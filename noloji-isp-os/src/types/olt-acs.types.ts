// OLT + ACS Database Types
// Auto-generated from 010_olt_acs_schema.sql

// ============================================
// ENUM TYPES
// ============================================

export type OltVendor = 'huawei' | 'zte' | 'fiberhome' | 'vsol' | 'other';
export type OltStatus = 'online' | 'offline' | 'error' | 'maintenance';
export type PortType = 'gpon' | 'epon' | 'xgpon' | 'xgspon';
export type PortStatus = 'up' | 'down' | 'unknown';
export type OnuStatus = 'online' | 'offline' | 'unauthorized' | 'deregistered';
export type AcsDeviceStatus = 'online' | 'offline' | 'pending' | 'error';
export type DeviceAssignmentStatus = 'pending' | 'provisioning' | 'active' | 'suspended' | 'failed';
export type AcsJobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AcsJobType =
    | 'get_parameter'
    | 'set_parameter'
    | 'reboot'
    | 'factory_reset'
    | 'firmware_upgrade'
    | 'wifi_config'
    | 'speed_limit'
    | 'custom';

// ============================================
// OLT TYPES
// ============================================

export interface Olt {
    id: string;
    workspace_id: string | null;
    name: string;
    vendor: OltVendor;
    model: string | null;
    serial_number: string | null;
    management_ip: string;
    snmp_port: number;
    snmp_version: string;
    snmp_community_encrypted: string | null;
    api_port: number | null;
    api_username_encrypted: string | null;
    api_password_encrypted: string | null;
    ssh_port: number;
    mgmt_vlan_id: number;
    access_vlan_start: number;
    access_vlan_end: number;
    status: OltStatus;
    firmware_version: string | null;
    uptime_seconds: number | null;
    last_polled_at: string | null;
    last_error: string | null;
    notes: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface OltInsert {
    workspace_id?: string | null;
    name: string;
    vendor?: OltVendor;
    model?: string | null;
    serial_number?: string | null;
    management_ip: string;
    snmp_port?: number;
    snmp_version?: string;
    snmp_community_encrypted?: string | null;
    api_port?: number | null;
    api_username_encrypted?: string | null;
    api_password_encrypted?: string | null;
    ssh_port?: number;
    mgmt_vlan_id?: number;
    access_vlan_start?: number;
    access_vlan_end?: number;
    notes?: string | null;
    metadata?: Record<string, any>;
}

export interface OltUpdate extends Partial<OltInsert> {
    status?: OltStatus;
    firmware_version?: string | null;
    uptime_seconds?: number | null;
    last_polled_at?: string | null;
    last_error?: string | null;
}

// ============================================
// OLT PORT TYPES
// ============================================

export interface OltPort {
    id: string;
    olt_id: string;
    port_number: string;
    port_name: string | null;
    port_type: PortType;
    status: PortStatus;
    onu_count: number;
    max_onus: number;
    description: string | null;
    metadata: Record<string, any>;
    last_updated_at: string;
    created_at: string;
}

export interface OltPortInsert {
    olt_id: string;
    port_number: string;
    port_name?: string | null;
    port_type?: PortType;
    status?: PortStatus;
    max_onus?: number;
    description?: string | null;
    metadata?: Record<string, any>;
}

// ============================================
// ONU TYPES
// ============================================

export interface Onu {
    id: string;
    olt_id: string;
    port_id: string | null;
    serial_number: string;
    mac_address: string | null;
    vendor: string | null;
    model: string | null;
    hardware_version: string | null;
    software_version: string | null;
    status: OnuStatus;
    rx_power: number | null;
    tx_power: number | null;
    distance: number | null;
    onu_index: number | null;
    description: string | null;
    last_seen_at: string | null;
    authorized_at: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface OnuInsert {
    olt_id: string;
    port_id?: string | null;
    serial_number: string;
    mac_address?: string | null;
    vendor?: string | null;
    model?: string | null;
    hardware_version?: string | null;
    software_version?: string | null;
    status?: OnuStatus;
    rx_power?: number | null;
    tx_power?: number | null;
    distance?: number | null;
    onu_index?: number | null;
    description?: string | null;
    metadata?: Record<string, any>;
}

export interface OnuUpdate extends Partial<OnuInsert> {
    last_seen_at?: string | null;
    authorized_at?: string | null;
}

// ============================================
// ACS DEVICE TYPES
// ============================================

export interface AcsDevice {
    id: string;
    workspace_id: string | null;
    serial_number: string;
    oui: string | null;
    product_class: string | null;
    manufacturer: string | null;
    model_name: string | null;
    hardware_version: string | null;
    software_version: string | null;
    provisioning_code: string | null;
    connection_request_url: string | null;
    connection_request_username: string | null;
    connection_request_password_encrypted: string | null;
    last_inform_at: string | null;
    last_inform_ip: string | null;
    inform_interval: number;
    status: AcsDeviceStatus;
    parameters: Record<string, any>;
    capabilities: Record<string, any>;
    tags: string[];
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface AcsDeviceInsert {
    workspace_id?: string | null;
    serial_number: string;
    oui?: string | null;
    product_class?: string | null;
    manufacturer?: string | null;
    model_name?: string | null;
    hardware_version?: string | null;
    software_version?: string | null;
    status?: AcsDeviceStatus;
    parameters?: Record<string, any>;
    capabilities?: Record<string, any>;
    tags?: string[];
    metadata?: Record<string, any>;
}

// ============================================
// PROVISIONING PROFILE TYPES
// ============================================

export interface ProvisioningProfile {
    id: string;
    workspace_id: string | null;
    name: string;
    description: string | null;
    internet_vlan: number | null;
    iptv_vlan: number | null;
    voip_vlan: number | null;
    speed_download_mbps: number | null;
    speed_upload_mbps: number | null;
    wifi_ssid_template: string | null;
    wifi_password_template: string | null;
    dns_primary: string | null;
    dns_secondary: string | null;
    ntp_server: string | null;
    tr069_inform_interval: number;
    settings: Record<string, any>;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProvisioningProfileInsert {
    workspace_id?: string | null;
    name: string;
    description?: string | null;
    internet_vlan?: number | null;
    iptv_vlan?: number | null;
    voip_vlan?: number | null;
    speed_download_mbps?: number | null;
    speed_upload_mbps?: number | null;
    wifi_ssid_template?: string | null;
    wifi_password_template?: string | null;
    dns_primary?: string | null;
    dns_secondary?: string | null;
    ntp_server?: string | null;
    tr069_inform_interval?: number;
    settings?: Record<string, any>;
    is_default?: boolean;
    is_active?: boolean;
}

// ============================================
// DEVICE ASSIGNMENT TYPES
// ============================================

export interface DeviceAssignment {
    id: string;
    customer_id: string;
    onu_id: string | null;
    acs_device_id: string | null;
    profile_id: string | null;
    status: DeviceAssignmentStatus;
    assigned_vlan: number | null;
    assigned_ip: string | null;
    last_provisioned_at: string | null;
    provision_attempts: number;
    last_error: string | null;
    notes: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    // Relations
    customer?: any;
    onu?: Onu;
    acs_device?: AcsDevice;
    profile?: ProvisioningProfile;
}

export interface DeviceAssignmentInsert {
    customer_id: string;
    onu_id?: string | null;
    acs_device_id?: string | null;
    profile_id?: string | null;
    status?: DeviceAssignmentStatus;
    assigned_vlan?: number | null;
    assigned_ip?: string | null;
    notes?: string | null;
    metadata?: Record<string, any>;
}

// ============================================
// ACS JOB TYPES
// ============================================

export interface AcsJob {
    id: string;
    device_id: string;
    assignment_id: string | null;
    job_type: AcsJobType;
    priority: number;
    parameters: Record<string, any>;
    status: AcsJobStatus;
    result: Record<string, any> | null;
    error_message: string | null;
    retry_count: number;
    max_retries: number;
    scheduled_at: string;
    started_at: string | null;
    completed_at: string | null;
    expires_at: string | null;
    created_by: string | null;
    metadata: Record<string, any>;
    created_at: string;
    // Relations
    device?: AcsDevice;
}

export interface AcsJobInsert {
    device_id: string;
    assignment_id?: string | null;
    job_type: AcsJobType;
    priority?: number;
    parameters?: Record<string, any>;
    scheduled_at?: string;
    expires_at?: string | null;
    created_by?: string | null;
    max_retries?: number;
    metadata?: Record<string, any>;
}

// ============================================
// ACS LOG TYPES
// ============================================

export interface AcsLog {
    id: string;
    device_id: string | null;
    job_id: string | null;
    event_type: string;
    event_data: Record<string, any>;
    source_ip: string | null;
    user_id: string | null;
    created_at: string;
}

export interface AcsLogInsert {
    device_id?: string | null;
    job_id?: string | null;
    event_type: string;
    event_data?: Record<string, any>;
    source_ip?: string | null;
    user_id?: string | null;
}

// ============================================
// EXTENDED TYPES WITH RELATIONS
// ============================================

export interface OltWithPorts extends Olt {
    ports?: OltPort[];
}

export interface OltWithOnus extends Olt {
    onus?: Onu[];
}

export interface OnuWithAssignment extends Onu {
    assignment?: DeviceAssignment | null;
    olt?: Olt;
}

export interface AcsDeviceWithAssignment extends AcsDevice {
    assignment?: DeviceAssignment | null;
}
