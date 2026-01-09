-- CAT Cinema Automation Tool - Database Schema
-- Initial migration: Core tables and relationships

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'editor', 'viewer');
CREATE TYPE movie_status AS ENUM ('draft', 'pending_review', 'verified', 'archived');
CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE export_status AS ENUM ('pending', 'generating', 'completed', 'failed');

-- ============================================================================
-- REFERENCE TABLES
-- ============================================================================

-- Countries
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2/3
    name VARCHAR(100) NOT NULL,
    name_native VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Languages
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(5) NOT NULL UNIQUE, -- ISO 639-1 or custom (e.g., 'LU')
    name VARCHAR(100) NOT NULL,
    name_native VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Formats (2D, 3D, IMAX, etc.)
CREATE TABLE formats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technologies (Atmos, 4DX, etc.)
CREATE TABLE technologies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Genres
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES genres(id),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Age Ratings
CREATE TABLE age_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_id UUID REFERENCES countries(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    min_age INT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(country_id, code)
);

-- ============================================================================
-- TAG TABLES
-- ============================================================================

-- Cinema Tags
CREATE TABLE cinema_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7), -- Hex color
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movie Tags
CREATE TABLE movie_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Tags
CREATE TABLE session_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CINEMA TABLES
-- ============================================================================

-- Cinema Groups (parent organizations)
CREATE TABLE cinema_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    country_id UUID REFERENCES countries(id),
    website VARCHAR(500),
    logo_url VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cinemas (individual locations)
CREATE TABLE cinemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cinema_group_id UUID REFERENCES cinema_groups(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    country_id UUID REFERENCES countries(id),
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(200),
    website VARCHAR(500),
    logo_url VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    screen_count INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    parser_type VARCHAR(50), -- Which parser to use for this cinema
    parser_config JSONB, -- Parser-specific configuration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cinema-Tag junction
CREATE TABLE cinema_cinema_tags (
    cinema_id UUID REFERENCES cinemas(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES cinema_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (cinema_id, tag_id)
);

-- ============================================================================
-- PEOPLE TABLES
-- ============================================================================

-- People (actors, directors, etc.)
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    birth_date DATE,
    death_date DATE,
    birth_place VARCHAR(200),
    biography TEXT,
    photo_url VARCHAR(500),
    imdb_id VARCHAR(20),
    tmdb_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MOVIE TABLES - THREE LAYER ARCHITECTURE
-- ============================================================================

-- Movies L0 (Core Information - language independent)
CREATE TABLE movies_l0 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    production_year INT,
    runtime_minutes INT, -- Default runtime
    poster_url VARCHAR(500),
    backdrop_url VARCHAR(500),
    trailer_url VARCHAR(500),
    imdb_id VARCHAR(20),
    tmdb_id INT,
    imdb_rating DECIMAL(3, 1),
    tmdb_rating DECIMAL(3, 1),
    status movie_status DEFAULT 'draft',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    notes TEXT, -- Internal notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movie L0 - Country junction (production countries)
CREATE TABLE movie_l0_countries (
    movie_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (movie_id, country_id)
);

-- Movie L0 - Genre junction
CREATE TABLE movie_l0_genres (
    movie_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    PRIMARY KEY (movie_id, genre_id)
);

-- Movie L0 - Tag junction
CREATE TABLE movie_l0_tags (
    movie_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES movie_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, tag_id)
);

-- Movie L0 - Cast (actors)
CREATE TABLE movie_l0_cast (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    character_name VARCHAR(200),
    billing_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movie L0 - Crew (directors, writers, etc.)
CREATE TABLE movie_l0_crew (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL, -- 'director', 'screenplay', 'music', 'cinematography', etc.
    department VARCHAR(100),
    credit_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movie L0 - Production Companies
CREATE TABLE movie_l0_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    company_country_id UUID REFERENCES countries(id),
    role VARCHAR(50) DEFAULT 'production', -- 'production', 'distribution', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movie L0 - Stills/Images
CREATE TABLE movie_l0_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    image_type VARCHAR(50) DEFAULT 'still', -- 'still', 'poster', 'backdrop', 'logo'
    width INT,
    height INT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movies L1 (Localized Information - per language)
CREATE TABLE movies_l1 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_l0_id UUID NOT NULL REFERENCES movies_l0(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id),
    title VARCHAR(500) NOT NULL, -- Localized title
    plot TEXT, -- Localized synopsis
    release_date DATE, -- Regional release date
    runtime_minutes INT, -- Can override L0 runtime
    age_rating_id UUID REFERENCES age_ratings(id),
    tagline VARCHAR(500),
    keywords TEXT[], -- Search keywords
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(movie_l0_id, language_id)
);

-- Movie L1 - Sync Voices (dubbing actors)
CREATE TABLE movie_l1_sync_voices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_l1_id UUID REFERENCES movies_l1(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id),
    person_name VARCHAR(200), -- Fallback if no person record
    original_character VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movies L2 (Edition/Variant Information)
CREATE TABLE movies_l2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_l0_id UUID NOT NULL REFERENCES movies_l0(id) ON DELETE CASCADE,
    edition_title VARCHAR(200), -- e.g., "IMAX 3D Version"
    format_id UUID REFERENCES formats(id),
    technology_id UUID REFERENCES technologies(id),
    audio_language_id UUID REFERENCES languages(id),
    subtitle_language_id UUID REFERENCES languages(id),
    subtitle_language_2_id UUID REFERENCES languages(id),
    is_original_version BOOLEAN DEFAULT FALSE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SESSION TABLES
-- ============================================================================

-- Sessions (movie showings at cinemas)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_l2_id UUID NOT NULL REFERENCES movies_l2(id) ON DELETE CASCADE,
    cinema_id UUID NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
    screen_name VARCHAR(100), -- Auditorium/screen name
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    end_time TIME, -- Calculated from movie duration
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    booking_url VARCHAR(500),
    notes TEXT,
    is_cancelled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session-Tag junction
CREATE TABLE session_session_tags (
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES session_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, tag_id)
);

-- Create index for common queries
CREATE INDEX idx_sessions_date ON sessions(show_date);
CREATE INDEX idx_sessions_cinema ON sessions(cinema_id);
CREATE INDEX idx_sessions_movie ON sessions(movie_l2_id);
CREATE INDEX idx_sessions_date_cinema ON sessions(show_date, cinema_id);

-- ============================================================================
-- USER & AUTH TABLES
-- ============================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    avatar_url VARCHAR(500),
    role user_role DEFAULT 'viewer',
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Cinema permissions (for role-based cinema access)
CREATE TABLE user_cinema_permissions (
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    cinema_id UUID REFERENCES cinemas(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_manage_sessions BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, cinema_id)
);

-- User-Cinema Group permissions
CREATE TABLE user_cinema_group_permissions (
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    cinema_group_id UUID REFERENCES cinema_groups(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_manage_sessions BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, cinema_group_id)
);

-- ============================================================================
-- IMPORT/EXPORT TABLES
-- ============================================================================

-- Import Jobs
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id),
    cinema_id UUID REFERENCES cinemas(id),
    file_name VARCHAR(500),
    file_url VARCHAR(500),
    file_type VARCHAR(50), -- 'xlsx', 'xml', 'csv'
    parser_type VARCHAR(50),
    status import_status DEFAULT 'pending',
    total_records INT DEFAULT 0,
    processed_records INT DEFAULT 0,
    success_records INT DEFAULT 0,
    error_records INT DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import Titles (mapping imported titles to movies)
