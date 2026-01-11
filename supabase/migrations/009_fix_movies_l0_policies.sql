-- Migration 009: Fix movies_l0 RLS policies to allow creation
-- Addresses 404 error when creating movies

-- First, drop any potentially conflicting policies on movies_l0
DROP POLICY IF EXISTS "Editor write access" ON movies_l0;
DROP POLICY IF EXISTS "Internal user write" ON movies_l0;
DROP POLICY IF EXISTS "Public read access" ON movies_l0;

-- Also fix movies_l1 and movies_l2 for consistency
DROP POLICY IF EXISTS "Editor write access" ON movies_l1;
DROP POLICY IF EXISTS "Internal user write" ON movies_l1;
DROP POLICY IF EXISTS "Public read access" ON movies_l1;

DROP POLICY IF EXISTS "Editor write access" ON movies_l2;
DROP POLICY IF EXISTS "Internal user write" ON movies_l2;
DROP POLICY IF EXISTS "Public read access" ON movies_l2;

-- Recreate clean policies for movies_l0
-- Public read - anyone can view movies
CREATE POLICY "movies_l0_select" ON movies_l0
    FOR SELECT
    USING (true);

-- Internal users and above can create/update/delete movies
CREATE POLICY "movies_l0_insert" ON movies_l0
    FOR INSERT
    WITH CHECK (is_internal_user_or_above(auth.uid()));

CREATE POLICY "movies_l0_update" ON movies_l0
    FOR UPDATE
    USING (is_internal_user_or_above(auth.uid()))
    WITH CHECK (is_internal_user_or_above(auth.uid()));

CREATE POLICY "movies_l0_delete" ON movies_l0
    FOR DELETE
    USING (is_internal_user_or_above(auth.uid()));

-- Recreate clean policies for movies_l1
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

-- Recreate clean policies for movies_l2
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

-- Verify the function exists and is correct
CREATE OR REPLACE FUNCTION is_internal_user_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Return TRUE if user has internal_user, internal_admin, or global_admin role
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_uuid
        AND role IN ('global_admin'::user_role, 'internal_admin'::user_role, 'internal_user'::user_role)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON movies_l0 TO authenticated;
GRANT ALL ON movies_l1 TO authenticated;
GRANT ALL ON movies_l2 TO authenticated;
