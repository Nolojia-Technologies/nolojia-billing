// API Route for fetching user profile
// Uses service role key to bypass RLS

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        if (!supabaseServiceKey) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY not set');
            return NextResponse.json({
                profile: null,
                warning: 'Service role key not configured',
            });
        }

        // Use service role key (bypasses RLS)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const { data, error } = await supabaseAdmin
            .from('landlord_users')
            .select('*, organization:organizations(*), landlord:landlords(*)')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Profile fetch error:', error);
            return NextResponse.json({
                profile: null,
                error: error.message,
            });
        }

        // Update last login
        if (data) {
            await supabaseAdmin
                .from('landlord_users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userId);
        }

        return NextResponse.json({ profile: data });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({
            profile: null,
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
}
