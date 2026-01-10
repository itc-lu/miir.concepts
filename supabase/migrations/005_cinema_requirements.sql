-- Cinema Automation Tool - Requirements Implementation
-- This migration adds features specified in the requirements document

-- ============================================================================
-- 1. COUNTRY WEEK START DAY
-- ============================================================================

-- Add week_start_day to countries (0=Sunday, 1=Monday, ..., 6=Saturday)
ALTER TABLE countries ADD COLUMN IF NOT EXISTS week_start_day INT DEFAULT 1;

-- Set week start days according to requirements
-- Luxembourg, Belgium, France: Wednesday (day 3)
-- Germany: Thursday (day 4)
-- All others: Monday (day 1)
UPDATE countries SET week_start_day = 3 WHERE code IN ('LU', 'BE', 'FR');
UPDATE countries SET week_start_day = 4 WHERE code IN ('DE');

-- Add display_name computed column
ALTER TABLE countries ADD COLUMN IF NOT EXISTS display_name VARCHAR(200)
  GENERATED ALWAYS AS ('[' || code || '] ' || name) STORED;

-- ============================================================================
-- 2. CINEMA TIMEZONE AND WEEK START
-- ============================================================================

-- Add timezone and week_start_day override to cinemas
ALTER TABLE cinemas ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Luxembourg';
ALTER TABLE cinemas ADD COLUMN IF NOT EXISTS week_start_day_override INT; -- NULL means inherit from country
ALTER TABLE cinemas ADD COLUMN IF NOT EXISTS missing_info TEXT; -- Free text for notes about missing data

-- Function to get effective week start day for a cinema
CREATE OR REPLACE FUNCTION get_cinema_week_start_day(p_cinema_id UUID)
RETURNS INT AS $$
DECLARE
  v_override INT;
  v_country_day INT;
BEGIN
  SELECT c.week_start_day_override, co.week_start_day
  INTO v_override, v_country_day
  FROM cinemas c
  LEFT JOIN countries co ON c.country_id = co.id
  WHERE c.id = p_cinema_id;

  RETURN COALESCE(v_override, v_country_day, 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. FLAG TYPES (BASIC/SUPERIOR)
-- ============================================================================

-- Create flag_type enum
DO $$ BEGIN
  CREATE TYPE flag_type AS ENUM (
    'releases_of_the_week',
    'previews_of_the_week',
    'special_screenings_of_the_week',
    'festival_screenings',
    'movie_of_the_week',
    'movie_of_the_day',
    'open_air'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rename session_tags to cinema_flags for clarity
ALTER TABLE session_tags ADD COLUMN IF NOT EXISTS is_basic_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE session_tags ADD COLUMN IF NOT EXISTS is_superior_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE session_tags ADD COLUMN IF NOT EXISTS flag_type flag_type;

-- Add constraint: cannot be both basic and superior
ALTER TABLE session_tags DROP CONSTRAINT IF EXISTS check_flag_exclusive;
ALTER TABLE session_tags ADD CONSTRAINT check_flag_exclusive
  CHECK (NOT (is_basic_flag = TRUE AND is_superior_flag = TRUE));

-- Insert default flags if they don't exist
INSERT INTO session_tags (name, is_basic_flag, is_superior_flag, flag_type, color, description) VALUES
  ('NEW RELEASE', FALSE, TRUE, 'releases_of_the_week', '#22c55e', 'New movie release'),
  ('PREVIEW', FALSE, TRUE, 'previews_of_the_week', '#3b82f6', 'Preview screening'),
  ('SPECIAL SCREENING', FALSE, TRUE, 'special_screenings_of_the_week', '#a855f7', 'Special screening event'),
  ('FESTIVAL', FALSE, FALSE, 'festival_screenings', '#f59e0b', 'Festival screening'),
  ('MOVIE OF THE WEEK', FALSE, FALSE, 'movie_of_the_week', '#ef4444', 'Featured movie of the week'),
  ('MOVIE OF THE DAY', FALSE, FALSE, 'movie_of_the_day', '#ec4899', 'Featured movie of the day'),
  ('OPEN AIR', FALSE, FALSE, 'open_air', '#06b6d4', 'Open air screening')
ON CONFLICT (name) DO UPDATE SET
  is_basic_flag = EXCLUDED.is_basic_flag,
  is_superior_flag = EXCLUDED.is_superior_flag,
  flag_type = EXCLUDED.flag_type;

-- ============================================================================
-- 4. SCREENING HIERARCHY (Screening -> Session Day -> Session Time)
-- ============================================================================

-- Create screenings table (represents a week of showings)
CREATE TABLE IF NOT EXISTS screenings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cinema_id UUID NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
  movie_l2_id UUID NOT NULL REFERENCES movies_l2(id) ON DELETE CASCADE,
  format_id UUID REFERENCES formats(id), -- Single format for this screening
  start_week_day DATE NOT NULL, -- First day of the screening week

  -- Flags
  movie_of_the_week BOOLEAN DEFAULT FALSE,
  movie_of_the_day BOOLEAN DEFAULT FALSE,
  day_flag_added_date DATE, -- When "movie of the day" was assigned

  -- Verification
  state VARCHAR(20) DEFAULT 'to_verify' CHECK (state IN ('to_verify', 'verified')),

  -- Notes
  missing_info TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(cinema_id, movie_l2_id, start_week_day)
);

-- Screening flags junction
CREATE TABLE IF NOT EXISTS screening_flags (
  screening_id UUID REFERENCES screenings(id) ON DELETE CASCADE,
  flag_id UUID REFERENCES session_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (screening_id, flag_id)
);

-- Session days (one per day within a screening week)
CREATE TABLE IF NOT EXISTS session_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(screening_id, date)
);

