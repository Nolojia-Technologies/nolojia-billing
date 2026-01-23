import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { querySTKPushStatus } from '@/services/daraja-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/payments/stk-status?checkout_request_id=...
 * Query STK Push transaction status
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const checkoutRequestId = searchParams.get('checkout_request_id');

        if (!checkoutRequestId) {
            return NextResponse.json(
                { success: false, error: 'checkout_request_id is required' },
                { status: 400 }
            );
        }

        // First check our database for the status
        const { data: transaction, error: dbError } = await supabase
            .from('mpesa_stk_transactions')
            .select('*')
            .eq('checkout_request_id', checkoutRequestId)
            .single();

        if (dbError) {
            return NextResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            );
        }

        // If we already have a final status, return it
        if (transaction.status === 'completed' || transaction.status === 'failed') {
            return NextResponse.json({
                success: true,
                data: {
                    status: transaction.status,
                    mpesa_receipt: transaction.mpesa_receipt_number,
                    amount: transaction.amount,
                    phone_number: transaction.phone_number,
                    result_description: transaction.result_description,
                    completed_at: transaction.completed_at,
                },
            });
        }

        // If still pending, query M-Pesa for latest status
        const queryResult = await querySTKPushStatus(checkoutRequestId);

        if (queryResult.success && queryResult.resultCode !== undefined) {
            // Update our database if we got a result
            const newStatus = queryResult.resultCode === '0' ? 'completed' : 'failed';

            if (newStatus !== transaction.status) {
                await supabase
                    .from('mpesa_stk_transactions')
                    .update({
                        status: newStatus,
                        result_code: parseInt(queryResult.resultCode),
                        result_description: queryResult.resultDesc,
                        completed_at: new Date().toISOString(),
                    })
                    .eq('checkout_request_id', checkoutRequestId);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                status: transaction.status,
                amount: transaction.amount,
                phone_number: transaction.phone_number,
                created_at: transaction.created_at,
                message: transaction.status === 'pending'
                    ? 'Payment is still pending. Complete payment on your phone.'
                    : undefined,
            },
        });
    } catch (error: any) {
        console.error('[STK Status] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
