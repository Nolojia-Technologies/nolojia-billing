// Individual OLT API Routes
// GET/PUT/DELETE /api/olts/[id]

import { NextRequest, NextResponse } from 'next/server';
import { oltApi, oltPortApi, onuApi } from '@/lib/olt-api';

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/olts/[id] - Get single OLT with details
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const includePorts = searchParams.get('include_ports') === 'true';
        const includeOnus = searchParams.get('include_onus') === 'true';

        let olt;

        if (includePorts) {
            olt = await oltApi.getWithPorts(id);
        } else {
            olt = await oltApi.getById(id);
        }

        if (!olt) {
            return NextResponse.json(
                { error: 'OLT not found' },
                { status: 404 }
            );
        }

        // Optionally include ONUs
        if (includeOnus) {
            const onus = await onuApi.getByOlt(id);
            (olt as any).onus = onus;
        }

        return NextResponse.json({ data: olt });
    } catch (error: any) {
        console.error('Failed to fetch OLT:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch OLT' },
            { status: 500 }
        );
    }
}

// PUT /api/olts/[id] - Update OLT
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const body = await request.json();

        const olt = await oltApi.update(id, body);

        return NextResponse.json({ data: olt });
    } catch (error: any) {
        console.error('Failed to update OLT:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update OLT' },
            { status: 500 }
        );
    }
}

// DELETE /api/olts/[id] - Delete OLT
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;

        await oltApi.delete(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete OLT:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete OLT' },
            { status: 500 }
        );
    }
}
