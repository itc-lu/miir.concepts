-- Migration 009: Fix movies_l0 RLS policies to allow creation
-- Addresses 404 error and "operator does not exist: user_role = text" error

-- ============================================================================
-- STEP 1: Drop all existing policies first
-- ============================================================================

DROP POLICY IF EXISTS "Editor write access" ON movies_l0;
DROP POLICY IF EXISTS "Internal user write" ON movies_l0;
DROP POLICY IF EXISTS "Public read access" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_select" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_insert" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_update" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_delete" ON movies_l0;

DROP POLICY IF EXISTS "Editor write access" ON movies_l1;
DROP POLICY IF EXISTS "Internal user write" ON movies_l1;
DROP POLICY IF EXISTS "Public read access" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_select" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_insert" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_update" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_delete" ON movies_l1;

DROP POLICY IF EXISTS "Editor write access" ON movies_l2;
DROP POLICY IF EXISTS "Internal user write" ON movies_l2;
DROP POLICY IF EXISTS "Public read access" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_select" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_insert" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_update" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_delete" ON movies_l2;

-- ============================================================================
-- STEP 2: Drop and recreate the helper function with proper enum casting
-- ============================================================================

DROP FUNCTION IF EXISTS is_internal_user_or_above(UUID) CASCADE;

CREATE FUNCTION is_internal_user_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    -- Get the user's role (already typed as user_role enum)
    SELECT role INTO user_role_val FROM user_profiles WHERE id = user_uuid;

    -- If user not found, return false
    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Compare enum to enum (no text comparison)
    RETURN user_role_val = 'global_admin'::user_role
        OR user_role_val = 'internal_admin'::user_role
        OR user_role_val = 'internal_user'::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 3: Recreate policies for movies_l0
-- ============================================================================

-- Public read - anyone can view movies
CREATE POLICY "movies_l0_select" ON movies_l0
    FOR SELECT
    USING (true);

-- Internal users and above can create movies
CREATE POLICY "movies_l0_insert" ON movies_l0
    FOR INSERT
    WITH CHECK (is_internal_user_or_above(auth.uid()));

-- Internal users and above can update movies
CREATE POLICY "movies_l0_update" ON movies_l0
    FOR UPDATE
    USING (is_internal_user_or_above(auth.uid()))
    WITH CHECK (is_internal_user_or_above(auth.uid()));

-- Internal users and above can delete movies
CREATE POLICY "movies_l0_delete" ON movies_l0
    FOR DELETE
    USING (is_internal_user_or_above(auth.uid()));

-- ============================================================================
-- STEP 4: Recreate policies for movies_l1
-- ============================================================================

CREATE POLICY "movies_l1_select" ON movies_l1
    FOR SELECT
    USING (true);

CREATE POLICY "movies_l1_insert" ON movies_l1
    FOR INSERT
    WITH CHECK (is_internal_user_or_above(auth.uid()));

CREATE POLICY "movies_l1_update" ON movies_l1
    FOR UPDATE
    USING (is_internal_user_or_above(auth.uid()))
    WITH CHECK (is_internal_user_or_above(auth.uid()));

CREATE POLICY "movies_l1_delete" ON movies_l1
    FOR DELETE
    USING (is_internal_user_or_above(auth.uid()));

-- ============================================================================
-- STEP 5: Recreate policies for movies_l2
-- ============================================================================

CREATE POLICY "movies_l2_select" ON movies_l2
    FOR SELECT
    USING (true);

CREATE POLICY "movies_l2_insert" ON movies_l2
    FOR INSERT
    WITH CHECK (is_internal_user_or_above(auth.uid()));

CREATE POLICY "movies_l2_update" ON movies_l2
    FOR UPDATE
    USING (is_internal_user_or_above(auth.uid()))
    WITH CHECK (is_internal_user_or_above(auth.uid()));

CREATE POLICY "movies_l2_delete" ON movies_l2
    FOR DELETE
    USING (is_internal_user_or_above(auth.uid()));

-- ============================================================================
-- STEP 6: Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON movies_l0 TO authenticated;
GRANT ALL ON movies_l1 TO authenticated;
GRANT ALL ON movies_l2 TO authenticated;
