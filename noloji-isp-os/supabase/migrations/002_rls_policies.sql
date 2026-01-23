-- ============================================================================
-- NOLOJIA LANDLORD ISP PLATFORM - ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- These policies ensure complete data isolation between tenants
-- while allowing Nolojia administrators full access
-- ============================================================================

-- Enable RLS on all landlord tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_router_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_enforcement_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Nolojia admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Nolojia admins can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Landlords can view their organization" ON organizations;

-- Nolojia admins can see all organizations
CREATE POLICY "Nolojia admins can view all organizations"
ON organizations FOR SELECT
TO authenticated
USING (is_landlord_nolojia_admin());

-- Nolojia admins can manage organizations
CREATE POLICY "Nolojia admins can manage organizations"
ON organizations FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlords can view their own organization
CREATE POLICY "Landlords can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT organization_id FROM landlords WHERE id = get_landlord_user_landlord_id()
    )
);

-- ============================================================================
-- LANDLORDS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage landlords" ON landlords;
DROP POLICY IF EXISTS "Landlords can view their own record" ON landlords;
DROP POLICY IF EXISTS "Landlord admins can update own record" ON landlords;

-- Nolojia admins can manage all landlords
CREATE POLICY "Nolojia admins can manage landlords"
ON landlords FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlord users can view their own landlord record
CREATE POLICY "Landlords can view their own record"
ON landlords FOR SELECT
TO authenticated
USING (id = get_landlord_user_landlord_id());

-- Landlord admins can update their own record (limited fields via application)
CREATE POLICY "Landlord admins can update own record"
ON landlords FOR UPDATE
TO authenticated
USING (
    id = get_landlord_user_landlord_id()
    AND EXISTS (
        SELECT 1 FROM landlord_users WHERE id = auth.uid() AND role = 'landlord_admin'
    )
)
WITH CHECK (
    id = get_landlord_user_landlord_id()
    AND EXISTS (
        SELECT 1 FROM landlord_users WHERE id = auth.uid() AND role = 'landlord_admin'
    )
);

-- ============================================================================
-- LANDLORD BUILDINGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage buildings" ON landlord_buildings;
DROP POLICY IF EXISTS "Landlords can view their buildings" ON landlord_buildings;

-- Nolojia admins can manage all buildings
CREATE POLICY "Nolojia admins can manage buildings"
ON landlord_buildings FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlords can view their own buildings
CREATE POLICY "Landlords can view their buildings"
ON landlord_buildings FOR SELECT
TO authenticated
USING (landlord_id = get_landlord_user_landlord_id());

-- ============================================================================
-- UNITS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage units" ON units;
DROP POLICY IF EXISTS "Landlords can view their units" ON units;

-- Nolojia admins can manage all units
CREATE POLICY "Nolojia admins can manage units"
ON units FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlords can view units in their buildings
CREATE POLICY "Landlords can view their units"
ON units FOR SELECT
TO authenticated
USING (
    building_id IN (
        SELECT id FROM landlord_buildings WHERE landlord_id = get_landlord_user_landlord_id()
    )
);

-- ============================================================================
-- PACKAGES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage packages" ON landlord_packages;
DROP POLICY IF EXISTS "Anyone can view global packages" ON landlord_packages;
DROP POLICY IF EXISTS "Landlords can view their custom packages" ON landlord_packages;

-- Nolojia admins can manage all packages
CREATE POLICY "Nolojia admins can manage packages"
ON landlord_packages FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Everyone can view active global packages
CREATE POLICY "Anyone can view global packages"
ON landlord_packages FOR SELECT
TO authenticated
USING (
    is_active = true
    AND landlord_id IS NULL
);

-- Landlords can view their custom packages
CREATE POLICY "Landlords can view their custom packages"
ON landlord_packages FOR SELECT
TO authenticated
USING (landlord_id = get_landlord_user_landlord_id());

-- ============================================================================
-- LANDLORD CUSTOMERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage customers" ON landlord_customers;
DROP POLICY IF EXISTS "Landlords can view their customers" ON landlord_customers;

-- Nolojia admins can manage all customers
CREATE POLICY "Nolojia admins can manage customers"
ON landlord_customers FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlords can view their own customers
CREATE POLICY "Landlords can view their customers"
ON landlord_customers FOR SELECT
TO authenticated
USING (landlord_id = get_landlord_user_landlord_id());

-- ============================================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Landlords can view their subscriptions" ON subscriptions;