CREATE TABLE import_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_title VARCHAR(500) NOT NULL,
    movie_l0_id UUID REFERENCES movies_l0(id) ON DELETE SET NULL,
    cinema_id UUID REFERENCES cinemas(id), -- NULL = global mapping
    confidence DECIMAL(3, 2) DEFAULT 1.0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_titles_title ON import_titles USING gin(import_title gin_trgm_ops);

-- Export Clients (customer configurations)
CREATE TABLE export_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    contact_email VARCHAR(255),
    contact_name VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export Templates
CREATE TABLE export_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES export_clients(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    format VARCHAR(20) DEFAULT 'xml', -- 'xml', 'json', 'csv'
    template_content TEXT NOT NULL, -- Handlebars template
    config JSONB DEFAULT '{}', -- Additional configuration
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export Jobs
CREATE TABLE export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id),
    client_id UUID REFERENCES export_clients(id),
    template_id UUID REFERENCES export_templates(id),
    status export_status DEFAULT 'pending',
    date_from DATE,
    date_to DATE,
    filters JSONB,
    output_url VARCHAR(500),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export Language Mappings (client-specific language codes)
CREATE TABLE export_language_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES export_clients(id) ON DELETE CASCADE,
    language_id UUID REFERENCES languages(id) ON DELETE CASCADE,
    export_code VARCHAR(20) NOT NULL, -- Client's preferred code
    export_name VARCHAR(100), -- Client's preferred name
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, language_id)
);

-- Export Title Mappings (client-specific movie titles)
CREATE TABLE export_title_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES export_clients(id) ON DELETE CASCADE,
    movie_l0_id UUID REFERENCES movies_l0(id) ON DELETE CASCADE,
    export_title VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, movie_l0_id)
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id),
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'verify', etc.
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cinema_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cinema_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cinemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies_l0 ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies_l1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies_l2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
    SELECT role FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user is admin+
