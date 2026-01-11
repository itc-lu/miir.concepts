-- Migration 007: Fix user_role enum comparison with text
-- Fixes "operator does not exist: user_role = text" error

-- Drop existing functions that may have different return types
DROP FUNCTION IF EXISTS get_accessible_cinema_ids(UUID);
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS has_cinema_access(UUID, UUID);
DROP FUNCTION IF EXISTS is_internal_user_or_above(UUID);
DROP FUNCTION IF EXISTS is_internal_admin_or_above(UUID);
DROP FUNCTION IF EXISTS is_global_admin(UUID);

-- Drop and recreate helper functions with proper enum casting

-- Check if user is global admin
CREATE OR REPLACE FUNCTION is_global_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT role = 'global_admin'::user_role FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is internal admin or above
CREATE OR REPLACE FUNCTION is_internal_admin_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT role IN ('global_admin'::user_role, 'internal_admin'::user_role) FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is internal user or above
CREATE OR REPLACE FUNCTION is_internal_user_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT role IN ('global_admin'::user_role, 'internal_admin'::user_role, 'internal_user'::user_role) FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if external user has access to a specific cinema
CREATE OR REPLACE FUNCTION has_cinema_access(user_uuid UUID, cinema_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;

    -- Global admin and internal roles have access to all cinemas
    IF user_role_val IN ('global_admin'::user_role, 'internal_admin'::user_role, 'internal_user'::user_role) THEN
        RETURN TRUE;
    END IF;

    -- External users: check cinema permissions
    IF user_role_val = 'external'::user_role THEN
        -- Check direct cinema permission
        IF EXISTS (
            SELECT 1 FROM user_cinema_permissions
            WHERE user_id = user_uuid AND cinema_id = cinema_uuid
        ) THEN
            RETURN TRUE;
        END IF;

        -- Check cinema group permission
        IF EXISTS (
            SELECT 1 FROM user_cinema_group_permissions ucgp
            JOIN cinemas c ON c.cinema_group_id = ucgp.cinema_group_id
            WHERE ucgp.user_id = user_uuid AND c.id = cinema_uuid
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get list of accessible cinema IDs for a user
CREATE OR REPLACE FUNCTION get_accessible_cinema_ids(user_uuid UUID)
RETURNS UUID[] AS $$
DECLARE
    user_role_val user_role;
    cinema_ids UUID[];
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;

    -- Global admin and internal roles have access to all cinemas
    IF user_role_val IN ('global_admin'::user_role, 'internal_admin'::user_role, 'internal_user'::user_role) THEN
        SELECT array_agg(id) INTO cinema_ids FROM cinemas;
        RETURN COALESCE(cinema_ids, ARRAY[]::UUID[]);
    END IF;

    -- External users: get permitted cinemas
    IF user_role_val = 'external'::user_role THEN
        SELECT array_agg(DISTINCT cinema_id) INTO cinema_ids
        FROM (
            -- Direct cinema permissions
            SELECT cinema_id FROM user_cinema_permissions WHERE user_id = user_uuid
            UNION
            -- Cinema group permissions (all cinemas in permitted groups)
            SELECT c.id FROM user_cinema_group_permissions ucgp
            JOIN cinemas c ON c.cinema_group_id = ucgp.cinema_group_id
            WHERE ucgp.user_id = user_uuid
        ) permitted_cinemas;

        RETURN COALESCE(cinema_ids, ARRAY[]::UUID[]);
    END IF;

    RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_user_role function to return properly
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
DECLARE
    role_val user_role;
BEGIN
    SELECT role INTO role_val FROM user_profiles WHERE id = user_uuid;
    RETURN role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