-- Nolojia admins can manage all subscriptions
CREATE POLICY "Nolojia admins can manage subscriptions"
ON subscriptions FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlords can view subscriptions of their customers
CREATE POLICY "Landlords can view their subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (
    customer_id IN (
        SELECT id FROM landlord_customers WHERE landlord_id = get_landlord_user_landlord_id()
    )
);

-- ============================================================================
-- PAYMENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage payments" ON landlord_payments;
DROP POLICY IF EXISTS "Landlords can view their payments" ON landlord_payments;

-- Nolojia admins can manage all payments
CREATE POLICY "Nolojia admins can manage payments"
ON landlord_payments FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlords can view their payments
CREATE POLICY "Landlords can view their payments"
ON landlord_payments FOR SELECT
TO authenticated
USING (landlord_id = get_landlord_user_landlord_id());

-- ============================================================================
-- INVOICES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage invoices" ON landlord_invoices;
DROP POLICY IF EXISTS "Landlords can view their invoices" ON landlord_invoices;

-- Nolojia admins can manage all invoices
CREATE POLICY "Nolojia admins can manage invoices"
ON landlord_invoices FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlords can view their invoices
CREATE POLICY "Landlords can view their invoices"
ON landlord_invoices FOR SELECT
TO authenticated
USING (landlord_id = get_landlord_user_landlord_id());

-- ============================================================================
-- ROUTERS POLICIES (NOLOJIA ONLY - NEVER VISIBLE TO LANDLORDS)
-- ============================================================================

DROP POLICY IF EXISTS "Only Nolojia admins can access routers" ON landlord_routers;

-- ONLY Nolojia admins can access routers
CREATE POLICY "Only Nolojia admins can access routers"
ON landlord_routers FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- ============================================================================
-- ROUTER ASSIGNMENTS POLICIES (NOLOJIA ONLY)
-- ============================================================================

DROP POLICY IF EXISTS "Only Nolojia admins can manage router assignments" ON landlord_router_assignments;

-- ONLY Nolojia admins can manage router assignments
CREATE POLICY "Only Nolojia admins can manage router assignments"
ON landlord_router_assignments FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage users" ON landlord_users;
DROP POLICY IF EXISTS "Users can view own record" ON landlord_users;
DROP POLICY IF EXISTS "Landlord admins can view their staff" ON landlord_users;
DROP POLICY IF EXISTS "Users can update own profile" ON landlord_users;

-- Nolojia admins can manage all users
CREATE POLICY "Nolojia admins can manage users"
ON landlord_users FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Users can view their own record
CREATE POLICY "Users can view own record"
ON landlord_users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Landlord admins can view users in their landlord
CREATE POLICY "Landlord admins can view their staff"
ON landlord_users FOR SELECT
TO authenticated
USING (
    landlord_id = get_landlord_user_landlord_id()
    AND EXISTS (
        SELECT 1 FROM landlord_users WHERE id = auth.uid() AND role = 'landlord_admin'
    )
);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON landlord_users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can view all audit logs" ON landlord_audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON landlord_audit_logs;

-- Only Nolojia admins can view all audit logs
CREATE POLICY "Nolojia admins can view all audit logs"
ON landlord_audit_logs FOR SELECT
TO authenticated
USING (is_landlord_nolojia_admin());

-- Insert-only for all authenticated users (logging their actions)
CREATE POLICY "Users can insert audit logs"
ON landlord_audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PAYOUTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Nolojia admins can manage payouts" ON landlord_payouts;
DROP POLICY IF EXISTS "Landlords can view their payouts" ON landlord_payouts;

-- Nolojia admins can manage all payouts
CREATE POLICY "Nolojia admins can manage payouts"
ON landlord_payouts FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- Landlords can view their payouts
CREATE POLICY "Landlords can view their payouts"
ON landlord_payouts FOR SELECT
TO authenticated
USING (landlord_id = get_landlord_user_landlord_id());

-- ============================================================================
-- ENFORCEMENT QUEUE POLICIES (NOLOJIA ONLY)
-- ============================================================================

DROP POLICY IF EXISTS "Only Nolojia admins can access enforcement queue" ON landlord_enforcement_queue;

-- ONLY Nolojia admins can access enforcement queue
CREATE POLICY "Only Nolojia admins can access enforcement queue"
ON landlord_enforcement_queue FOR ALL
TO authenticated
USING (is_landlord_nolojia_admin())
WITH CHECK (is_landlord_nolojia_admin());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Only Nolojia admins can access routers" ON landlord_routers IS 'Routers are NEVER visible to landlords. Only Nolojia staff can access.';
COMMENT ON POLICY "Only Nolojia admins can access enforcement queue" ON landlord_enforcement_queue IS 'Enforcement queue is internal only.';
