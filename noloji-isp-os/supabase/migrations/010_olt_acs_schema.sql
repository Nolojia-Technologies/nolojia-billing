-- OLT + ACS Integration Schema
-- Migration: 010_olt_acs_schema.sql

-- ============================================
-- ENUM TYPES
-- ============================================

DO $$ BEGIN
    CREATE TYPE olt_vendor AS ENUM ('huawei', 'zte', 'fiberhome', 'vsol', 'hioso', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE olt_status AS ENUM ('online', 'offline', 'error', 'maintenance');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE port_type AS ENUM ('gpon', 'epon', 'xgpon', 'xgspon');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE port_status AS ENUM ('up', 'down', 'unknown');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE onu_status AS ENUM ('online', 'offline', 'unauthorized', 'deregistered');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE acs_device_status AS ENUM ('online', 'offline', 'pending', 'error');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_assignment_status AS ENUM ('pending', 'provisioning', 'active', 'suspended', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE acs_job_status AS ENUM ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE acs_job_type AS ENUM (
        'get_parameter', 'set_parameter', 'reboot', 'factory_reset',
        'firmware_upgrade', 'wifi_config', 'speed_limit', 'custom'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- OLT TABLES
-- ============================================

-- OLT Device Registration
CREATE TABLE IF NOT EXISTS olts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    vendor olt_vendor NOT NULL DEFAULT 'huawei',
    model VARCHAR(100),
    serial_number VARCHAR(100),
    management_ip INET NOT NULL,
    snmp_port INTEGER DEFAULT 161,
    snmp_version VARCHAR(10) DEFAULT 'v2c',
    snmp_community_encrypted TEXT, -- Encrypted SNMP community string
    api_port INTEGER,
    api_username_encrypted TEXT,
    api_password_encrypted TEXT,
    ssh_port INTEGER DEFAULT 22,
    mgmt_vlan_id INTEGER DEFAULT 100,
    access_vlan_start INTEGER DEFAULT 200,
    access_vlan_end INTEGER DEFAULT 4000,
    status olt_status DEFAULT 'offline',
    firmware_version VARCHAR(100),
    uptime_seconds BIGINT,
    last_polled_at TIMESTAMPTZ,
    last_error TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, management_ip)
);

-- OLT PON Ports
CREATE TABLE IF NOT EXISTS olt_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    olt_id UUID NOT NULL REFERENCES olts(id) ON DELETE CASCADE,
    port_number VARCHAR(20) NOT NULL, -- e.g., "0/0/1" or "1/1/1"
    port_name VARCHAR(100),
    port_type port_type DEFAULT 'gpon',
    status port_status DEFAULT 'unknown',
    onu_count INTEGER DEFAULT 0,
    max_onus INTEGER DEFAULT 128,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(olt_id, port_number)
);

-- ONU Devices (Discovered from OLT)
CREATE TABLE IF NOT EXISTS onus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    olt_id UUID NOT NULL REFERENCES olts(id) ON DELETE CASCADE,
    port_id UUID REFERENCES olt_ports(id) ON DELETE SET NULL,
    serial_number VARCHAR(50) NOT NULL,
    mac_address MACADDR,
    vendor VARCHAR(100),
    model VARCHAR(100),
    hardware_version VARCHAR(50),
    software_version VARCHAR(50),
    status onu_status DEFAULT 'unauthorized',
    rx_power DECIMAL(6,2), -- dBm
    tx_power DECIMAL(6,2), -- dBm
    distance INTEGER, -- meters
    onu_index INTEGER, -- ONU index on port
    description TEXT,
    last_seen_at TIMESTAMPTZ,
    authorized_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(olt_id, serial_number)
);

-- ============================================
-- ACS (TR-069) TABLES
-- ============================================

-- ACS Registered CPE Devices
CREATE TABLE IF NOT EXISTS acs_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    oui VARCHAR(10), -- Manufacturer OUI
    product_class VARCHAR(100), -- Device product class
    manufacturer VARCHAR(100),
    model_name VARCHAR(100),
    hardware_version VARCHAR(50),
    software_version VARCHAR(100),
    provisioning_code VARCHAR(100),
    connection_request_url TEXT,
    connection_request_username TEXT,
    connection_request_password_encrypted TEXT,
    last_inform_at TIMESTAMPTZ,
    last_inform_ip INET,
    inform_interval INTEGER DEFAULT 300, -- seconds
    status acs_device_status DEFAULT 'pending',
    parameters JSONB DEFAULT '{}', -- Cached device parameters
    capabilities JSONB DEFAULT '{}', -- Device capabilities
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(serial_number)
);

-- ============================================
-- PROVISIONING TABLES
-- ============================================

