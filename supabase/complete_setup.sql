-- ============================================================================
-- COMPLETE SAFE SETUP SCRIPT
-- Run this in Supabase SQL Editor - handles existing objects safely
-- ============================================================================

-- ============================================================================
-- STEP 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 2: ENUMS (check if exists first)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('global_admin', 'internal_admin', 'internal_user', 'external');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movie_status') THEN
        CREATE TYPE movie_status AS ENUM ('draft', 'pending_review', 'verified', 'archived');
    END IF;
END $$;

-- ============================================================================
-- STEP 3: REFERENCE TABLES
-- ============================================================================

-- Countries
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Languages
CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(5) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Formats
CREATE TABLE IF NOT EXISTS formats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technologies
CREATE TABLE IF NOT EXISTS technologies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Genres
CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Age Ratings
CREATE TABLE IF NOT EXISTS age_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    min_age INT,
    country_id UUID REFERENCES countries(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: CINEMA TABLES
-- ============================================================================

-- Cinema Groups
CREATE TABLE IF NOT EXISTS cinema_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    website VARCHAR(500),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cinemas
CREATE TABLE IF NOT EXISTS cinemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cinema_group_id UUID REFERENCES cinema_groups(id),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    address TEXT,
    country_id UUID REFERENCES countries(id),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: MOVIE TABLES (3-Layer Architecture)
-- ============================================================================

-- Movies L0 (Core - language independent)
CREATE TABLE IF NOT EXISTS movies_l0 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_title VARCHAR(500) NOT NULL,
    release_year INT,
    runtime_minutes INT,
    imdb_id VARCHAR(20),
    tmdb_id INT,
    poster_url TEXT,
    backdrop_url TEXT,
    status movie_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movies L1 (Localized info)
CREATE TABLE IF NOT EXISTS movies_l1 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_l0_id UUID NOT NULL REFERENCES movies_l0(id) ON DELETE CASCADE,
    language_id UUID REFERENCES languages(id),
    title VARCHAR(500) NOT NULL,
    plot TEXT,
    tagline VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movies L2 (Editions - specific versions)
CREATE TABLE IF NOT EXISTS movies_l2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_l0_id UUID NOT NULL REFERENCES movies_l0(id) ON DELETE CASCADE,
    edition_title VARCHAR(255),
    format_id UUID REFERENCES formats(id),
    technology_id UUID REFERENCES technologies(id),
    audio_language_id UUID REFERENCES languages(id),
    subtitle_language_id UUID REFERENCES languages(id),
    age_rating_id UUID REFERENCES age_ratings(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movie Genres junction
CREATE TABLE IF NOT EXISTS movie_genres (
    movie_l0_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_l0_id, genre_id)
);

-- ============================================================================
-- STEP 6: SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_l2_id UUID NOT NULL REFERENCES movies_l2(id) ON DELETE CASCADE,
    cinema_id UUID NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
    screen_name VARCHAR(100),
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    booking_url TEXT,
    is_cancelled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(show_date);
CREATE INDEX IF NOT EXISTS idx_sessions_cinema ON sessions(cinema_id);
CREATE INDEX IF NOT EXISTS idx_sessions_movie ON sessions(movie_l2_id);

-- ============================================================================
-- STEP 7: USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'external',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ============================================================================
-- STEP 8: USER CINEMA PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_cinema_permissions (
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    cinema_id UUID REFERENCES cinemas(id) ON DELETE CASCADE,
    can_view_sessions BOOLEAN DEFAULT TRUE,
    can_create_sessions BOOLEAN DEFAULT TRUE,
    can_edit_sessions BOOLEAN DEFAULT TRUE,
    can_delete_sessions BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, cinema_id)
);

CREATE TABLE IF NOT EXISTS user_cinema_group_permissions (
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    cinema_group_id UUID REFERENCES cinema_groups(id) ON DELETE CASCADE,
    can_view_sessions BOOLEAN DEFAULT TRUE,
    can_create_sessions BOOLEAN DEFAULT TRUE,
    can_edit_sessions BOOLEAN DEFAULT TRUE,
    can_delete_sessions BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, cinema_group_id)
);

