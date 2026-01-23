-- ============================================================================
-- COMPLETE RLS FIX - DROP ALL DEPENDENCIES FIRST
-- ============================================================================
-- This migration drops ALL policies that depend on the recursive functions,
-- fixes the functions, and recreates the policies.

-- ============================================
-- STEP 1: Drop ALL dependent policies
-- ============================================

-- landlord_users policies
DROP POLICY IF EXISTS "Admins can manage all users" ON public.landlord_users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.landlord_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.landlord_users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.landlord_users;
DROP POLICY IF EXISTS "Nolojia admins can manage users" ON public.landlord_users;

-- organizations policies
DROP POLICY IF EXISTS "Nolojia admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Nolojia admins can manage organizations" ON public.organizations;

-- landlords policies
DROP POLICY IF EXISTS "Nolojia admins can manage landlords" ON public.landlords;

-- landlord_buildings policies
DROP POLICY IF EXISTS "Nolojia admins can manage buildings" ON public.landlord_buildings;

-- units policies
DROP POLICY IF EXISTS "Nolojia admins can manage units" ON public.units;

-- landlord_packages policies
DROP POLICY IF EXISTS "Nolojia admins can manage packages" ON public.landlord_packages;

-- landlord_customers policies
DROP POLICY IF EXISTS "Nolojia admins can manage customers" ON public.landlord_customers;

-- subscriptions policies
DROP POLICY IF EXISTS "Nolojia admins can manage subscriptions" ON public.subscriptions;

-- landlord_payments policies
DROP POLICY IF EXISTS "Nolojia admins can manage payments" ON public.landlord_payments;

-- landlord_invoices policies
DROP POLICY IF EXISTS "Nolojia admins can manage invoices" ON public.landlord_invoices;

-- landlord_routers policies
DROP POLICY IF EXISTS "Only Nolojia admins can access routers" ON public.landlord_routers;

-- landlord_router_assignments policies
DROP POLICY IF EXISTS "Only Nolojia admins can manage router assignments" ON public.landlord_router_assignments;

-- landlord_audit_logs policies
DROP POLICY IF EXISTS "Nolojia admins can view all audit logs" ON public.landlord_audit_logs;

-- landlord_payouts policies
DROP POLICY IF EXISTS "Nolojia admins can manage payouts" ON public.landlord_payouts;

-- landlord_enforcement_queue policies
DROP POLICY IF EXISTS "Only Nolojia admins can access enforcement queue" ON public.landlord_enforcement_queue;

-- ============================================
-- STEP 2: Drop the problematic functions
-- ============================================
DROP FUNCTION IF EXISTS public.is_landlord_nolojia_admin();
DROP FUNCTION IF EXISTS public.is_admin_user(UUID);
DROP FUNCTION IF EXISTS public.is_nolojia_admin();

-- ============================================
-- STEP 3: Create NON-RECURSIVE admin check function
-- ============================================
-- This function uses SECURITY DEFINER and SET search_path to bypass RLS
CREATE OR REPLACE FUNCTION public.is_nolojia_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- SECURITY DEFINER runs as function owner (postgres), bypassing RLS
    SELECT role::TEXT INTO user_role
    FROM public.landlord_users
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN COALESCE(user_role IN ('super_admin', 'nolojia_staff'), FALSE);
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Alias for backwards compatibility
CREATE OR REPLACE FUNCTION public.is_landlord_nolojia_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_nolojia_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_nolojia_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_nolojia_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_landlord_nolojia_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_landlord_nolojia_admin() TO anon;

-- ============================================
-- STEP 4: Recreate landlord_users policies (simple, non-recursive)
-- ============================================
ALTER TABLE public.landlord_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.landlord_users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.landlord_users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to read profiles (for directories)
CREATE POLICY "Authenticated can read all profiles" ON public.landlord_users
    FOR SELECT TO authenticated
    USING (true);

-- Allow inserts (for registration)
CREATE POLICY "Allow user creation" ON public.landlord_users
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role full access" ON public.landlord_users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- STEP 5: Recreate policies for other tables using the fixed function
-- ============================================

-- organizations
CREATE POLICY "Nolojia admins can view all organizations" ON public.organizations
    FOR SELECT TO authenticated
    USING (public.is_nolojia_admin());

CREATE POLICY "Nolojia admins can manage organizations" ON public.organizations
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlords
CREATE POLICY "Nolojia admins can manage landlords" ON public.landlords
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_buildings
CREATE POLICY "Nolojia admins can manage buildings" ON public.landlord_buildings
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- units
CREATE POLICY "Nolojia admins can manage units" ON public.units
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_packages
CREATE POLICY "Nolojia admins can manage packages" ON public.landlord_packages
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_customers
CREATE POLICY "Nolojia admins can manage customers" ON public.landlord_customers
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- subscriptions
CREATE POLICY "Nolojia admins can manage subscriptions" ON public.subscriptions
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_payments
CREATE POLICY "Nolojia admins can manage payments" ON public.landlord_payments
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_invoices
CREATE POLICY "Nolojia admins can manage invoices" ON public.landlord_invoices
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_routers
CREATE POLICY "Nolojia admins can access routers" ON public.landlord_routers
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_router_assignments
CREATE POLICY "Nolojia admins can manage router assignments" ON public.landlord_router_assignments
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_audit_logs
CREATE POLICY "Nolojia admins can view all audit logs" ON public.landlord_audit_logs
    FOR SELECT TO authenticated
    USING (public.is_nolojia_admin());

-- landlord_payouts
CREATE POLICY "Nolojia admins can manage payouts" ON public.landlord_payouts
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- landlord_enforcement_queue
CREATE POLICY "Nolojia admins can access enforcement queue" ON public.landlord_enforcement_queue
    FOR ALL TO authenticated
    USING (public.is_nolojia_admin())
    WITH CHECK (public.is_nolojia_admin());

-- ============================================
-- STEP 6: Fix user roles
-- ============================================
UPDATE public.landlord_users
SET role = 'full_isp'
WHERE email = 'shaundanielmachua@gmail.com';

UPDATE public.landlord_users
SET role = 'super_admin',
    organization_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'nolojiatechnologies@gmail.com';

-- ============================================
-- DONE! Verify with:
-- SELECT * FROM pg_policies WHERE tablename = 'landlord_users';
-- ============================================
