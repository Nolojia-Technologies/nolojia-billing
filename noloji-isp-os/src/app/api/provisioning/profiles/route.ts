// Provisioning Profiles API Routes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}

// GET /api/provisioning/profiles - List all profiles
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organization_id');

        const supabase = getServiceClient();

        let query = supabase
            .from('provisioning_profiles')
            .select('*')
            .eq('is_active', true);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;

        return NextResponse.json({ data: data || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/provisioning/profiles - Create new profile
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            organization_id,
            name,
            description,
            internet_vlan,
            speed_download_mbps,
            speed_upload_mbps,
            wifi_ssid_template,
            wifi_password_template,
            dns_primary,
            dns_secondary,
            is_default,
        } = body;

        if (!name) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        const supabase = getServiceClient();

        // If setting as default, unset other defaults
        if (is_default && organization_id) {
            await supabase
                .from('provisioning_profiles')
                .update({ is_default: false })
                .eq('organization_id', organization_id);
        }

        const { data, error } = await supabase
            .from('provisioning_profiles')
            .insert({
                organization_id,
                name,
                description,
                internet_vlan,
                speed_download_mbps,
                speed_upload_mbps,
                wifi_ssid_template,
                wifi_password_template,
                dns_primary,
                dns_secondary,
                is_default: is_default || false,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
