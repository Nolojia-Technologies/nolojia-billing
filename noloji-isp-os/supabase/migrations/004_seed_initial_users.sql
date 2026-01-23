-- ============================================================================
-- SEED INITIAL USERS
-- Creates the initial Nolojia ISP admin account
-- ============================================================================

-- Note: This migration creates a user account.
-- The password should be updated via Supabase Dashboard or Auth Admin API for security.
-- Email: nolojiatechnologies@gmail.com
-- Initial password should be set via Supabase Dashboard

-- First, ensure the Nolojia organization exists
INSERT INTO public.organizations (id, name, type, status, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Nolojia Technologies',
    'nolojia',
    'active',
    '{"features": ["all"]}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    status = EXCLUDED.status;

-- Create a function to safely insert or update the ISP user profile
-- This will be called after the user is created in auth.users via Supabase Dashboard/API
CREATE OR REPLACE FUNCTION public.ensure_nolojia_admin_exists()
RETURNS void AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if the user exists in auth.users
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'nolojiatechnologies@gmail.com'
    LIMIT 1;

    IF admin_user_id IS NOT NULL THEN
        -- Ensure the landlord_users entry exists and has correct role
        INSERT INTO public.landlord_users (
            id,
            email,
            full_name,
            role,
            organization_id,
            is_active
        ) VALUES (
            admin_user_id,
            'nolojiatechnologies@gmail.com',
            'Nolojia Admin',
            'super_admin'::user_role,
            '00000000-0000-0000-0000-000000000001',
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'super_admin'::user_role,
            organization_id = '00000000-0000-0000-0000-000000000001',
            is_active = true,
            updated_at = NOW();

        RAISE NOTICE 'Nolojia admin user profile ensured for user ID: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Nolojia admin user not found in auth.users. Please create the user first via Supabase Dashboard.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT public.ensure_nolojia_admin_exists();

-- ============================================================================
-- INSTRUCTIONS FOR CREATING THE INITIAL USER
-- ============================================================================
--
-- Since Supabase auth.users requires the password to be hashed using their
-- specific algorithm, you need to create the initial admin user through
-- one of these methods:
--
-- METHOD 1: Via Supabase Dashboard (Recommended)
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add user"
-- 4. Enter email: nolojiatechnologies@gmail.com
-- 5. Enter password: 21890547NjeriMC
-- 6. Click "Create user"
-- 7. Run: SELECT public.ensure_nolojia_admin_exists();
--
-- METHOD 2: Via Supabase Admin API
-- Use the service role key to call:
-- POST /auth/v1/admin/users
-- {
--   "email": "nolojiatechnologies@gmail.com",
--   "password": "21890547NjeriMC",
--   "email_confirm": true,
--   "user_metadata": {
--     "full_name": "Nolojia Admin"
--   }
-- }
--
-- METHOD 3: Via application on first startup
-- The user management service can create users programmatically.
-- Use the createUser function from user-management-service.ts
--
-- ============================================================================

-- Create a helper view to see user roles (for debugging)
CREATE OR REPLACE VIEW public.user_roles_summary AS
SELECT
    lu.id,
    lu.email,
    lu.full_name,
    lu.role,
    lu.is_active,
    o.name as organization_name,
    lu.last_login,
    lu.created_at
FROM public.landlord_users lu
LEFT JOIN public.organizations o ON o.id = lu.organization_id
ORDER BY
    CASE lu.role
        WHEN 'super_admin' THEN 1
        WHEN 'nolojia_staff' THEN 2
        WHEN 'full_isp' THEN 3
        WHEN 'landlord_admin' THEN 4
        WHEN 'landlord_staff' THEN 5
    END,
    lu.created_at;

-- Grant access to the view
GRANT SELECT ON public.user_roles_summary TO authenticated;
