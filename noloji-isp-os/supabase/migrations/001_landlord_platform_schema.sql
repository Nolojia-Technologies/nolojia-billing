-- ============================================================================
-- NOLOJIA LANDLORD ISP PLATFORM - DATABASE SCHEMA
-- ============================================================================
-- This migration creates the multi-tenant landlord management system
-- Uses IF NOT EXISTS to handle existing tables gracefully
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS (Create only if not exists)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE organization_type AS ENUM ('nolojia', 'full_isp', 'landlord');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'nolojia_staff', 'full_isp', 'landlord_admin', 'landlord_staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payout_method AS ENUM ('mpesa', 'bank', 'cheque');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_type AS ENUM ('apartment', 'shop', 'office', 'house');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_status AS ENUM ('vacant', 'occupied', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_cycle AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE customer_status AS ENUM ('active', 'suspended', 'disconnected', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('mpesa', 'cash', 'bank', 'card');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE router_type AS ENUM ('mikrotik', 'ubiquiti', 'cisco', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE router_status AS ENUM ('online', 'offline', 'maintenance', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type organization_type NOT NULL,
    status organization_status NOT NULL DEFAULT 'pending',
    settings JSONB DEFAULT '{}',
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Nolojia as the parent organization (if not exists)
INSERT INTO organizations (id, name, type, status, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Nolojia',
    'nolojia',
    'active',
    '{"is_parent": true}'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- LANDLORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Kenya',

    -- Payout configuration
    payout_method payout_method DEFAULT 'mpesa',
    payout_details JSONB DEFAULT '{}',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 30.00,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_commission CHECK (commission_rate >= 0 AND commission_rate <= 100)
);

CREATE INDEX IF NOT EXISTS idx_landlords_organization ON landlords(organization_id);
CREATE INDEX IF NOT EXISTS idx_landlords_active ON landlords(is_active) WHERE is_active = true;

-- ============================================================================
-- LANDLORD BUILDINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    total_units INTEGER NOT NULL DEFAULT 0,

    status organization_status NOT NULL DEFAULT 'active',
    settings JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_landlord ON landlord_buildings(landlord_id);
CREATE INDEX IF NOT EXISTS idx_buildings_status ON landlord_buildings(status);

