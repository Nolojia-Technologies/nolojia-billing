import { NextRequest, NextResponse } from 'next/server';
import { processSTKCallback, STKCallbackData } from '@/services/daraja-service';

/**
 * POST /api/payments/stk-callback
 * M-Pesa callback endpoint for STK Push results
 * 
 * This endpoint is called by Safaricom after customer completes or cancels payment
 * 
 * Callback payload structure:
 * {
 *   "Body": {
 *     "stkCallback": {
 *       "MerchantRequestID": "...",
 *       "CheckoutRequestID": "...",
 *       "ResultCode": 0,  // 0 = success, any other = failure
 *       "ResultDesc": "Success...",
 *       "CallbackMetadata": {
 *         "Item": [
 *           { "Name": "Amount", "Value": 1 },
 *           { "Name": "MpesaReceiptNumber", "Value": "NLJ..." },
 *           { "Name": "TransactionDate", "Value": 20201115... },
 *           { "Name": "PhoneNumber", "Value": 254... }
 *         ]
 *       }
 *     }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();

        console.log('[STK Callback] Received:', JSON.stringify(payload, null, 2));

        // Extract callback data from M-Pesa format
        const stkCallback = payload?.Body?.stkCallback;

        if (!stkCallback) {
            console.error('[STK Callback] Invalid payload structure:', payload);
            return NextResponse.json(
                { ResultCode: 1, ResultDesc: 'Invalid payload' },
                { status: 400 }
            );
        }

        const callbackData: STKCallbackData = {
            MerchantRequestID: stkCallback.MerchantRequestID,
            CheckoutRequestID: stkCallback.CheckoutRequestID,
            ResultCode: stkCallback.ResultCode,
            ResultDesc: stkCallback.ResultDesc,
            CallbackMetadata: stkCallback.CallbackMetadata,
        };

        // Process the callback
        const result = await processSTKCallback(callbackData);

        if (!result.success) {
            console.error('[STK Callback] Processing failed:', result.error);
            // Still return success to M-Pesa to prevent retries
            return NextResponse.json({
                ResultCode: 0,
                ResultDesc: 'Callback received',
            });
        }

        console.log('[STK Callback] Processed successfully:', result.transactionId);

        // Return success to M-Pesa
        return NextResponse.json({
            ResultCode: 0,
            ResultDesc: 'Callback received and processed successfully',
        });
    } catch (error: any) {
        console.error('[STK Callback] Error:', error);
        // Return success to prevent M-Pesa retries
        return NextResponse.json({
            ResultCode: 0,
            ResultDesc: 'Callback received',
        });
    }
}

/**
 * GET /api/payments/stk-callback
 * Health check for callback URL validation
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'M-Pesa STK callback endpoint is active',
        timestamp: new Date().toISOString(),
    });
}
