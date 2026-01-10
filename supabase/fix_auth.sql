-- FIX AUTH ISSUES
-- Run this in Supabase SQL Editor to fix authentication

-- 1. Create user_profiles table if not exists
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'external',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 3. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (if any) and create new ones
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable" ON user_profiles
    FOR SELECT USING (true);

-- 5. Create trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'external'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Create admin user
DO $$
DECLARE
    admin_id UUID;
    admin_email TEXT := 'admin@miir.lu';  -- <<< CHANGE THIS
    admin_password TEXT := 'Admin123!';    -- <<< CHANGE THIS
BEGIN
    -- Check if admin exists
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;

    IF admin_id IS NULL THEN
        -- Create admin user
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
            is_super_admin, role, aud
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(), NOW(), NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Global Admin"}',
            FALSE, 'authenticated', 'authenticated'
        )
        RETURNING id INTO admin_id;

        RAISE NOTICE 'Created admin user: %', admin_email;
    ELSE
        RAISE NOTICE 'Admin user already exists: %', admin_email;
    END IF;

    -- Ensure profile exists with global_admin role
    INSERT INTO user_profiles (id, email, full_name, role, is_active)
    VALUES (admin_id, admin_email, 'Global Admin', 'global_admin', TRUE)
    ON CONFLICT (id) DO UPDATE SET role = 'global_admin', is_active = TRUE;

    RAISE NOTICE 'Admin profile set to global_admin';
END $$;

-- 8. Verify setup
SELECT 'Auth users:' as info;
SELECT id, email, created_at FROM auth.users LIMIT 5;

SELECT 'User profiles:' as info;
SELECT id, email, full_name, role, is_active FROM user_profiles;
