// Database types for Nolojia Billing
// Matches Supabase schema

export interface Admin {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    role: 'admin' | 'ops_manager' | 'technician' | 'billing_agent' | 'viewer';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Router {
    id: number;
    name: string;
    host: string;
    api_port: number;
    api_username: string;
    api_password: string;
    nas_identifier?: string;
    radius_secret: string;
    location?: string;
    is_active: boolean;
    last_seen?: string;
    created_at: string;
    updated_at: string;
}

export interface Plan {
    id: number;
    name: string;
    description?: string;
    upload_speed?: number;
    download_speed?: number;
    session_timeout?: number;
    idle_timeout?: number;
    validity_days?: number;
    data_limit_mb?: number;
    price?: number;
    currency: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Customer {
    id: number;
    username: string;
    password: string;
    email?: string;
    phone?: string;
    full_name?: string;
    address?: string;
    id_number?: string;
    plan_id?: number;
    router_id?: number;
    connection_type: 'pppoe' | 'hotspot' | 'static';
    is_active: boolean;
    is_online: boolean;
    valid_from: string;
    valid_until?: string;
    total_data_used_mb: number;
    total_session_time: number;
    mac_address?: string;
    notes?: string;
    mikrotik_profile?: string;
    created_at: string;
    updated_at: string;
    last_login?: string;
    // Joined data
    plans?: Plan;
    routers?: Router;
}

export interface Voucher {
    id: number;
    code: string;
    pin?: string;
    plan_id?: number;
    batch_id?: string;
    status: 'active' | 'used' | 'expired' | 'disabled';
    used_by?: number;
    used_at?: string;
    valid_from: string;
    valid_until?: string;
    created_by?: string;
    notes?: string;
    created_at: string;
    // Joined data
    plans?: Plan;
}

export interface Session {
    id: number;
    session_id: string;
    customer_id?: number;
    username: string;
    router_id?: number;
    nas_ip_address?: string;
    nas_identifier?: string;
    nas_port_id?: string;
    framed_ip_address?: string;
    mac_address?: string;
    start_time: string;
    stop_time?: string;
    session_duration: number;
    last_update: string;
    input_octets: number;
    output_octets: number;
    input_packets: number;
    output_packets: number;
    input_gigawords: number;
    output_gigawords: number;
    input_rate?: number;
    output_rate?: number;
    status: 'active' | 'stopped' | 'timeout' | 'error';
    terminate_cause?: string;
    created_at: string;
    updated_at: string;
    // Joined data
    customers?: Customer;
    routers?: Router;
}

// ============================================
// SMS Types
// ============================================

export interface SmsCredit {
    id: number;
    balance: number;
    cost_per_sms: number;
    currency: string;
    created_at: string;
    updated_at: string;
}

export interface SmsLog {
    id: number;
    recipient: string;
    message: string;
    sender_id?: string;
    customer_id?: number;
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    provider_message_id?: string;
    provider_response?: Record<string, any>;
    cost?: number;
    created_at: string;
    sent_at?: string;
    // Joined data
    customers?: Customer;
}

export interface SmsTemplate {
    id: number;
    name: string;
    category: 'billing' | 'notification' | 'marketing' | 'support' | 'custom';
    content: string;
    variables?: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// API Response types
export interface SmsStats {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    total_credits_used?: number;
}

export interface SendSmsRequest {
    recipient: string;
    message: string;
    sender_id?: string;
    customer_id?: number;
}

export interface SendBulkSmsRequest {
    recipients: string[];
    message: string;
    sender_id?: string;
}

export interface AddCreditsRequest {
    amount: number;
    cost_per_sms?: number;
}

export interface UpdatePricingRequest {
    cost_per_sms: number;
    currency?: string;
}

export interface CreateTemplateRequest {
    name: string;
    category: SmsTemplate['category'];
    content: string;
    variables?: string[];
}
