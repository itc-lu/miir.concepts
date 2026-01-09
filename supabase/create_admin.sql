-- Create Global Admin Account
-- Run this in Supabase SQL Editor after running the migrations

-- Option 1: If you already have a user (signed up through the app), upgrade them to global_admin
-- Replace 'your-email@example.com' with the actual email
UPDATE user_profiles
SET role = 'global_admin'
WHERE email = 'your-email@example.com';

-- Option 2: Create a new admin user directly (if auth tables exist)
-- This creates a user with email/password authentication
-- Replace the values below with your desired credentials

DO $$
DECLARE
    new_user_id UUID;
    admin_email TEXT := 'admin@miir.lu';  -- Change this
    admin_password TEXT := 'Admin123!';    -- Change this (min 6 chars)
    admin_name TEXT := 'Global Admin';     -- Change this
BEGIN
    -- Check if user already exists
    SELECT id INTO new_user_id
    FROM auth.users
    WHERE email = admin_email;

    IF new_user_id IS NULL THEN
        -- Create the user in auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            aud,
            confirmation_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            jsonb_build_object('full_name', admin_name),
            FALSE,
            'authenticated',
            'authenticated',
            ''
        )
        RETURNING id INTO new_user_id;

        RAISE NOTICE 'Created new user with ID: %', new_user_id;
    ELSE
        RAISE NOTICE 'User already exists with ID: %', new_user_id;
    END IF;

    -- Ensure user_profiles entry exists with global_admin role
    INSERT INTO user_profiles (id, email, full_name, role, is_active)
    VALUES (new_user_id, admin_email, admin_name, 'global_admin', TRUE)
    ON CONFLICT (id) DO UPDATE SET
        role = 'global_admin',
        full_name = EXCLUDED.full_name,
        is_active = TRUE;

    RAISE NOTICE 'User profile updated to global_admin';
END $$;

-- Verify the admin was created
SELECT
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.is_active,
    up.created_at
FROM user_profiles up
WHERE up.role = 'global_admin';
