-- Migration 006: Parser System and Import Conflicts
-- Implements the complete parser infrastructure for cinema schedule imports

-- ============================================================================
-- PARSERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS parsers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    supported_formats TEXT[] DEFAULT ARRAY['xlsx', 'xls'], -- File formats this parser can handle
    config_schema JSONB DEFAULT '{}', -- JSON schema for parser configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default parsers
INSERT INTO parsers (name, slug, description, supported_formats) VALUES
    ('Kinepolis', 'kinepolis', 'Generic Kinepolis cinema schedule format', ARRAY['xlsx', 'xls']),
    ('Kinepolis France - Longwy/Thionville', 'kinepolis-fr-longwy-thionville', 'French Kinepolis format for Longwy and Thionville cinemas', ARRAY['xlsx', 'xls']),
    ('Kinepolis France - Metz/Amphitheatre', 'kinepolis-fr-metz-amphitheatre', 'French Kinepolis format for Metz and Amphitheatre cinemas', ARRAY['xlsx', 'xls']),
    ('Kinepolis France - Waves', 'kinepolis-fr-waves', 'French Kinepolis format for Waves cinema', ARRAY['xlsx', 'xls']),
    ('Cinextdoor', 'cinextdoor', 'Cinextdoor cinema schedule format', ARRAY['xlsx', 'xls']),
    ('Scala Cinextdoor', 'scala-cinextdoor', 'Scala cinema schedule format (German dates in images)', ARRAY['xlsx', 'xls'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- UPDATE CINEMA GROUPS AND CINEMAS FOR PARSER ASSIGNMENT
-- ============================================================================

-- Add parser_id to cinema_groups (group-level default parser)
ALTER TABLE cinema_groups
ADD COLUMN IF NOT EXISTS parser_id UUID REFERENCES parsers(id) ON DELETE SET NULL;

-- Add parser_id to cinemas (can override group parser)
ALTER TABLE cinemas
ADD COLUMN IF NOT EXISTS parser_id UUID REFERENCES parsers(id) ON DELETE SET NULL;

-- ============================================================================
-- LANGUAGE MAPPING SYSTEM
-- ============================================================================

-- Language mapping configurations (e.g., "Default Mapping", "Kinepolis France Mapping")
CREATE TABLE IF NOT EXISTS language_mapping_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual mapping lines
CREATE TABLE IF NOT EXISTS language_mapping_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES language_mapping_configs(id) ON DELETE CASCADE,
    version_string TEXT NOT NULL, -- e.g., "VO st FR&NL", "VF", "OmU"
    spoken_language_id UUID REFERENCES languages(id) ON DELETE SET NULL, -- NULL means "Original Language (VO)"
    subtitle_language_ids UUID[] DEFAULT '{}', -- Array of language IDs for subtitles
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(config_id, version_string)
);

-- Insert default language mapping
INSERT INTO language_mapping_configs (name, description, is_default) VALUES
    ('Default Mapping', 'Standard European version string mappings', true)
ON CONFLICT DO NOTHING;

-- Link cinema groups to language mapping
ALTER TABLE cinema_groups
ADD COLUMN IF NOT EXISTS language_mapping_id UUID REFERENCES language_mapping_configs(id) ON DELETE SET NULL;

-- ============================================================================
-- IMPORT CONFLICT TABLES
-- ============================================================================

-- State enum for verification
DO $$ BEGIN
    CREATE TYPE import_conflict_state AS ENUM ('to_verify', 'verified', 'processed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Import conflict movies - temporary storage for movies needing review
CREATE TABLE IF NOT EXISTS import_conflict_movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tracking
    cinema_group_id UUID REFERENCES cinema_groups(id) ON DELETE CASCADE,
    cinema_id UUID REFERENCES cinemas(id) ON DELETE CASCADE,
    import_job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    parser_id UUID REFERENCES parsers(id) ON DELETE SET NULL,

    -- Imported data
    import_title TEXT NOT NULL, -- Full title string from import
    movie_name TEXT, -- Extracted movie name
    director TEXT,
    year_of_production INTEGER,
    country_of_production TEXT,
    plot_description TEXT,

    -- Matching
    matched_movie_l0_id UUID REFERENCES movies_l0(id) ON DELETE SET NULL, -- If matched to existing movie

    -- Status
    state import_conflict_state DEFAULT 'to_verify',
    missing_info TEXT, -- Description of what's missing
    is_created BOOLEAN DEFAULT false, -- Whether movie was created from this conflict

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    import_text TEXT -- Detailed import tracking
);

-- Import conflict editions - edition data within a movie conflict
CREATE TABLE IF NOT EXISTS import_conflict_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent references
    conflict_movie_id UUID NOT NULL REFERENCES import_conflict_movies(id) ON DELETE CASCADE,

    -- Edition data
    title TEXT,
    full_title TEXT, -- Complete string from import
    language_code TEXT, -- e.g., "EN", "FR", "VO"
    language_id UUID REFERENCES languages(id) ON DELETE SET NULL,
    duration_minutes INTEGER,
    duration_text TEXT, -- Original format e.g., "2:42"

    -- Additional info
    director TEXT,
    year_of_production INTEGER,
    country_of_production TEXT,
    countries_available TEXT[], -- Array of country names
    subtitle_languages TEXT[], -- Array of subtitle language codes
    subtitle_language_ids UUID[] DEFAULT '{}',
    tags TEXT[], -- Array of tag names
    format_codes TEXT[], -- Array of format names e.g., ["3D", "IMAX"]
    format_id UUID REFERENCES formats(id) ON DELETE SET NULL,
    technology_id UUID REFERENCES technologies(id) ON DELETE SET NULL,
    age_rating TEXT,
    age_rating_id UUID REFERENCES age_ratings(id) ON DELETE SET NULL,
    plot_description TEXT,
    version_string TEXT, -- Original version string e.g., "VO st FR&ALL"

    -- Status
    state import_conflict_state DEFAULT 'to_verify',
    missing_info TEXT,

    -- Matching
    matched_movie_l2_id UUID REFERENCES movies_l2(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    import_text TEXT
);

-- Import conflict sessions - session/showtime data
CREATE TABLE IF NOT EXISTS import_conflict_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent references
    conflict_movie_id UUID NOT NULL REFERENCES import_conflict_movies(id) ON DELETE CASCADE,
    conflict_edition_id UUID REFERENCES import_conflict_editions(id) ON DELETE SET NULL,

    -- Session data
    cinema_id UUID NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
    screening_datetime TIMESTAMPTZ NOT NULL,
    screening_date DATE,
    time_float DECIMAL(4,2), -- e.g., 14.5 for 14:30

    -- Edition info (denormalized for display)
    title TEXT,
    language_code TEXT,
    duration_minutes INTEGER,
    format_code TEXT,

    -- Week info
    start_week_day DATE,

    -- Status
    state import_conflict_state DEFAULT 'to_verify',
    missing_info TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    import_text TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_import_conflict_movies_cinema_group ON import_conflict_movies(cinema_group_id);
CREATE INDEX IF NOT EXISTS idx_import_conflict_movies_cinema ON import_conflict_movies(cinema_id);
CREATE INDEX IF NOT EXISTS idx_import_conflict_movies_state ON import_conflict_movies(state);
CREATE INDEX IF NOT EXISTS idx_import_conflict_movies_import_job ON import_conflict_movies(import_job_id);

CREATE INDEX IF NOT EXISTS idx_import_conflict_editions_movie ON import_conflict_editions(conflict_movie_id);
CREATE INDEX IF NOT EXISTS idx_import_conflict_editions_state ON import_conflict_editions(state);

CREATE INDEX IF NOT EXISTS idx_import_conflict_sessions_movie ON import_conflict_sessions(conflict_movie_id);
CREATE INDEX IF NOT EXISTS idx_import_conflict_sessions_edition ON import_conflict_sessions(conflict_edition_id);
CREATE INDEX IF NOT EXISTS idx_import_conflict_sessions_cinema ON import_conflict_sessions(cinema_id);
CREATE INDEX IF NOT EXISTS idx_import_conflict_sessions_datetime ON import_conflict_sessions(screening_datetime);

CREATE INDEX IF NOT EXISTS idx_language_mapping_lines_config ON language_mapping_lines(config_id);
CREATE INDEX IF NOT EXISTS idx_language_mapping_lines_version ON language_mapping_lines(version_string);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE parsers ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_mapping_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_mapping_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_conflict_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_conflict_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_conflict_sessions ENABLE ROW LEVEL SECURITY;

-- Parsers - read by all authenticated, modify by admins
CREATE POLICY "parsers_select" ON parsers FOR SELECT TO authenticated USING (true);
CREATE POLICY "parsers_admin" ON parsers FOR ALL TO authenticated
    USING (is_internal_admin_or_above(auth.uid()));

-- Language mappings - read by all authenticated, modify by admins
CREATE POLICY "lang_mapping_configs_select" ON language_mapping_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "lang_mapping_configs_admin" ON language_mapping_configs FOR ALL TO authenticated
    USING (is_internal_admin_or_above(auth.uid()));

CREATE POLICY "lang_mapping_lines_select" ON language_mapping_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "lang_mapping_lines_admin" ON language_mapping_lines FOR ALL TO authenticated
    USING (is_internal_admin_or_above(auth.uid()));

-- Import conflicts - accessible by admins and users with cinema access
CREATE POLICY "import_conflict_movies_select" ON import_conflict_movies FOR SELECT TO authenticated
    USING (
        is_internal_admin_or_above(auth.uid()) OR
        cinema_id = ANY(get_accessible_cinema_ids(auth.uid()))
    );
CREATE POLICY "import_conflict_movies_admin" ON import_conflict_movies FOR ALL TO authenticated
    USING (is_internal_admin_or_above(auth.uid()));

CREATE POLICY "import_conflict_editions_select" ON import_conflict_editions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM import_conflict_movies m
            WHERE m.id = conflict_movie_id
            AND (is_internal_admin_or_above(auth.uid()) OR m.cinema_id = ANY(get_accessible_cinema_ids(auth.uid())))
        )
    );
