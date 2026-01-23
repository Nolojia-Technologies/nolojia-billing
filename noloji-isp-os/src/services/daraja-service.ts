/**
 * DARAJA API SERVICE
 * Safaricom M-Pesa Integration for Nolojia ISP Platform
 * 
 * Handles:
 * - OAuth token generation
 * - STK Push (Lipa Na M-Pesa Online)
 * - STK Push status query
 * - C2B Registration (future)
 * - B2C Disbursement (for landlord payouts)
 */

import { supabase } from '@/lib/supabase';

// Environment configuration
const MPESA_ENV = process.env.MPESA_ENVIRONMENT || 'sandbox';
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const SHORTCODE = process.env.MPESA_SHORTCODE || '174379'; // Sandbox default
const PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'; // Sandbox default passkey
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || '';

// API URLs
const SANDBOX_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_URL = 'https://api.safaricom.co.ke';
const BASE_URL = MPESA_ENV === 'production' ? PRODUCTION_URL : SANDBOX_URL;

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// Types
export interface STKPushOptions {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc?: string;
    customerId?: string;
    landlordId?: string;
}

export interface STKPushResponse {
    success: boolean;
    checkoutRequestId?: string;
    merchantRequestId?: string;
    responseCode?: string;
    responseDescription?: string;
    customerMessage?: string;
    error?: string;
}

export interface STKQueryResponse {
    success: boolean;
    resultCode?: string;
    resultDesc?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    phoneNumber?: string;
    amount?: number;
    error?: string;
}

export interface STKCallbackData {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResultCode: number;
    ResultDesc: string;
    CallbackMetadata?: {
        Item: Array<{
            Name: string;
            Value: string | number;
        }>;
    };
}

/**
 * Get OAuth access token from Daraja API
 * Caches token until expiry
 */
async function getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    try {
        const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Daraja] Token error:', errorText);
            throw new Error(`Failed to get access token: ${response.status}`);
        }

        const data = await response.json();
        accessToken = data.access_token;
        // Token expires in 3599 seconds, we'll refresh 5 minutes early
        tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);

        console.log('[Daraja] Access token obtained successfully');
        return accessToken!;
    } catch (error: any) {
        console.error('[Daraja] Error getting access token:', error);
        throw error;
    }
}

/**
 * Format phone number to international format (254XXXXXXXXX)
 */
function formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned;
    }

    return cleaned;
}

/**
 * Generate password for STK Push
 * Formula: Base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(timestamp: string): string {
    const data = `${SHORTCODE}${PASSKEY}${timestamp}`;
    return Buffer.from(data).toString('base64');
}

/**
 * Generate timestamp in format YYYYMMDDHHmmss
 */
function generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Initiate STK Push (Lipa Na M-Pesa Online)
 * Sends payment prompt to customer's phone
 */
export async function initiateSTKPush(options: STKPushOptions): Promise<STKPushResponse> {
    try {
        const token = await getAccessToken();
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);
        const phoneNumber = formatPhoneNumber(options.phoneNumber);

        const payload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.ceil(options.amount), // M-Pesa only accepts whole numbers
            PartyA: phoneNumber,
            PartyB: SHORTCODE,
            PhoneNumber: phoneNumber,
            CallBackURL: CALLBACK_URL,
            AccountReference: options.accountReference || 'Nolojia ISP',
            TransactionDesc: options.transactionDesc || 'Internet subscription payment',
        };

        console.log('[Daraja] Initiating STK Push:', { phone: phoneNumber, amount: options.amount });

        const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.ResponseCode === '0') {
            // Store transaction in database
            await supabase.from('mpesa_stk_transactions').insert({
                customer_id: options.customerId,
                landlord_id: options.landlordId,
                phone_number: phoneNumber,
                amount: options.amount,
                checkout_request_id: data.CheckoutRequestID,
                merchant_request_id: data.MerchantRequestID,
                status: 'pending',
            });

            console.log('[Daraja] STK Push initiated:', data.CheckoutRequestID);

            return {
                success: true,
                checkoutRequestId: data.CheckoutRequestID,
                merchantRequestId: data.MerchantRequestID,
                responseCode: data.ResponseCode,
                responseDescription: data.ResponseDescription,
                customerMessage: data.CustomerMessage,
            };
        } else {
            console.error('[Daraja] STK Push failed:', data);
            return {
                success: false,
                responseCode: data.ResponseCode,
                responseDescription: data.ResponseDescription,
                error: data.errorMessage || data.ResponseDescription || 'STK Push failed',
            };
        }
    } catch (error: any) {
        console.error('[Daraja] STK Push error:', error);
        return {
            success: false,
            error: error.message || 'Failed to initiate payment',
        };
    }
}

