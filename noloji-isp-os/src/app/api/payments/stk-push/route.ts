import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initiateSTKPush, isDarajaConfigured, getConfigStatus } from '@/services/daraja-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/payments/stk-push
 * Initiate STK Push payment request
 * 
 * Body: {
 *   customer_id: string (required)
 *   phone_number: string (required)
 *   amount: number (required)
 *   account_reference?: string
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Check configuration
        if (!isDarajaConfigured()) {
            const status = getConfigStatus();
            console.error('[STK Push] Daraja not configured:', status);
            return NextResponse.json(
                { success: false, error: 'M-Pesa payment is not configured. Please contact administrator.' },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { customer_id, phone_number, amount, account_reference } = body;

        // Validate required fields
        if (!customer_id || !phone_number || !amount) {
            return NextResponse.json(
                { success: false, error: 'customer_id, phone_number, and amount are required' },
                { status: 400 }
            );
        }

        // Validate amount
        if (amount <= 0 || amount > 150000) {
            return NextResponse.json(
                { success: false, error: 'Amount must be between 1 and 150,000 KES' },
                { status: 400 }
            );
        }

        // Fetch customer to get landlord_id
        const { data: customer, error: customerError } = await supabase
            .from('landlord_customers')
            .select('id, name, landlord_id')
            .eq('id', customer_id)
            .single();

        if (customerError || !customer) {
            return NextResponse.json(
                { success: false, error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Initiate STK Push
        const result = await initiateSTKPush({
            phoneNumber: phone_number,
            amount: amount,
            accountReference: account_reference || `NOLOJIA-${customer.name?.substring(0, 10) || customer_id.substring(0, 8)}`,
            transactionDesc: `Internet payment for ${customer.name || 'Customer'}`,
            customerId: customer.id,
            landlordId: customer.landlord_id,
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to initiate payment' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                checkout_request_id: result.checkoutRequestId,
                merchant_request_id: result.merchantRequestId,
                customer_message: result.customerMessage,
                message: 'Payment prompt sent to phone. Please complete the payment.',
            },
        });
    } catch (error: any) {
        console.error('[STK Push] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/payments/stk-push
 * Get configuration status (for debugging)
 */
export async function GET() {
    const status = getConfigStatus();
    return NextResponse.json({
        configured: isDarajaConfigured(),
        environment: status.environment,
        shortcode: status.shortcode,
        hasCallbackUrl: status.hasCallbackUrl,
    });
}
