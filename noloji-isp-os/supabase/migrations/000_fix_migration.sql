-- ============================================================================
-- FIX MIGRATION - Handles existing tables and missing dependencies
-- ============================================================================
-- This migration safely handles:
-- 1. Tables that already exist (routers, etc.)
-- 2. Missing dependencies (organizations table)
-- Run this BEFORE the landlord platform schema if you have existing tables
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 1: Create ENUMS (using the safe DO block pattern)
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
-- STEP 2: Create ORGANIZATIONS table (needed by landlords and other tables)
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
-- STEP 3: Ensure 'routers' table has required columns for MikroTik integration
-- (The table already exists from the original schema)
-- ============================================================================

-- Add new columns to existing routers table if they don't exist
DO $$
BEGIN
    -- Add role column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'role') THEN
        ALTER TABLE routers ADD COLUMN role TEXT DEFAULT 'hotspot' 
            CHECK (role IN ('hotspot', 'pppoe', 'edge'));
    END IF;
    
    -- Add status column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'status') THEN
        ALTER TABLE routers ADD COLUMN status TEXT DEFAULT 'offline' 
            CHECK (status IN ('online', 'offline', 'degraded'));
    END IF;
    
    -- Add cpu_usage column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'cpu_usage') THEN
        ALTER TABLE routers ADD COLUMN cpu_usage INTEGER;
    END IF;
    
    -- Add memory_usage column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'memory_usage') THEN
        ALTER TABLE routers ADD COLUMN memory_usage INTEGER;
    END IF;
    
    -- Add uptime column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'uptime') THEN
        ALTER TABLE routers ADD COLUMN uptime TEXT;
    END IF;
    
    -- Add use_ssl column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'use_ssl') THEN
        ALTER TABLE routers ADD COLUMN use_ssl BOOLEAN DEFAULT false;
    END IF;
    
    -- Add last_health_check column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'routers' AND column_name = 'last_health_check') THEN
        ALTER TABLE routers ADD COLUMN last_health_check TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Create helper functions (needed by RLS policies)
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to organizations if not exists
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: Create MikroTik-related tables (if not exists)
-- ============================================================================

-- Router commands log
CREATE TABLE IF NOT EXISTS router_commands_log (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    result JSONB,
    success BOOLEAN DEFAULT false,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_router_commands_router_id ON router_commands_log(router_id);
CREATE INDEX IF NOT EXISTS idx_router_commands_created_at ON router_commands_log(created_at);

-- Router jobs queue
CREATE TABLE IF NOT EXISTS router_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('provision', 'suspend', 'activate', 'speed_change', 'disconnect', 'health_check')),
    payload JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_router_jobs_status ON router_jobs(status);
CREATE INDEX IF NOT EXISTS idx_router_jobs_router_id ON router_jobs(router_id);

-- PPPoE profiles
CREATE TABLE IF NOT EXISTS pppoe_profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    rate_limit TEXT,
    local_address TEXT,
    remote_address TEXT,
    only_one BOOLEAN DEFAULT true,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotspot profiles
CREATE TABLE IF NOT EXISTS hotspot_profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    rate_limit TEXT,
    session_timeout TEXT,
    idle_timeout TEXT,
    shared_users INTEGER DEFAULT 1,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 6: Create GIS tables (if not exists)
-- ============================================================================

-- Fiber cables for GIS mapping
CREATE TABLE IF NOT EXISTS fiber_cables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    coordinates JSONB NOT NULL,
    cable_type VARCHAR(50) DEFAULT 'fiber',
    length_meters DECIMAL(10, 2),
    fiber_count INTEGER DEFAULT 12,
    status VARCHAR(20) DEFAULT 'active',
    color VARCHAR(20) DEFAULT '#3b82f6',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiber_cables_status ON fiber_cables(status);

-- GIS labels/points of interest
CREATE TABLE IF NOT EXISTS gis_labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    label_type VARCHAR(50) DEFAULT 'poi',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    icon VARCHAR(50) DEFAULT 'marker',
    color VARCHAR(20) DEFAULT '#8b5cf6',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gis_labels_type ON gis_labels(label_type);

