-- Migration 013: Add import title mappings for automatic movie matching
-- Stores "import string" -> "movie edition" mappings per cinema group

-- ============================================================================
-- STEP 1: Create import_title_mappings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_title_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cinema_group_id UUID REFERENCES cinema_groups(id) ON DELETE CASCADE,
    import_title TEXT NOT NULL, -- The exact string from the imported file
    normalized_title TEXT NOT NULL, -- Normalized version for matching
    movie_l0_id UUID REFERENCES movies_l0(id) ON DELETE SET NULL,
    movie_l1_id UUID REFERENCES movies_l1(id) ON DELETE SET NULL,
    movie_l2_id UUID REFERENCES movies_l2(id) ON DELETE SET NULL,
    language_code TEXT, -- Detected language code
    format_code TEXT, -- Detected format (3D, IMAX, etc)
    is_verified BOOLEAN DEFAULT FALSE, -- Whether a human verified this mapping
    match_count INTEGER DEFAULT 1, -- How many times this mapping was used
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(cinema_group_id, import_title)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_import_title_mappings_lookup
    ON import_title_mappings(cinema_group_id, normalized_title);

CREATE INDEX IF NOT EXISTS idx_import_title_mappings_movie
    ON import_title_mappings(movie_l0_id);

-- ============================================================================
-- STEP 2: Enable RLS
-- ============================================================================

ALTER TABLE import_title_mappings ENABLE ROW LEVEL SECURITY;

-- Anyone can read mappings
CREATE POLICY "import_title_mappings_select" ON import_title_mappings
    FOR SELECT
    USING (true);

-- Internal admins can manage mappings
CREATE POLICY "import_title_mappings_insert" ON import_title_mappings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

CREATE POLICY "import_title_mappings_update" ON import_title_mappings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin', 'internal_user')
        )
    );

CREATE POLICY "import_title_mappings_delete" ON import_title_mappings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role::text IN ('global_admin', 'internal_admin')
        )
    );

-- Grant permissions
GRANT ALL ON import_title_mappings TO authenticated;
GRANT SELECT ON import_title_mappings TO anon;

-- ============================================================================
-- STEP 3: Add function to normalize import titles for matching
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_import_title(title TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove age ratings like (12), (PG-13), etc.
    -- Remove format indicators like 3D, IMAX
    -- Remove leading/trailing whitespace
    -- Convert to lowercase
    RETURN LOWER(
        TRIM(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(title, '\s*\([^)]+\)\s*$', '', 'g'),
                    '\s*(3D|IMAX|4DX|ATMOS|Dolby|D-BOX|ScreenX)\s*', '', 'gi'
                ),
                '\s+', ' ', 'g'
            )
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 4: Add trigger to auto-update normalized_title
-- ============================================================================

CREATE OR REPLACE FUNCTION update_import_title_mapping_normalized()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_title := normalize_import_title(NEW.import_title);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_import_title_mapping_normalize
    BEFORE INSERT OR UPDATE ON import_title_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_import_title_mapping_normalized();

-- ============================================================================
-- STEP 5: Add helper function to find or create mapping
-- ============================================================================

CREATE OR REPLACE FUNCTION find_or_create_import_mapping(
    p_cinema_group_id UUID,
    p_import_title TEXT,
    p_movie_l0_id UUID DEFAULT NULL,
    p_movie_l1_id UUID DEFAULT NULL,
    p_movie_l2_id UUID DEFAULT NULL,
    p_language_code TEXT DEFAULT NULL,
    p_format_code TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS import_title_mappings AS $$
DECLARE
    v_mapping import_title_mappings;
    v_normalized TEXT;
BEGIN
    v_normalized := normalize_import_title(p_import_title);

    -- Try to find existing mapping
    SELECT * INTO v_mapping
    FROM import_title_mappings
    WHERE cinema_group_id = p_cinema_group_id
      AND normalized_title = v_normalized
    LIMIT 1;

    IF FOUND THEN
        -- Update match count and last used
        UPDATE import_title_mappings
        SET match_count = match_count + 1,
            last_used_at = NOW()
        WHERE id = v_mapping.id;

        RETURN v_mapping;
    END IF;

    -- Create new mapping if movie provided
    IF p_movie_l0_id IS NOT NULL OR p_movie_l1_id IS NOT NULL OR p_movie_l2_id IS NOT NULL THEN
        INSERT INTO import_title_mappings (
            cinema_group_id,
            import_title,
            normalized_title,
            movie_l0_id,
            movie_l1_id,
            movie_l2_id,
            language_code,
            format_code,
            created_by
        ) VALUES (
            p_cinema_group_id,
            p_import_title,
            v_normalized,
            p_movie_l0_id,
            p_movie_l1_id,
            p_movie_l2_id,
            p_language_code,
            p_format_code,
            p_user_id
        )
        RETURNING * INTO v_mapping;

        RETURN v_mapping;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