-- Session times (individual showings within a day)
CREATE TABLE IF NOT EXISTS session_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_day_id UUID NOT NULL REFERENCES session_days(id) ON DELETE CASCADE,
  time_float DECIMAL(5,2) NOT NULL, -- Time as decimal hours (e.g., 14.5 = 14:30)

  -- Computed fields (updated by trigger)
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: valid time (0-23.99)
  CONSTRAINT valid_time_float CHECK (time_float >= 0 AND time_float < 24)
);

-- Indexes for screening queries
CREATE INDEX IF NOT EXISTS idx_screenings_cinema ON screenings(cinema_id);
CREATE INDEX IF NOT EXISTS idx_screenings_movie ON screenings(movie_l2_id);
CREATE INDEX IF NOT EXISTS idx_screenings_week ON screenings(start_week_day);
CREATE INDEX IF NOT EXISTS idx_session_days_date ON session_days(date);
CREATE INDEX IF NOT EXISTS idx_session_times_day ON session_times(session_day_id);

-- Function to create session days when screening is created
CREATE OR REPLACE FUNCTION create_session_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Create 7 session days starting from start_week_day
  FOR i IN 0..6 LOOP
    INSERT INTO session_days (screening_id, date)
    VALUES (NEW.id, NEW.start_week_day + i)
    ON CONFLICT (screening_id, date) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_session_days ON screenings;
CREATE TRIGGER trigger_create_session_days
  AFTER INSERT ON screenings
  FOR EACH ROW
  EXECUTE FUNCTION create_session_days();

-- Function to calculate session time datetimes
CREATE OR REPLACE FUNCTION calculate_session_datetime()
RETURNS TRIGGER AS $$
DECLARE
  v_date DATE;
  v_duration_minutes INT;
  v_hour INT;
  v_minute INT;
BEGIN
  -- Get the date from session day
  SELECT sd.date INTO v_date
  FROM session_days sd
  WHERE sd.id = NEW.session_day_id;

  -- Get movie duration from screening -> movie_l2 -> movie_l0
  SELECT COALESCE(l0.runtime_minutes, 120) INTO v_duration_minutes
  FROM session_days sd
  JOIN screenings s ON sd.screening_id = s.id
  JOIN movies_l2 l2 ON s.movie_l2_id = l2.id
  JOIN movies_l0 l0 ON l2.movie_l0_id = l0.id
  WHERE sd.id = NEW.session_day_id;

  -- Calculate hour and minute from time_float
  v_hour := FLOOR(NEW.time_float);
  v_minute := ROUND((NEW.time_float - v_hour) * 60);

  -- Set start datetime
  NEW.start_datetime := v_date + (v_hour || ' hours')::INTERVAL + (v_minute || ' minutes')::INTERVAL;

  -- Set end datetime (start + duration)
  NEW.end_datetime := NEW.start_datetime + (v_duration_minutes || ' minutes')::INTERVAL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_session_datetime ON session_times;
