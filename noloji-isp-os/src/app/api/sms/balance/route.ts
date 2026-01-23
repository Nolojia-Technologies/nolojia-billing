import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isBytewaveConfigured, checkBalance as checkProviderBalance } from '@/services/bytewave-sms-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('sms_credits')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            // If no record exists, create one
            if (error.code === 'PGRST116') {
                const { data: newData, error: insertError } = await supabase
                    .from('sms_credits')
                    .insert({ balance: 0, cost_per_sms: 0.50, currency: 'KES' })
                    .select()
                    .single();

                if (insertError) throw insertError;
                return NextResponse.json({
                    success: true,
                    data: newData,
                    provider: {
                        configured: isBytewaveConfigured(),
                        name: 'Bytewave Networks'
                    }
                });
            }
            throw error;
        }

        // Check provider status
        const providerStatus = {
            configured: isBytewaveConfigured(),
            name: 'Bytewave Networks',
            balance: null as number | null,
            status: 'unknown' as string
        };

        if (isBytewaveConfigured()) {
            try {
                const providerBalance = await checkProviderBalance();
                if (providerBalance.success) {
                    providerStatus.balance = providerBalance.balance || null;
                    providerStatus.status = 'connected';
                } else {
                    providerStatus.status = 'error';
                }
            } catch {
                providerStatus.status = 'error';
            }
        } else {
            providerStatus.status = 'not_configured';
        }

        return NextResponse.json({
            success: true,
            data,
            provider: providerStatus
        });
    } catch (error: any) {
        console.error('Error fetching SMS balance:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
