import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const from_date = searchParams.get('from_date');
        const to_date = searchParams.get('to_date');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = supabase
            .from('sms_logs')
            .select('*, customers:customer_id(username, full_name, phone)', { count: 'exact' });

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`recipient.ilike.%${search}%,message.ilike.%${search}%`);
        }

        if (from_date) {
            query = query.gte('created_at', from_date);
        }

        if (to_date) {
            query = query.lte('created_at', to_date);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data,
            count,
            pagination: {
                limit,
                offset,
                total: count
            }
        });
    } catch (error: any) {
        console.error('Error fetching SMS logs:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
