-- Safe Admin Creation Script
-- Use this if the database is already partially set up

-- First, check if user_profiles table exists and create admin
DO $$
DECLARE
    new_user_id UUID;
    admin_email TEXT := 'admin@miir.lu';  -- CHANGE THIS
    admin_password TEXT := 'Admin123!';    -- CHANGE THIS (min 6 chars)
    admin_name TEXT := 'Global Admin';     -- CHANGE THIS
    profile_exists BOOLEAN;
BEGIN
    -- Check if user_profiles table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        RAISE NOTICE 'user_profiles table exists, proceeding...';

        -- Check if user already exists in auth.users
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

            RAISE NOTICE 'Created new auth user with ID: %', new_user_id;
        ELSE
            RAISE NOTICE 'Auth user already exists with ID: %', new_user_id;
        END IF;

        -- Check if profile exists
        SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = new_user_id) INTO profile_exists;

        IF profile_exists THEN
            -- Update existing profile to global_admin
            UPDATE user_profiles
            SET role = 'global_admin', full_name = admin_name, is_active = TRUE
            WHERE id = new_user_id;
            RAISE NOTICE 'Updated existing profile to global_admin';
        ELSE
            -- Insert new profile
            INSERT INTO user_profiles (id, email, full_name, role, is_active)
            VALUES (new_user_id, admin_email, admin_name, 'global_admin', TRUE);
            RAISE NOTICE 'Created new profile with global_admin role';
        END IF;

    ELSE
        RAISE EXCEPTION 'user_profiles table does not exist. Run the initial migration first.';
    END IF;
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
