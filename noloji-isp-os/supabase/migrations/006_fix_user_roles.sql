-- ============================================================================
-- FIX USER ROLES FOR SPECIFIC EMAILS
-- ============================================================================

-- 1. Set nolojiatechnologies@gmail.com to super_admin (Reduces to /admin/landlords)
UPDATE public.landlord_users
SET role = 'super_admin',
    organization_id = '00000000-0000-0000-0000-000000000001' -- Ensure linked to Nolojia Org
WHERE email = 'nolojiatechnologies@gmail.com';

-- 2. Set shaundanielmachua@gmail.com to full_isp (Reduces to /dashboard)
-- First, ensure an organization exists for this ISP (if not already)
-- We'll create a placeholder org for them if they don't have one, or update their existing one.
-- Ideally we just update the user role.

UPDATE public.landlord_users
SET role = 'full_isp'
WHERE email = 'shaundanielmachua@gmail.com';

-- OPTIONAL: If shaun needs his own org, we might need to create one, but for now assuming he has one or Nolojia org is fine as placeholder until he creates one.
-- But 'full_isp' role will trigger the /dashboard redirect as per the API logic.
