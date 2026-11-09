-- Migration 029: Allow public read of public devotee profiles for social feed author display
GRANT SELECT ON profiles TO anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Public profiles viewable by anyone'
  ) THEN
    CREATE POLICY "Public profiles viewable by anyone"
      ON profiles FOR SELECT
      TO anon
      USING (is_profile_public = true);
  END IF;
END $$;
