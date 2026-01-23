-- ============================================================================
-- FIX USER CREATION - Ensures organization exists and trigger handles errors
-- ============================================================================

-- First, ensure the Nolojia organization exists BEFORE the trigger runs
INSERT INTO public.organizations (id, name, type, status, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Nolojia Technologies',
    'nolojia',
    'active',
    '{"features": ["all"]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
    nolojia_org_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Check if this is the first user in the system
    SELECT NOT EXISTS (SELECT 1 FROM public.landlord_users) INTO is_first_user;

    -- Check if the Nolojia organization exists, if not create it
    INSERT INTO public.organizations (id, name, type, status, settings)
    VALUES (
        nolojia_org_id,
        'Nolojia Technologies',
        'nolojia',
        'active',
        '{"features": ["all"]}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert the user into landlord_users
    INSERT INTO public.landlord_users (id, email, full_name, role, organization_id, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE WHEN is_first_user THEN 'super_admin'::user_role ELSE 'landlord_staff'::user_role END,
        CASE WHEN is_first_user THEN nolojia_org_id ELSE NULL END,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.landlord_users.full_name),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.landlord_users TO authenticated;
GRANT SELECT ON public.organizations TO authenticated;

-- Ensure RLS policies allow the trigger to work
ALTER TABLE public.landlord_users ENABLE ROW LEVEL SECURITY;

-- Policy for trigger (service role bypasses RLS, but just in case)
DROP POLICY IF EXISTS "Service role can manage all users" ON public.landlord_users;
CREATE POLICY "Service role can manage all users" ON public.landlord_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy for users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.landlord_users;
CREATE POLICY "Users can read own profile" ON public.landlord_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.landlord_users;
CREATE POLICY "Users can update own profile" ON public.landlord_users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy for admins to manage all users
DROP POLICY IF EXISTS "Admins can manage all users" ON public.landlord_users;
CREATE POLICY "Admins can manage all users" ON public.landlord_users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.landlord_users lu
            WHERE lu.id = auth.uid()
            AND lu.role IN ('super_admin', 'nolojia_staff')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.landlord_users lu
            WHERE lu.id = auth.uid()
            AND lu.role IN ('super_admin', 'nolojia_staff')
        )
    );
