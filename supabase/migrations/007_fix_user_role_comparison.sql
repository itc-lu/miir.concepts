-- Migration 007: Fix user_role enum comparison with text
-- Fixes "operator does not exist: user_role = text" error

-- First, drop the dependent policies that use get_user_role
DROP POLICY IF EXISTS "External user cinema access" ON sessions;
DROP POLICY IF EXISTS "Editor write access" ON movie_l2_subtitles;

-- Drop existing functions that may have different return types (CASCADE for safety)
DROP FUNCTION IF EXISTS get_accessible_cinema_ids(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS has_cinema_access(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_internal_user_or_above(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_internal_admin_or_above(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_global_admin(UUID) CASCADE;

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

-- ============================================================================
-- RECREATE ALL DROPPED POLICIES (from CASCADE)
-- ============================================================================

-- Reference tables: internal_admin+ write
DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON countries FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON languages FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON formats FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON technologies FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON genres FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON age_ratings FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON cinema_tags FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON movie_tags FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON session_tags FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cinema Groups & Cinemas: internal_admin+ write
DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON cinema_groups FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON cinemas FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- People: internal_admin+ write
DO $$ BEGIN
    CREATE POLICY "Internal admin write" ON people FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Movies L0/L1/L2: internal_user+ write
DO $$ BEGIN
    CREATE POLICY "Internal user write" ON movies_l0 FOR ALL
        USING (is_internal_user_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal user write" ON movies_l1 FOR ALL
        USING (is_internal_user_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal user write" ON movies_l2 FOR ALL
        USING (is_internal_user_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sessions: complex permissions
DO $$ BEGIN
    CREATE POLICY "Internal user full access" ON sessions FOR ALL
        USING (is_internal_user_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "External user cinema access" ON sessions FOR ALL
        USING (
            get_user_role(auth.uid()) = 'external'::user_role
            AND has_cinema_access(auth.uid(), cinema_id)
        )
        WITH CHECK (
            get_user_role(auth.uid()) = 'external'::user_role
            AND has_cinema_access(auth.uid(), cinema_id)
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User profiles
DO $$ BEGIN
    CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT
        USING (auth.uid() = id OR is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin manage users" ON user_profiles FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Import jobs
DO $$ BEGIN
    CREATE POLICY "Internal user create imports" ON import_jobs FOR INSERT
        WITH CHECK (is_internal_user_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users read own imports" ON import_jobs FOR SELECT
        USING (user_id = auth.uid() OR is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Export: internal_admin+ for client/template management
DO $$ BEGIN
    CREATE POLICY "Internal admin exports" ON export_clients FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Internal admin templates" ON export_templates FOR ALL
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Export jobs
DO $$ BEGIN
    CREATE POLICY "Internal user export jobs" ON export_jobs FOR ALL
        USING (is_internal_user_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit logs
DO $$ BEGIN
    CREATE POLICY "Internal admin read audit" ON audit_logs FOR SELECT
        USING (is_internal_admin_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Movie L2 subtitles
DO $$ BEGIN
    CREATE POLICY "Editor write access" ON movie_l2_subtitles FOR ALL
        USING (is_internal_user_or_above(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
