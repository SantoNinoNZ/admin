-- ============================================================================
-- Devotees App - Profiles and Areas
-- ============================================================================

-- Areas (Geographic regions in NZ)
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default NZ areas
INSERT INTO areas (name, description) VALUES
  ('Auckland Central', 'Central Auckland area'),
  ('North Shore', 'North Shore, Auckland'),
  ('South Auckland', 'South Auckland including Manukau'),
  ('West Auckland', 'West Auckland'),
  ('East Auckland', 'East Auckland including Howick'),
  ('Pukekohe', 'Pukekohe and Franklin area'),
  ('Hamilton', 'Hamilton and Waikato region'),
  ('Wellington', 'Wellington region'),
  ('Christchurch', 'Christchurch and Canterbury'),
  ('Other', 'Other areas in New Zealand')
ON CONFLICT (name) DO NOTHING;

-- Profiles (extends Supabase auth.users for devotees app)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  area_id UUID REFERENCES areas(id),
  bio TEXT,
  -- JSON field for flexible role data
  roles JSONB DEFAULT '{"devotee": true}'::jsonb,
  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_profile_public BOOLEAN DEFAULT true,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_area ON profiles(area_id);
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN(roles);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_profile();

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_timestamp ON profiles;
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();

-- RLS Policies for areas
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Areas are viewable by everyone"
  ON areas FOR SELECT
  USING (true);

CREATE POLICY "Areas are manageable by admins"
  ON areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.roles->>'super_admin')::boolean = true
    )
  );

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (is_profile_public = true OR id = auth.uid())
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT SELECT ON areas TO authenticated;
GRANT ALL ON profiles TO authenticated;
