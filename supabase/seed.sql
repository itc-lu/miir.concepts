-- CAT Cinema Automation Tool - Seed Data
-- Initial data for reference tables

-- ============================================================================
-- COUNTRIES
-- ============================================================================

INSERT INTO countries (code, name, name_native) VALUES
    ('LU', 'Luxembourg', 'Lëtzebuerg'),
    ('DE', 'Germany', 'Deutschland'),
    ('FR', 'France', 'France'),
    ('BE', 'Belgium', 'België / Belgique'),
    ('NL', 'Netherlands', 'Nederland'),
    ('AT', 'Austria', 'Österreich'),
    ('CH', 'Switzerland', 'Schweiz'),
    ('US', 'United States', 'United States'),
    ('GB', 'United Kingdom', 'United Kingdom'),
    ('IT', 'Italy', 'Italia'),
    ('ES', 'Spain', 'España'),
    ('JP', 'Japan', '日本'),
    ('KR', 'South Korea', '대한민국'),
    ('CN', 'China', '中国'),
    ('IN', 'India', 'भारत');

-- ============================================================================
-- LANGUAGES
-- ============================================================================

INSERT INTO languages (code, name, name_native, display_order) VALUES
    ('LU', 'Luxembourgish', 'Lëtzebuergesch', 1),
    ('FR', 'French', 'Français', 2),
    ('DE', 'German', 'Deutsch', 3),
    ('EN', 'English', 'English', 4),
    ('NL', 'Dutch', 'Nederlands', 5),
    ('IT', 'Italian', 'Italiano', 6),
    ('ES', 'Spanish', 'Español', 7),
    ('PT', 'Portuguese', 'Português', 8),
    ('JA', 'Japanese', '日本語', 9),
    ('KO', 'Korean', '한국어', 10),
    ('ZH', 'Chinese', '中文', 11),
    ('HI', 'Hindi', 'हिन्दी', 12),
    ('AR', 'Arabic', 'العربية', 13),
    ('RU', 'Russian', 'Русский', 14);

-- ============================================================================
-- FORMATS
-- ============================================================================

INSERT INTO formats (code, name, description, display_order) VALUES
    ('2D', '2D', 'Standard 2D projection', 1),
    ('3D', '3D', 'Stereoscopic 3D projection', 2),
    ('IMAX', 'IMAX', 'IMAX large format', 3),
    ('IMAX3D', 'IMAX 3D', 'IMAX with 3D', 4),
    ('4DX', '4DX', '4DX motion seats', 5),
    ('SCREENX', 'ScreenX', '270-degree panoramic projection', 6),
    ('DBOX', 'D-BOX', 'D-BOX motion seats', 7);

-- ============================================================================
-- TECHNOLOGIES
-- ============================================================================

INSERT INTO technologies (code, name, description, display_order) VALUES
    ('STANDARD', 'Standard', 'Standard projection and sound', 1),
    ('DOLBY_DIGITAL', 'Dolby Digital', 'Dolby Digital surround sound', 2),
    ('DOLBY_ATMOS', 'Dolby Atmos', 'Dolby Atmos immersive audio', 3),
    ('DTS', 'DTS', 'DTS surround sound', 4),
    ('DTSX', 'DTS:X', 'DTS:X immersive audio', 5),
    ('LASER', 'Laser Projection', 'Laser projection technology', 6),
    ('HDR', 'HDR', 'High Dynamic Range', 7),
    ('HFR', 'HFR', 'High Frame Rate (48fps+)', 8);

-- ============================================================================
-- GENRES
-- ============================================================================

INSERT INTO genres (code, name, display_order) VALUES
    ('ACTION', 'Action', 1),
    ('ADVENTURE', 'Adventure', 2),
    ('ANIMATION', 'Animation', 3),
    ('COMEDY', 'Comedy', 4),
    ('CRIME', 'Crime', 5),
    ('DOCUMENTARY', 'Documentary', 6),
    ('DRAMA', 'Drama', 7),
    ('FAMILY', 'Family', 8),
    ('FANTASY', 'Fantasy', 9),
    ('HORROR', 'Horror', 10),
    ('MUSIC', 'Music', 11),
    ('MYSTERY', 'Mystery', 12),
    ('ROMANCE', 'Romance', 13),
    ('SCIFI', 'Science Fiction', 14),
    ('THRILLER', 'Thriller', 15),
    ('WAR', 'War', 16),
    ('WESTERN', 'Western', 17),
    ('BIOGRAPHY', 'Biography', 18),
    ('HISTORY', 'History', 19),
    ('SPORT', 'Sport', 20);

-- ============================================================================
-- AGE RATINGS (Luxembourg)
-- ============================================================================

INSERT INTO age_ratings (country_id, code, name, min_age, description, display_order)
SELECT
    c.id,
    rating.code,
    rating.name,
    rating.min_age,
    rating.description,
    rating.display_order
FROM countries c
CROSS JOIN (
    VALUES
        ('EA', 'Tous publics', 0, 'Suitable for all audiences', 1),
        ('6', '6+', 6, 'Suitable for ages 6 and above', 2),
        ('12', '12+', 12, 'Suitable for ages 12 and above', 3),
        ('16', '16+', 16, 'Suitable for ages 16 and above', 4),
        ('18', '18+', 18, 'Adults only', 5)
) AS rating(code, name, min_age, description, display_order)
WHERE c.code = 'LU';

-- Also add German age ratings
INSERT INTO age_ratings (country_id, code, name, min_age, description, display_order)
SELECT
    c.id,
    rating.code,
    rating.name,
    rating.min_age,
    rating.description,
    rating.display_order