/**
 * Query STK Push transaction status
 */
export async function querySTKPushStatus(checkoutRequestId: string): Promise<STKQueryResponse> {
    try {
        const token = await getAccessToken();
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);

        const payload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId,
        };

        const response = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.ResponseCode === '0') {
            return {
                success: true,
                resultCode: data.ResultCode,
                resultDesc: data.ResultDesc,
            };
        } else {
            return {
                success: false,
                error: data.errorMessage || 'Query failed',
            };
        }
    } catch (error: any) {
        console.error('[Daraja] STK Query error:', error);
        return {
            success: false,
            error: error.message || 'Failed to query status',
        };
    }
}

/**
 * Process STK Push callback from M-Pesa
 */
export async function processSTKCallback(callbackData: STKCallbackData): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
}> {
    try {
        const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData;

        console.log('[Daraja] Processing callback:', { CheckoutRequestID, ResultCode });

        // Extract metadata if payment was successful
        let mpesaReceiptNumber: string | undefined;
        let amount: number | undefined;
        let phoneNumber: string | undefined;
        let transactionDate: string | undefined;

        if (ResultCode === 0 && CallbackMetadata?.Item) {
            for (const item of CallbackMetadata.Item) {
                switch (item.Name) {
                    case 'MpesaReceiptNumber':
                        mpesaReceiptNumber = String(item.Value);
                        break;
                    case 'Amount':
                        amount = Number(item.Value);
                        break;
                    case 'PhoneNumber':
                        phoneNumber = String(item.Value);
                        break;
                    case 'TransactionDate':
                        transactionDate = String(item.Value);
                        break;
                }
            }
        }

        // Update transaction in database
        const status = ResultCode === 0 ? 'completed' : 'failed';

        const { data: transaction, error: updateError } = await supabase
            .from('mpesa_stk_transactions')
            .update({
                result_code: ResultCode,
                result_description: ResultDesc,
                mpesa_receipt_number: mpesaReceiptNumber,
                status,
                completed_at: new Date().toISOString(),
            })
            .eq('checkout_request_id', CheckoutRequestID)
            .select('*, customer_id, landlord_id, amount')
            .single();

        if (updateError) {
            console.error('[Daraja] Failed to update transaction:', updateError);
            throw updateError;
        }

        // If payment successful, process it through billing service
        if (ResultCode === 0 && transaction) {
            // Import dynamically to avoid circular dependency
            const { handleMpesaCallback } = await import('./landlord-billing-service');

            await handleMpesaCallback({
                ResultCode: 0,
                ResultDesc,
                MpesaReceiptNumber: mpesaReceiptNumber!,
                TransactionDate: transactionDate!,
                PhoneNumber: phoneNumber!,
                Amount: amount || transaction.amount,
                customer_id: transaction.customer_id,
            });

            // Link payment to STK transaction
            const { data: payment } = await supabase
                .from('landlord_payments')
                .select('id')
                .eq('mpesa_receipt', mpesaReceiptNumber)
                .single();

            if (payment) {
                await supabase
                    .from('mpesa_stk_transactions')
                    .update({ payment_id: payment.id })
                    .eq('checkout_request_id', CheckoutRequestID);
            }

            console.log('[Daraja] Payment processed successfully:', mpesaReceiptNumber);
        }

        return {
            success: true,
            transactionId: transaction?.id,
        };
    } catch (error: any) {
        console.error('[Daraja] Callback processing error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Check if Daraja is properly configured
 */
export function isDarajaConfigured(): boolean {
    return !!(CONSUMER_KEY && CONSUMER_SECRET && CALLBACK_URL);
}

/**
 * Get configuration status for debugging
 */
export function getConfigStatus(): {
    environment: string;
    hasConsumerKey: boolean;
    hasConsumerSecret: boolean;
    hasPasskey: boolean;
    hasCallbackUrl: boolean;
    shortcode: string;
} {
    return {
        environment: MPESA_ENV,
        hasConsumerKey: !!CONSUMER_KEY,
        hasConsumerSecret: !!CONSUMER_SECRET,
        hasPasskey: !!PASSKEY,
        hasCallbackUrl: !!CALLBACK_URL,
        shortcode: SHORTCODE,
    };
}
