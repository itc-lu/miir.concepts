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
INSERT INTO countries (id, code, name, flag_emoji, is_active) VALUES
    (gen_random_uuid(), 'LU', 'Luxembourg', '🇱🇺', true),
    (gen_random_uuid(), 'DE', 'Germany', '🇩🇪', true),
    (gen_random_uuid(), 'FR', 'France', '🇫🇷', true),
    (gen_random_uuid(), 'BE', 'Belgium', '🇧🇪', true),
    (gen_random_uuid(), 'US', 'United States', '🇺🇸', true),
    (gen_random_uuid(), 'GB', 'United Kingdom', '🇬🇧', true),
    (gen_random_uuid(), 'IT', 'Italy', '🇮🇹', true),
    (gen_random_uuid(), 'ES', 'Spain', '🇪🇸', true),
    (gen_random_uuid(), 'JP', 'Japan', '🇯🇵', true),
    (gen_random_uuid(), 'KR', 'South Korea', '🇰🇷', true),
    (gen_random_uuid(), 'AU', 'Australia', '🇦🇺', true),
    (gen_random_uuid(), 'CA', 'Canada', '🇨🇦', true),
    (gen_random_uuid(), 'NL', 'Netherlands', '🇳🇱', true),
    (gen_random_uuid(), 'AT', 'Austria', '🇦🇹', true),
    (gen_random_uuid(), 'CH', 'Switzerland', '🇨🇭', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- LANGUAGES
-- ============================================
INSERT INTO languages (id, code, name, name_native, display_order, is_active) VALUES
    (gen_random_uuid(), 'lu', 'Luxembourgish', 'Lëtzebuergesch', 1, true),
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
INSERT INTO formats (id, name, code, description, display_order, is_active) VALUES
    (gen_random_uuid(), '2D', '2D', 'Standard 2D projection', 1, true),
    (gen_random_uuid(), '3D', '3D', '3D stereoscopic projection', 2, true),
    (gen_random_uuid(), 'IMAX 2D', 'IMAX2D', 'IMAX large format 2D', 3, true),
    (gen_random_uuid(), 'IMAX 3D', 'IMAX3D', 'IMAX large format 3D', 4, true),
    (gen_random_uuid(), '4DX', '4DX', '4D experience with motion seats', 5, true),
    (gen_random_uuid(), 'ScreenX', 'SCREENX', 'Multi-projection immersive format', 6, true),
    (gen_random_uuid(), 'Dolby Cinema', 'DOLBY', 'Dolby Vision & Atmos experience', 7, true),
    (gen_random_uuid(), 'Premium', 'PREMIUM', 'Premium large format', 8, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- TECHNOLOGIES
-- ============================================
INSERT INTO technologies (id, name, code, description, display_order, is_active) VALUES
    (gen_random_uuid(), 'Dolby Atmos', 'ATMOS', 'Object-based surround sound', 1, true),
    (gen_random_uuid(), 'Dolby Vision', 'DVISION', 'HDR video technology', 2, true),
    (gen_random_uuid(), 'IMAX Laser', 'IMAXLASER', 'IMAX laser projection', 3, true),
    (gen_random_uuid(), 'RealD 3D', 'REALD', 'Circular polarized 3D', 4, true),
    (gen_random_uuid(), 'Auro 11.1', 'AURO', '3D sound technology', 5, true),
    (gen_random_uuid(), 'DTS:X', 'DTSX', 'Object-based audio codec', 6, true),
    (gen_random_uuid(), '4K Laser', '4KLASER', '4K laser projection', 7, true),
    (gen_random_uuid(), 'HFR', 'HFR', 'High Frame Rate (48/60fps)', 8, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- GENRES
-- ============================================
INSERT INTO genres (id, name, slug, description, display_order, is_active) VALUES
    (gen_random_uuid(), 'Action', 'action', 'Action-packed films with physical feats', 1, true),
    (gen_random_uuid(), 'Adventure', 'adventure', 'Exciting journeys and explorations', 2, true),
    (gen_random_uuid(), 'Animation', 'animation', 'Animated feature films', 3, true),
    (gen_random_uuid(), 'Comedy', 'comedy', 'Humorous and entertaining films', 4, true),
    (gen_random_uuid(), 'Crime', 'crime', 'Crime and detective stories', 5, true),
    (gen_random_uuid(), 'Documentary', 'documentary', 'Non-fiction films', 6, true),
    (gen_random_uuid(), 'Drama', 'drama', 'Serious narrative films', 7, true),
    (gen_random_uuid(), 'Family', 'family', 'Films suitable for all ages', 8, true),
    (gen_random_uuid(), 'Fantasy', 'fantasy', 'Magical and fantastical stories', 9, true),
    (gen_random_uuid(), 'Horror', 'horror', 'Scary and suspenseful films', 10, true),
    (gen_random_uuid(), 'Musical', 'musical', 'Films featuring music and dance', 11, true),
    (gen_random_uuid(), 'Mystery', 'mystery', 'Puzzling and enigmatic stories', 12, true),
    (gen_random_uuid(), 'Romance', 'romance', 'Love stories and romantic tales', 13, true),
    (gen_random_uuid(), 'Science Fiction', 'sci-fi', 'Futuristic and speculative fiction', 14, true),
    (gen_random_uuid(), 'Thriller', 'thriller', 'Suspenseful and tense narratives', 15, true),
    (gen_random_uuid(), 'War', 'war', 'War and military themed films', 16, true),
    (gen_random_uuid(), 'Western', 'western', 'American Old West stories', 17, true),
    (gen_random_uuid(), 'Biography', 'biography', 'Life stories of real people', 18, true),
    (gen_random_uuid(), 'History', 'history', 'Historical period films', 19, true),
    (gen_random_uuid(), 'Sport', 'sport', 'Sports-themed films', 20, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- AGE RATINGS
-- ============================================
-- Get country IDs first
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
    INSERT INTO age_ratings (id, country_id, code, name, min_age, description, color, display_order, is_active)
    VALUES
        (gen_random_uuid(), lu_id, 'TP', 'Tous Publics', 0, 'All audiences', '#22c55e', 1, true),
        (gen_random_uuid(), lu_id, '6+', '6 ans et plus', 6, '6 years and older', '#84cc16', 2, true),
        (gen_random_uuid(), lu_id, '12+', '12 ans et plus', 12, '12 years and older', '#f59e0b', 3, true),
        (gen_random_uuid(), lu_id, '16+', '16 ans et plus', 16, '16 years and older', '#f97316', 4, true),
        (gen_random_uuid(), lu_id, '18+', '18 ans et plus', 18, 'Adults only', '#ef4444', 5, true)
    ON CONFLICT DO NOTHING;

    -- German Age Ratings (FSK)
    INSERT INTO age_ratings (id, country_id, code, name, min_age, description, color, display_order, is_active)
    VALUES
        (gen_random_uuid(), de_id, 'FSK 0', 'FSK 0', 0, 'Freigegeben ohne Altersbeschränkung', '#22c55e', 1, true),
        (gen_random_uuid(), de_id, 'FSK 6', 'FSK 6', 6, 'Freigegeben ab 6 Jahren', '#84cc16', 2, true),
        (gen_random_uuid(), de_id, 'FSK 12', 'FSK 12', 12, 'Freigegeben ab 12 Jahren', '#f59e0b', 3, true),
        (gen_random_uuid(), de_id, 'FSK 16', 'FSK 16', 16, 'Freigegeben ab 16 Jahren', '#f97316', 4, true),
        (gen_random_uuid(), de_id, 'FSK 18', 'FSK 18', 18, 'Keine Jugendfreigabe', '#ef4444', 5, true)
    ON CONFLICT DO NOTHING;

    -- French Age Ratings
    INSERT INTO age_ratings (id, country_id, code, name, min_age, description, color, display_order, is_active)
    VALUES
        (gen_random_uuid(), fr_id, 'U', 'Tous publics', 0, 'All audiences', '#22c55e', 1, true),
        (gen_random_uuid(), fr_id, '-10', 'Déconseillé -10', 10, 'Not recommended under 10', '#84cc16', 2, true),
        (gen_random_uuid(), fr_id, '-12', 'Interdit -12', 12, 'Prohibited under 12', '#f59e0b', 3, true),
        (gen_random_uuid(), fr_id, '-16', 'Interdit -16', 16, 'Prohibited under 16', '#f97316', 4, true),
        (gen_random_uuid(), fr_id, '-18', 'Interdit -18', 18, 'Prohibited under 18', '#ef4444', 5, true)
    ON CONFLICT DO NOTHING;

    -- US Age Ratings (MPAA)
    INSERT INTO age_ratings (id, country_id, code, name, min_age, description, color, display_order, is_active)
    VALUES
        (gen_random_uuid(), us_id, 'G', 'General Audiences', 0, 'All ages admitted', '#22c55e', 1, true),
        (gen_random_uuid(), us_id, 'PG', 'Parental Guidance', 0, 'Parental guidance suggested', '#84cc16', 2, true),
        (gen_random_uuid(), us_id, 'PG-13', 'Parents Strongly Cautioned', 13, 'May be inappropriate for under 13', '#f59e0b', 3, true),
        (gen_random_uuid(), us_id, 'R', 'Restricted', 17, 'Under 17 requires accompanying adult', '#f97316', 4, true),
        (gen_random_uuid(), us_id, 'NC-17', 'Adults Only', 18, 'No one 17 and under admitted', '#ef4444', 5, true)
    ON CONFLICT DO NOTHING;
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
    de_id UUID;
BEGIN
    SELECT id INTO kinepolis_id FROM cinema_groups WHERE slug = 'kinepolis';
    SELECT id INTO utopia_id FROM cinema_groups WHERE slug = 'utopia';
    SELECT id INTO cine_belval_id FROM cinema_groups WHERE slug = 'cine-belval';
    SELECT id INTO lu_id FROM countries WHERE code = 'LU';
    SELECT id INTO de_id FROM countries WHERE code = 'DE';

    INSERT INTO cinemas (id, name, slug, cinema_group_id, country_id, city, address, postal_code, phone, email, website, screen_count, total_seats, is_active)
    VALUES
        (gen_random_uuid(), 'Kinepolis Kirchberg', 'kinepolis-kirchberg', kinepolis_id, lu_id, 'Luxembourg', '45 Avenue John F. Kennedy', '1855', '+352 42 95 11', 'info@kinepolis.lu', 'https://kinepolis.lu', 10, 2400, true),
        (gen_random_uuid(), 'Kinepolis Belval', 'kinepolis-belval', kinepolis_id, lu_id, 'Esch-sur-Alzette', '17 Avenue du Rock''n''Roll', '4361', '+352 42 95 11', 'belval@kinepolis.lu', 'https://kinepolis.lu/belval', 8, 1800, true),
        (gen_random_uuid(), 'Utopia Luxembourg', 'utopia-luxembourg', utopia_id, lu_id, 'Luxembourg', '16 Avenue de la Faiencerie', '1510', '+352 22 46 11', 'info@utopolis.lu', 'https://utopolis.lu', 6, 1200, true),
        (gen_random_uuid(), 'Ciné Utopia', 'cine-utopia', utopia_id, lu_id, 'Luxembourg', '16 Avenue de la Faiencerie', '1510', '+352 22 46 11', NULL, NULL, 2, 350, true),
        (gen_random_uuid(), 'Ciné Belval', 'ciné-belval', cine_belval_id, lu_id, 'Esch-sur-Alzette', 'Place de l''Université', '4365', '+352 26 84 00', 'info@cinebelval.lu', NULL, 4, 650, true)
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
ON CONFLICT DO NOTHING;

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
ON CONFLICT DO NOTHING;

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
ON CONFLICT DO NOTHING;

-- ============================================
-- MOVIES (L0 - Core Data)
-- ============================================
DO $$
DECLARE
    us_id UUID;
    gb_id UUID;
    action_id UUID;
    adventure_id UUID;
    scifi_id UUID;
    drama_id UUID;
    comedy_id UUID;
    animation_id UUID;
    thriller_id UUID;
BEGIN
    SELECT id INTO us_id FROM countries WHERE code = 'US';
    SELECT id INTO gb_id FROM countries WHERE code = 'GB';
    SELECT id INTO action_id FROM genres WHERE slug = 'action';
    SELECT id INTO adventure_id FROM genres WHERE slug = 'adventure';
    SELECT id INTO scifi_id FROM genres WHERE slug = 'sci-fi';
    SELECT id INTO drama_id FROM genres WHERE slug = 'drama';
    SELECT id INTO comedy_id FROM genres WHERE slug = 'comedy';
    SELECT id INTO animation_id FROM genres WHERE slug = 'animation';
    SELECT id INTO thriller_id FROM genres WHERE slug = 'thriller';

    -- Movie 1: Dune Part Two
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Dune: Part Two', 2024, 'tt15239678', 693134, true);

    -- Movie 2: Oppenheimer
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Oppenheimer', 2023, 'tt15398776', 872585, true);

    -- Movie 3: Barbie
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Barbie', 2023, 'tt1517268', 346698, true);

    -- Movie 4: Inside Out 2
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Inside Out 2', 2024, 'tt22022452', 1022789, true);

    -- Movie 5: Gladiator II
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Gladiator II', 2024, 'tt9218128', 558449, true);

    -- Movie 6: Furiosa: A Mad Max Saga
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Furiosa: A Mad Max Saga', 2024, 'tt12037194', 786892, true);

    -- Movie 7: Wonka
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Wonka', 2023, 'tt6166392', 787699, true);

    -- Movie 8: The Fall Guy
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'The Fall Guy', 2024, 'tt1684562', 746036, true);

    -- Movie 9: Killers of the Flower Moon
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Killers of the Flower Moon', 2023, 'tt5537002', 466420, true);

    -- Movie 10: Poor Things
    INSERT INTO movies_l0 (id, original_title, production_year, imdb_id, tmdb_id, is_active)
    VALUES (gen_random_uuid(), 'Poor Things', 2023, 'tt14230458', 792307, true);
END $$;

-- ============================================
-- MOVIES L1 - Localized Data (per market)
-- ============================================
DO $$
DECLARE
    dune_id UUID;
    oppen_id UUID;
    barbie_id UUID;
    inside_id UUID;
    gladiator_id UUID;
    furiosa_id UUID;
    wonka_id UUID;
    fallguy_id UUID;
    killers_id UUID;
    poor_id UUID;

    lu_id UUID;
    de_id UUID;
    fr_id UUID;
    be_id UUID;

    lu_tp UUID;
    lu_12 UUID;
    lu_16 UUID;
    de_fsk0 UUID;
    de_fsk12 UUID;
    de_fsk16 UUID;
    fr_u UUID;
    fr_12 UUID;
BEGIN
    -- Get movie IDs
    SELECT id INTO dune_id FROM movies_l0 WHERE original_title = 'Dune: Part Two';
    SELECT id INTO oppen_id FROM movies_l0 WHERE original_title = 'Oppenheimer';
    SELECT id INTO barbie_id FROM movies_l0 WHERE original_title = 'Barbie';
    SELECT id INTO inside_id FROM movies_l0 WHERE original_title = 'Inside Out 2';
    SELECT id INTO gladiator_id FROM movies_l0 WHERE original_title = 'Gladiator II';
    SELECT id INTO furiosa_id FROM movies_l0 WHERE original_title = 'Furiosa: A Mad Max Saga';
    SELECT id INTO wonka_id FROM movies_l0 WHERE original_title = 'Wonka';
    SELECT id INTO fallguy_id FROM movies_l0 WHERE original_title = 'The Fall Guy';
    SELECT id INTO killers_id FROM movies_l0 WHERE original_title = 'Killers of the Flower Moon';
    SELECT id INTO poor_id FROM movies_l0 WHERE original_title = 'Poor Things';

    -- Get country IDs
    SELECT id INTO lu_id FROM countries WHERE code = 'LU';
    SELECT id INTO de_id FROM countries WHERE code = 'DE';
    SELECT id INTO fr_id FROM countries WHERE code = 'FR';
    SELECT id INTO be_id FROM countries WHERE code = 'BE';

    -- Get age rating IDs
    SELECT id INTO lu_tp FROM age_ratings WHERE code = 'TP' AND country_id = lu_id;
    SELECT id INTO lu_12 FROM age_ratings WHERE code = '12+' AND country_id = lu_id;
    SELECT id INTO lu_16 FROM age_ratings WHERE code = '16+' AND country_id = lu_id;
    SELECT id INTO de_fsk0 FROM age_ratings WHERE code = 'FSK 0' AND country_id = de_id;
    SELECT id INTO de_fsk12 FROM age_ratings WHERE code = 'FSK 12' AND country_id = de_id;
    SELECT id INTO de_fsk16 FROM age_ratings WHERE code = 'FSK 16' AND country_id = de_id;
    SELECT id INTO fr_u FROM age_ratings WHERE code = 'U' AND country_id = fr_id;
    SELECT id INTO fr_12 FROM age_ratings WHERE code = '-12' AND country_id = fr_id;

    -- Dune: Part Two - L1 data for each market
    IF dune_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, country_id, local_title, release_date, runtime_minutes, age_rating_id, plot_summary, is_active)
        VALUES
            (gen_random_uuid(), dune_id, lu_id, 'Dune: Deuxième Partie', '2024-03-01', 166, lu_12, 'Paul Atréides s''unit avec Chani et les Fremen tout en étant sur un chemin de vengeance contre les conspirateurs qui ont détruit sa famille.', true),
            (gen_random_uuid(), dune_id, de_id, 'Dune: Part Two', '2024-03-01', 166, de_fsk12, 'Paul Atreides verbündet sich mit Chani und den Fremen, während er einen Rachefeldzug gegen die Verschwörer plant.', true),
            (gen_random_uuid(), dune_id, fr_id, 'Dune: Deuxième Partie', '2024-02-28', 166, fr_12, 'Paul Atréides s''unit avec Chani et les Fremen tout en cherchant à se venger de ceux qui ont détruit sa famille.', true);
    END IF;

    -- Oppenheimer - L1 data
    IF oppen_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, country_id, local_title, release_date, runtime_minutes, age_rating_id, plot_summary, is_active)
        VALUES
            (gen_random_uuid(), oppen_id, lu_id, 'Oppenheimer', '2023-07-21', 180, lu_12, 'L''histoire de J. Robert Oppenheimer et son rôle dans le développement de la bombe atomique.', true),
            (gen_random_uuid(), oppen_id, de_id, 'Oppenheimer', '2023-07-20', 180, de_fsk12, 'Die Geschichte von J. Robert Oppenheimer und seine Rolle bei der Entwicklung der Atombombe.', true),
            (gen_random_uuid(), oppen_id, fr_id, 'Oppenheimer', '2023-07-19', 180, fr_12, 'L''histoire du physicien américain J. Robert Oppenheimer, père de la bombe atomique.', true);
    END IF;

    -- Barbie - L1 data
    IF barbie_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, country_id, local_title, release_date, runtime_minutes, age_rating_id, plot_summary, is_active)
        VALUES
            (gen_random_uuid(), barbie_id, lu_id, 'Barbie', '2023-07-21', 114, lu_tp, 'Barbie et Ken vivent dans le monde parfait de Barbie Land jusqu''à ce qu''ils aient l''occasion d''aller dans le monde réel.', true),
            (gen_random_uuid(), barbie_id, de_id, 'Barbie', '2023-07-20', 114, de_fsk0, 'Barbie und Ken leben im perfekten Barbieland, bis sie die Gelegenheit bekommen, in die reale Welt zu gehen.', true),
            (gen_random_uuid(), barbie_id, fr_id, 'Barbie', '2023-07-19', 114, fr_u, 'Barbie et Ken vivent dans le monde parfait de Barbie Land avant de découvrir le monde réel.', true);
    END IF;

    -- Inside Out 2 - L1 data
    IF inside_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, country_id, local_title, release_date, runtime_minutes, age_rating_id, plot_summary, is_active)
        VALUES
            (gen_random_uuid(), inside_id, lu_id, 'Vice-Versa 2', '2024-06-19', 96, lu_tp, 'Riley entre dans l''adolescence et de nouvelles émotions font leur apparition au quartier général.', true),
            (gen_random_uuid(), inside_id, de_id, 'Alles steht Kopf 2', '2024-06-13', 96, de_fsk0, 'Riley wird Teenager und neue Emotionen tauchen in der Kommandozentrale auf.', true),
            (gen_random_uuid(), inside_id, fr_id, 'Vice-Versa 2', '2024-06-19', 96, fr_u, 'Riley entre dans l''adolescence et de nouvelles émotions débarquent au Quartier général.', true);
    END IF;

    -- Gladiator II - L1 data
    IF gladiator_id IS NOT NULL THEN
        INSERT INTO movies_l1 (id, movie_l0_id, country_id, local_title, release_date, runtime_minutes, age_rating_id, plot_summary, is_active)
        VALUES
            (gen_random_uuid(), gladiator_id, lu_id, 'Gladiator II', '2024-11-22', 148, lu_16, 'Lucius, le fils de Lucilla, doit entrer dans l''arène après que sa maison ait été conquise.', true),
            (gen_random_uuid(), gladiator_id, de_id, 'Gladiator II', '2024-11-14', 148, de_fsk16, 'Lucius, der Sohn von Lucilla, muss in die Arena eintreten, nachdem sein Zuhause erobert wurde.', true),
            (gen_random_uuid(), gladiator_id, fr_id, 'Gladiator II', '2024-11-13', 148, fr_12, 'Lucius, fils de Lucilla, doit entrer dans l''arène après la conquête de son foyer.', true);
    END IF;
