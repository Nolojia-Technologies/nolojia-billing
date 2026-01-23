-- ============================================================================
-- FIX AUTH SYNC AND PERMISSIONS
-- ============================================================================

-- Function to handle new user creation automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
BEGIN
    -- Check if this is the first user in the system
    SELECT NOT EXISTS (SELECT 1 FROM public.landlord_users) INTO is_first_user;

    INSERT INTO public.landlord_users (id, email, full_name, role, organization_id, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        -- Make the first user a Super Admin, others default to Landlord Admin (or Nolojia Staff based on invite logic, but default safety here)
        CASE WHEN is_first_user THEN 'super_admin'::user_role ELSE 'landlord_staff'::user_role END,
        -- Assign first user to Nolojia Org
        CASE WHEN is_first_user THEN '00000000-0000-0000-0000-000000000001'::uuid ELSE NULL END,
        true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (Crucial for the current user)
INSERT INTO public.landlord_users (id, email, full_name, role, organization_id, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email),
    'super_admin'::user_role, -- WARNING: This makes ALL current users super admins. Adjust if production has many users.
    '00000000-0000-0000-0000-000000000001'::uuid,
    true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.landlord_users)
ON CONFLICT (id) DO NOTHING;