-- ============================================================================
-- UNITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES landlord_buildings(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    floor INTEGER,
    type unit_type NOT NULL DEFAULT 'apartment',
    status unit_status NOT NULL DEFAULT 'vacant',

    description TEXT,
    monthly_rent DECIMAL(10,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(building_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_units_building ON units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

-- ============================================================================
-- PACKAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    landlord_id UUID REFERENCES landlords(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,
    speed_mbps INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',

    router_profile VARCHAR(100),

    burst_limit_mbps INTEGER,
    burst_threshold_mbps INTEGER,
    burst_time_seconds INTEGER,

    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_organization ON landlord_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_packages_landlord ON landlord_packages(landlord_id);
CREATE INDEX IF NOT EXISTS idx_packages_active ON landlord_packages(is_active) WHERE is_active = true;

-- Insert default packages
INSERT INTO landlord_packages (name, description, speed_mbps, price, billing_cycle, router_profile, is_active)
SELECT 'Basic', 'Basic internet for light users', 5, 1000.00, 'monthly', 'basic_5mbps', true
WHERE NOT EXISTS (SELECT 1 FROM landlord_packages WHERE name = 'Basic' AND landlord_id IS NULL);

INSERT INTO landlord_packages (name, description, speed_mbps, price, billing_cycle, router_profile, is_active)
SELECT 'Standard', 'Standard internet for regular users', 10, 1500.00, 'monthly', 'standard_10mbps', true
WHERE NOT EXISTS (SELECT 1 FROM landlord_packages WHERE name = 'Standard' AND landlord_id IS NULL);

INSERT INTO landlord_packages (name, description, speed_mbps, price, billing_cycle, router_profile, is_active)
SELECT 'Premium', 'Premium internet for heavy users', 20, 2500.00, 'monthly', 'premium_20mbps', true
WHERE NOT EXISTS (SELECT 1 FROM landlord_packages WHERE name = 'Premium' AND landlord_id IS NULL);

INSERT INTO landlord_packages (name, description, speed_mbps, price, billing_cycle, router_profile, is_active)
SELECT 'Business', 'Business-grade internet', 50, 5000.00, 'monthly', 'business_50mbps', true
WHERE NOT EXISTS (SELECT 1 FROM landlord_packages WHERE name = 'Business' AND landlord_id IS NULL);

-- ============================================================================
-- LANDLORD CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,

    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    national_id VARCHAR(50),

    pppoe_username VARCHAR(100) UNIQUE,
    pppoe_password_hash TEXT,

    status customer_status NOT NULL DEFAULT 'pending',
    status_reason TEXT,

    mac_address VARCHAR(17),
    ip_address INET,
    last_online TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_landlord ON landlord_customers(landlord_id);
CREATE INDEX IF NOT EXISTS idx_customers_unit ON landlord_customers(unit_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON landlord_customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_pppoe ON landlord_customers(pppoe_username);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES landlord_customers(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES landlord_packages(id) ON DELETE RESTRICT,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    status subscription_status NOT NULL DEFAULT 'pending',
    auto_renew BOOLEAN NOT NULL DEFAULT true,

    price_at_subscription DECIMAL(10,2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_package ON subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES landlord_customers(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,

    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    transaction_ref VARCHAR(100),

    mpesa_receipt VARCHAR(50),
    mpesa_phone VARCHAR(20),

    status payment_status NOT NULL DEFAULT 'pending',
    status_reason TEXT,

    paid_at TIMESTAMPTZ,

    landlord_share DECIMAL(10,2),
    nolojia_share DECIMAL(10,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_subscription ON landlord_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON landlord_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_landlord ON landlord_payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON landlord_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON landlord_payments(paid_at);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES landlord_customers(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'unpaid',

    paid_at TIMESTAMPTZ,
    payment_id UUID REFERENCES landlord_payments(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON landlord_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_landlord ON landlord_invoices(landlord_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON landlord_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON landlord_invoices(due_date);

-- ============================================================================
-- LANDLORD ROUTERS TABLE (separate from main routers table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_routers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,

    ip_address TEXT NOT NULL,
    api_port INTEGER NOT NULL DEFAULT 8728,
    api_ssl_port INTEGER DEFAULT 8729,
    username TEXT NOT NULL,
    password TEXT NOT NULL,

    router_type router_type NOT NULL DEFAULT 'mikrotik',
    model VARCHAR(100),
    serial_number VARCHAR(100),

    status router_status NOT NULL DEFAULT 'unknown',
    last_seen TIMESTAMPTZ,
    last_error TEXT,

    location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landlord_routers_status ON landlord_routers(status);

-- ============================================================================
-- ROUTER ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_router_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    router_id UUID NOT NULL REFERENCES landlord_routers(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES landlord_buildings(id) ON DELETE CASCADE,

    assigned_by UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(router_id, building_id)
);

CREATE INDEX IF NOT EXISTS idx_router_assignments_router ON landlord_router_assignments(router_id);
CREATE INDEX IF NOT EXISTS idx_router_assignments_building ON landlord_router_assignments(building_id);
CREATE INDEX IF NOT EXISTS idx_router_assignments_active ON landlord_router_assignments(is_active) WHERE is_active = true;

-- ============================================================================
-- LANDLORD USERS TABLE (extends Supabase auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    landlord_id UUID REFERENCES landlords(id) ON DELETE SET NULL,

    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,

    role user_role NOT NULL DEFAULT 'landlord_staff',

    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landlord_users_organization ON landlord_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_landlord_users_landlord ON landlord_users(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_users_role ON landlord_users(role);
CREATE INDEX IF NOT EXISTS idx_landlord_users_active ON landlord_users(is_active) WHERE is_active = true;

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES landlord_users(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,

    old_values JSONB,
    new_values JSONB,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON landlord_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON landlord_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON landlord_audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON landlord_audit_logs(created_at);

-- ============================================================================
-- LANDLORD PAYOUTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,

    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    total_revenue DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    payout_amount DECIMAL(12,2) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    payout_method payout_method,
    payout_reference VARCHAR(100),

    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES landlord_users(id),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_landlord ON landlord_payouts(landlord_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON landlord_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON landlord_payouts(period_start, period_end);

-- ============================================================================
-- ENFORCEMENT QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_enforcement_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES landlord_customers(id) ON DELETE CASCADE,
    router_id UUID NOT NULL REFERENCES landlord_routers(id) ON DELETE CASCADE,

    action VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',

    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,

    error_message TEXT,
    executed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enforcement_queue_status ON landlord_enforcement_queue(status);
CREATE INDEX IF NOT EXISTS idx_enforcement_queue_customer ON landlord_enforcement_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_queue_created ON landlord_enforcement_queue(created_at);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlords_updated_at ON landlords;
CREATE TRIGGER update_landlords_updated_at BEFORE UPDATE ON landlords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_buildings_updated_at ON landlord_buildings;
CREATE TRIGGER update_landlord_buildings_updated_at BEFORE UPDATE ON landlord_buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_units_updated_at ON units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_packages_updated_at ON landlord_packages;
CREATE TRIGGER update_landlord_packages_updated_at BEFORE UPDATE ON landlord_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_customers_updated_at ON landlord_customers;
CREATE TRIGGER update_landlord_customers_updated_at BEFORE UPDATE ON landlord_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_payments_updated_at ON landlord_payments;
CREATE TRIGGER update_landlord_payments_updated_at BEFORE UPDATE ON landlord_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_invoices_updated_at ON landlord_invoices;
CREATE TRIGGER update_landlord_invoices_updated_at BEFORE UPDATE ON landlord_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_routers_updated_at ON landlord_routers;
CREATE TRIGGER update_landlord_routers_updated_at BEFORE UPDATE ON landlord_routers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_router_assignments_updated_at ON landlord_router_assignments;
CREATE TRIGGER update_landlord_router_assignments_updated_at BEFORE UPDATE ON landlord_router_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_users_updated_at ON landlord_users;
CREATE TRIGGER update_landlord_users_updated_at BEFORE UPDATE ON landlord_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_payouts_updated_at ON landlord_payouts;
CREATE TRIGGER update_landlord_payouts_updated_at BEFORE UPDATE ON landlord_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landlord_enforcement_queue_updated_at ON landlord_enforcement_queue;
CREATE TRIGGER update_landlord_enforcement_queue_updated_at BEFORE UPDATE ON landlord_enforcement_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's landlord_id
CREATE OR REPLACE FUNCTION get_landlord_user_landlord_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT landlord_id FROM landlord_users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is Nolojia admin
CREATE OR REPLACE FUNCTION is_landlord_nolojia_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM landlord_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'nolojia_staff')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is landlord
CREATE OR REPLACE FUNCTION is_landlord_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM landlord_users
        WHERE id = auth.uid()
        AND role IN ('landlord_admin', 'landlord_staff')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS FOR LANDLORD DASHBOARD
-- ============================================================================

CREATE OR REPLACE VIEW landlord_dashboard_summary AS
SELECT
    l.id AS landlord_id,
    l.contact_name,
    COUNT(DISTINCT lb.id) AS total_buildings,
    COUNT(DISTINCT u.id) AS total_units,
    COUNT(DISTINCT lc.id) AS total_customers,
    COUNT(DISTINCT CASE WHEN lc.status = 'active' THEN lc.id END) AS active_customers,
    COUNT(DISTINCT CASE WHEN lc.status = 'suspended' THEN lc.id END) AS suspended_customers,
    COALESCE(SUM(CASE WHEN lp.status = 'completed' AND lp.paid_at >= DATE_TRUNC('month', NOW()) THEN lp.amount END), 0) AS revenue_this_month,
    COALESCE(SUM(CASE WHEN lp.status = 'completed' AND lp.paid_at >= DATE_TRUNC('month', NOW()) THEN lp.landlord_share END), 0) AS earnings_this_month
FROM landlords l
LEFT JOIN landlord_buildings lb ON l.id = lb.landlord_id
LEFT JOIN units u ON lb.id = u.building_id
LEFT JOIN landlord_customers lc ON l.id = lc.landlord_id
LEFT JOIN landlord_payments lp ON l.id = lp.landlord_id
GROUP BY l.id, l.contact_name;

CREATE OR REPLACE VIEW building_occupancy AS
SELECT
    lb.id AS building_id,
    lb.landlord_id,
    lb.name AS building_name,
    COUNT(u.id) AS total_units,
    COUNT(CASE WHEN u.status = 'occupied' THEN 1 END) AS occupied_units,
    COUNT(CASE WHEN u.status = 'vacant' THEN 1 END) AS vacant_units,
    COUNT(DISTINCT lc.id) FILTER (WHERE lc.status = 'active') AS active_connections
FROM landlord_buildings lb
LEFT JOIN units u ON lb.id = u.building_id
LEFT JOIN landlord_customers lc ON u.id = lc.unit_id
GROUP BY lb.id, lb.landlord_id, lb.name;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organizations IS 'Parent organizations - Nolojia, Full ISPs, and Landlords';
COMMENT ON TABLE landlords IS 'Landlord accounts with payout configuration';
COMMENT ON TABLE landlord_buildings IS 'Buildings managed by landlords';
COMMENT ON TABLE units IS 'Individual units/apartments within buildings';
COMMENT ON TABLE landlord_packages IS 'Internet packages available for subscription';
COMMENT ON TABLE landlord_customers IS 'Tenants subscribed to internet services';
COMMENT ON TABLE subscriptions IS 'Customer subscription records';
COMMENT ON TABLE landlord_payments IS 'Payment transactions';
COMMENT ON TABLE landlord_routers IS 'MikroTik routers (Nolojia-managed only)';
COMMENT ON TABLE landlord_router_assignments IS 'Router to building assignments';
COMMENT ON TABLE landlord_enforcement_queue IS 'Queue for router enforcement commands';