END $$;

-- ============================================
-- MOVIES L2 - Editions (Format/Language versions)
-- ============================================
DO $$
DECLARE
    dune_l1_lu UUID;
    dune_l1_de UUID;
    oppen_l1_lu UUID;
    barbie_l1_lu UUID;
    inside_l1_lu UUID;

    format_2d UUID;
    format_3d UUID;
    format_imax UUID;
    format_dolby UUID;

    tech_atmos UUID;
    tech_dvision UUID;

    lang_en UUID;
    lang_de UUID;
    lang_fr UUID;
BEGIN
    -- Get L1 IDs
    SELECT ml1.id INTO dune_l1_lu
    FROM movies_l1 ml1
    JOIN movies_l0 ml0 ON ml1.movie_l0_id = ml0.id
    JOIN countries c ON ml1.country_id = c.id
    WHERE ml0.original_title = 'Dune: Part Two' AND c.code = 'LU';

    SELECT ml1.id INTO dune_l1_de
    FROM movies_l1 ml1
    JOIN movies_l0 ml0 ON ml1.movie_l0_id = ml0.id
    JOIN countries c ON ml1.country_id = c.id
    WHERE ml0.original_title = 'Dune: Part Two' AND c.code = 'DE';

    SELECT ml1.id INTO oppen_l1_lu
    FROM movies_l1 ml1
    JOIN movies_l0 ml0 ON ml1.movie_l0_id = ml0.id
    JOIN countries c ON ml1.country_id = c.id
    WHERE ml0.original_title = 'Oppenheimer' AND c.code = 'LU';

    SELECT ml1.id INTO barbie_l1_lu
    FROM movies_l1 ml1
    JOIN movies_l0 ml0 ON ml1.movie_l0_id = ml0.id
    JOIN countries c ON ml1.country_id = c.id
    WHERE ml0.original_title = 'Barbie' AND c.code = 'LU';

    SELECT ml1.id INTO inside_l1_lu
    FROM movies_l1 ml1
    JOIN movies_l0 ml0 ON ml1.movie_l0_id = ml0.id
    JOIN countries c ON ml1.country_id = c.id
    WHERE ml0.original_title = 'Inside Out 2' AND c.code = 'LU';

    -- Get format IDs
    SELECT id INTO format_2d FROM formats WHERE code = '2D';
    SELECT id INTO format_3d FROM formats WHERE code = '3D';
    SELECT id INTO format_imax FROM formats WHERE code = 'IMAX2D';
    SELECT id INTO format_dolby FROM formats WHERE code = 'DOLBY';

    -- Get technology IDs
    SELECT id INTO tech_atmos FROM technologies WHERE code = 'ATMOS';
    SELECT id INTO tech_dvision FROM technologies WHERE code = 'DVISION';

    -- Get language IDs
    SELECT id INTO lang_en FROM languages WHERE code = 'en';
    SELECT id INTO lang_de FROM languages WHERE code = 'de';
    SELECT id INTO lang_fr FROM languages WHERE code = 'fr';

    -- Dune editions for LU
    IF dune_l1_lu IS NOT NULL AND format_2d IS NOT NULL THEN
        INSERT INTO movies_l2 (id, movie_l1_id, edition_title, format_id, audio_language_id, subtitle_language_id, is_active)
        VALUES
            (gen_random_uuid(), dune_l1_lu, 'Dune 2 - OV', format_2d, lang_en, lang_fr, true),
            (gen_random_uuid(), dune_l1_lu, 'Dune 2 - VF', format_2d, lang_fr, NULL, true),
            (gen_random_uuid(), dune_l1_lu, 'Dune 2 - IMAX OV', format_imax, lang_en, lang_fr, true),
            (gen_random_uuid(), dune_l1_lu, 'Dune 2 - Dolby Cinema', format_dolby, lang_en, lang_fr, true);
    END IF;

    -- Oppenheimer editions for LU
    IF oppen_l1_lu IS NOT NULL AND format_2d IS NOT NULL THEN
        INSERT INTO movies_l2 (id, movie_l1_id, edition_title, format_id, audio_language_id, subtitle_language_id, is_active)
        VALUES
            (gen_random_uuid(), oppen_l1_lu, 'Oppenheimer - OV', format_2d, lang_en, lang_fr, true),
            (gen_random_uuid(), oppen_l1_lu, 'Oppenheimer - VF', format_2d, lang_fr, NULL, true),
            (gen_random_uuid(), oppen_l1_lu, 'Oppenheimer - IMAX', format_imax, lang_en, lang_fr, true);
    END IF;

    -- Barbie editions for LU
    IF barbie_l1_lu IS NOT NULL AND format_2d IS NOT NULL THEN
        INSERT INTO movies_l2 (id, movie_l1_id, edition_title, format_id, audio_language_id, subtitle_language_id, is_active)
        VALUES
            (gen_random_uuid(), barbie_l1_lu, 'Barbie - OV', format_2d, lang_en, lang_fr, true),
            (gen_random_uuid(), barbie_l1_lu, 'Barbie - VF', format_2d, lang_fr, NULL, true),
            (gen_random_uuid(), barbie_l1_lu, 'Barbie - DF', format_2d, lang_de, NULL, true);
    END IF;

    -- Inside Out 2 editions for LU
    IF inside_l1_lu IS NOT NULL AND format_2d IS NOT NULL THEN
        INSERT INTO movies_l2 (id, movie_l1_id, edition_title, format_id, audio_language_id, subtitle_language_id, is_active)
        VALUES
            (gen_random_uuid(), inside_l1_lu, 'Vice-Versa 2 - VF', format_2d, lang_fr, NULL, true),
            (gen_random_uuid(), inside_l1_lu, 'Vice-Versa 2 - DF', format_2d, lang_de, NULL, true),
            (gen_random_uuid(), inside_l1_lu, 'Inside Out 2 - 3D VF', format_3d, lang_fr, NULL, true);
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
            (gen_random_uuid(), rtl_id, 'RTL Weekly PDF', 'Weekly cinema overview', 'json', '{"week": "{{week}}", "cinemas": [...]}', '{"format": "pdf"}', true);
    END IF;

    IF wort_id IS NOT NULL THEN
        INSERT INTO export_templates (id, client_id, name, description, format, template_content, config, is_active)
        VALUES
            (gen_random_uuid(), wort_id, 'Wort Cinema Feed', 'Cinema listings for Wort', 'xml', '<programme>...</programme>', '{}', true);
    END IF;
