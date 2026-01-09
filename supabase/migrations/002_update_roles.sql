-- CAT Cinema Automation Tool - Role System Update
-- Migration: Update roles to match business requirements

-- ============================================================================
-- UPDATE ROLE ENUM
-- ============================================================================

-- First, drop dependent objects
DROP POLICY IF EXISTS "Admin write access" ON countries;
DROP POLICY IF EXISTS "Admin write access" ON languages;
DROP POLICY IF EXISTS "Admin write access" ON formats;
DROP POLICY IF EXISTS "Admin write access" ON technologies;
DROP POLICY IF EXISTS "Admin write access" ON genres;
DROP POLICY IF EXISTS "Admin write access" ON age_ratings;
DROP POLICY IF EXISTS "Admin write access" ON cinema_tags;
DROP POLICY IF EXISTS "Admin write access" ON movie_tags;
DROP POLICY IF EXISTS "Admin write access" ON session_tags;
DROP POLICY IF EXISTS "Admin write access" ON cinema_groups;
DROP POLICY IF EXISTS "Admin write access" ON cinemas;
DROP POLICY IF EXISTS "Admin write access" ON people;
DROP POLICY IF EXISTS "Editor write access" ON movies_l0;
DROP POLICY IF EXISTS "Editor write access" ON movies_l1;
DROP POLICY IF EXISTS "Editor write access" ON movies_l2;
DROP POLICY IF EXISTS "Editor write access" ON sessions;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "User read own imports" ON import_jobs;
DROP POLICY IF EXISTS "Editor can create imports" ON import_jobs;
DROP POLICY IF EXISTS "Admin read exports" ON export_clients;
DROP POLICY IF EXISTS "Admin write exports" ON export_clients;
DROP POLICY IF EXISTS "Admin read templates" ON export_templates;
DROP POLICY IF EXISTS "Admin write templates" ON export_templates;
DROP POLICY IF EXISTS "User read own export jobs" ON export_jobs;
DROP POLICY IF EXISTS "User create export jobs" ON export_jobs;
DROP POLICY IF EXISTS "Admin read audit logs" ON audit_logs;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS is_admin_or_above(UUID);

-- Create new role enum
-- Roles:
--   global_admin:   Everything (super user)
--   internal_admin: CRUD users, movies, sessions, reference tables (age_rating, genre, cinema_group, cinema, etc.)
--   internal_user:  CRUD movies and sessions only
--   external:       Create sessions manually for linked cinemas only
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM (
    'global_admin',    -- Everything
    'internal_admin',  -- CRUD users/movies/sessions/reference tables
    'internal_user',   -- CRUD movies/sessions
    'external'         -- Only sessions for linked cinemas
);

-- Migrate existing data
ALTER TABLE user_profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE user_profiles
    ALTER COLUMN role TYPE user_role
    USING (
        CASE role::text
            WHEN 'super_admin' THEN 'global_admin'::user_role
            WHEN 'admin' THEN 'internal_admin'::user_role
            WHEN 'editor' THEN 'internal_user'::user_role
            WHEN 'viewer' THEN 'external'::user_role
        END
    );
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'external';

DROP TYPE user_role_old;

-- ============================================================================
-- NEW HELPER FUNCTIONS
-- ============================================================================

-- Get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
    SELECT role FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is global admin
