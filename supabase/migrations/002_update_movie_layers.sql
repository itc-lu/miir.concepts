-- ============================================================================
-- Migration: Update Movie L1/L2 Structure
-- ============================================================================
-- L1: Country-based releases (LU, DE, FR, BE)
-- L2: Edition-specific info linked to L1
-- ============================================================================

-- ============================================================================
-- UPDATE movies_l1 - Make it country-based instead of language-based
-- ============================================================================

-- Add country_id column if not exists
ALTER TABLE movies_l1
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id);

-- Migrate existing data: try to map language to country
UPDATE movies_l1
SET country_id = (
    SELECT c.id FROM countries c
    JOIN languages l ON l.id = movies_l1.language_id
    WHERE LOWER(l.code) = LOWER(c.code)
    LIMIT 1
)
WHERE country_id IS NULL AND language_id IS NOT NULL;

-- Default to LU if no match
UPDATE movies_l1
SET country_id = (SELECT id FROM countries WHERE code = 'LU' LIMIT 1)
WHERE country_id IS NULL;

-- Drop unique constraint on (movie_l0_id, language_id) if exists
ALTER TABLE movies_l1
DROP CONSTRAINT IF EXISTS movies_l1_movie_l0_id_language_id_key;

-- Add new unique constraint on (movie_l0_id, country_id)
ALTER TABLE movies_l1
ADD CONSTRAINT movies_l1_movie_l0_id_country_id_key
UNIQUE (movie_l0_id, country_id);

-- Add local_title column (title in the country's language)
ALTER TABLE movies_l1
ADD COLUMN IF NOT EXISTS local_title VARCHAR(500);

-- Copy title to local_title if not set
UPDATE movies_l1
SET local_title = title
WHERE local_title IS NULL;

-- ============================================================================
-- UPDATE movies_l2 - Link to L1 instead of L0
-- ============================================================================

-- Add movie_l1_id column
ALTER TABLE movies_l2
ADD COLUMN IF NOT EXISTS movie_l1_id UUID REFERENCES movies_l1(id) ON DELETE CASCADE;

-- Migrate existing L2 records to link to L1
-- Try to find matching L1 for each L2
UPDATE movies_l2 l2
SET movie_l1_id = (
    SELECT l1.id FROM movies_l1 l1
    WHERE l1.movie_l0_id = l2.movie_l0_id
    ORDER BY l1.created_at
    LIMIT 1
)
WHERE movie_l1_id IS NULL;

-- For L2 records without a matching L1, create default L1 records
INSERT INTO movies_l1 (movie_l0_id, country_id, title, local_title)
SELECT DISTINCT
    l2.movie_l0_id,
    (SELECT id FROM countries WHERE code = 'LU' LIMIT 1),
    l0.original_title,
    l0.original_title
FROM movies_l2 l2
JOIN movies_l0 l0 ON l0.id = l2.movie_l0_id
WHERE l2.movie_l1_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM movies_l1 l1
    WHERE l1.movie_l0_id = l2.movie_l0_id
)
ON CONFLICT (movie_l0_id, country_id) DO NOTHING;

-- Now update the L2 records
UPDATE movies_l2 l2
SET movie_l1_id = (
    SELECT l1.id FROM movies_l1 l1
    WHERE l1.movie_l0_id = l2.movie_l0_id
    ORDER BY l1.created_at
    LIMIT 1
)
WHERE movie_l1_id IS NULL;

-- ============================================================================
-- Sync Voices table for L1
-- ============================================================================

-- The movie_l1_sync_voices table already exists
-- Add convenience fields if needed
ALTER TABLE movie_l1_sync_voices
ADD COLUMN IF NOT EXISTS actor_name VARCHAR(200);

ALTER TABLE movie_l1_sync_voices
ADD COLUMN IF NOT EXISTS role_description VARCHAR(200);

-- ============================================================================
-- Additional subtitle support for L2 (more than 2)
-- ============================================================================

-- Create junction table for multiple subtitles
CREATE TABLE IF NOT EXISTS movie_l2_subtitles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_l2_id UUID NOT NULL REFERENCES movies_l2(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id),
    subtitle_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'sdh', 'cc', 'forced'
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(movie_l2_id, language_id)
);

-- Migrate existing subtitle data to new table
INSERT INTO movie_l2_subtitles (movie_l2_id, language_id, display_order)
SELECT id, subtitle_language_id, 1
FROM movies_l2
WHERE subtitle_language_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO movie_l2_subtitles (movie_l2_id, language_id, display_order)
SELECT id, subtitle_language_2_id, 2
FROM movies_l2
WHERE subtitle_language_2_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_movies_l1_country ON movies_l1(country_id);
CREATE INDEX IF NOT EXISTS idx_movies_l2_l1 ON movies_l2(movie_l1_id);
CREATE INDEX IF NOT EXISTS idx_movie_l2_subtitles_l2 ON movie_l2_subtitles(movie_l2_id);

-- ============================================================================
-- Enable RLS on new table
-- ============================================================================

ALTER TABLE movie_l2_subtitles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON movie_l2_subtitles FOR SELECT USING (true);
CREATE POLICY "Editor write access" ON movie_l2_subtitles FOR ALL USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'editor')
);
