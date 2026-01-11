-- Migration 008: Enhance import_jobs for better history tracking
-- Adds cinema_group support, sheet mapping, and better status tracking

-- ============================================================================
-- ENHANCE IMPORT_JOBS TABLE
-- ============================================================================

-- Add cinema_group_id to import_jobs
ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS cinema_group_id UUID REFERENCES cinema_groups(id) ON DELETE SET NULL;

-- Add parser_id (reference to actual parser record - only if parsers table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsers') THEN
        ALTER TABLE import_jobs
        ADD COLUMN IF NOT EXISTS parser_id UUID REFERENCES parsers(id) ON DELETE SET NULL;
    ELSE
        ALTER TABLE import_jobs
        ADD COLUMN IF NOT EXISTS parser_id UUID;
    END IF;
END $$;

-- Add file size for auditing
ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- Add original file name (file_name might be altered)
ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS original_file_name TEXT;

-- Add sheet count
ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS sheet_count INT DEFAULT 0;

-- Add summary data as JSONB
ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{}';

-- ============================================================================
-- IMPORT JOB SHEETS TABLE (for multi-sheet mapping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_job_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,

    -- Sheet identification
    sheet_index INT NOT NULL,
    sheet_name TEXT NOT NULL,

    -- Cinema mapping (user maps each sheet to a cinema)
    cinema_id UUID REFERENCES cinemas(id) ON DELETE SET NULL,

    -- Sheet stats
    film_count INT DEFAULT 0,
    session_count INT DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,

    -- Processing status
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, skipped
    errors JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    UNIQUE(import_job_id, sheet_index)
);

-- ============================================================================
-- UPDATE IMPORT STATUS ENUM
-- ============================================================================

-- Add new status values if not already present
DO $$
BEGIN
    -- Add 'preview' status for initial sheet detection
    ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'preview';
    -- Add 'mapping' status for sheet-to-cinema mapping phase
    ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'mapping';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_import_jobs_cinema_group ON import_jobs(cinema_group_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_parser ON import_jobs(parser_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);

CREATE INDEX IF NOT EXISTS idx_import_job_sheets_job ON import_job_sheets(import_job_id);
CREATE INDEX IF NOT EXISTS idx_import_job_sheets_cinema ON import_job_sheets(cinema_id);

-- ============================================================================
-- RLS POLICIES FOR IMPORT_JOB_SHEETS
-- ============================================================================

ALTER TABLE import_job_sheets ENABLE ROW LEVEL SECURITY;

-- Users can view sheets from jobs they have access to
CREATE POLICY "import_job_sheets_select" ON import_job_sheets FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM import_jobs j
            WHERE j.id = import_job_id
            AND (
                j.user_id = auth.uid() OR
                is_internal_admin_or_above(auth.uid()) OR
                has_cinema_access(auth.uid(), j.cinema_id)
            )
        )
    );

-- Admins can manage all sheets
CREATE POLICY "import_job_sheets_admin" ON import_job_sheets FOR ALL TO authenticated
    USING (is_internal_admin_or_above(auth.uid()));

-- Users can manage sheets in their own jobs
CREATE POLICY "import_job_sheets_owner" ON import_job_sheets FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM import_jobs j
            WHERE j.id = import_job_id AND j.user_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTION: Get import history for a cinema or group
-- ============================================================================

-- Note: get_import_history function is created conditionally to handle missing parsers table
DO $$
BEGIN
    -- Drop existing function if it exists
    DROP FUNCTION IF EXISTS get_import_history(UUID, UUID, INT, INT);

    -- Create the function
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsers') THEN
        EXECUTE '
        CREATE FUNCTION get_import_history(
            p_cinema_id UUID DEFAULT NULL,
            p_cinema_group_id UUID DEFAULT NULL,
            p_limit INT DEFAULT 50,
            p_offset INT DEFAULT 0
        )
        RETURNS TABLE (
            id UUID,
            user_id UUID,
            user_email TEXT,
            cinema_id UUID,
            cinema_name TEXT,
            cinema_group_id UUID,
            cinema_group_name TEXT,
            file_name VARCHAR,
            parser_name TEXT,
            status import_status,
            total_records INT,
            success_records INT,
            error_records INT,
            sheet_count INT,
            created_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ
        )
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT
                ij.id,
                ij.user_id,
                up.email::TEXT AS user_email,
                ij.cinema_id,
                c.name::TEXT AS cinema_name,
                ij.cinema_group_id,
                cg.name::TEXT AS cinema_group_name,
                ij.file_name,
                p.name::TEXT AS parser_name,
                ij.status,
                ij.total_records,
                ij.success_records,
                ij.error_records,
                ij.sheet_count,
                ij.created_at,
                ij.completed_at
            FROM import_jobs ij
            LEFT JOIN user_profiles up ON up.id = ij.user_id
            LEFT JOIN cinemas c ON c.id = ij.cinema_id
            LEFT JOIN cinema_groups cg ON cg.id = ij.cinema_group_id
            LEFT JOIN parsers p ON p.id = ij.parser_id
            WHERE
                (p_cinema_id IS NULL OR ij.cinema_id = p_cinema_id) AND
                (p_cinema_group_id IS NULL OR ij.cinema_group_id = p_cinema_group_id OR
                 (ij.cinema_id IN (SELECT cid.id FROM cinemas cid WHERE cid.cinema_group_id = p_cinema_group_id)))
            ORDER BY ij.created_at DESC
            LIMIT p_limit
            OFFSET p_offset;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER';
    ELSE
        -- Create version without parsers join
        EXECUTE '
        CREATE FUNCTION get_import_history(
            p_cinema_id UUID DEFAULT NULL,
            p_cinema_group_id UUID DEFAULT NULL,
            p_limit INT DEFAULT 50,
            p_offset INT DEFAULT 0
        )
        RETURNS TABLE (
            id UUID,
            user_id UUID,
            user_email TEXT,
            cinema_id UUID,
            cinema_name TEXT,
            cinema_group_id UUID,
            cinema_group_name TEXT,
            file_name VARCHAR,
            parser_name TEXT,
            status import_status,
            total_records INT,
            success_records INT,
            error_records INT,
            sheet_count INT,
            created_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ
        )
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT
                ij.id,
                ij.user_id,
                up.email::TEXT AS user_email,
                ij.cinema_id,
                c.name::TEXT AS cinema_name,
                ij.cinema_group_id,
                cg.name::TEXT AS cinema_group_name,
                ij.file_name,
                NULL::TEXT AS parser_name,
                ij.status,
                ij.total_records,
                ij.success_records,
                ij.error_records,
                ij.sheet_count,
                ij.created_at,
                ij.completed_at
            FROM import_jobs ij
            LEFT JOIN user_profiles up ON up.id = ij.user_id
            LEFT JOIN cinemas c ON c.id = ij.cinema_id
            LEFT JOIN cinema_groups cg ON cg.id = ij.cinema_group_id
            WHERE
                (p_cinema_id IS NULL OR ij.cinema_id = p_cinema_id) AND
                (p_cinema_group_id IS NULL OR ij.cinema_group_id = p_cinema_group_id OR
                 (ij.cinema_id IN (SELECT cid.id FROM cinemas cid WHERE cid.cinema_group_id = p_cinema_group_id)))
            ORDER BY ij.created_at DESC
            LIMIT p_limit
            OFFSET p_offset;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER';
    END IF;
END $$;
