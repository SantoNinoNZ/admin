-- ============================================================================
-- Devotees App - Novena Prayers
-- ============================================================================

-- Novena Definitions
CREATE TABLE IF NOT EXISTS novenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  total_days INTEGER DEFAULT 9,
  -- Array of daily prayers:
  -- [{ "day": 1, "title": "Day 1", "opening_prayer": "...", "content": "...", "reflection": "...", "closing_prayer": "..." }]
  prayers JSONB NOT NULL,
  -- Metadata
  featured_image TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default Santo Niño Novena
INSERT INTO novenas (title, description, total_days, prayers, is_featured)
VALUES (
  'Novena to Santo Niño',
  'The traditional nine-day prayer to the Holy Child Jesus, Santo Niño de Cebu.',
  9,
  '[
    {
      "day": 1,
      "title": "Day 1 - Faith",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\nO Holy Child Jesus, I come before You with faith and love...",
      "content": "Lord Jesus, as a child You showed us the way of faith. Help me to trust in You completely...",
      "reflection": "Reflect on your faith journey. Where do you need to trust God more?",
      "closing_prayer": "Santo Niño, bless me with unwavering faith. Amen."
    },
    {
      "day": 2,
      "title": "Day 2 - Hope",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      "content": "O Divine Child, You are the source of all hope. In times of darkness, be my light...",
      "reflection": "What situations in your life need the light of hope?",
      "closing_prayer": "Santo Niño, fill my heart with hope. Amen."
    },
    {
      "day": 3,
      "title": "Day 3 - Love",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      "content": "Sweet Child Jesus, Your love knows no bounds. Teach me to love as You love...",
      "reflection": "How can you show greater love to those around you?",
      "closing_prayer": "Santo Niño, teach me to love unconditionally. Amen."
    },
    {
      "day": 4,
      "title": "Day 4 - Humility",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      "content": "O humble Child, You chose to come as a baby, teaching us humility...",
      "reflection": "Where in your life do you need to practice humility?",
      "closing_prayer": "Santo Niño, grant me a humble heart. Amen."
    },
    {
      "day": 5,
      "title": "Day 5 - Gratitude",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      "content": "Blessed Child, I thank You for all the blessings You have given me...",
      "reflection": "Count your blessings today. What are you grateful for?",
      "closing_prayer": "Santo Niño, make me always grateful. Amen."
    },
    {
      "day": 6,
      "title": "Day 6 - Peace",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      "content": "Prince of Peace, bring Your peace to my heart and to the world...",
      "reflection": "Where do you need peace in your life? In your relationships?",
      "closing_prayer": "Santo Niño, be my peace. Amen."
    },
    {
      "day": 7,
      "title": "Day 7 - Healing",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      "content": "Divine Healer, touch those who are sick and suffering...",
      "reflection": "Pray for those who need healing - physical, emotional, or spiritual.",
      "closing_prayer": "Santo Niño, bring healing to all who suffer. Amen."
    },
    {
      "day": 8,
      "title": "Day 8 - Protection",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      "content": "O Powerful Child, protect me and my loved ones from all harm...",
      "reflection": "Trust in Gods protection. Release your fears to Him.",
      "closing_prayer": "Santo Niño, be our shield and protector. Amen."
    },
    {
      "day": 9,
      "title": "Day 9 - Thanksgiving & Petition",
      "opening_prayer": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      "content": "Miraculous Child, as I complete this novena, I offer You my deepest gratitude and present my petitions...",
      "reflection": "Present your intentions to Santo Niño with confidence.",
      "closing_prayer": "Santo Niño, I trust in Your love and mercy. Pit Señor! Amen."
    }
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- User Novena Progress
CREATE TABLE IF NOT EXISTS user_novenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  novena_id UUID NOT NULL REFERENCES novenas(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_day INTEGER DEFAULT 1,
  completed_days INTEGER[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  -- Prevent multiple active novenas of same type
  UNIQUE(user_id, novena_id, started_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_novenas_user ON user_novenas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_novenas_active ON user_novenas(user_id, is_active);

-- Function to mark novena day complete
CREATE OR REPLACE FUNCTION complete_novena_day(
  p_user_novena_id UUID,
  p_day INTEGER
)
RETURNS user_novenas AS $$
DECLARE
  v_novena user_novenas;
  v_total_days INTEGER;
BEGIN
  -- Get the user_novena record
  SELECT un.* INTO v_novena
  FROM user_novenas un
  WHERE un.id = p_user_novena_id
  AND un.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Novena not found or access denied';
  END IF;

  -- Get total days for this novena
  SELECT total_days INTO v_total_days
  FROM novenas
  WHERE id = v_novena.novena_id;

  -- Add day to completed_days if not already there
  IF NOT (p_day = ANY(v_novena.completed_days)) THEN
    UPDATE user_novenas
    SET
      completed_days = array_append(completed_days, p_day),
      current_day = LEAST(p_day + 1, v_total_days),
      completed_at = CASE
        WHEN array_length(completed_days, 1) + 1 >= v_total_days THEN NOW()
        ELSE NULL
      END,
      is_active = CASE
        WHEN array_length(completed_days, 1) + 1 >= v_total_days THEN false
        ELSE true
      END
    WHERE id = p_user_novena_id
    RETURNING * INTO v_novena;
  END IF;

  RETURN v_novena;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for novenas
ALTER TABLE novenas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Novenas viewable by all authenticated"
  ON novenas FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Novenas manageable by admins"
  ON novenas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        (profiles.roles->>'super_admin')::boolean = true OR
        (profiles.roles->>'hermano')::boolean = true
      )
    )
  );

-- RLS Policies for user_novenas
ALTER TABLE user_novenas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own novena progress"
  ON user_novenas FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can start novenas"
  ON user_novenas FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own novena progress"
  ON user_novenas FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own novena progress"
  ON user_novenas FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT ON novenas TO authenticated;
GRANT ALL ON user_novenas TO authenticated;
GRANT EXECUTE ON FUNCTION complete_novena_day TO authenticated;