FROM countries c
CROSS JOIN (
    VALUES
        ('FSK0', 'FSK 0', 0, 'Freigegeben ohne Altersbeschränkung', 1),
        ('FSK6', 'FSK 6', 6, 'Freigegeben ab 6 Jahren', 2),
        ('FSK12', 'FSK 12', 12, 'Freigegeben ab 12 Jahren', 3),
        ('FSK16', 'FSK 16', 16, 'Freigegeben ab 16 Jahren', 4),
        ('FSK18', 'FSK 18', 18, 'Keine Jugendfreigabe', 5)
) AS rating(code, name, min_age, description, display_order)
WHERE c.code = 'DE';

-- ============================================================================
-- DEFAULT TAGS
-- ============================================================================

-- Cinema Tags
INSERT INTO cinema_tags (name, color, description) VALUES
    ('Premium', '#FFD700', 'Premium cinema experience'),
    ('Outdoor', '#228B22', 'Outdoor/Open-air cinema'),
    ('Art House', '#9370DB', 'Art house / Independent cinema'),
    ('Multiplex', '#4169E1', 'Multiplex cinema'),
    ('Historic', '#8B4513', 'Historic cinema building'),
    ('Accessible', '#20B2AA', 'Fully wheelchair accessible');

-- Movie Tags
INSERT INTO movie_tags (name, color, description) VALUES
    ('New Release', '#FF4500', 'New release this week'),
    ('Ending Soon', '#DC143C', 'Leaving theaters soon'),
    ('Award Winner', '#FFD700', 'Award-winning film'),
    ('Festival Selection', '#9370DB', 'Selected for film festival'),
    ('Family Friendly', '#32CD32', 'Great for families'),
    ('Special Event', '#FF69B4', 'Special screening event'),
    ('Preview', '#00CED1', 'Preview/Avant-première'),
    ('Re-release', '#FFA500', 'Classic film re-release');

-- Session Tags
INSERT INTO session_tags (name, color, description) VALUES
    ('Preview', '#00CED1', 'Preview screening'),
    ('Premiere', '#FFD700', 'Premiere event'),
    ('Last Screening', '#DC143C', 'Final screening'),
    ('Ladies Night', '#FF69B4', 'Ladies night special'),
    ('Seniors', '#20B2AA', 'Senior citizen screening'),
    ('Kids Club', '#32CD32', 'Kids club screening'),
    ('Original Version', '#4169E1', 'Original language version'),
    ('Q&A', '#9370DB', 'Q&A with filmmakers'),
    ('Subtitled', '#808080', 'With subtitles');

-- ============================================================================
-- SAMPLE CINEMA GROUPS & CINEMAS (Luxembourg)
-- ============================================================================

-- Get Luxembourg country ID
WITH lu_country AS (
    SELECT id FROM countries WHERE code = 'LU'
)
INSERT INTO cinema_groups (name, slug, country_id, website, description)
SELECT
    group_data.name,
    group_data.slug,
    lu_country.id,
    group_data.website,
    group_data.description
FROM lu_country
CROSS JOIN (
    VALUES
        ('Kinepolis Luxembourg', 'kinepolis-luxembourg', 'https://kinepolis.lu', 'Major multiplex cinema chain'),
        ('Utopia Group', 'utopia-group', 'https://utopia.lu', 'Independent cinema group'),
        ('Ciné Utopia', 'cine-utopia', 'https://www.utopia.lu', 'Art house cinema'),
        ('Kulturhuef Grevenmacher', 'kulturhuef', 'https://kulturhuef.lu', 'Cultural center with cinema'),
        ('Cinémathèque de la Ville de Luxembourg', 'cinematheque', 'https://cinematheque.lu', 'Film archive and cinema')
) AS group_data(name, slug, website, description);

-- Insert sample cinemas
WITH lu_country AS (
    SELECT id FROM countries WHERE code = 'LU'
),
cinema_group_ids AS (
    SELECT id, slug FROM cinema_groups
)
INSERT INTO cinemas (cinema_group_id, name, slug, country_id, city, address_line1, postal_code, screen_count, parser_type)
SELECT
    cg.id,
    cinema_data.name,
    cinema_data.slug,
    lu_country.id,
    cinema_data.city,
    cinema_data.address,
    cinema_data.postal_code,
    cinema_data.screens,
    cinema_data.parser
FROM lu_country
CROSS JOIN (
    VALUES
        ('kinepolis-luxembourg', 'Kinepolis Kirchberg', 'kinepolis-kirchberg', 'Luxembourg', '45 Avenue J.F. Kennedy', 'L-1855', 10, 'kinepolis'),
        ('kinepolis-luxembourg', 'Kinepolis Belval', 'kinepolis-belval', 'Esch-sur-Alzette', '18 Avenue du Rock''n''Roll', 'L-4361', 8, 'kinepolis'),
        ('utopia-group', 'Utopolis Kirchberg', 'utopolis-kirchberg', 'Luxembourg', '45 Avenue J.F. Kennedy', 'L-1855', 6, 'utopia'),
        ('cine-utopia', 'Ciné Utopia', 'cine-utopia-city', 'Luxembourg', '16 Avenue de la Faïencerie', 'L-1510', 1, 'utopia'),
        ('kulturhuef', 'Kulturhuef Kino', 'kulturhuef-kino', 'Grevenmacher', '54 Route de Trèves', 'L-6793', 1, 'kulturhuef'),
        ('cinematheque', 'Cinémathèque', 'cinematheque-city', 'Luxembourg', '17 Place du Théâtre', 'L-2613', 2, 'cinematheque')
) AS cinema_data(group_slug, name, slug, city, address, postal_code, screens, parser)
JOIN cinema_group_ids cg ON cg.slug = cinema_data.group_slug;