CREATE TRIGGER trigger_calculate_session_datetime
  BEFORE INSERT OR UPDATE OF time_float, session_day_id ON session_times
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_datetime();

-- ============================================================================
-- 5. MOVIE COUNTRY WEEK TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS movie_country_weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_l2_id UUID NOT NULL REFERENCES movies_l2(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  national_start_date DATE NOT NULL,

  -- Computed number of weeks (updated by trigger or view)
  weeks_showing INT DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(movie_l2_id, country_id)
);

-- Function to calculate weeks showing
CREATE OR REPLACE FUNCTION calculate_weeks_showing(
  p_national_start DATE,
  p_week_start_day INT
) RETURNS INT AS $$
DECLARE
  v_start_weekday INT;
  v_days_to_subtract INT;
  v_adjusted_start DATE;
  v_today DATE;
  v_days_diff INT;
BEGIN
  v_today := CURRENT_DATE;

  -- Get weekday of national start (0=Sunday, 6=Saturday in PostgreSQL)
  v_start_weekday := EXTRACT(DOW FROM p_national_start)::INT;

  -- Calculate days to subtract to reach the week start day
  v_days_to_subtract := (v_start_weekday - p_week_start_day + 7) % 7;

  -- Get the closest previous week start day
  v_adjusted_start := p_national_start - v_days_to_subtract;

  -- Calculate days since adjusted start
  v_days_diff := v_today - v_adjusted_start;

  -- Week number is days / 7 + 1
  IF v_days_diff < 0 THEN
    RETURN 0;
  END IF;

  RETURN (v_days_diff / 7) + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FLAG AUTOMATION CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS flag_date_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_l2_id UUID NOT NULL REFERENCES movies_l2(id) ON DELETE CASCADE,
  cinema_group_id UUID REFERENCES cinema_groups(id) ON DELETE CASCADE,
  cinema_id UUID REFERENCES cinemas(id) ON DELETE CASCADE,

  movie_of_the_day_date DATE,
  movie_of_the_week_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one target must be specified
  CONSTRAINT check_target CHECK (cinema_group_id IS NOT NULL OR cinema_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_flag_configs_movie ON flag_date_configs(movie_l2_id);
CREATE INDEX IF NOT EXISTS idx_flag_configs_day ON flag_date_configs(movie_of_the_day_date);
CREATE INDEX IF NOT EXISTS idx_flag_configs_week ON flag_date_configs(movie_of_the_week_date);

-- ============================================================================
-- 7. MOVIE DURATION IN DECIMAL HOURS
-- ============================================================================

-- Add duration_hours to movies_l0 (parallel to runtime_minutes for compatibility)
ALTER TABLE movies_l0 ADD COLUMN IF NOT EXISTS duration_hours DECIMAL(4,2);

-- Function to sync duration formats
CREATE OR REPLACE FUNCTION sync_movie_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.runtime_minutes IS NOT NULL AND (NEW.duration_hours IS NULL OR OLD.runtime_minutes != NEW.runtime_minutes) THEN
    -- Convert minutes to decimal hours
    NEW.duration_hours := NEW.runtime_minutes::DECIMAL / 60;
  ELSIF NEW.duration_hours IS NOT NULL AND (NEW.runtime_minutes IS NULL OR OLD.duration_hours != NEW.duration_hours) THEN
    -- Convert decimal hours to minutes
    NEW.runtime_minutes := ROUND(NEW.duration_hours * 60);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_movie_duration ON movies_l0;
CREATE TRIGGER trigger_sync_movie_duration
  BEFORE INSERT OR UPDATE OF runtime_minutes, duration_hours ON movies_l0
  FOR EACH ROW
  EXECUTE FUNCTION sync_movie_duration();

-- ============================================================================
-- 8. MOVIE EDITION UPDATES
-- ============================================================================

-- Add fields to movies_l2 for edition management
ALTER TABLE movies_l2 ADD COLUMN IF NOT EXISTS missing_info TEXT;

-- ============================================================================
-- 9. EXPORT LANGUAGE MAPPINGS (ensure table exists)
-- ============================================================================

-- Ensure export_language_mappings exists with proper structure
CREATE TABLE IF NOT EXISTS export_language_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  export_client_id UUID NOT NULL REFERENCES export_clients(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  export_code VARCHAR(50) NOT NULL, -- Customer-specific code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(export_client_id, language_id)
);

-- Export technology mappings
CREATE TABLE IF NOT EXISTS export_technology_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  export_client_id UUID NOT NULL REFERENCES export_clients(id) ON DELETE CASCADE,
  format_id UUID REFERENCES formats(id) ON DELETE CASCADE,
  technology_id UUID REFERENCES technologies(id) ON DELETE CASCADE,
  export_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_mapping_target CHECK (format_id IS NOT NULL OR technology_id IS NOT NULL)
);