-- Provisioning Profiles / Templates
CREATE TABLE IF NOT EXISTS provisioning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    internet_vlan INTEGER,
    iptv_vlan INTEGER,
    voip_vlan INTEGER,
    speed_download_mbps INTEGER,
    speed_upload_mbps INTEGER,
    wifi_ssid_template VARCHAR(100), -- e.g., "{{customer_name}}_WiFi"
    wifi_password_template VARCHAR(100),
    dns_primary INET,
    dns_secondary INET,
    ntp_server VARCHAR(255),
    tr069_inform_interval INTEGER DEFAULT 300,
    settings JSONB DEFAULT '{}', -- Additional vendor-specific settings
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Device Assignments (ONU/CPE <-> Customer linking)
CREATE TABLE IF NOT EXISTS device_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    onu_id UUID REFERENCES onus(id) ON DELETE SET NULL,
    acs_device_id UUID REFERENCES acs_devices(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES provisioning_profiles(id) ON DELETE SET NULL,
    status device_assignment_status DEFAULT 'pending',
    assigned_vlan INTEGER,
    assigned_ip INET,
    last_provisioned_at TIMESTAMPTZ,
    provision_attempts INTEGER DEFAULT 0,
    last_error TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACS Job Queue
CREATE TABLE IF NOT EXISTS acs_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES acs_devices(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES device_assignments(id) ON DELETE SET NULL,
    job_type acs_job_type NOT NULL,
    priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    parameters JSONB DEFAULT '{}',
    status acs_job_status DEFAULT 'pending',
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACS Audit Logs
CREATE TABLE IF NOT EXISTS acs_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES acs_devices(id) ON DELETE SET NULL,
    job_id UUID REFERENCES acs_jobs(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    source_ip INET,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_olts_org ON olts(organization_id);
CREATE INDEX IF NOT EXISTS idx_olts_status ON olts(status);
CREATE INDEX IF NOT EXISTS idx_olt_ports_olt ON olt_ports(olt_id);
CREATE INDEX IF NOT EXISTS idx_onus_olt ON onus(olt_id);
CREATE INDEX IF NOT EXISTS idx_onus_serial ON onus(serial_number);
CREATE INDEX IF NOT EXISTS idx_onus_status ON onus(status);
CREATE INDEX IF NOT EXISTS idx_acs_devices_org ON acs_devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_acs_devices_serial ON acs_devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_acs_devices_status ON acs_devices(status);
CREATE INDEX IF NOT EXISTS idx_provisioning_profiles_org ON provisioning_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_customer ON device_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_onu ON device_assignments(onu_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_acs_device ON device_assignments(acs_device_id);
CREATE INDEX IF NOT EXISTS idx_acs_jobs_device ON acs_jobs(device_id);
CREATE INDEX IF NOT EXISTS idx_acs_jobs_status ON acs_jobs(status);
CREATE INDEX IF NOT EXISTS idx_acs_jobs_scheduled ON acs_jobs(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_acs_logs_device ON acs_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_acs_logs_created ON acs_logs(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_olts_updated_at ON olts;
CREATE TRIGGER update_olts_updated_at
    BEFORE UPDATE ON olts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onus_updated_at ON onus;
CREATE TRIGGER update_onus_updated_at
    BEFORE UPDATE ON onus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_acs_devices_updated_at ON acs_devices;
CREATE TRIGGER update_acs_devices_updated_at
    BEFORE UPDATE ON acs_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_provisioning_profiles_updated_at ON provisioning_profiles;
CREATE TRIGGER update_provisioning_profiles_updated_at
    BEFORE UPDATE ON provisioning_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_device_assignments_updated_at ON device_assignments;
CREATE TRIGGER update_device_assignments_updated_at
    BEFORE UPDATE ON device_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE olts ENABLE ROW LEVEL SECURITY;
ALTER TABLE olt_ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE onus ENABLE ROW LEVEL SECURITY;
ALTER TABLE acs_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisioning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE acs_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE acs_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for backend services)
CREATE POLICY service_all_olts ON olts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_olt_ports ON olt_ports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_onus ON onus FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_acs_devices ON acs_devices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_provisioning_profiles ON provisioning_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_device_assignments ON device_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_acs_jobs ON acs_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_acs_logs ON acs_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get organization ID from customer (via router assignment)
-- Note: This is a placeholder - actual implementation depends on your data model

-- Function to auto-link ONU to ACS device by serial
CREATE OR REPLACE FUNCTION link_onu_to_acs_device()
RETURNS TRIGGER AS $$
BEGIN
    -- When an ACS device is registered, try to find matching ONU
    UPDATE onus SET
        status = 'online'
    WHERE serial_number = NEW.serial_number
    AND status = 'unauthorized';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS acs_device_link_onu ON acs_devices;
CREATE TRIGGER acs_device_link_onu
    AFTER INSERT ON acs_devices
    FOR EACH ROW EXECUTE FUNCTION link_onu_to_acs_device();

-- Function to update ONU count on port
CREATE OR REPLACE FUNCTION update_port_onu_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.port_id IS NOT NULL THEN
            UPDATE olt_ports SET
                onu_count = (SELECT COUNT(*) FROM onus WHERE port_id = NEW.port_id),
                last_updated_at = NOW()
            WHERE id = NEW.port_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.port_id IS NOT NULL THEN
            UPDATE olt_ports SET
                onu_count = (SELECT COUNT(*) FROM onus WHERE port_id = OLD.port_id),
                last_updated_at = NOW()
            WHERE id = OLD.port_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_onu_count ON onus;
CREATE TRIGGER update_onu_count
    AFTER INSERT OR UPDATE OR DELETE ON onus
    FOR EACH ROW EXECUTE FUNCTION update_port_onu_count();

-- Done
SELECT 'OLT + ACS schema migration completed!' as status;
