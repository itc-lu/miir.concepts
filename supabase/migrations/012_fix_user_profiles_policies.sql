-- Migration 012: Fix user_profiles policies for role updates
-- Uses direct SQL without helper functions to avoid enum casting issues

-- ============================================================================
-- STEP 1: Drop existing user_profiles policies
-- ============================================================================

DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own basic info" ON user_profiles;
DROP POLICY IF EXISTS "Internal admin manage users" ON user_profiles;

-- ============================================================================
-- STEP 2: Create simple policies using direct SQL (no helper functions)
-- ============================================================================

-- Users can read their own profile, admins can read all
CREATE POLICY "user_profiles_select" ON user_profiles
    FOR SELECT
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin')
        )
    );

-- Users can update their own basic info (name, phone, avatar - NOT role)
CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Prevent users from changing their own role
        AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
    );

-- Global admin and internal admin can update all users including roles
CREATE POLICY "user_profiles_admin_update" ON user_profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin')
        )
    );

-- Global admin and internal admin can insert new users
CREATE POLICY "user_profiles_admin_insert" ON user_profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin')
        )
    );

-- Global admin and internal admin can delete users
CREATE POLICY "user_profiles_admin_delete" ON user_profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin')
        )
    );

-- ============================================================================
-- STEP 3: Grant permissions
-- ============================================================================

GRANT ALL ON user_profiles TO authenticated;
