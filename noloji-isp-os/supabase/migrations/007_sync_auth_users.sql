-- ============================================================================
-- SYNC AUTH USERS TO LANDLORD_USERS
-- ============================================================================
-- This migration ensures all auth.users have corresponding entries in landlord_users

-- First, ensure the Nolojia organization exists
INSERT INTO public.organizations (id, name, type, status, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Nolojia Technologies',
    'nolojia',
    'active',
    '{"features": ["all"]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Insert any auth users that don't have landlord_users entries
INSERT INTO public.landlord_users (id, email, full_name, role, organization_id, is_active)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'landlord_staff'::user_role,  -- Default role
    NULL,
    true
FROM auth.users au
LEFT JOIN public.landlord_users lu ON lu.id = au.id
WHERE lu.id IS NULL;

-- Now update roles for specific users
-- Admin user
UPDATE public.landlord_users
SET
    role = 'super_admin',
    organization_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'nolojiatechnologies@gmail.com';

-- ISP user
UPDATE public.landlord_users
SET role = 'full_isp'
WHERE email = 'shaundanielmachua@gmail.com';

-- Verify the results
DO $$
DECLARE
    admin_count INTEGER;
    isp_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM public.landlord_users WHERE email = 'nolojiatechnologies@gmail.com' AND role = 'super_admin';
    SELECT COUNT(*) INTO isp_count FROM public.landlord_users WHERE email = 'shaundanielmachua@gmail.com' AND role = 'full_isp';

    RAISE NOTICE 'Admin user (super_admin): %', admin_count;
    RAISE NOTICE 'ISP user (full_isp): %', isp_count;
END $$;
