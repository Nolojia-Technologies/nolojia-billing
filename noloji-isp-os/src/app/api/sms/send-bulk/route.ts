import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSms as sendViaBytewaveAPI, isBytewaveConfigured } from '@/services/bytewave-sms-service';
import { replaceTemplateVariables, type SmsVariableContext } from '@/lib/sms-template-variables';

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
        const { recipients, message, sender_id = 'BytewaveSMS' } = body;

        console.log('[SMS Bulk] Received request:', { recipientCount: recipients?.length, messageLength: message?.length, sender_id });

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            console.log('[SMS Bulk] Error: No recipients provided');
            return NextResponse.json(
                { success: false, error: 'Recipients array is required' },
                { status: 400 }
            );
        }

        if (!message) {
            return NextResponse.json(
                { success: false, error: 'Message is required' },
                { status: 400 }
            );
        }

        // Fetch customer data for all recipients to enable variable replacement
        const { data: customersData } = await supabase
            .from('customers')
            .select('id, phone, full_name, username, email, valid_until, plans(name, price, download_speed)')
            .in('phone', recipients);

        // Create a map of phone -> customer data for quick lookup
        const customerMap = new Map<string, any>();
        (customersData || []).forEach(customer => {
            if (customer.phone) {
                customerMap.set(customer.phone, customer);
            }
        });

        console.log('[SMS Bulk] Found customer data for', customerMap.size, 'of', recipients.length, 'recipients');

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

        // Calculate total credits needed
        // Note: This calculation is an estimate. Actual segments might vary per recipient if variables change message length.
        // For now, we'll use the base message length.
        const creditsPerMessage = calculateSmsSegments(message);
        const totalCreditsNeeded = creditsPerMessage * recipients.length;

        if (credits.balance < totalCreditsNeeded) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Insufficient credits. Need ${totalCreditsNeeded}, have ${credits.balance}`
                },
                { status: 400 }
            );
        }

        const results = {
            total: recipients.length,
            sent: 0,
            failed: 0,
            errors: [] as string[]
        };

        // Process each recipient
        for (const recipient of recipients) {
            // Get customer data for this recipient (if available)
            const customer = customerMap.get(recipient);

            // Build variable context from customer data
            const variableContext: SmsVariableContext = {
                customer_name: customer?.full_name || customer?.username || 'Customer',
                customer_username: customer?.username,
                customer_phone: recipient,
                customer_email: customer?.email,
                plan_name: customer?.plans?.name,
                plan_price: customer?.plans?.price,
                plan_speed: customer?.plans?.download_speed,
                expiry_date: customer?.valid_until,
                amount_due: customer?.plans?.price, // Default to plan price
                isp_name: 'Noloji ISP', // Could be made configurable
            };

            // Replace template variables in the message
            const personalizedMessage = replaceTemplateVariables(message, variableContext);

            // Create log entry with personalized message
            const { data: logEntry } = await supabase
                .from('sms_logs')
                .insert({
                    recipient,
                    message: personalizedMessage,
                    sender_id,
                    customer_id: customer?.id,
                    status: 'pending',
                    cost: creditsPerMessage * credits.cost_per_sms
                })
                .select()
                .single();

            try {
                // Send via Bytewave Networks with personalized message
                const providerResponse = await sendViaBytewaveAPI({
                    to: recipient,
                    message: personalizedMessage,
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
                        .eq('id', logEntry?.id);

                    results.failed++;
                    results.errors.push(`${recipient}: ${providerResponse.error}`);
                    continue;
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
                    .eq('id', logEntry?.id);

                results.sent++;

            } catch (sendError: any) {
                // Update log with failure
                await supabase
                    .from('sms_logs')
                    .update({
                        status: 'failed',
                        provider_response: { error: sendError.message }
                    })
                    .eq('id', logEntry?.id);

                results.failed++;
                results.errors.push(`${recipient}: ${sendError.message}`);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Deduct credits for sent messages only
        const creditsUsed = results.sent * creditsPerMessage;
        if (creditsUsed > 0) {
            await supabase
                .from('sms_credits')
                .update({ balance: credits.balance - creditsUsed })
                .eq('id', credits.id);
        }

        return NextResponse.json({
            success: true,
            data: {
                ...results,
                credits_used: creditsUsed,
                remaining_credits: credits.balance - creditsUsed
            }
        });

    } catch (error: any) {
        console.error('Error sending bulk SMS:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
