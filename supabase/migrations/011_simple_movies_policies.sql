-- Migration 011: Simple movies policies without helper functions
-- Bypasses helper functions entirely to avoid enum casting issues

-- ============================================================================
-- STEP 1: Drop ALL existing policies on movies tables
-- ============================================================================

DROP POLICY IF EXISTS "movies_l0_select" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_insert" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_update" ON movies_l0;
DROP POLICY IF EXISTS "movies_l0_delete" ON movies_l0;
DROP POLICY IF EXISTS "Internal user write" ON movies_l0;
DROP POLICY IF EXISTS "Public read access" ON movies_l0;
DROP POLICY IF EXISTS "Editor write access" ON movies_l0;

DROP POLICY IF EXISTS "movies_l1_select" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_insert" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_update" ON movies_l1;
DROP POLICY IF EXISTS "movies_l1_delete" ON movies_l1;
DROP POLICY IF EXISTS "Internal user write" ON movies_l1;
DROP POLICY IF EXISTS "Public read access" ON movies_l1;
DROP POLICY IF EXISTS "Editor write access" ON movies_l1;

DROP POLICY IF EXISTS "movies_l2_select" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_insert" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_update" ON movies_l2;
DROP POLICY IF EXISTS "movies_l2_delete" ON movies_l2;
DROP POLICY IF EXISTS "Internal user write" ON movies_l2;
DROP POLICY IF EXISTS "Public read access" ON movies_l2;
DROP POLICY IF EXISTS "Editor write access" ON movies_l2;

-- ============================================================================
-- STEP 2: Create simple policies using direct SQL (no helper functions)
-- ============================================================================

-- Movies L0: Anyone can read, internal users+ can write
CREATE POLICY "movies_l0_select" ON movies_l0
    FOR SELECT
    USING (true);

CREATE POLICY "movies_l0_insert" ON movies_l0
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

CREATE POLICY "movies_l0_update" ON movies_l0
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

CREATE POLICY "movies_l0_delete" ON movies_l0
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

-- Movies L1
CREATE POLICY "movies_l1_select" ON movies_l1
    FOR SELECT
    USING (true);

CREATE POLICY "movies_l1_insert" ON movies_l1
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

CREATE POLICY "movies_l1_update" ON movies_l1
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

CREATE POLICY "movies_l1_delete" ON movies_l1
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

-- Movies L2
CREATE POLICY "movies_l2_select" ON movies_l2
    FOR SELECT
    USING (true);

CREATE POLICY "movies_l2_insert" ON movies_l2
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

CREATE POLICY "movies_l2_update" ON movies_l2
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

CREATE POLICY "movies_l2_delete" ON movies_l2
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

-- ============================================================================
-- STEP 3: Grant permissions
-- ============================================================================

GRANT ALL ON movies_l0 TO authenticated;
GRANT ALL ON movies_l1 TO authenticated;
GRANT ALL ON movies_l2 TO authenticated;
GRANT SELECT ON movies_l0 TO anon;
GRANT SELECT ON movies_l1 TO anon;
GRANT SELECT ON movies_l2 TO anon;
