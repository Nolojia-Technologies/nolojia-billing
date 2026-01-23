-- ============================================================================
-- FIX RLS RECURSION ON LANDLORD_USERS
-- ============================================================================
-- The "Admins can manage all users" policy causes infinite recursion because
-- it queries landlord_users to check if the current user is an admin.
-- We need to fix this by using a SECURITY DEFINER function with RLS disabled.

-- Drop the problematic policy first
DROP POLICY IF EXISTS "Admins can manage all users" ON public.landlord_users;

-- Drop old function if exists
DROP FUNCTION IF EXISTS public.is_admin_user(UUID);

-- Create a function to check if user is admin
-- SECURITY DEFINER + SET search_path + explicit schema ensures RLS bypass
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Direct query with explicit schema, SECURITY DEFINER means this runs as the function owner (postgres)
    -- which bypasses RLS
    SELECT role::TEXT INTO user_role
    FROM public.landlord_users
    WHERE id = check_user_id
    LIMIT 1;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN user_role IN ('super_admin', 'nolojia_staff');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Ensure the function owner is postgres (or superuser) to bypass RLS
ALTER FUNCTION public.is_admin_user(UUID) OWNER TO postgres;

-- Re-create admin policy using the function
CREATE POLICY "Admins can manage all users" ON public.landlord_users
    FOR ALL
    TO authenticated
    USING (public.is_admin_user(auth.uid()))
    WITH CHECK (public.is_admin_user(auth.uid()));

-- Ensure basic self-access policies exist and are correct
DROP POLICY IF EXISTS "Users can read own profile" ON public.landlord_users;
CREATE POLICY "Users can read own profile" ON public.landlord_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.landlord_users;
CREATE POLICY "Users can update own profile" ON public.landlord_users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role policy (explicit, though service_role bypasses by default)
DROP POLICY IF EXISTS "Service role can manage all users" ON public.landlord_users;
CREATE POLICY "Service role can manage all users" ON public.landlord_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO anon;

