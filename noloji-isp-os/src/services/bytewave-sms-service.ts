/**
 * Bytewave Networks SMS Service
 *
 * Integration with Bytewave Networks SMS API
 * API Documentation: https://portal.bytewavenetworks.com/developers/docs
 *
 * Endpoints:
 * - OAuth 2.0 API: https://portal.bytewavenetworks.com/api/v3/
 * - HTTP API: https://portal.bytewavenetworks.com/api/http/
 */

// Configuration from environment variables
const BYTEWAVE_API_URL = process.env.BYTEWAVE_API_URL || 'https://portal.bytewavenetworks.com/api/v3';
const BYTEWAVE_HTTP_API_URL = process.env.BYTEWAVE_HTTP_API_URL || 'https://portal.bytewavenetworks.com/api/http';
const BYTEWAVE_API_TOKEN = process.env.BYTEWAVE_API_TOKEN;

export interface SendSmsRequest {
    to: string;
    message: string;
    sender_id?: string;
}

export interface SendBulkSmsRequest {
    recipients: string[];
    message: string;
    sender_id?: string;
}

export interface BytewaveSmsResponse {
    success: boolean;
    message_id?: string;
    status?: string;
    message?: string;
    error?: string;
    balance?: number;
    data?: any;
}

export interface BytewaveBalanceResponse {
    success: boolean;
    balance?: number;
    currency?: string;
    error?: string;
}

/**
 * Check if Bytewave API is configured
 */
export function isBytewaveConfigured(): boolean {
    return !!BYTEWAVE_API_TOKEN;
}

/**
 * Get authorization headers for Bytewave API
 */
function getAuthHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${BYTEWAVE_API_TOKEN}`
    };
}

/**
 * Send a single SMS via Bytewave Networks HTTP API
 * The HTTP API uses api_token in the request body and 'recipient' as the phone field
 */
export async function sendSms(request: SendSmsRequest): Promise<BytewaveSmsResponse> {
    if (!BYTEWAVE_API_TOKEN) {
        console.error('[Bytewave] API token not configured');
        return {
            success: false,
            error: 'SMS provider not configured. Please set BYTEWAVE_API_TOKEN environment variable.'
        };
    }

    try {
        // Use HTTP API with api_token in body - this is the correct format for Bytewave
        const requestBody = {
            api_token: BYTEWAVE_API_TOKEN,
            recipient: request.to, // Bytewave uses 'recipient' not 'to'
            message: request.message,
            sender_id: request.sender_id || 'BytewaveSMS'
        };

        const apiUrl = `${BYTEWAVE_HTTP_API_URL}/sms/send`;
        console.log('[Bytewave] Sending SMS request to:', apiUrl);
        console.log('[Bytewave] Request body (token hidden):', JSON.stringify({
            ...requestBody,
            api_token: requestBody.api_token.substring(0, 5) + '...'
        }, null, 2));

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.error('[Bytewave] Non-JSON response:', textResponse.substring(0, 200));
            return {
                success: false,
                error: 'Unexpected response format from SMS provider'
            };
        }

        const data = await response.json();

        console.log('[Bytewave] Response status:', response.status, response.statusText);
        console.log('[Bytewave] Response data:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            const errorMessage = data.message || data.error || data.errors?.[0] || 'Failed to send SMS';
            console.error('[Bytewave] API returned error:', errorMessage);
            return {
                success: false,
                error: errorMessage,
                data
            };
        }

        // Check if the API returned a success indicator in the response body
        if (data.success === false || data.status === 'failed' || data.status === 'error') {
            const errorMessage = data.message || data.error || 'API returned failure status';
            console.error('[Bytewave] API returned success:false in body:', errorMessage);
            return {
                success: false,
                error: errorMessage,
                data
            };
        }

        console.log('[Bytewave] SMS sent successfully, message_id:', data.message_id || data.id || data.data?.message_id);

        return {
            success: true,
            message_id: data.message_id || data.id || data.data?.message_id,
            status: data.status || 'sent',
            balance: data.balance || data.credits_remaining,
            data
        };

    } catch (error: any) {
        console.error('[Bytewave] SMS Error:', error);
        return {
            success: false,
            error: error.message || 'Network error while sending SMS'
        };
    }
}

/**
 * Send bulk SMS via Bytewave Networks API
 */
export async function sendBulkSms(request: SendBulkSmsRequest): Promise<BytewaveSmsResponse & { sent?: number; failed?: number }> {
    if (!BYTEWAVE_API_TOKEN) {
        return {
            success: false,
            error: 'SMS provider not configured. Please set BYTEWAVE_API_TOKEN environment variable.'
        };
    }

    try {
        // First, try the bulk endpoint if available
        const response = await fetch(`${BYTEWAVE_API_URL}/sms/bulk`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                recipients: request.recipients,
                message: request.message,
                sender_id: request.sender_id || 'BytewaveSMS',
                // Alternative field names
                to: request.recipients,
                text: request.message,
                from: request.sender_id || 'BytewaveSMS'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // If bulk endpoint fails, fall back to sending individually
            if (response.status === 404) {
                return await sendBulkIndividually(request);
            }

            return {
                success: false,
                error: data.message || data.error || 'Failed to send bulk SMS',
                data
            };
        }

        return {
            success: true,
            message_id: data.batch_id || data.id,
            status: 'sent',
            sent: data.sent || data.success_count || request.recipients.length,
            failed: data.failed || data.failure_count || 0,
            balance: data.balance,
            data
        };

    } catch (error: any) {
        // Fall back to individual sending
        console.error('Bytewave Bulk API Error, falling back to individual:', error);
        return await sendBulkIndividually(request);
    }
}

/**
 * Fallback: Send bulk SMS individually
 */
async function sendBulkIndividually(request: SendBulkSmsRequest): Promise<BytewaveSmsResponse & { sent?: number; failed?: number }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of request.recipients) {
        const result = await sendSms({
            to: recipient,
            message: request.message,
            sender_id: request.sender_id
        });

        if (result.success) {
            sent++;
        } else {
            failed++;
            errors.push(`${recipient}: ${result.error}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
        success: sent > 0,
        sent,
        failed,
        message: `Sent: ${sent}, Failed: ${failed}`,
        error: errors.length > 0 ? errors.join('; ') : undefined
    };
}

/**
 * Check SMS balance via Bytewave Networks API
 */
export async function checkBalance(): Promise<BytewaveBalanceResponse> {
    if (!BYTEWAVE_API_TOKEN) {
        return {
            success: false,
            error: 'SMS provider not configured'
        };
    }

    try {
        const response = await fetch(`${BYTEWAVE_API_URL}/sms/balance`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.message || data.error || 'Failed to check balance'
            };
        }

        return {
            success: true,
            balance: data.balance || data.credits || data.data?.balance,
            currency: data.currency || 'KES'
        };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Network error while checking balance'
        };
    }
}

/**
 * Get delivery status for a message
 */
export async function getDeliveryStatus(messageId: string): Promise<BytewaveSmsResponse> {
    if (!BYTEWAVE_API_TOKEN) {
        return {
            success: false,
            error: 'SMS provider not configured'
        };
    }

    try {
        const response = await fetch(`${BYTEWAVE_API_URL}/sms/status/${messageId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.message || data.error || 'Failed to get delivery status'
            };
        }

        return {
            success: true,
            message_id: messageId,
            status: data.status || data.delivery_status,
            data
        };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Network error while checking status'
        };
    }
}

export default {
    isBytewaveConfigured,
    sendSms,
    sendBulkSms,
    checkBalance,
    getDeliveryStatus
};
