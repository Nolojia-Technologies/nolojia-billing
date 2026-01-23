import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST: Add credits
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { amount, cost_per_sms } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Get current balance
        const { data: current, error: fetchError } = await supabase
            .from('sms_credits')
            .select('*')
            .limit(1)
            .single();

        if (fetchError) throw fetchError;

        // Update balance
        const updates: any = { balance: current.balance + amount };
        if (cost_per_sms !== undefined) {
            updates.cost_per_sms = cost_per_sms;
        }

        const { data, error } = await supabase
            .from('sms_credits')
            .update(updates)
            .eq('id', current.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error adding SMS credits:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// PUT: Update pricing
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { cost_per_sms, currency } = body;

        if (!cost_per_sms || cost_per_sms <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid cost per SMS' },
                { status: 400 }
            );
        }

        // Get current record
        const { data: current, error: fetchError } = await supabase
            .from('sms_credits')
            .select('*')
            .limit(1)
            .single();

        if (fetchError) throw fetchError;

        // Update pricing
        const updates: any = { cost_per_sms };
        if (currency) updates.currency = currency;

        const { data, error } = await supabase
            .from('sms_credits')
            .update(updates)
            .eq('id', current.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error updating SMS pricing:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