CREATE OR REPLACE FUNCTION is_global_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT role = 'global_admin' FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is internal admin or above
CREATE OR REPLACE FUNCTION is_internal_admin_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT role IN ('global_admin', 'internal_admin') FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is internal user or above
CREATE OR REPLACE FUNCTION is_internal_user_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT role IN ('global_admin', 'internal_admin', 'internal_user') FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if external user has access to a specific cinema
CREATE OR REPLACE FUNCTION has_cinema_access(user_uuid UUID, cinema_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;

    -- Global admin and internal roles have access to all cinemas
    IF user_role_val IN ('global_admin', 'internal_admin', 'internal_user') THEN
        RETURN TRUE;
    END IF;

    -- External users: check cinema permissions
    IF user_role_val = 'external' THEN
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

-- Get list of cinema IDs user has access to
CREATE OR REPLACE FUNCTION get_accessible_cinema_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;

    -- Global admin and internal roles have access to all cinemas
    IF user_role_val IN ('global_admin', 'internal_admin', 'internal_user') THEN
        RETURN QUERY SELECT id FROM cinemas;
    END IF;

    -- External users: return only permitted cinemas
    IF user_role_val = 'external' THEN
        RETURN QUERY
            SELECT DISTINCT c.id FROM cinemas c
            LEFT JOIN user_cinema_permissions ucp ON c.id = ucp.cinema_id
            LEFT JOIN user_cinema_group_permissions ucgp ON c.cinema_group_id = ucgp.cinema_group_id
            WHERE ucp.user_id = user_uuid OR ucgp.user_id = user_uuid;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- UPDATED RLS POLICIES
-- ============================================================================

-- Reference tables: public read, internal_admin+ write
CREATE POLICY "Internal admin write" ON countries FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON languages FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON formats FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON technologies FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON genres FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON age_ratings FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON cinema_tags FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON movie_tags FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON session_tags FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));

-- Cinema Groups & Cinemas: public read, internal_admin+ write
CREATE POLICY "Internal admin write" ON cinema_groups FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin write" ON cinemas FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));

-- People: public read, internal_admin+ write
CREATE POLICY "Internal admin write" ON people FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));

-- Movies L0/L1/L2: public read, internal_user+ write
CREATE POLICY "Internal user write" ON movies_l0 FOR ALL
    USING (is_internal_user_or_above(auth.uid()));
CREATE POLICY "Internal user write" ON movies_l1 FOR ALL
    USING (is_internal_user_or_above(auth.uid()));
CREATE POLICY "Internal user write" ON movies_l2 FOR ALL
    USING (is_internal_user_or_above(auth.uid()));

-- Sessions: complex permissions
-- - Public can read active sessions
-- - Internal users can CRUD all sessions
-- - External users can only CRUD sessions for their linked cinemas
CREATE POLICY "Internal user full access" ON sessions FOR ALL
    USING (is_internal_user_or_above(auth.uid()));

CREATE POLICY "External user cinema access" ON sessions FOR ALL
    USING (
        get_user_role(auth.uid()) = 'external'
        AND has_cinema_access(auth.uid(), cinema_id)
    )
    WITH CHECK (
        get_user_role(auth.uid()) = 'external'
        AND has_cinema_access(auth.uid(), cinema_id)
    );

-- User profiles
CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT
    USING (auth.uid() = id OR is_internal_admin_or_above(auth.uid()));

CREATE POLICY "Users update own basic info" ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Users can only update their own non-sensitive fields
        -- Role changes require admin
    );

CREATE POLICY "Internal admin manage users" ON user_profiles FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));

-- Import jobs: internal_user+ can create, view own or admin sees all
CREATE POLICY "Internal user create imports" ON import_jobs FOR INSERT
    WITH CHECK (is_internal_user_or_above(auth.uid()));

CREATE POLICY "Users read own imports" ON import_jobs FOR SELECT
    USING (user_id = auth.uid() OR is_internal_admin_or_above(auth.uid()));

-- Export: internal_admin+ for client/template management
CREATE POLICY "Internal admin exports" ON export_clients FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin templates" ON export_templates FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));

-- Export jobs: internal_user+ can create
CREATE POLICY "Internal user export jobs" ON export_jobs FOR ALL
    USING (is_internal_user_or_above(auth.uid()));

-- Audit logs: internal_admin+ read only
CREATE POLICY "Internal admin read audit" ON audit_logs FOR SELECT
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "System insert audit" ON audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- UPDATE USER CINEMA PERMISSIONS TABLE
-- ============================================================================

-- Add more granular permissions for external users
ALTER TABLE user_cinema_permissions
    ADD COLUMN IF NOT EXISTS can_view_sessions BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_create_sessions BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_edit_sessions BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_delete_sessions BOOLEAN DEFAULT FALSE;

ALTER TABLE user_cinema_group_permissions
    ADD COLUMN IF NOT EXISTS can_view_sessions BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_create_sessions BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_edit_sessions BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_delete_sessions BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- UPDATE AUTO-CREATE USER TRIGGER
-- ============================================================================

-- New users default to 'external' role (no access until admin assigns cinemas)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'external'  -- Default to external (most restricted)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