CREATE POLICY "import_conflict_editions_admin" ON import_conflict_editions FOR ALL TO authenticated
    USING (is_internal_admin_or_above(auth.uid()));

CREATE POLICY "import_conflict_sessions_select" ON import_conflict_sessions FOR SELECT TO authenticated
    USING (
        is_internal_admin_or_above(auth.uid()) OR
        cinema_id = ANY(get_accessible_cinema_ids(auth.uid()))
    );
CREATE POLICY "import_conflict_sessions_admin" ON import_conflict_sessions FOR ALL TO authenticated
    USING (is_internal_admin_or_above(auth.uid()));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get parser for a cinema (uses cinema's parser or falls back to group's parser)
CREATE OR REPLACE FUNCTION get_cinema_parser(p_cinema_id UUID)
RETURNS UUID AS $$
DECLARE
    v_parser_id UUID;
    v_group_parser_id UUID;
BEGIN
    -- First try cinema's own parser
    SELECT parser_id INTO v_parser_id FROM cinemas WHERE id = p_cinema_id;

    IF v_parser_id IS NOT NULL THEN
        RETURN v_parser_id;
    END IF;

    -- Fall back to cinema group's parser
    SELECT cg.parser_id INTO v_group_parser_id
    FROM cinemas c
    JOIN cinema_groups cg ON cg.id = c.cinema_group_id
    WHERE c.id = p_cinema_id;

    RETURN v_group_parser_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert time string to float (e.g., "14:30" -> 14.5)
