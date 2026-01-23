// Device Assignment API Routes
// POST: Create assignment, GET: Get assignments, DELETE: Remove assignment
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}

// GET /api/provisioning/assignments - Get all assignments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customer_id');
        const organizationId = searchParams.get('organization_id');

        const supabase = getServiceClient();

        let query = supabase
            .from('device_assignments')
            .select(`
        *,
        onu:onus(id, serial_number, status, rx_power, tx_power),
        acs_device:acs_devices(id, serial_number, manufacturer, model_name, status),
        profile:provisioning_profiles(id, name)
      `);

        if (customerId) {
            query = query.eq('customer_id', customerId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ data: data || [] });
    } catch (error: any) {
        console.error('Failed to fetch assignments:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/provisioning/assignments - Create new assignment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { customer_id, onu_id, acs_device_id, profile_id, notes } = body;

        if (!customer_id) {
            return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
        }

        if (!onu_id && !acs_device_id) {
            return NextResponse.json(
                { error: 'Either onu_id or acs_device_id is required' },
                { status: 400 }
            );
        }

        const supabase = getServiceClient();

        // Check if customer already has an assignment
        const { data: existing } = await supabase
            .from('device_assignments')
            .select('id')
            .eq('customer_id', customer_id)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'Customer already has a device assignment' },
                { status: 409 }
            );
        }

        // Check if ONU is already assigned
        if (onu_id) {
            const { data: onuAssigned } = await supabase
                .from('device_assignments')
                .select('id')
                .eq('onu_id', onu_id)
                .single();

            if (onuAssigned) {
                return NextResponse.json(
                    { error: 'This ONU is already assigned to another customer' },
                    { status: 409 }
                );
            }
        }

        // Check if ACS device is already assigned
        if (acs_device_id) {
            const { data: acsAssigned } = await supabase
                .from('device_assignments')
                .select('id')
                .eq('acs_device_id', acs_device_id)
                .single();

            if (acsAssigned) {
                return NextResponse.json(
                    { error: 'This ACS device is already assigned to another customer' },
                    { status: 409 }
                );
            }
        }

        // Create assignment
        const { data: assignment, error } = await supabase
            .from('device_assignments')
            .insert({
                customer_id,
                onu_id: onu_id || null,
                acs_device_id: acs_device_id || null,
                profile_id: profile_id || null,
                status: 'pending',
                notes: notes || null,
            })
            .select(`
        *,
        onu:onus(id, serial_number),
        acs_device:acs_devices(id, serial_number)
      `)
            .single();

        if (error) throw error;

        return NextResponse.json({ data: assignment }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create assignment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
