-- ============================================
-- CINEMA AUTOMATION TOOL (CAT) - DEMO DATA
-- ============================================
-- This script creates demo data for all tables
-- Based on the L0/L1/L2 movie data structure
-- ============================================

-- First, create the role_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(50) PRIMARY KEY,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COUNTRIES
-- ============================================
INSERT INTO countries (id, code, name, name_native) VALUES
    (gen_random_uuid(), 'LU', 'Luxembourg', 'Lëtzebuerg'),
    (gen_random_uuid(), 'DE', 'Germany', 'Deutschland'),
    (gen_random_uuid(), 'FR', 'France', 'France'),
    (gen_random_uuid(), 'BE', 'Belgium', 'België/Belgique'),
    (gen_random_uuid(), 'US', 'United States', 'United States'),
    (gen_random_uuid(), 'GB', 'United Kingdom', 'United Kingdom'),
    (gen_random_uuid(), 'IT', 'Italy', 'Italia'),
    (gen_random_uuid(), 'ES', 'Spain', 'España'),
    (gen_random_uuid(), 'JP', 'Japan', '日本'),
    (gen_random_uuid(), 'KR', 'South Korea', '대한민국'),
    (gen_random_uuid(), 'AU', 'Australia', 'Australia'),
    (gen_random_uuid(), 'CA', 'Canada', 'Canada'),
    (gen_random_uuid(), 'NL', 'Netherlands', 'Nederland'),
    (gen_random_uuid(), 'AT', 'Austria', 'Österreich'),
    (gen_random_uuid(), 'CH', 'Switzerland', 'Schweiz/Suisse')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- LANGUAGES