CREATE OR REPLACE FUNCTION time_string_to_float(p_time TEXT)
RETURNS DECIMAL(4,2) AS $$
DECLARE
    v_parts TEXT[];
    v_hours INTEGER;
    v_minutes INTEGER;
BEGIN
    IF p_time IS NULL OR p_time = '' THEN
        RETURN NULL;
    END IF;

    v_parts := string_to_array(p_time, ':');

    IF array_length(v_parts, 1) < 2 THEN
        RETURN NULL;
    END IF;

    v_hours := v_parts[1]::INTEGER;
    v_minutes := v_parts[2]::INTEGER;

    RETURN v_hours + (v_minutes::DECIMAL / 60);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert float to time string (e.g., 14.5 -> "14:30")
CREATE OR REPLACE FUNCTION float_to_time_string(p_float DECIMAL)
RETURNS TEXT AS $$
DECLARE
    v_hours INTEGER;
    v_minutes INTEGER;
BEGIN
    IF p_float IS NULL THEN
        RETURN NULL;
    END IF;

    v_hours := FLOOR(p_float)::INTEGER;
    v_minutes := ROUND((p_float - v_hours) * 60)::INTEGER;

    RETURN LPAD(v_hours::TEXT, 2, '0') || ':' || LPAD(v_minutes::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate start_week_day from a date
CREATE OR REPLACE FUNCTION get_week_start_day(p_date DATE, p_week_start INTEGER DEFAULT 3)
RETURNS DATE AS $$
DECLARE
    v_day_of_week INTEGER;
    v_days_since_start INTEGER;
BEGIN
    -- p_week_start: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, etc.
    v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER; -- 0=Sunday, 6=Saturday

    -- Calculate days since the week start
    v_days_since_start := (v_day_of_week - p_week_start + 7) % 7;

    RETURN p_date - v_days_since_start;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_import_conflict_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS import_conflict_movies_updated_at ON import_conflict_movies;
CREATE TRIGGER import_conflict_movies_updated_at
    BEFORE UPDATE ON import_conflict_movies
    FOR EACH ROW EXECUTE FUNCTION update_import_conflict_updated_at();

DROP TRIGGER IF EXISTS import_conflict_editions_updated_at ON import_conflict_editions;
CREATE TRIGGER import_conflict_editions_updated_at
    BEFORE UPDATE ON import_conflict_editions
    FOR EACH ROW EXECUTE FUNCTION update_import_conflict_updated_at();

DROP TRIGGER IF EXISTS import_conflict_sessions_updated_at ON import_conflict_sessions;
CREATE TRIGGER import_conflict_sessions_updated_at
    BEFORE UPDATE ON import_conflict_sessions
    FOR EACH ROW EXECUTE FUNCTION update_import_conflict_updated_at();

-- ============================================================================
-- COMPUTED CONFLICT STATE
-- ============================================================================

-- Function to compute overall conflict movie state based on children
CREATE OR REPLACE FUNCTION compute_conflict_movie_state(p_conflict_movie_id UUID)
RETURNS import_conflict_state AS $$
DECLARE
    v_has_unverified_editions BOOLEAN;
    v_has_unverified_sessions BOOLEAN;
BEGIN
    -- Check for unverified editions
    SELECT EXISTS(
        SELECT 1 FROM import_conflict_editions
        WHERE conflict_movie_id = p_conflict_movie_id AND state = 'to_verify'
    ) INTO v_has_unverified_editions;

    -- Check for unverified sessions
    SELECT EXISTS(
        SELECT 1 FROM import_conflict_sessions
        WHERE conflict_movie_id = p_conflict_movie_id AND state = 'to_verify'
    ) INTO v_has_unverified_sessions;

    IF v_has_unverified_editions OR v_has_unverified_sessions THEN
        RETURN 'to_verify';
    ELSE
        RETURN 'verified';
    END IF;
END;
$$ LANGUAGE plpgsql;
