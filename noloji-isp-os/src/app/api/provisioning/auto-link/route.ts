// Auto-link API - Match ONU/ACS device to customer by serial number
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}

// POST /api/provisioning/auto-link - Auto-link device by serial
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { serial_number, customer_id, profile_id } = body;

        if (!serial_number) {
            return NextResponse.json({ error: 'serial_number is required' }, { status: 400 });
        }

        if (!customer_id) {
            return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
        }

        const supabase = getServiceClient();

        // Check if customer already has assignment
        const { data: existingAssignment } = await supabase
            .from('device_assignments')
            .select('id')
            .eq('customer_id', customer_id)
            .single();

        if (existingAssignment) {
            return NextResponse.json(
                { error: 'Customer already has a device assignment' },
                { status: 409 }
            );
        }

        // Try to find ONU by serial
        const { data: onu } = await supabase
            .from('onus')
            .select('id')
            .eq('serial_number', serial_number)
            .single();

        // Try to find ACS device by serial
        const { data: acsDevice } = await supabase
            .from('acs_devices')
            .select('id')
            .eq('serial_number', serial_number)
            .single();

        if (!onu && !acsDevice) {
            return NextResponse.json(
                { error: 'No device found with this serial number' },
                { status: 404 }
            );
        }

        // Check if devices are already assigned
        if (onu) {
            const { data: onuAssigned } = await supabase
                .from('device_assignments')
                .select('id')
                .eq('onu_id', onu.id)
                .single();

            if (onuAssigned) {
                return NextResponse.json(
                    { error: 'This device is already assigned' },
                    { status: 409 }
                );
            }
        }

        if (acsDevice) {
            const { data: acsAssigned } = await supabase
                .from('device_assignments')
                .select('id')
                .eq('acs_device_id', acsDevice.id)
                .single();

            if (acsAssigned) {
                return NextResponse.json(
                    { error: 'This device is already assigned' },
                    { status: 409 }
                );
            }
        }

        // Create assignment
        const { data: assignment, error } = await supabase
            .from('device_assignments')
            .insert({
                customer_id,
                onu_id: onu?.id || null,
                acs_device_id: acsDevice?.id || null,
                profile_id: profile_id || null,
                status: 'active',
                notes: `Auto-linked via serial: ${serial_number}`,
            })
            .select(`
        *,
        onu:onus(id, serial_number),
        acs_device:acs_devices(id, serial_number)
      `)
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Device linked successfully',
            data: assignment,
        });
    } catch (error: any) {
        console.error('Auto-link failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
