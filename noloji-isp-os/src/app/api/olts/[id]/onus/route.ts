// ONU API Routes
// GET /api/olts/[id]/onus

import { NextRequest, NextResponse } from 'next/server';
import { onuApi } from '@/lib/olt-api';

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/olts/[id]/onus - Get all ONUs for an OLT
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id: oltId } = await params;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let onus = await onuApi.getByOlt(oltId);

        // Filter by status if provided
        if (status) {
            onus = onus.filter(onu => onu.status === status);
        }

        return NextResponse.json({ data: onus });
    } catch (error: any) {
        console.error('Failed to fetch ONUs:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch ONUs' },
            { status: 500 }
        );
    }
}
