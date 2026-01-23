import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: List templates
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');

        let query = supabase
            .from('sms_templates')
            .select('*')
            .eq('is_active', true);

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error fetching SMS templates:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST: Create template
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, category, content, variables } = body;

        if (!name || !category || !content) {
            return NextResponse.json(
                { success: false, error: 'Name, category, and content are required' },
                { status: 400 }
            );
        }

        const validCategories = ['billing', 'notification', 'marketing', 'support', 'custom'];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { success: false, error: 'Invalid category' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('sms_templates')
            .insert({
                name,
                category,
                content,
                variables: variables || [],
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error creating SMS template:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