-- Network points
CREATE TABLE IF NOT EXISTS network_points (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    point_type VARCHAR(50) DEFAULT 'fat',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    capacity INTEGER DEFAULT 8,
    used_ports INTEGER DEFAULT 0,
    available_signals JSONB DEFAULT '[]',
    customer_ids JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    color VARCHAR(20) DEFAULT '#f97316',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_points_type ON network_points(point_type);
CREATE INDEX IF NOT EXISTS idx_network_points_status ON network_points(status);
CREATE INDEX IF NOT EXISTS idx_network_points_location ON network_points(latitude, longitude);

-- ============================================================================
-- STEP 7: Enable RLS on new tables
-- ============================================================================

ALTER TABLE router_commands_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE router_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pppoe_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiber_cables ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Create RLS policies (drop first if exists)
-- ============================================================================

-- Router commands log
DROP POLICY IF EXISTS "router_commands_log_policy" ON router_commands_log;
CREATE POLICY "router_commands_log_policy" ON router_commands_log 
    FOR ALL USING (true) WITH CHECK (true);

-- Router jobs
DROP POLICY IF EXISTS "router_jobs_policy" ON router_jobs;
CREATE POLICY "router_jobs_policy" ON router_jobs 
    FOR ALL USING (true) WITH CHECK (true);

-- PPPoE profiles
DROP POLICY IF EXISTS "pppoe_profiles_policy" ON pppoe_profiles;
CREATE POLICY "pppoe_profiles_policy" ON pppoe_profiles 
    FOR ALL USING (true) WITH CHECK (true);

-- Hotspot profiles
DROP POLICY IF EXISTS "hotspot_profiles_policy" ON hotspot_profiles;
CREATE POLICY "hotspot_profiles_policy" ON hotspot_profiles 
    FOR ALL USING (true) WITH CHECK (true);

-- Fiber cables
DROP POLICY IF EXISTS "Enable all for fiber_cables" ON fiber_cables;
CREATE POLICY "Enable all for fiber_cables" ON fiber_cables 
    FOR ALL USING (true) WITH CHECK (true);

-- GIS labels
DROP POLICY IF EXISTS "Enable all for gis_labels" ON gis_labels;
CREATE POLICY "Enable all for gis_labels" ON gis_labels 
    FOR ALL USING (true) WITH CHECK (true);

-- Network points
DROP POLICY IF EXISTS "Enable all for network_points" ON network_points;
CREATE POLICY "Enable all for network_points" ON network_points 
    FOR ALL USING (true) WITH CHECK (true);

-- Organizations
DROP POLICY IF EXISTS "organizations_policy" ON organizations;
CREATE POLICY "organizations_policy" ON organizations 
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 9: Create updated_at triggers for new tables
-- ============================================================================

DROP TRIGGER IF EXISTS update_pppoe_profiles_updated_at ON pppoe_profiles;
CREATE TRIGGER update_pppoe_profiles_updated_at 
    BEFORE UPDATE ON pppoe_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hotspot_profiles_updated_at ON hotspot_profiles;
CREATE TRIGGER update_hotspot_profiles_updated_at 
    BEFORE UPDATE ON hotspot_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fiber_cables_updated_at ON fiber_cables;
CREATE TRIGGER update_fiber_cables_updated_at 
    BEFORE UPDATE ON fiber_cables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_network_points_updated_at ON network_points;
CREATE TRIGGER update_network_points_updated_at 
    BEFORE UPDATE ON network_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: Create function to auto-create profiles when plan is created
-- ============================================================================

CREATE OR REPLACE FUNCTION create_profiles_for_plan()
RETURNS TRIGGER AS $$
DECLARE
    rate_limit TEXT;
    profile_name TEXT;
BEGIN
    -- Calculate rate limit string (Kbps to format like "2M/5M")
    rate_limit := CONCAT(
        CASE WHEN NEW.upload_speed >= 1024 THEN CONCAT(NEW.upload_speed / 1024, 'M')
             ELSE CONCAT(NEW.upload_speed, 'k') END,
        '/',
        CASE WHEN NEW.download_speed >= 1024 THEN CONCAT(NEW.download_speed / 1024, 'M')
             ELSE CONCAT(NEW.download_speed, 'k') END
    );
    
    profile_name := CONCAT('plan-', LOWER(REPLACE(NEW.name, ' ', '-')));
    
    -- Create hotspot profile
    INSERT INTO hotspot_profiles (name, plan_id, rate_limit, session_timeout)
    VALUES (profile_name, NEW.id, rate_limit, 
            CASE WHEN NEW.session_timeout IS NOT NULL 
                 THEN CONCAT(NEW.session_timeout, 's') 
                 ELSE NULL END)
    ON CONFLICT (name) DO UPDATE SET 
        rate_limit = EXCLUDED.rate_limit,
        session_timeout = EXCLUDED.session_timeout;
    
    -- Create PPPoE profile
    INSERT INTO pppoe_profiles (name, plan_id, rate_limit)
    VALUES (profile_name, NEW.id, rate_limit)
    ON CONFLICT (name) DO UPDATE SET rate_limit = EXCLUDED.rate_limit;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profiles when plan is created/updated
DROP TRIGGER IF EXISTS create_plan_profiles ON plans;
CREATE TRIGGER create_plan_profiles
    AFTER INSERT OR UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION create_profiles_for_plan();

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Fix migration completed successfully!' as status;
