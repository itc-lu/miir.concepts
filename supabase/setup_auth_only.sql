-- ============================================================================
-- MINIMAL AUTH SETUP
-- Run this first, then create user through Supabase Dashboard
-- ============================================================================

-- 1. Create user_profiles table
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

-- 2. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Public read" ON user_profiles;
DROP POLICY IF EXISTS "Users update own" ON user_profiles;

CREATE POLICY "Public read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users update own" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Create trigger to auto-create profile on signup
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

-- 5. Create profiles for any existing auth users that don't have one
INSERT INTO user_profiles (id, email, full_name, role)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    'external'
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

SELECT 'Auth setup complete!' as status;
SELECT 'Now go to Supabase Dashboard -> Authentication -> Users -> Add user' as next_step;
SELECT 'Then run: UPDATE user_profiles SET role = ''global_admin'' WHERE email = ''your-email'';' as make_admin;
