// OLT Management API Routes
// POST/GET/PUT/DELETE /api/olts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { oltApi } from '@/lib/olt-api';

// Get Supabase admin client
function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}

// GET /api/olts - List all OLTs
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get('workspace_id');

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'workspace_id is required' },
                { status: 400 }
            );
        }

        const olts = await oltApi.getAll(workspaceId);

        return NextResponse.json({ data: olts });
    } catch (error: any) {
        console.error('Failed to fetch OLTs:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch OLTs' },
            { status: 500 }
        );
    }
}

// POST /api/olts - Create new OLT
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            workspace_id,
            name,
            vendor,
            model,
            management_ip,
            snmp_port,
            snmp_community,
            api_port,
            api_username,
            api_password,
            ssh_port,
            mgmt_vlan_id,
            access_vlan_start,
            access_vlan_end,
            notes,
        } = body;

        if (!workspace_id || !name || !management_ip) {
            return NextResponse.json(
                { error: 'workspace_id, name, and management_ip are required' },
                { status: 400 }
            );
        }

        const olt = await oltApi.create({
            workspace_id,
            name,
            vendor: vendor || 'huawei',
            model,
            management_ip,
            snmp_port: snmp_port || 161,
            snmp_community, // Will be encrypted
            api_port,
            api_username, // Will be encrypted
            api_password, // Will be encrypted
            ssh_port: ssh_port || 22,
            mgmt_vlan_id: mgmt_vlan_id || 100,
            access_vlan_start: access_vlan_start || 200,
            access_vlan_end: access_vlan_end || 4000,
            notes,
        });

        return NextResponse.json({ data: olt }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create OLT:', error);

        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'An OLT with this IP already exists in this workspace' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to create OLT' },
            { status: 500 }
        );
    }
}
