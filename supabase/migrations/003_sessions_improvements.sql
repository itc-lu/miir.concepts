-- CAT Cinema Automation Tool - Sessions Table Improvements
-- Migration: Add start_time computed column and is_active flag

-- Add is_active flag for soft deletes / hiding sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create a computed start_time column (combining show_date and show_time)
-- This makes queries simpler and more efficient
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ
    GENERATED ALWAYS AS (show_date + show_time) STORED;

-- Create index on start_time for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;

-- Update the views for the public cinema program
CREATE OR REPLACE VIEW public_sessions AS
SELECT
    s.id,
    s.start_time,
    s.show_date,
    s.show_time,
    s.screen_name,
    s.is_cancelled,
    -- Movie edition info
    l2.id AS movie_edition_id,
    l2.edition_title,
    l0.id AS movie_id,
    l0.original_title,
    l0.runtime_minutes,
    l0.poster_url,
    -- Localized title (prefer German for Luxembourg)
    COALESCE(
        (SELECT title FROM movies_l1 WHERE movie_l0_id = l0.id AND language_id = (SELECT id FROM languages WHERE code = 'DE' LIMIT 1)),
        (SELECT title FROM movies_l1 WHERE movie_l0_id = l0.id LIMIT 1),
        l0.original_title
    ) AS movie_title,
    -- Format and technology
    f.name AS format_name,
    t.name AS technology_name,
    -- Languages
    al.code AS audio_language_code,
    al.name AS audio_language_name,
    sl.code AS subtitle_language_code,
    sl.name AS subtitle_language_name,
    -- Cinema info
    c.id AS cinema_id,
    c.name AS cinema_name,
    c.city AS cinema_city,
    cg.id AS cinema_group_id,
    cg.name AS cinema_group_name
FROM sessions s
JOIN movies_l2 l2 ON s.movie_l2_id = l2.id
JOIN movies_l0 l0 ON l2.movie_l0_id = l0.id
JOIN cinemas c ON s.cinema_id = c.id
LEFT JOIN cinema_groups cg ON c.cinema_group_id = cg.id
LEFT JOIN formats f ON l2.format_id = f.id
LEFT JOIN technologies t ON l2.technology_id = t.id
LEFT JOIN languages al ON l2.audio_language_id = al.id
LEFT JOIN languages sl ON l2.subtitle_language_id = sl.id
WHERE s.is_active = TRUE
    AND s.is_cancelled = FALSE
    AND c.is_active = TRUE;

-- Grant access to the view
GRANT SELECT ON public_sessions TO anon, authenticated;