-- ============================================
INSERT INTO languages (id, code, name, name_native, display_order, is_active) VALUES
    (gen_random_uuid(), 'lb', 'Luxembourgish', 'Lëtzebuergesch', 1, true),
    (gen_random_uuid(), 'de', 'German', 'Deutsch', 2, true),
    (gen_random_uuid(), 'fr', 'French', 'Français', 3, true),
    (gen_random_uuid(), 'en', 'English', 'English', 4, true),
    (gen_random_uuid(), 'nl', 'Dutch', 'Nederlands', 5, true),
    (gen_random_uuid(), 'it', 'Italian', 'Italiano', 6, true),
    (gen_random_uuid(), 'es', 'Spanish', 'Español', 7, true),
    (gen_random_uuid(), 'pt', 'Portuguese', 'Português', 8, true),
    (gen_random_uuid(), 'ja', 'Japanese', '日本語', 9, true),
    (gen_random_uuid(), 'ko', 'Korean', '한국어', 10, true),
    (gen_random_uuid(), 'zh', 'Chinese', '中文', 11, true),
    (gen_random_uuid(), 'ru', 'Russian', 'Русский', 12, true),
    (gen_random_uuid(), 'ar', 'Arabic', 'العربية', 13, true),
    (gen_random_uuid(), 'hi', 'Hindi', 'हिन्दी', 14, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- FORMATS
-- ============================================
INSERT INTO formats (id, code, name, description, display_order, is_active) VALUES
    (gen_random_uuid(), '2D', '2D', 'Standard 2D projection', 1, true),
    (gen_random_uuid(), '3D', '3D', '3D stereoscopic projection', 2, true),
    (gen_random_uuid(), 'IMAX2D', 'IMAX 2D', 'IMAX large format 2D', 3, true),
    (gen_random_uuid(), 'IMAX3D', 'IMAX 3D', 'IMAX large format 3D', 4, true),
    (gen_random_uuid(), '4DX', '4DX', '4D experience with motion seats', 5, true),
    (gen_random_uuid(), 'SCREENX', 'ScreenX', 'Multi-projection immersive format', 6, true),
    (gen_random_uuid(), 'DOLBY', 'Dolby Cinema', 'Dolby Vision & Atmos experience', 7, true),
    (gen_random_uuid(), 'PREMIUM', 'Premium', 'Premium large format', 8, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- TECHNOLOGIES
-- ============================================
INSERT INTO technologies (id, code, name, description, display_order, is_active) VALUES
    (gen_random_uuid(), 'ATMOS', 'Dolby Atmos', 'Object-based surround sound', 1, true),
    (gen_random_uuid(), 'DVISION', 'Dolby Vision', 'HDR video technology', 2, true),
    (gen_random_uuid(), 'IMAXLASER', 'IMAX Laser', 'IMAX laser projection', 3, true),
    (gen_random_uuid(), 'REALD', 'RealD 3D', 'Circular polarized 3D', 4, true),
    (gen_random_uuid(), 'AURO', 'Auro 11.1', '3D sound technology', 5, true),
    (gen_random_uuid(), 'DTSX', 'DTS:X', 'Object-based audio codec', 6, true),
    (gen_random_uuid(), '4KLASER', '4K Laser', '4K laser projection', 7, true),
    (gen_random_uuid(), 'HFR', 'HFR', 'High Frame Rate (48/60fps)', 8, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- GENRES
-- ============================================
INSERT INTO genres (id, code, name, display_order, is_active) VALUES
    (gen_random_uuid(), 'action', 'Action', 1, true),
    (gen_random_uuid(), 'adventure', 'Adventure', 2, true),
    (gen_random_uuid(), 'animation', 'Animation', 3, true),
    (gen_random_uuid(), 'comedy', 'Comedy', 4, true),
    (gen_random_uuid(), 'crime', 'Crime', 5, true),
    (gen_random_uuid(), 'documentary', 'Documentary', 6, true),
    (gen_random_uuid(), 'drama', 'Drama', 7, true),
    (gen_random_uuid(), 'family', 'Family', 8, true),
    (gen_random_uuid(), 'fantasy', 'Fantasy', 9, true),
    (gen_random_uuid(), 'horror', 'Horror', 10, true),
    (gen_random_uuid(), 'musical', 'Musical', 11, true),
    (gen_random_uuid(), 'mystery', 'Mystery', 12, true),
    (gen_random_uuid(), 'romance', 'Romance', 13, true),
    (gen_random_uuid(), 'sci-fi', 'Science Fiction', 14, true),
    (gen_random_uuid(), 'thriller', 'Thriller', 15, true),
    (gen_random_uuid(), 'war', 'War', 16, true),
    (gen_random_uuid(), 'western', 'Western', 17, true),
    (gen_random_uuid(), 'biography', 'Biography', 18, true),
    (gen_random_uuid(), 'history', 'History', 19, true),
    (gen_random_uuid(), 'sport', 'Sport', 20, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- AGE RATINGS
-- ============================================
DO $$
DECLARE
    lu_id UUID;
    de_id UUID;
    fr_id UUID;
    be_id UUID;
    us_id UUID;
BEGIN
    SELECT id INTO lu_id FROM countries WHERE code = 'LU';
    SELECT id INTO de_id FROM countries WHERE code = 'DE';
    SELECT id INTO fr_id FROM countries WHERE code = 'FR';
    SELECT id INTO be_id FROM countries WHERE code = 'BE';
    SELECT id INTO us_id FROM countries WHERE code = 'US';

    -- Luxembourg Age Ratings
    IF lu_id IS NOT NULL THEN
        INSERT INTO age_ratings (id, country_id, code, name, min_age, description, display_order, is_active)
        VALUES
            (gen_random_uuid(), lu_id, 'TP', 'Tous Publics', 0, 'All audiences', 1, true),
            (gen_random_uuid(), lu_id, '6+', '6 ans et plus', 6, '6 years and older', 2, true),
            (gen_random_uuid(), lu_id, '12+', '12 ans et plus', 12, '12 years and older', 3, true),
            (gen_random_uuid(), lu_id, '16+', '16 ans et plus', 16, '16 years and older', 4, true),
            (gen_random_uuid(), lu_id, '18+', '18 ans et plus', 18, 'Adults only', 5, true)
        ON CONFLICT (country_id, code) DO NOTHING;
    END IF;

    -- German Age Ratings (FSK)
    IF de_id IS NOT NULL THEN
        INSERT INTO age_ratings (id, country_id, code, name, min_age, description, display_order, is_active)
        VALUES
            (gen_random_uuid(), de_id, 'FSK0', 'FSK 0', 0, 'Freigegeben ohne Altersbeschränkung', 1, true),
            (gen_random_uuid(), de_id, 'FSK6', 'FSK 6', 6, 'Freigegeben ab 6 Jahren', 2, true),
            (gen_random_uuid(), de_id, 'FSK12', 'FSK 12', 12, 'Freigegeben ab 12 Jahren', 3, true),
            (gen_random_uuid(), de_id, 'FSK16', 'FSK 16', 16, 'Freigegeben ab 16 Jahren', 4, true),
            (gen_random_uuid(), de_id, 'FSK18', 'FSK 18', 18, 'Keine Jugendfreigabe', 5, true)
        ON CONFLICT (country_id, code) DO NOTHING;
    END IF;

    -- French Age Ratings
    IF fr_id IS NOT NULL THEN
        INSERT INTO age_ratings (id, country_id, code, name, min_age, description, display_order, is_active)
        VALUES
            (gen_random_uuid(), fr_id, 'U', 'Tous publics', 0, 'All audiences', 1, true),
            (gen_random_uuid(), fr_id, '-10', 'Déconseillé -10', 10, 'Not recommended under 10', 2, true),
            (gen_random_uuid(), fr_id, '-12', 'Interdit -12', 12, 'Prohibited under 12', 3, true),
            (gen_random_uuid(), fr_id, '-16', 'Interdit -16', 16, 'Prohibited under 16', 4, true),
            (gen_random_uuid(), fr_id, '-18', 'Interdit -18', 18, 'Prohibited under 18', 5, true)
        ON CONFLICT (country_id, code) DO NOTHING;
    END IF;

    -- US Age Ratings (MPAA)
    IF us_id IS NOT NULL THEN
        INSERT INTO age_ratings (id, country_id, code, name, min_age, description, display_order, is_active)
        VALUES
            (gen_random_uuid(), us_id, 'G', 'General Audiences', 0, 'All ages admitted', 1, true),
            (gen_random_uuid(), us_id, 'PG', 'Parental Guidance', 0, 'Parental guidance suggested', 2, true),
            (gen_random_uuid(), us_id, 'PG13', 'PG-13', 13, 'May be inappropriate for under 13', 3, true),
            (gen_random_uuid(), us_id, 'R', 'Restricted', 17, 'Under 17 requires accompanying adult', 4, true),
            (gen_random_uuid(), us_id, 'NC17', 'NC-17', 18, 'No one 17 and under admitted', 5, true)
        ON CONFLICT (country_id, code) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- CINEMA GROUPS
-- ============================================
DO $$
DECLARE
    lu_id UUID;
    de_id UUID;
    fr_id UUID;
    be_id UUID;
BEGIN
    SELECT id INTO lu_id FROM countries WHERE code = 'LU';
    SELECT id INTO de_id FROM countries WHERE code = 'DE';
    SELECT id INTO fr_id FROM countries WHERE code = 'FR';
    SELECT id INTO be_id FROM countries WHERE code = 'BE';

    INSERT INTO cinema_groups (id, name, slug, country_id, website, description, is_active)
    VALUES
        (gen_random_uuid(), 'Kinepolis Group', 'kinepolis', be_id, 'https://www.kinepolis.com', 'Major European cinema operator', true),
        (gen_random_uuid(), 'Utopia Group', 'utopia', lu_id, 'https://www.utopolis.lu', 'Luxembourg cinema chain', true),
        (gen_random_uuid(), 'Ciné Belval', 'cine-belval', lu_id, NULL, 'Belval cinema complex', true),
        (gen_random_uuid(), 'CineStar', 'cinestar', de_id, 'https://www.cinestar.de', 'German cinema chain', true),
        (gen_random_uuid(), 'UCI Kinowelt', 'uci', de_id, 'https://www.uci-kinowelt.de', 'German UCI cinemas', true),
        (gen_random_uuid(), 'Pathé Gaumont', 'pathe', fr_id, 'https://www.pathe.fr', 'French cinema chain', true),
        (gen_random_uuid(), 'UGC Cinémas', 'ugc', fr_id, 'https://www.ugc.fr', 'French cinema network', true)
    ON CONFLICT (slug) DO NOTHING;
END $$;

-- ============================================
-- CINEMAS
-- ============================================
DO $$
DECLARE
    kinepolis_id UUID;
    utopia_id UUID;
    cine_belval_id UUID;
    lu_id UUID;
BEGIN
    SELECT id INTO kinepolis_id FROM cinema_groups WHERE slug = 'kinepolis';
    SELECT id INTO utopia_id FROM cinema_groups WHERE slug = 'utopia';
    SELECT id INTO cine_belval_id FROM cinema_groups WHERE slug = 'cine-belval';
    SELECT id INTO lu_id FROM countries WHERE code = 'LU';

    INSERT INTO cinemas (id, name, slug, cinema_group_id, country_id, city, address_line1, postal_code, phone, email, website, screen_count, is_active)
    VALUES
        (gen_random_uuid(), 'Kinepolis Kirchberg', 'kinepolis-kirchberg', kinepolis_id, lu_id, 'Luxembourg', '45 Avenue John F. Kennedy', '1855', '+352 42 95 11', 'info@kinepolis.lu', 'https://kinepolis.lu', 10, true),
        (gen_random_uuid(), 'Kinepolis Belval', 'kinepolis-belval', kinepolis_id, lu_id, 'Esch-sur-Alzette', '17 Avenue du Rock''n''Roll', '4361', '+352 42 95 11', 'belval@kinepolis.lu', 'https://kinepolis.lu/belval', 8, true),
        (gen_random_uuid(), 'Utopia Luxembourg', 'utopia-luxembourg', utopia_id, lu_id, 'Luxembourg', '16 Avenue de la Faiencerie', '1510', '+352 22 46 11', 'info@utopolis.lu', 'https://utopolis.lu', 6, true),
        (gen_random_uuid(), 'Ciné Utopia', 'cine-utopia', utopia_id, lu_id, 'Luxembourg', '16 Avenue de la Faiencerie', '1510', '+352 22 46 11', NULL, NULL, 2, true),
        (gen_random_uuid(), 'Ciné Belval', 'cinema-belval', cine_belval_id, lu_id, 'Esch-sur-Alzette', 'Place de l''Université', '4365', '+352 26 84 00', 'info@cinebelval.lu', NULL, 4, true)
    ON CONFLICT (slug) DO NOTHING;
END $$;

-- ============================================
-- MOVIE TAGS (for Production Companies, Cast, Directors, etc.)
-- ============================================
INSERT INTO movie_tags (id, name, color, description, is_active)
VALUES
    -- Production Companies
    (gen_random_uuid(), 'Warner Bros.', '#005eb8', 'Warner Bros. Pictures', true),
    (gen_random_uuid(), 'Universal Pictures', '#00b4e4', 'Universal Pictures', true),
    (gen_random_uuid(), 'Disney', '#113ccf', 'The Walt Disney Company', true),
    (gen_random_uuid(), 'Paramount', '#0063dc', 'Paramount Pictures', true),
    (gen_random_uuid(), 'Sony Pictures', '#003087', 'Sony Pictures Entertainment', true),
    (gen_random_uuid(), '20th Century Studios', '#f5c518', '20th Century Studios', true),
    (gen_random_uuid(), 'Lionsgate', '#ff6600', 'Lionsgate Films', true),
    (gen_random_uuid(), 'A24', '#000000', 'A24 Films', true),
    (gen_random_uuid(), 'Studio Ghibli', '#3d7b5e', 'Studio Ghibli', true),
    -- Directors
    (gen_random_uuid(), 'Christopher Nolan', '#2563eb', 'Director', true),
    (gen_random_uuid(), 'Denis Villeneuve', '#7c3aed', 'Director', true),
    (gen_random_uuid(), 'Greta Gerwig', '#ec4899', 'Director', true),
    (gen_random_uuid(), 'Martin Scorsese', '#dc2626', 'Director', true),
    (gen_random_uuid(), 'Steven Spielberg', '#f59e0b', 'Director', true),
    (gen_random_uuid(), 'Ridley Scott', '#6b7280', 'Director', true),
    -- Cast Members
    (gen_random_uuid(), 'Timothée Chalamet', '#8b5cf6', 'Actor', true),
    (gen_random_uuid(), 'Florence Pugh', '#f472b6', 'Actor', true),
    (gen_random_uuid(), 'Margot Robbie', '#14b8a6', 'Actor', true),
    (gen_random_uuid(), 'Ryan Gosling', '#6366f1', 'Actor', true),
    (gen_random_uuid(), 'Cillian Murphy', '#0ea5e9', 'Actor', true),
    (gen_random_uuid(), 'Emily Blunt', '#d946ef', 'Actor', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SESSION TAGS
-- ============================================
INSERT INTO session_tags (id, name, color, description, is_active)
VALUES
    (gen_random_uuid(), 'Preview', '#8b5cf6', 'Preview screening before official release', true),
    (gen_random_uuid(), 'Premiere', '#ef4444', 'Official premiere event', true),
    (gen_random_uuid(), 'Ladies Night', '#ec4899', 'Special ladies night event', true),
    (gen_random_uuid(), 'Family Day', '#22c55e', 'Family-friendly screening', true),
    (gen_random_uuid(), 'Senior Screening', '#f59e0b', 'Screening for seniors', true),
    (gen_random_uuid(), 'Student Special', '#3b82f6', 'Discounted student screening', true),
    (gen_random_uuid(), 'Original Version', '#06b6d4', 'Original language version', true),
    (gen_random_uuid(), 'Marathon', '#f97316', 'Movie marathon event', true),
    (gen_random_uuid(), 'Late Night', '#64748b', 'Late night screening', true),
    (gen_random_uuid(), 'Q&A', '#a855f7', 'Screening with Q&A session', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- CINEMA TAGS
-- ============================================
INSERT INTO cinema_tags (id, name, color, description, is_active)
VALUES
    (gen_random_uuid(), 'Premium', '#f59e0b', 'Premium cinema experience', true),
    (gen_random_uuid(), 'IMAX', '#0ea5e9', 'IMAX certified theatre', true),
    (gen_random_uuid(), 'Dolby Cinema', '#000000', 'Dolby Cinema certified', true),
    (gen_random_uuid(), 'Wheelchair Accessible', '#22c55e', 'Full wheelchair accessibility', true),
    (gen_random_uuid(), 'VIP Lounge', '#8b5cf6', 'VIP lounge available', true),
    (gen_random_uuid(), 'Restaurant', '#ef4444', 'On-site restaurant', true),
    (gen_random_uuid(), 'Parking', '#6366f1', 'Free parking available', true),
    (gen_random_uuid(), 'Kids Area', '#ec4899', 'Kids play area', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- MOVIES (L0 - Core Data)
-- ============================================
-- Helper function to generate slug
CREATE OR REPLACE FUNCTION slugify(input TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(regexp_replace(input, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

INSERT INTO movies_l0 (id, original_title, slug, production_year, runtime_minutes, imdb_id, tmdb_id)
VALUES
    (gen_random_uuid(), 'Dune: Part Two', 'dune-part-two', 2024, 166, 'tt15239678', 693134),
    (gen_random_uuid(), 'Oppenheimer', 'oppenheimer', 2023, 180, 'tt15398776', 872585),
    (gen_random_uuid(), 'Barbie', 'barbie', 2023, 114, 'tt1517268', 346698),
    (gen_random_uuid(), 'Inside Out 2', 'inside-out-2', 2024, 96, 'tt22022452', 1022789),
    (gen_random_uuid(), 'Gladiator II', 'gladiator-2', 2024, 148, 'tt9218128', 558449),
    (gen_random_uuid(), 'Furiosa: A Mad Max Saga', 'furiosa', 2024, 148, 'tt12037194', 786892),
    (gen_random_uuid(), 'Wonka', 'wonka', 2023, 116, 'tt6166392', 787699),
    (gen_random_uuid(), 'The Fall Guy', 'the-fall-guy', 2024, 126, 'tt1684562', 746036),
    (gen_random_uuid(), 'Killers of the Flower Moon', 'killers-of-the-flower-moon', 2023, 206, 'tt5537002', 466420),
    (gen_random_uuid(), 'Poor Things', 'poor-things', 2023, 141, 'tt14230458', 792307)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- MOVIES L1 - Localized Data (per language)
-- ============================================
DO $$
DECLARE
    dune_id UUID;
    oppen_id UUID;
    barbie_id UUID;
    inside_id UUID;
    gladiator_id UUID;

    lang_en UUID;
    lang_de UUID;
    lang_fr UUID;

    lu_id UUID;
    de_id UUID;
    fr_id UUID;

    lu_12 UUID;
    de_fsk12 UUID;
    fr_12 UUID;
    lu_tp UUID;
    de_fsk0 UUID;
    fr_u UUID;
    lu_16 UUID;
    de_fsk16 UUID;
BEGIN
    -- Get movie IDs
    SELECT id INTO dune_id FROM movies_l0 WHERE slug = 'dune-part-two';
    SELECT id INTO oppen_id FROM movies_l0 WHERE slug = 'oppenheimer';
    SELECT id INTO barbie_id FROM movies_l0 WHERE slug = 'barbie';
    SELECT id INTO inside_id FROM movies_l0 WHERE slug = 'inside-out-2';
    SELECT id INTO gladiator_id FROM movies_l0 WHERE slug = 'gladiator-2';

    -- Get language IDs
    SELECT id INTO lang_en FROM languages WHERE code = 'en';
    SELECT id INTO lang_de FROM languages WHERE code = 'de';
    SELECT id INTO lang_fr FROM languages WHERE code = 'fr';

    -- Get country IDs
    SELECT id INTO lu_id FROM countries WHERE code = 'LU';
    SELECT id INTO de_id FROM countries WHERE code = 'DE';
    SELECT id INTO fr_id FROM countries WHERE code = 'FR';

    -- Get age rating IDs
    SELECT id INTO lu_tp FROM age_ratings WHERE code = 'TP' AND country_id = lu_id;
    SELECT id INTO lu_12 FROM age_ratings WHERE code = '12+' AND country_id = lu_id;
    SELECT id INTO lu_16 FROM age_ratings WHERE code = '16+' AND country_id = lu_id;
    SELECT id INTO de_fsk0 FROM age_ratings WHERE code = 'FSK0' AND country_id = de_id;
    SELECT id INTO de_fsk12 FROM age_ratings WHERE code = 'FSK12' AND country_id = de_id;
    SELECT id INTO de_fsk16 FROM age_ratings WHERE code = 'FSK16' AND country_id = de_id;
    SELECT id INTO fr_u FROM age_ratings WHERE code = 'U' AND country_id = fr_id;
    SELECT id INTO fr_12 FROM age_ratings WHERE code = '-12' AND country_id = fr_id;

    -- Dune: Part Two - L1 data per language
    IF dune_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, language_id, title, release_date, runtime_minutes, age_rating_id, plot)
        VALUES
            (gen_random_uuid(), dune_id, lang_en, 'Dune: Part Two', '2024-03-01', 166, lu_12, 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.'),
            (gen_random_uuid(), dune_id, lang_de, 'Dune: Part Two', '2024-03-01', 166, de_fsk12, 'Paul Atreides verbündet sich mit Chani und den Fremen, während er Rache gegen die Verschwörer sucht, die seine Familie zerstört haben.'),
            (gen_random_uuid(), dune_id, lang_fr, 'Dune: Deuxième Partie', '2024-02-28', 166, fr_12, 'Paul Atréides s''unit avec Chani et les Fremen tout en cherchant à se venger de ceux qui ont détruit sa famille.')
        ON CONFLICT (movie_l0_id, language_id) DO NOTHING;
    END IF;

    -- Oppenheimer - L1 data
    IF oppen_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, language_id, title, release_date, runtime_minutes, age_rating_id, plot)
        VALUES
            (gen_random_uuid(), oppen_id, lang_en, 'Oppenheimer', '2023-07-21', 180, lu_12, 'The story of J. Robert Oppenheimer and his role in the development of the atomic bomb.'),
            (gen_random_uuid(), oppen_id, lang_de, 'Oppenheimer', '2023-07-20', 180, de_fsk12, 'Die Geschichte von J. Robert Oppenheimer und seine Rolle bei der Entwicklung der Atombombe.'),
            (gen_random_uuid(), oppen_id, lang_fr, 'Oppenheimer', '2023-07-19', 180, fr_12, 'L''histoire du physicien américain J. Robert Oppenheimer, père de la bombe atomique.')
        ON CONFLICT (movie_l0_id, language_id) DO NOTHING;
    END IF;

    -- Barbie - L1 data
    IF barbie_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, language_id, title, release_date, runtime_minutes, age_rating_id, plot)
        VALUES
            (gen_random_uuid(), barbie_id, lang_en, 'Barbie', '2023-07-21', 114, lu_tp, 'Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land.'),
            (gen_random_uuid(), barbie_id, lang_de, 'Barbie', '2023-07-20', 114, de_fsk0, 'Barbie und Ken leben im perfekten Barbieland, bis sie die Gelegenheit bekommen, in die reale Welt zu gehen.'),
            (gen_random_uuid(), barbie_id, lang_fr, 'Barbie', '2023-07-19', 114, fr_u, 'Barbie et Ken vivent dans le monde parfait de Barbie Land avant de découvrir le monde réel.')
        ON CONFLICT (movie_l0_id, language_id) DO NOTHING;
    END IF;

    -- Inside Out 2 - L1 data
    IF inside_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, language_id, title, release_date, runtime_minutes, age_rating_id, plot)
        VALUES
            (gen_random_uuid(), inside_id, lang_en, 'Inside Out 2', '2024-06-14', 96, lu_tp, 'Riley enters puberty and new emotions show up at headquarters.'),
            (gen_random_uuid(), inside_id, lang_de, 'Alles steht Kopf 2', '2024-06-13', 96, de_fsk0, 'Riley wird Teenager und neue Emotionen tauchen in der Kommandozentrale auf.'),
            (gen_random_uuid(), inside_id, lang_fr, 'Vice-Versa 2', '2024-06-19', 96, fr_u, 'Riley entre dans l''adolescence et de nouvelles émotions débarquent au Quartier général.')
        ON CONFLICT (movie_l0_id, language_id) DO NOTHING;
    END IF;

    -- Gladiator II - L1 data
    IF gladiator_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, language_id, title, release_date, runtime_minutes, age_rating_id, plot)
        VALUES
            (gen_random_uuid(), gladiator_id, lang_en, 'Gladiator II', '2024-11-22', 148, lu_16, 'Lucius, son of Lucilla, must enter the arena after his home is conquered.'),
            (gen_random_uuid(), gladiator_id, lang_de, 'Gladiator II', '2024-11-14', 148, de_fsk16, 'Lucius, der Sohn von Lucilla, muss in die Arena eintreten, nachdem sein Zuhause erobert wurde.'),
            (gen_random_uuid(), gladiator_id, lang_fr, 'Gladiator II', '2024-11-13', 148, fr_12, 'Lucius, fils de Lucilla, doit entrer dans l''arène après la conquête de son foyer.')
        ON CONFLICT (movie_l0_id, language_id) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- MOVIES L2 - Editions (Format/Language versions)
-- ============================================
DO $$
DECLARE
    dune_id UUID;
    barbie_id UUID;
    inside_id UUID;
    oppen_id UUID;

    format_2d UUID;
    format_3d UUID;
    format_imax UUID;
    format_dolby UUID;

    lang_en UUID;
    lang_de UUID;
    lang_fr UUID;
BEGIN
    -- Get movie L0 IDs
    SELECT id INTO dune_id FROM movies_l0 WHERE slug = 'dune-part-two';
    SELECT id INTO barbie_id FROM movies_l0 WHERE slug = 'barbie';
    SELECT id INTO inside_id FROM movies_l0 WHERE slug = 'inside-out-2';
    SELECT id INTO oppen_id FROM movies_l0 WHERE slug = 'oppenheimer';

    -- Get format IDs
    SELECT id INTO format_2d FROM formats WHERE code = '2D';
    SELECT id INTO format_3d FROM formats WHERE code = '3D';
    SELECT id INTO format_imax FROM formats WHERE code = 'IMAX2D';
    SELECT id INTO format_dolby FROM formats WHERE code = 'DOLBY';

    -- Get language IDs
    SELECT id INTO lang_en FROM languages WHERE code = 'en';
    SELECT id INTO lang_de FROM languages WHERE code = 'de';
    SELECT id INTO lang_fr FROM languages WHERE code = 'fr';

    -- Dune editions
    IF dune_id IS NOT NULL AND format_2d IS NOT NULL THEN
        INSERT INTO movies_l2 (id, movie_l0_id, edition_title, format_id, audio_language_id, subtitle_language_id, is_original_version, is_active)
        VALUES
            (gen_random_uuid(), dune_id, 'Dune 2 - OV', format_2d, lang_en, lang_fr, true, true),
            (gen_random_uuid(), dune_id, 'Dune 2 - VF', format_2d, lang_fr, NULL, false, true),
            (gen_random_uuid(), dune_id, 'Dune 2 - DF', format_2d, lang_de, NULL, false, true),
            (gen_random_uuid(), dune_id, 'Dune 2 - IMAX OV', format_imax, lang_en, lang_fr, true, true),
            (gen_random_uuid(), dune_id, 'Dune 2 - Dolby Cinema', format_dolby, lang_en, lang_fr, true, true);
    END IF;

    -- Oppenheimer editions
    IF oppen_id IS NOT NULL AND format_2d IS NOT NULL THEN
        INSERT INTO movies_l2 (id, movie_l0_id, edition_title, format_id, audio_language_id, subtitle_language_id, is_original_version, is_active)
        VALUES
            (gen_random_uuid(), oppen_id, 'Oppenheimer - OV', format_2d, lang_en, lang_fr, true, true),
            (gen_random_uuid(), oppen_id, 'Oppenheimer - VF', format_2d, lang_fr, NULL, false, true),
            (gen_random_uuid(), oppen_id, 'Oppenheimer - IMAX', format_imax, lang_en, lang_fr, true, true);
    END IF;

    -- Barbie editions
    IF barbie_id IS NOT NULL AND format_2d IS NOT NULL THEN
        INSERT INTO movies_l2 (id, movie_l0_id, edition_title, format_id, audio_language_id, subtitle_language_id, is_original_version, is_active)
        VALUES
            (gen_random_uuid(), barbie_id, 'Barbie - OV', format_2d, lang_en, lang_fr, true, true),
            (gen_random_uuid(), barbie_id, 'Barbie - VF', format_2d, lang_fr, NULL, false, true),
            (gen_random_uuid(), barbie_id, 'Barbie - DF', format_2d, lang_de, NULL, false, true);
    END IF;

    -- Inside Out 2 editions
    IF inside_id IS NOT NULL AND format_2d IS NOT NULL THEN
        INSERT INTO movies_l2 (id, movie_l0_id, edition_title, format_id, audio_language_id, subtitle_language_id, is_original_version, is_active)
        VALUES
            (gen_random_uuid(), inside_id, 'Vice-Versa 2 - VF', format_2d, lang_fr, NULL, false, true),
            (gen_random_uuid(), inside_id, 'Alles steht Kopf 2 - DF', format_2d, lang_de, NULL, false, true),
            (gen_random_uuid(), inside_id, 'Inside Out 2 - 3D VF', format_3d, lang_fr, NULL, false, true);
    END IF;
END $$;

-- ============================================
-- EXPORT CLIENTS
-- ============================================
INSERT INTO export_clients (id, name, slug, contact_email, contact_name, is_active)
VALUES
    (gen_random_uuid(), 'RTL', 'rtl', 'cinema@rtl.lu', 'RTL Editorial', true),
    (gen_random_uuid(), 'Luxemburger Wort', 'wort', 'kultur@wort.lu', 'Culture Desk', true),
    (gen_random_uuid(), 'Telecran', 'telecran', 'redaktion@telecran.lu', 'Telecran Team', true),
    (gen_random_uuid(), 'L''essentiel', 'lessentiel', 'cinema@lessentiel.lu', NULL, true),
    (gen_random_uuid(), 'Paperjam', 'paperjam', 'lifestyle@paperjam.lu', 'Paperjam Culture', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- EXPORT TEMPLATES
-- ============================================
DO $$
DECLARE
    rtl_id UUID;
    wort_id UUID;
BEGIN
    SELECT id INTO rtl_id FROM export_clients WHERE slug = 'rtl';
    SELECT id INTO wort_id FROM export_clients WHERE slug = 'wort';

    IF rtl_id IS NOT NULL THEN
        INSERT INTO export_templates (id, client_id, name, description, format, template_content, config, is_active)
        VALUES
            (gen_random_uuid(), rtl_id, 'RTL Daily Feed', 'Daily cinema program for RTL website', 'xml', '<cinemas>{{#cinemas}}<cinema name="{{name}}">{{#sessions}}<session>...</session>{{/sessions}}</cinema>{{/cinemas}}</cinemas>', '{"include_synopsis": true}', true),
            (gen_random_uuid(), rtl_id, 'RTL Weekly PDF', 'Weekly cinema overview', 'json', '{"week": "{{week}}", "cinemas": [...]}', '{"format": "pdf"}', true)
        ON CONFLICT DO NOTHING;
    END IF;

    IF wort_id IS NOT NULL THEN
        INSERT INTO export_templates (id, client_id, name, description, format, template_content, config, is_active)
        VALUES
            (gen_random_uuid(), wort_id, 'Wort Cinema Feed', 'Cinema listings for Wort', 'xml', '<programme>...</programme>', '{}', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- SAMPLE SESSIONS (Cinema Screenings)
-- ============================================
DO $$
DECLARE
    kinepolis_kb_id UUID;
    utopia_id UUID;

    dune_ed_ov UUID;
    dune_ed_vf UUID;
    dune_ed_imax UUID;
    barbie_ed_ov UUID;
    inside_ed_vf UUID;

    today DATE := CURRENT_DATE;
    tomorrow DATE := CURRENT_DATE + 1;
BEGIN
    -- Get cinema IDs
    SELECT id INTO kinepolis_kb_id FROM cinemas WHERE slug = 'kinepolis-kirchberg';
    SELECT id INTO utopia_id FROM cinemas WHERE slug = 'utopia-luxembourg';

    -- Get edition IDs
    SELECT id INTO dune_ed_ov FROM movies_l2 WHERE edition_title = 'Dune 2 - OV';
    SELECT id INTO dune_ed_vf FROM movies_l2 WHERE edition_title = 'Dune 2 - VF';
    SELECT id INTO dune_ed_imax FROM movies_l2 WHERE edition_title = 'Dune 2 - IMAX OV';
    SELECT id INTO barbie_ed_ov FROM movies_l2 WHERE edition_title = 'Barbie - OV';
    SELECT id INTO inside_ed_vf FROM movies_l2 WHERE edition_title = 'Vice-Versa 2 - VF';

    -- Create sessions for Kinepolis Kirchberg
    IF kinepolis_kb_id IS NOT NULL AND dune_ed_ov IS NOT NULL THEN
        INSERT INTO sessions (id, movie_l2_id, cinema_id, screen_name, show_date, show_time, end_time, price, booking_url)
        VALUES
            (gen_random_uuid(), dune_ed_ov, kinepolis_kb_id, 'Saal 1', today, '14:00', '16:46', 14.50, 'https://kinepolis.lu/tickets'),
            (gen_random_uuid(), dune_ed_ov, kinepolis_kb_id, 'Saal 1', today, '17:30', '20:16', 14.50, 'https://kinepolis.lu/tickets'),
            (gen_random_uuid(), dune_ed_ov, kinepolis_kb_id, 'Saal 1', today, '20:45', '23:31', 14.50, 'https://kinepolis.lu/tickets'),
            (gen_random_uuid(), dune_ed_ov, kinepolis_kb_id, 'Saal 1', tomorrow, '14:00', '16:46', 14.50, 'https://kinepolis.lu/tickets'),
            (gen_random_uuid(), dune_ed_ov, kinepolis_kb_id, 'Saal 1', tomorrow, '20:00', '22:46', 14.50, 'https://kinepolis.lu/tickets');
    END IF;

    IF kinepolis_kb_id IS NOT NULL AND dune_ed_vf IS NOT NULL THEN
        INSERT INTO sessions (id, movie_l2_id, cinema_id, screen_name, show_date, show_time, end_time, price, booking_url)
        VALUES
            (gen_random_uuid(), dune_ed_vf, kinepolis_kb_id, 'Saal 3', today, '15:00', '17:46', 14.50, 'https://kinepolis.lu/tickets'),
            (gen_random_uuid(), dune_ed_vf, kinepolis_kb_id, 'Saal 3', today, '20:00', '22:46', 14.50, 'https://kinepolis.lu/tickets');
    END IF;

    IF kinepolis_kb_id IS NOT NULL AND dune_ed_imax IS NOT NULL THEN
        INSERT INTO sessions (id, movie_l2_id, cinema_id, screen_name, show_date, show_time, end_time, price, booking_url)
        VALUES
            (gen_random_uuid(), dune_ed_imax, kinepolis_kb_id, 'IMAX', today, '16:00', '18:46', 18.50, 'https://kinepolis.lu/tickets'),
            (gen_random_uuid(), dune_ed_imax, kinepolis_kb_id, 'IMAX', today, '21:00', '23:46', 18.50, 'https://kinepolis.lu/tickets'),
            (gen_random_uuid(), dune_ed_imax, kinepolis_kb_id, 'IMAX', tomorrow, '14:00', '16:46', 18.50, 'https://kinepolis.lu/tickets'),
            (gen_random_uuid(), dune_ed_imax, kinepolis_kb_id, 'IMAX', tomorrow, '20:00', '22:46', 18.50, 'https://kinepolis.lu/tickets');
    END IF;

    -- Create sessions for Utopia
    IF utopia_id IS NOT NULL AND barbie_ed_ov IS NOT NULL THEN
        INSERT INTO sessions (id, movie_l2_id, cinema_id, screen_name, show_date, show_time, end_time, price, booking_url)
        VALUES
            (gen_random_uuid(), barbie_ed_ov, utopia_id, 'Saal A', today, '14:30', '16:24', 12.00, 'https://utopolis.lu/tickets'),
            (gen_random_uuid(), barbie_ed_ov, utopia_id, 'Saal A', today, '19:00', '20:54', 12.00, 'https://utopolis.lu/tickets');
    END IF;

    IF utopia_id IS NOT NULL AND inside_ed_vf IS NOT NULL THEN
        INSERT INTO sessions (id, movie_l2_id, cinema_id, screen_name, show_date, show_time, end_time, price, booking_url)
        VALUES
            (gen_random_uuid(), inside_ed_vf, utopia_id, 'Saal B', today, '11:00', '12:36', 10.00, 'https://utopolis.lu/tickets'),
            (gen_random_uuid(), inside_ed_vf, utopia_id, 'Saal B', today, '14:00', '15:36', 12.00, 'https://utopolis.lu/tickets'),
            (gen_random_uuid(), inside_ed_vf, utopia_id, 'Saal B', today, '16:30', '18:06', 12.00, 'https://utopolis.lu/tickets');
    END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Demo data successfully inserted!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Countries: %', (SELECT COUNT(*) FROM countries);
    RAISE NOTICE 'Languages: %', (SELECT COUNT(*) FROM languages);
    RAISE NOTICE 'Formats: %', (SELECT COUNT(*) FROM formats);
    RAISE NOTICE 'Technologies: %', (SELECT COUNT(*) FROM technologies);
    RAISE NOTICE 'Genres: %', (SELECT COUNT(*) FROM genres);
    RAISE NOTICE 'Age Ratings: %', (SELECT COUNT(*) FROM age_ratings);
    RAISE NOTICE 'Cinema Groups: %', (SELECT COUNT(*) FROM cinema_groups);
    RAISE NOTICE 'Cinemas: %', (SELECT COUNT(*) FROM cinemas);
    RAISE NOTICE 'Movies (L0): %', (SELECT COUNT(*) FROM movies_l0);
    RAISE NOTICE 'Movies (L1): %', (SELECT COUNT(*) FROM movies_l1);
    RAISE NOTICE 'Movies (L2): %', (SELECT COUNT(*) FROM movies_l2);
    RAISE NOTICE 'Sessions: %', (SELECT COUNT(*) FROM sessions);
    RAISE NOTICE 'Export Clients: %', (SELECT COUNT(*) FROM export_clients);
    RAISE NOTICE '============================================';
END $$;
