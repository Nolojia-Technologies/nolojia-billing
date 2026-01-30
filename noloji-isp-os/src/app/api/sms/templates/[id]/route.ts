import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PUT: Update template
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: paramId } = await params;
    try {
        const id = parseInt(paramId);
        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid template ID' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { name, category, content, variables, is_active } = body;

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (category !== undefined) updates.category = category;
        if (content !== undefined) updates.content = content;
        if (variables !== undefined) updates.variables = variables;
        if (is_active !== undefined) updates.is_active = is_active;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No updates provided' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('sms_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error updating SMS template:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE: Delete template
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: paramId } = await params;
    try {
        const id = parseInt(paramId);
        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid template ID' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('sms_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting SMS template:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
