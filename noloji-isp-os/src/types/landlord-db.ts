export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface LandlordDB {
    id: string
    organization_id: string
    contact_name: string
    contact_email: string
    contact_phone: string | null
    address: string | null
    city: string | null
    country: string | null
    payout_method: 'mpesa' | 'bank' | 'cheque'
    payout_details: Json
    commission_rate: number
    is_active: boolean
    verified_at: string | null
    created_at: string
    updated_at: string
}

export interface LandlordBuildingDB {
    id: string
    landlord_id: string
    name: string
    address: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
    total_units: number
    status: 'active' | 'suspended' | 'pending'
    settings: Json
    created_at: string
    updated_at: string
}

export interface LandlordRouterDB {
    id: string
    name: string
    ip_address: string
    api_port: number
    api_ssl_port: number | null
    username: string
    password: string // Usually shouldn't expose this in types freely, but needed for management
    router_type: 'mikrotik' | 'ubiquiti' | 'cisco' | 'other'
    model: string | null
    serial_number: string | null
    status: 'online' | 'offline' | 'maintenance' | 'unknown'
    last_seen: string | null
    last_error: string | null
    location: string | null
    latitude: number | null
    longitude: number | null
    created_at: string
    updated_at: string
}

export interface LandlordRouterAssignmentDB {
    id: string
    router_id: string
    building_id: string
    assigned_by: string | null
    assigned_at: string
    is_active: boolean
    notes: string | null
    created_at: string
    updated_at: string
}

export interface LandlordPayoutDB {
    id: string;
    landlord_id: string;
    period_start: string;
    period_end: string;
    total_revenue: number;
    commission_amount: number;
    payout_amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    payout_method: string | null;
    payout_reference: string | null;
    processed_at: string | null;
    processed_by: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface LandlordPaymentDB {
    id: string;
    subscription_id: string | null;
    customer_id: string;
    landlord_id: string;
    amount: number;
    payment_method: 'mpesa' | 'cash' | 'bank' | 'card';
    transaction_ref: string | null;
    mpesa_receipt: string | null;
    mpesa_phone: string | null;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    status_reason: string | null;
    paid_at: string | null;
    landlord_share: number | null;
    nolojia_share: number | null;
    created_at: string;
    updated_at: string;
}
