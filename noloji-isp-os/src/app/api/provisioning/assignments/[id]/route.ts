// Individual Assignment API Routes
// GET/PUT/DELETE /api/provisioning/assignments/[id]
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/provisioning/assignments/[id]
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('device_assignments')
            .select(`
        *,
        onu:onus(*),
        acs_device:acs_devices(*),
        profile:provisioning_profiles(*)
      `)
            .eq('id', id)
            .single();

        if (error) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/provisioning/assignments/[id] - Update assignment
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { profile_id, status, notes, assigned_vlan } = body;

        const supabase = getServiceClient();

        const update: any = {};
        if (profile_id !== undefined) update.profile_id = profile_id;
        if (status !== undefined) update.status = status;
        if (notes !== undefined) update.notes = notes;
        if (assigned_vlan !== undefined) update.assigned_vlan = assigned_vlan;

        const { data, error } = await supabase
            .from('device_assignments')
            .update(update)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/provisioning/assignments/[id] - Remove assignment
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const supabase = getServiceClient();

        const { error } = await supabase
            .from('device_assignments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
