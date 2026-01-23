import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSms as sendViaBytewaveAPI, isBytewaveConfigured } from '@/services/bytewave-sms-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Check if message contains Unicode (non-GSM characters)
function containsUnicode(text: string): boolean {
    const gsmChars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑܧ¿a-zäöñüà\r\n]*$/;
    return !gsmChars.test(text);
}

// Calculate SMS segments based on content
function calculateSmsSegments(text: string): number {
    const isUnicode = containsUnicode(text);
    const charsPerSegment = isUnicode ? 70 : 160;
    return text.length === 0 ? 1 : Math.ceil(text.length / charsPerSegment);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { recipient, message, sender_id = 'BytewaveSMS', customer_id } = body;

        if (!recipient || !message) {
            return NextResponse.json(
                { success: false, error: 'Recipient and message are required' },
                { status: 400 }
            );
        }

        // Check if Bytewave is configured
        if (!isBytewaveConfigured()) {
            return NextResponse.json(
                { success: false, error: 'SMS provider not configured. Please contact administrator.' },
                { status: 503 }
            );
        }

        // Check SMS credits
        const { data: credits, error: creditsError } = await supabase
            .from('sms_credits')
            .select('*')
            .limit(1)
            .single();

        if (creditsError) {
            console.error('Credits fetch error:', creditsError);
            return NextResponse.json(
                { success: false, error: 'Failed to check SMS credits' },
                { status: 500 }
            );
        }

        // Calculate credits needed based on message length and encoding
        const creditsNeeded = calculateSmsSegments(message);

        if (credits.balance < creditsNeeded) {
            return NextResponse.json(
                { success: false, error: `Insufficient SMS credits. Need ${creditsNeeded}, have ${credits.balance}` },
                { status: 400 }
            );
        }

        // Create log entry (pending)
        const { data: logEntry, error: logError } = await supabase
            .from('sms_logs')
            .insert({
                recipient,
                message,
                sender_id,
                customer_id,
                status: 'pending',
                cost: creditsNeeded * credits.cost_per_sms
            })
            .select()
            .single();

        if (logError) {
            console.error('Log creation error:', logError);
            return NextResponse.json(
                { success: false, error: 'Failed to create SMS log' },
                { status: 500 }
            );
        }

        try {
            // Send via Bytewave Networks
            const providerResponse = await sendViaBytewaveAPI({
                to: recipient,
                message: message,
                sender_id: sender_id
            });

            if (!providerResponse.success) {
                // Update log with failure
                await supabase
                    .from('sms_logs')
                    .update({
                        status: 'failed',
                        provider_response: { error: providerResponse.error, data: providerResponse.data }
                    })
                    .eq('id', logEntry.id);

                return NextResponse.json(
                    { success: false, error: providerResponse.error || 'Failed to send SMS' },
                    { status: 500 }
                );
            }

            // Update log with success
            await supabase
                .from('sms_logs')
                .update({
                    status: 'sent',
                    provider_message_id: providerResponse.message_id,
                    provider_response: providerResponse.data,
                    sent_at: new Date().toISOString()
                })
                .eq('id', logEntry.id);

            // Deduct credits
            await supabase
                .from('sms_credits')
                .update({ balance: credits.balance - creditsNeeded })
                .eq('id', credits.id);

            return NextResponse.json({
                success: true,
                data: {
                    log_id: logEntry.id,
                    message_id: providerResponse.message_id,
                    status: 'sent',
                    credits_used: creditsNeeded,
                    remaining_credits: credits.balance - creditsNeeded
                }
            });

        } catch (sendError: any) {
            // Update log with failure
            await supabase
                .from('sms_logs')
                .update({
                    status: 'failed',
                    provider_response: { error: sendError.message }
                })
                .eq('id', logEntry.id);

            return NextResponse.json(
                { success: false, error: sendError.message },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Error sending SMS:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