END $$;

-- ============================================
-- SAMPLE SESSIONS (Cinema Screenings)
-- ============================================
DO $$
DECLARE
    kinepolis_kb_id UUID;
    kinepolis_bv_id UUID;
    utopia_id UUID;

    dune_ed_ov UUID;
    dune_ed_vf UUID;
    dune_ed_imax UUID;
    barbie_ed_ov UUID;
    inside_ed_vf UUID;

    today DATE := CURRENT_DATE;
    tomorrow DATE := CURRENT_DATE + 1;
    day_after DATE := CURRENT_DATE + 2;
BEGIN
    -- Get cinema IDs
    SELECT id INTO kinepolis_kb_id FROM cinemas WHERE slug = 'kinepolis-kirchberg';
    SELECT id INTO kinepolis_bv_id FROM cinemas WHERE slug = 'kinepolis-belval';
    SELECT id INTO utopia_id FROM cinemas WHERE slug = 'utopia-luxembourg';

    -- Get edition IDs
    SELECT id INTO dune_ed_ov FROM movies_l2 WHERE edition_title = 'Dune 2 - OV';
    SELECT id INTO dune_ed_vf FROM movies_l2 WHERE edition_title = 'Dune 2 - VF';
    SELECT id INTO dune_ed_imax FROM movies_l2 WHERE edition_title = 'Dune 2 - IMAX OV';
    SELECT id INTO barbie_ed_ov FROM movies_l2 WHERE edition_title = 'Barbie - OV';
    SELECT id INTO inside_ed_vf FROM movies_l2 WHERE edition_title = 'Vice-Versa 2 - VF';

    -- Create sessions for Kinepolis Kirchberg
    IF kinepolis_kb_id IS NOT NULL AND dune_ed_ov IS NOT NULL THEN
        INSERT INTO sessions (id, cinema_id, movie_edition_id, screen_name, start_time, end_time, ticket_price, booking_url, is_active)
        VALUES
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_ov, 'Saal 1', (today + TIME '14:00')::TIMESTAMP, (today + TIME '16:46')::TIMESTAMP, 14.50, 'https://kinepolis.lu/tickets', true),
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_ov, 'Saal 1', (today + TIME '17:30')::TIMESTAMP, (today + TIME '20:16')::TIMESTAMP, 14.50, 'https://kinepolis.lu/tickets', true),
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_ov, 'Saal 1', (today + TIME '20:45')::TIMESTAMP, (today + TIME '23:31')::TIMESTAMP, 14.50, 'https://kinepolis.lu/tickets', true),
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_vf, 'Saal 3', (today + TIME '15:00')::TIMESTAMP, (today + TIME '17:46')::TIMESTAMP, 14.50, 'https://kinepolis.lu/tickets', true),
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_vf, 'Saal 3', (today + TIME '20:00')::TIMESTAMP, (today + TIME '22:46')::TIMESTAMP, 14.50, 'https://kinepolis.lu/tickets', true);
    END IF;

    IF kinepolis_kb_id IS NOT NULL AND dune_ed_imax IS NOT NULL THEN
        INSERT INTO sessions (id, cinema_id, movie_edition_id, screen_name, start_time, end_time, ticket_price, booking_url, is_active)
        VALUES
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_imax, 'IMAX', (today + TIME '16:00')::TIMESTAMP, (today + TIME '18:46')::TIMESTAMP, 18.50, 'https://kinepolis.lu/tickets', true),
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_imax, 'IMAX', (today + TIME '21:00')::TIMESTAMP, (today + TIME '23:46')::TIMESTAMP, 18.50, 'https://kinepolis.lu/tickets', true),
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_imax, 'IMAX', (tomorrow + TIME '14:00')::TIMESTAMP, (tomorrow + TIME '16:46')::TIMESTAMP, 18.50, 'https://kinepolis.lu/tickets', true),
            (gen_random_uuid(), kinepolis_kb_id, dune_ed_imax, 'IMAX', (tomorrow + TIME '20:00')::TIMESTAMP, (tomorrow + TIME '22:46')::TIMESTAMP, 18.50, 'https://kinepolis.lu/tickets', true);
    END IF;

    -- Create sessions for Utopia
    IF utopia_id IS NOT NULL AND barbie_ed_ov IS NOT NULL THEN
        INSERT INTO sessions (id, cinema_id, movie_edition_id, screen_name, start_time, end_time, ticket_price, booking_url, is_active)
        VALUES
            (gen_random_uuid(), utopia_id, barbie_ed_ov, 'Saal A', (today + TIME '14:30')::TIMESTAMP, (today + TIME '16:24')::TIMESTAMP, 12.00, 'https://utopolis.lu/tickets', true),
            (gen_random_uuid(), utopia_id, barbie_ed_ov, 'Saal A', (today + TIME '19:00')::TIMESTAMP, (today + TIME '20:54')::TIMESTAMP, 12.00, 'https://utopolis.lu/tickets', true);
    END IF;

    IF utopia_id IS NOT NULL AND inside_ed_vf IS NOT NULL THEN
        INSERT INTO sessions (id, cinema_id, movie_edition_id, screen_name, start_time, end_time, ticket_price, booking_url, is_active)
        VALUES
            (gen_random_uuid(), utopia_id, inside_ed_vf, 'Saal B', (today + TIME '11:00')::TIMESTAMP, (today + TIME '12:36')::TIMESTAMP, 10.00, 'https://utopolis.lu/tickets', true),
            (gen_random_uuid(), utopia_id, inside_ed_vf, 'Saal B', (today + TIME '14:00')::TIMESTAMP, (today + TIME '15:36')::TIMESTAMP, 12.00, 'https://utopolis.lu/tickets', true),
            (gen_random_uuid(), utopia_id, inside_ed_vf, 'Saal B', (today + TIME '16:30')::TIMESTAMP, (today + TIME '18:06')::TIMESTAMP, 12.00, 'https://utopolis.lu/tickets', true);
    END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Demo data successfully inserted!';
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
END $$;