-- ============================================================================
-- 10. VIEW FOR PUBLIC SESSIONS (using new screening structure)
-- ============================================================================

CREATE OR REPLACE VIEW public_screenings AS
SELECT
  st.id AS session_time_id,
  st.time_float,
  st.start_datetime,
  st.end_datetime,
  sd.date AS show_date,
  s.id AS screening_id,
  s.start_week_day,
  s.movie_of_the_week,
  s.movie_of_the_day,
  s.state AS screening_state,
  c.id AS cinema_id,
  c.name AS cinema_name,
  c.city AS cinema_city,
  c.timezone AS cinema_timezone,
  l2.id AS movie_l2_id,
  l2.edition_title,
  l0.id AS movie_l0_id,
  l0.original_title,
  l0.runtime_minutes,
  l0.duration_hours,
  l0.poster_url,
  f.name AS format_name,
  t.name AS technology_name,
  lang.name AS audio_language
FROM session_times st
JOIN session_days sd ON st.session_day_id = sd.id
JOIN screenings s ON sd.screening_id = s.id
JOIN cinemas c ON s.cinema_id = c.id
JOIN movies_l2 l2 ON s.movie_l2_id = l2.id
JOIN movies_l0 l0 ON l2.movie_l0_id = l0.id
LEFT JOIN formats f ON s.format_id = f.id
LEFT JOIN technologies t ON l2.technology_id = t.id
LEFT JOIN languages lang ON l2.audio_language_id = lang.id
WHERE c.is_active = TRUE
  AND l2.is_active = TRUE
  AND s.state = 'verified';

-- ============================================================================
-- 11. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_country_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flag_date_configs ENABLE ROW LEVEL SECURITY;

-- Policies for screenings
CREATE POLICY "Screenings viewable by authenticated" ON screenings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screenings manageable by editors" ON screenings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('global_admin', 'internal_admin', 'internal_user')
    )
  );

-- Policies for session_days
CREATE POLICY "Session days viewable by authenticated" ON session_days
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Session days manageable by editors" ON session_days
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('global_admin', 'internal_admin', 'internal_user')
    )
  );

-- Policies for session_times
CREATE POLICY "Session times viewable by authenticated" ON session_times
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Session times manageable by editors" ON session_times
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('global_admin', 'internal_admin', 'internal_user')
    )
  );

-- Policies for screening_flags
CREATE POLICY "Screening flags viewable by authenticated" ON screening_flags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screening flags manageable by editors" ON screening_flags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('global_admin', 'internal_admin', 'internal_user')
    )
  );

-- Policies for movie_country_weeks
CREATE POLICY "Movie country weeks viewable by authenticated" ON movie_country_weeks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Movie country weeks manageable by editors" ON movie_country_weeks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('global_admin', 'internal_admin', 'internal_user')
    )
  );

-- Policies for flag_date_configs
CREATE POLICY "Flag configs viewable by authenticated" ON flag_date_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Flag configs manageable by admins" ON flag_date_configs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('global_admin', 'internal_admin')
    )
  );