-- ============================================================================
-- STEP 9: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cinema_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cinemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies_l0 ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies_l1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies_l2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Public read policies for reference tables
CREATE POLICY IF NOT EXISTS "Public read" ON countries FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON languages FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON formats FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON technologies FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON genres FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON age_ratings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON cinema_groups FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON cinemas FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON movies_l0 FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON movies_l1 FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON movies_l2 FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON sessions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read" ON user_profiles FOR SELECT USING (true);

-- User can update own profile
DROP POLICY IF EXISTS "Users update own" ON user_profiles;
CREATE POLICY "Users update own" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- STEP 10: AUTO-CREATE PROFILE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'external'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- STEP 11: SEED DATA
-- ============================================================================

-- Countries
INSERT INTO countries (code, name) VALUES
    ('LU', 'Luxembourg'),
    ('DE', 'Germany'),
    ('FR', 'France'),
    ('BE', 'Belgium')
ON CONFLICT (code) DO NOTHING;

-- Languages
INSERT INTO languages (code, name) VALUES
    ('DE', 'Deutsch'),
    ('FR', 'Français'),
    ('EN', 'English'),
    ('LU', 'Lëtzebuergesch')
ON CONFLICT (code) DO NOTHING;

-- Formats
INSERT INTO formats (code, name) VALUES
    ('2D', '2D'),
    ('3D', '3D'),
    ('IMAX', 'IMAX'),
    ('4DX', '4DX')
ON CONFLICT (code) DO NOTHING;

-- Technologies
INSERT INTO technologies (code, name) VALUES
    ('STANDARD', 'Standard'),
    ('DOLBY_ATMOS', 'Dolby Atmos'),
    ('DOLBY_CINEMA', 'Dolby Cinema')
ON CONFLICT (code) DO NOTHING;

-- Genres
INSERT INTO genres (code, name) VALUES
    ('ACTION', 'Action'),
    ('COMEDY', 'Comedy'),
    ('DRAMA', 'Drama'),
    ('HORROR', 'Horror'),
    ('SCIFI', 'Science Fiction'),
    ('THRILLER', 'Thriller'),
    ('ROMANCE', 'Romance'),
    ('FAMILY', 'Family'),
    ('ANIMATION', 'Animation'),
    ('DOCUMENTARY', 'Documentary')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 12: CREATE ADMIN USER
-- ============================================================================

DO $$
DECLARE
    admin_id UUID;
    admin_email TEXT := 'admin@miir.lu';      -- <<< CHANGE THIS
    admin_password TEXT := 'AdminPass123!';   -- <<< CHANGE THIS
    existing_id UUID;
BEGIN
    -- Check if admin already exists
    SELECT id INTO existing_id FROM auth.users WHERE email = admin_email;

    IF existing_id IS NOT NULL THEN
        -- Admin exists, just update profile
        admin_id := existing_id;
        RAISE NOTICE 'Admin user already exists with ID: %', admin_id;
    ELSE
        -- Create new admin user
        admin_id := gen_random_uuid();

        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            aud
        ) VALUES (
            admin_id,
            '00000000-0000-0000-0000-000000000000',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Global Admin"}',
            FALSE,
            'authenticated',
            'authenticated'
        );

        RAISE NOTICE 'Created admin user with ID: %', admin_id;
    END IF;

    -- Ensure profile exists with global_admin role
    INSERT INTO user_profiles (id, email, full_name, role, is_active)
    VALUES (admin_id, admin_email, 'Global Admin', 'global_admin', TRUE)
    ON CONFLICT (id) DO UPDATE SET
        role = 'global_admin',
        is_active = TRUE,
        full_name = 'Global Admin';

    RAISE NOTICE 'Admin profile configured as global_admin';
END $$;

-- ============================================================================
-- STEP 13: VERIFY SETUP
-- ============================================================================

SELECT '=== SETUP COMPLETE ===' as status;

SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT 'Admin user:' as info;
SELECT id, email, full_name, role, is_active
FROM user_profiles
WHERE role = 'global_admin';
