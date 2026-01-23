// Provisioning API Routes
// Links ONU/ACS devices to customers and applies profiles
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}

// GET /api/provisioning/unassigned - Get unassigned ONUs and ACS devices
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organization_id');

        const supabase = getServiceClient();

        // Get unassigned ONUs (not linked to any customer)
        const { data: onus, error: onuError } = await supabase
            .from('onus')
            .select(`
        *,
        olt:olts(id, name, organization_id)
      `)
            .in('status', ['online', 'unauthorized']);

        if (onuError) throw onuError;

        // Filter ONUs that don't have assignments
        const { data: assignments } = await supabase
            .from('device_assignments')
            .select('onu_id, acs_device_id');

        const assignedOnuIds = new Set((assignments || []).map(a => a.onu_id).filter(Boolean));
        const assignedAcsIds = new Set((assignments || []).map(a => a.acs_device_id).filter(Boolean));

        const unassignedOnus = (onus || []).filter(onu => {
            if (assignedOnuIds.has(onu.id)) return false;
            if (organizationId && onu.olt?.organization_id !== organizationId) return false;
            return true;
        });

        // Get unassigned ACS devices
        const { data: acsDevices, error: acsError } = await supabase
            .from('acs_devices')
            .select('*')
            .eq('status', 'online');

        if (acsError) throw acsError;

        const unassignedAcs = (acsDevices || []).filter(device => {
            if (assignedAcsIds.has(device.id)) return false;
            if (organizationId && device.organization_id !== organizationId) return false;
            return true;
        });

        return NextResponse.json({
            unassigned_onus: unassignedOnus,
            unassigned_acs_devices: unassignedAcs,
        });
    } catch (error: any) {
        console.error('Failed to fetch unassigned devices:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