CREATE OR REPLACE FUNCTION is_admin_or_above(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT role IN ('super_admin', 'admin') FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Public read access for reference tables
CREATE POLICY "Public read access" ON countries FOR SELECT USING (true);
CREATE POLICY "Public read access" ON languages FOR SELECT USING (true);
CREATE POLICY "Public read access" ON formats FOR SELECT USING (true);
CREATE POLICY "Public read access" ON technologies FOR SELECT USING (true);
CREATE POLICY "Public read access" ON genres FOR SELECT USING (true);
CREATE POLICY "Public read access" ON age_ratings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON cinema_tags FOR SELECT USING (true);
CREATE POLICY "Public read access" ON movie_tags FOR SELECT USING (true);
CREATE POLICY "Public read access" ON session_tags FOR SELECT USING (true);

-- Admin write access for reference tables
CREATE POLICY "Admin write access" ON countries FOR ALL USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write access" ON languages FOR ALL USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write access" ON formats FOR ALL USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write access" ON technologies FOR ALL USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write access" ON genres FOR ALL USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write access" ON age_ratings FOR ALL USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write access" ON cinema_tags FOR ALL USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write access" ON movie_tags FOR ALL USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write access" ON session_tags FOR ALL USING (is_admin_or_above(auth.uid()));

-- Cinema Groups: public read, admin write
CREATE POLICY "Public read access" ON cinema_groups FOR SELECT USING (true);
CREATE POLICY "Admin write access" ON cinema_groups FOR ALL USING (is_admin_or_above(auth.uid()));

-- Cinemas: public read, admin write
CREATE POLICY "Public read access" ON cinemas FOR SELECT USING (true);
CREATE POLICY "Admin write access" ON cinemas FOR ALL USING (is_admin_or_above(auth.uid()));

-- People: public read, admin write
CREATE POLICY "Public read access" ON people FOR SELECT USING (true);
CREATE POLICY "Admin write access" ON people FOR ALL USING (is_admin_or_above(auth.uid()));

-- Movies L0: public read, editor+ write
CREATE POLICY "Public read access" ON movies_l0 FOR SELECT USING (true);
CREATE POLICY "Editor write access" ON movies_l0 FOR ALL USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'editor')
);

-- Movies L1: public read, editor+ write
CREATE POLICY "Public read access" ON movies_l1 FOR SELECT USING (true);
CREATE POLICY "Editor write access" ON movies_l1 FOR ALL USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'editor')
);

-- Movies L2: public read, editor+ write
CREATE POLICY "Public read access" ON movies_l2 FOR SELECT USING (true);
CREATE POLICY "Editor write access" ON movies_l2 FOR ALL USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'editor')
);

-- Sessions: public read, editor+ write
CREATE POLICY "Public read access" ON sessions FOR SELECT USING (true);
CREATE POLICY "Editor write access" ON sessions FOR ALL USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'editor')
);

-- User profiles: users can read their own, admins can read all
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (
    auth.uid() = id OR is_admin_or_above(auth.uid())
);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (
    auth.uid() = id OR get_user_role(auth.uid()) = 'super_admin'
);
CREATE POLICY "Super admin can manage all profiles" ON user_profiles FOR ALL USING (
    get_user_role(auth.uid()) = 'super_admin'
);

-- Import/Export: users see their own, admins see all
CREATE POLICY "User read own imports" ON import_jobs FOR SELECT USING (
    user_id = auth.uid() OR is_admin_or_above(auth.uid())
);
CREATE POLICY "Editor can create imports" ON import_jobs FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'editor')
);

CREATE POLICY "Admin read exports" ON export_clients FOR SELECT USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write exports" ON export_clients FOR ALL USING (is_admin_or_above(auth.uid()));

CREATE POLICY "Admin read templates" ON export_templates FOR SELECT USING (is_admin_or_above(auth.uid()));
CREATE POLICY "Admin write templates" ON export_templates FOR ALL USING (is_admin_or_above(auth.uid()));

CREATE POLICY "User read own export jobs" ON export_jobs FOR SELECT USING (
    user_id = auth.uid() OR is_admin_or_above(auth.uid())
);
CREATE POLICY "User create export jobs" ON export_jobs FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'editor', 'viewer')
);

-- Audit logs: admins only
CREATE POLICY "Admin read audit logs" ON audit_logs FOR SELECT USING (is_admin_or_above(auth.uid()));
CREATE POLICY "System insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_formats_updated_at BEFORE UPDATE ON formats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_technologies_updated_at BEFORE UPDATE ON technologies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_genres_updated_at BEFORE UPDATE ON genres
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_age_ratings_updated_at BEFORE UPDATE ON age_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cinema_tags_updated_at BEFORE UPDATE ON cinema_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movie_tags_updated_at BEFORE UPDATE ON movie_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_session_tags_updated_at BEFORE UPDATE ON session_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cinema_groups_updated_at BEFORE UPDATE ON cinema_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cinemas_updated_at BEFORE UPDATE ON cinemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movies_l0_updated_at BEFORE UPDATE ON movies_l0
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movies_l1_updated_at BEFORE UPDATE ON movies_l1
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movies_l2_updated_at BEFORE UPDATE ON movies_l2
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_export_clients_updated_at BEFORE UPDATE ON export_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_export_templates_updated_at BEFORE UPDATE ON export_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_import_titles_updated_at BEFORE UPDATE ON import_titles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'viewer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
