import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
    try {
        // Get total count
        const { count: total } = await supabase
            .from('sms_logs')
            .select('*', { count: 'exact', head: true });

        // Get sent count (includes 'sent' status)
        const { count: sent } = await supabase
            .from('sms_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'sent');

        // Get delivered count
        const { count: delivered } = await supabase
            .from('sms_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'delivered');

        // Get failed count
        const { count: failed } = await supabase
            .from('sms_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed');

        // Calculate successful (sent + delivered)
        const successful = (sent || 0) + (delivered || 0);

        // Get total credits used
        const { data: costData } = await supabase
            .from('sms_logs')
            .select('cost')
            .in('status', ['sent', 'delivered']);

        const totalCreditsUsed = costData?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;

        return NextResponse.json({
            success: true,
            data: {
                total: total || 0,
                successful,
                sent: sent || 0,
                delivered: delivered || 0,
                failed: failed || 0,
                total_credits_used: Math.ceil(totalCreditsUsed)
            }
        });
    } catch (error: any) {
        console.error('Error fetching SMS stats:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
