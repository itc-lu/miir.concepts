-- Migration 010: Fix ALL helper functions to avoid user_role = text comparison
-- This migration completely rewrites all helper functions using plpgsql with proper enum handling

-- ============================================================================
-- STEP 1: Drop ALL existing helper functions with CASCADE
-- ============================================================================

DROP FUNCTION IF EXISTS is_global_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_internal_admin_or_above(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_internal_user_or_above(UUID) CASCADE;
DROP FUNCTION IF EXISTS has_cinema_access(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_accessible_cinema_ids(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_or_above(UUID) CASCADE;

-- ============================================================================
-- STEP 2: Recreate ALL helper functions using plpgsql with explicit enum handling
-- ============================================================================

-- Check if user is global admin
CREATE FUNCTION is_global_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;
    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN user_role_val = 'global_admin'::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is internal admin or above
CREATE FUNCTION is_internal_admin_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;
    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN user_role_val = 'global_admin'::user_role
        OR user_role_val = 'internal_admin'::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is internal user or above
CREATE FUNCTION is_internal_user_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;
    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN user_role_val = 'global_admin'::user_role
        OR user_role_val = 'internal_admin'::user_role
        OR user_role_val = 'internal_user'::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user role
CREATE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
DECLARE
    role_val user_role;
BEGIN
    SELECT role INTO role_val FROM user_profiles WHERE id = user_uuid;
    RETURN role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if external user has access to a specific cinema
CREATE FUNCTION has_cinema_access(user_uuid UUID, cinema_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;

    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Global admin and internal roles have access to all cinemas
    IF user_role_val = 'global_admin'::user_role
       OR user_role_val = 'internal_admin'::user_role
       OR user_role_val = 'internal_user'::user_role THEN
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
CREATE FUNCTION get_accessible_cinema_ids(user_uuid UUID)
RETURNS UUID[] AS $$
DECLARE
    user_role_val user_role;
    cinema_ids UUID[];
BEGIN
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;

    IF user_role_val IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;

    -- Global admin and internal roles have access to all cinemas
    IF user_role_val = 'global_admin'::user_role
       OR user_role_val = 'internal_admin'::user_role
       OR user_role_val = 'internal_user'::user_role THEN
        SELECT array_agg(id) INTO cinema_ids FROM cinemas;
        RETURN COALESCE(cinema_ids, ARRAY[]::UUID[]);
    END IF;

    -- External users: get permitted cinemas
    IF user_role_val = 'external'::user_role THEN
        SELECT array_agg(DISTINCT cinema_id) INTO cinema_ids
        FROM (
            SELECT cinema_id FROM user_cinema_permissions WHERE user_id = user_uuid
            UNION
            SELECT c.id FROM user_cinema_group_permissions ucgp
            JOIN cinemas c ON c.cinema_group_id = ucgp.cinema_group_id
            WHERE ucgp.user_id = user_uuid
        ) permitted_cinemas;
        RETURN COALESCE(cinema_ids, ARRAY[]::UUID[]);
    END IF;

    RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 3: Recreate ALL policies that were dropped by CASCADE
-- ============================================================================

-- Reference tables: public read, internal_admin+ write
DROP POLICY IF EXISTS "Public read access" ON countries;
DROP POLICY IF EXISTS "Internal admin write" ON countries;
CREATE POLICY "Public read access" ON countries FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON countries FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON languages;
DROP POLICY IF EXISTS "Internal admin write" ON languages;
CREATE POLICY "Public read access" ON languages FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON languages FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON formats;
DROP POLICY IF EXISTS "Internal admin write" ON formats;
CREATE POLICY "Public read access" ON formats FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON formats FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON technologies;
DROP POLICY IF EXISTS "Internal admin write" ON technologies;
CREATE POLICY "Public read access" ON technologies FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON technologies FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON genres;
DROP POLICY IF EXISTS "Internal admin write" ON genres;
CREATE POLICY "Public read access" ON genres FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON genres FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON age_ratings;
DROP POLICY IF EXISTS "Internal admin write" ON age_ratings;
CREATE POLICY "Public read access" ON age_ratings FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON age_ratings FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON cinema_tags;
DROP POLICY IF EXISTS "Internal admin write" ON cinema_tags;
CREATE POLICY "Public read access" ON cinema_tags FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON cinema_tags FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON movie_tags;
DROP POLICY IF EXISTS "Internal admin write" ON movie_tags;
CREATE POLICY "Public read access" ON movie_tags FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON movie_tags FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON session_tags;
DROP POLICY IF EXISTS "Internal admin write" ON session_tags;
CREATE POLICY "Public read access" ON session_tags FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON session_tags FOR ALL USING (is_internal_admin_or_above(auth.uid()));

-- Cinema Groups & Cinemas
DROP POLICY IF EXISTS "Public read access" ON cinema_groups;
DROP POLICY IF EXISTS "Internal admin write" ON cinema_groups;
CREATE POLICY "Public read access" ON cinema_groups FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON cinema_groups FOR ALL USING (is_internal_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Public read access" ON cinemas;
DROP POLICY IF EXISTS "Internal admin write" ON cinemas;
CREATE POLICY "Public read access" ON cinemas FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON cinemas FOR ALL USING (is_internal_admin_or_above(auth.uid()));

-- People
DROP POLICY IF EXISTS "Public read access" ON people;
DROP POLICY IF EXISTS "Internal admin write" ON people;
CREATE POLICY "Public read access" ON people FOR SELECT USING (true);
CREATE POLICY "Internal admin write" ON people FOR ALL USING (is_internal_admin_or_above(auth.uid()));

-- Movies L0/L1/L2
DROP POLICY IF EXISTS "movies_l0_select" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_insert" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_update" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_delete" ON movies_l0;
DROP POLICY IF EXISTS "Internal user write" ON movies_l0;
DROP POLICY IF EXISTS "Public read access" ON movies_l0;

CREATE POLICY "movies_l0_select" ON movies_l0 FOR SELECT USING (true);
CREATE POLICY "movies_l0_insert" ON movies_l0 FOR INSERT WITH CHECK (is_internal_user_or_above(auth.uid()));
CREATE POLICY "movies_l0_update" ON movies_l0 FOR UPDATE USING (is_internal_user_or_above(auth.uid()));
CREATE POLICY "movies_l0_delete" ON movies_l0 FOR DELETE USING (is_internal_user_or_above(auth.uid()));

DROP POLICY IF EXISTS "movies_l1_select" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_insert" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_update" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_delete" ON movies_l1;
DROP POLICY IF EXISTS "Internal user write" ON movies_l1;
DROP POLICY IF EXISTS "Public read access" ON movies_l1;

CREATE POLICY "movies_l1_select" ON movies_l1 FOR SELECT USING (true);
CREATE POLICY "movies_l1_insert" ON movies_l1 FOR INSERT WITH CHECK (is_internal_user_or_above(auth.uid()));
CREATE POLICY "movies_l1_update" ON movies_l1 FOR UPDATE USING (is_internal_user_or_above(auth.uid()));
CREATE POLICY "movies_l1_delete" ON movies_l1 FOR DELETE USING (is_internal_user_or_above(auth.uid()));

DROP POLICY IF EXISTS "movies_l2_select" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_insert" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_update" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_delete" ON movies_l2;
DROP POLICY IF EXISTS "Internal user write" ON movies_l2;
DROP POLICY IF EXISTS "Public read access" ON movies_l2;

CREATE POLICY "movies_l2_select" ON movies_l2 FOR SELECT USING (true);
CREATE POLICY "movies_l2_insert" ON movies_l2 FOR INSERT WITH CHECK (is_internal_user_or_above(auth.uid()));
CREATE POLICY "movies_l2_update" ON movies_l2 FOR UPDATE USING (is_internal_user_or_above(auth.uid()));
CREATE POLICY "movies_l2_delete" ON movies_l2 FOR DELETE USING (is_internal_user_or_above(auth.uid()));

-- Sessions
DROP POLICY IF EXISTS "Public read access" ON sessions;
DROP POLICY IF EXISTS "Internal user full access" ON sessions;
DROP POLICY IF EXISTS "External user cinema access" ON sessions;

CREATE POLICY "Public read access" ON sessions FOR SELECT USING (true);
CREATE POLICY "Internal user full access" ON sessions FOR ALL USING (is_internal_user_or_above(auth.uid()));
CREATE POLICY "External user cinema access" ON sessions FOR ALL
    USING (has_cinema_access(auth.uid(), cinema_id))
    WITH CHECK (has_cinema_access(auth.uid(), cinema_id));

-- User profiles
DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Internal admin manage users" ON user_profiles;

CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT
    USING (auth.uid() = id OR is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin manage users" ON user_profiles FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));

-- Import jobs
DROP POLICY IF EXISTS "Internal user create imports" ON import_jobs;
DROP POLICY IF EXISTS "Users read own imports" ON import_jobs;

CREATE POLICY "Internal user create imports" ON import_jobs FOR INSERT
    WITH CHECK (is_internal_user_or_above(auth.uid()));
CREATE POLICY "Users read own imports" ON import_jobs FOR SELECT
    USING (user_id = auth.uid() OR is_internal_admin_or_above(auth.uid()));

-- Export
DROP POLICY IF EXISTS "Internal admin exports" ON export_clients;
DROP POLICY IF EXISTS "Internal admin templates" ON export_templates;
DROP POLICY IF EXISTS "Internal user export jobs" ON export_jobs;

CREATE POLICY "Internal admin exports" ON export_clients FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal admin templates" ON export_templates FOR ALL
    USING (is_internal_admin_or_above(auth.uid()));
CREATE POLICY "Internal user export jobs" ON export_jobs FOR ALL
    USING (is_internal_user_or_above(auth.uid()));

-- Audit logs
DROP POLICY IF EXISTS "Internal admin read audit" ON audit_logs;
CREATE POLICY "Internal admin read audit" ON audit_logs FOR SELECT
    USING (is_internal_admin_or_above(auth.uid()));

-- Movie L2 subtitles
DROP POLICY IF EXISTS "Editor write access" ON movie_l2_subtitles;
DROP POLICY IF EXISTS "Public read access" ON movie_l2_subtitles;

CREATE POLICY "Public read access" ON movie_l2_subtitles FOR SELECT USING (true);
CREATE POLICY "Internal user write" ON movie_l2_subtitles FOR ALL
    USING (is_internal_user_or_above(auth.uid()));

-- ============================================================================
-- STEP 4: Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT ALL ON movies_l0 TO authenticated;
GRANT ALL ON movies_l1 TO authenticated;
GRANT ALL ON movies_l2 TO authenticated;

GRANT EXECUTE ON FUNCTION is_global_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_global_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_internal_admin_or_above(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_internal_admin_or_above(UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_internal_user_or_above(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_internal_user_or_above(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO anon;
GRANT EXECUTE ON FUNCTION has_cinema_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_cinema_access(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_accessible_cinema_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessible_cinema_ids(UUID) TO anon;
