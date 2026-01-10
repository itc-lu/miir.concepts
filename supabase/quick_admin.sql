-- QUICK ADMIN CREATION
-- Run this in Supabase SQL Editor
-- Change the email and password below!

DO $$
DECLARE
    admin_id UUID;
    admin_email TEXT := 'admin@miir.lu';  -- <<< CHANGE THIS
    admin_password TEXT := 'Admin123!';    -- <<< CHANGE THIS
BEGIN
    -- Create user in auth.users
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
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id INTO admin_id;

    -- Create or update profile
    INSERT INTO user_profiles (id, email, full_name, role, is_active)
    VALUES (admin_id, admin_email, 'Global Admin', 'global_admin', TRUE)
    ON CONFLICT (id) DO UPDATE SET role = 'global_admin', is_active = TRUE;

    RAISE NOTICE 'Admin created: % (ID: %)', admin_email, admin_id;
END $$;

-- Show result
SELECT id, email, full_name, role FROM user_profiles WHERE role = 'global_admin';
