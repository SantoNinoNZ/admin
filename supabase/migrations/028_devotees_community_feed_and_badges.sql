-- ============================================================================
-- Devotees App - Community Social Feed, Faith Badges & Liturgical Roster
-- Additive migration for shared Supabase database
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Community Posts Table
-- Named 'community_posts' to avoid collision with existing CMS 'posts' table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'prayer_request', 'event', 'announcement', 'novena_completion'
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  youtube_video_id TEXT,
  intention_category TEXT, -- 'healing', 'thanksgiving', 'special', 'repose'
  announcement_type TEXT, -- 'general', 'casting_call', 'urgent', 'event'
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'public', -- 'public', 'hermanos_only', 'members'
  is_pinned BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for community_posts
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_community_posts_event ON community_posts(event_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_posts(is_pinned) WHERE is_pinned = true;

-- Trigger for community_posts updated_at
CREATE OR REPLACE FUNCTION update_community_posts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_posts_updated_at ON community_posts;
CREATE TRIGGER trg_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_community_posts_timestamp();

-- ----------------------------------------------------------------------------
-- 2. Community Post Reactions Table
-- Tracks 'amen', 'heart', 'like' reactions per post and devotee
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'amen', -- 'amen', 'heart', 'like'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT community_post_reactions_post_user_key UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_reactions_post ON community_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_reactions_user ON community_post_reactions(user_id);

-- ----------------------------------------------------------------------------
-- 3. Community Post Comments Table
-- Devotee comments on community posts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post ON community_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_comments_author ON community_post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_community_post_comments_created ON community_post_comments(created_at ASC);

-- ----------------------------------------------------------------------------
-- 4. Faith & Festival Badge Definitions Catalog
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'clergy', 'liturgy', 'performance', 'pageant', 'media', 'partner', 'devotional', 'service'
  icon TEXT NOT NULL,
  description TEXT,
  is_repeatable_yearly BOOLEAN DEFAULT true,
  badge_color TEXT DEFAULT 'amber',
  is_verified_only BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard badge definitions
INSERT INTO badge_definitions (id, name, category, icon, description, is_repeatable_yearly, badge_color, is_verified_only)
VALUES
  ('priest', 'Bishop / Priest', 'clergy', '✝️', 'Ordained celebrant presiding over Holy Mass & blessings.', false, 'purple', true),
  ('deacon', 'Deacon / Lay Minister', 'clergy', '🕊️', 'Liturgical minister assisting with communion and blessings.', false, 'blue', true),
  ('hermano_major', 'Hermano / Hermana Major', 'clergy', '👑', 'Spiritual head and host for the festival year.', true, 'gold', true),
  ('choir_member', 'Music Ministry / Choir Member', 'liturgy', '🎶', 'Active choir vocalist or instrumentalist for Novena and Masses.', true, 'indigo', true),
  ('lector', 'Liturgical Lector / Commentator', 'liturgy', '📖', 'Proclaimer of the Word for Saturday and feast masses.', true, 'emerald', true),
  ('acolyte', 'Acolyte / Altar Server', 'liturgy', '🕯️', 'Youth or senior altar server assisting liturgical celebrations.', true, 'amber', true),
  ('sinulog_dancer', 'Sinulog Dancer', 'performance', '💃', 'Dancer participating in devotional offering and street dance.', true, 'rose', true),
  ('dance_competitor', 'Dance Troupe Competitor', 'performance', '🏆', 'Performer competing in the official Sinulog Dance Competition.', true, 'amber', true),
  ('sinulog_queen', 'Sinulog Festival Queen', 'pageant', '👸', 'Sinulog Festival Queen candidate or titleholder.', true, 'gold', true),
  ('drummer_brass', 'Drummers & Brass Musician', 'performance', '🥁', 'Percussionist or brass instrumentalist providing Sinulog rhythm.', true, 'red', true),
  ('photographer', 'Official Photographer', 'media', '📸', 'Accredited photographer documenting community liturgy and festivals.', true, 'teal', true),
  ('videographer', 'Official Videographer', 'media', '🎥', 'Accredited videographer documenting community celebrations and recaps.', true, 'cyan', true),
  ('festival_vendor', 'Festival Partner / Vendor', 'partner', '🛍️', 'Official food, merchandise, or retail vendor at Sinulog festivities.', true, 'orange', true),
  ('festival_sponsor', 'Festival Sponsor / Benefactor', 'partner', '🤝', 'Community business or benefactor sponsoring festival events.', true, 'gold', true),
  ('novena_completer', '9-Day Novena Completer', 'devotional', '📿', 'Devotee who completed all 9 days of the annual Novena.', true, 'emerald', false),
  ('pilgrim_host', 'Pilgrim Image Host', 'devotional', '🏠', 'Family hosting the sacred Pilgrim Image of Santo Niño for home visits.', true, 'sky', true),
  ('sinulog_volunteer', 'Sinulog Volunteer / Contributor', 'service', '🌟', 'Logistics volunteer, marshal, or organizer serving the community.', true, 'blue', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  is_repeatable_yearly = EXCLUDED.is_repeatable_yearly,
  badge_color = EXCLUDED.badge_color,
  is_verified_only = EXCLUDED.is_verified_only;

-- ----------------------------------------------------------------------------
-- 5. User Awarded Badges
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  year INTEGER,
  title_override TEXT,
  organization_or_troupe TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_featured BOOLEAN DEFAULT true,
  awarded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_badges_user_badge_year_key UNIQUE (user_id, badge_id, year)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_year ON user_badges(year);

-- ----------------------------------------------------------------------------
-- 6. Novena Progress Table
-- Daily completion tracking for the 9-Day Novena cycle
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS novena_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 9),
  cycle_year INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT novena_progress_user_day_year_key UNIQUE (user_id, day_number, cycle_year)
);

CREATE INDEX IF NOT EXISTS idx_novena_progress_user ON novena_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_novena_progress_year ON novena_progress(cycle_year);

-- ----------------------------------------------------------------------------
-- 7. Extend Events Table for Liturgical Roster & Choir Rotation
-- ----------------------------------------------------------------------------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS presider_name TEXT,
  ADD COLUMN IF NOT EXISTS presider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS choir_name TEXT,
  ADD COLUMN IF NOT EXISTS choir_group_id UUID REFERENCES dance_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lectors TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS acolytes_guild TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_chapter TEXT,
  ADD COLUMN IF NOT EXISTS mass_sequence_number INT;

CREATE INDEX IF NOT EXISTS idx_events_presider ON events(presider_id);
CREATE INDEX IF NOT EXISTS idx_events_choir_group ON events(choir_group_id);
CREATE INDEX IF NOT EXISTS idx_events_mass_seq ON events(mass_sequence_number);

-- ----------------------------------------------------------------------------
-- 8. Row-Level Security (RLS) Policies
-- ----------------------------------------------------------------------------

-- A. community_posts RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public posts viewable by everyone"
  ON community_posts FOR SELECT
  USING (
    is_hidden = false AND (
      visibility = 'public' OR
      (visibility = 'members' AND auth.uid() IS NOT NULL) OR
      (visibility = 'hermanos_only' AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (
          (p.roles->>'super_admin')::boolean = true OR
          (p.roles->>'coordinator')::boolean = true OR
          (p.roles->>'hermano')::boolean = true
        )
      ))
    ) OR
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true OR
        (p.roles->>'hermano')::boolean = true
      )
    )
  );

CREATE POLICY "Authenticated users can create posts"
  ON community_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors and admins can update posts"
  ON community_posts FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true OR
        (p.roles->>'hermano')::boolean = true
      )
    )
  );

CREATE POLICY "Authors and admins can delete posts"
  ON community_posts FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true OR
        (p.roles->>'hermano')::boolean = true
      )
    )
  );

-- B. community_post_reactions RLS
ALTER TABLE community_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by everyone"
  ON community_post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert reactions"
  ON community_post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON community_post_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON community_post_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- C. community_post_comments RLS
ALTER TABLE community_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by everyone"
  ON community_post_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON community_post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors and admins can update comments"
  ON community_post_comments FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true OR
        (p.roles->>'hermano')::boolean = true
      )
    )
  );

CREATE POLICY "Authors and admins can delete comments"
  ON community_post_comments FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true OR
        (p.roles->>'hermano')::boolean = true
      )
    )
  );

-- D. badge_definitions RLS
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badge definitions viewable by everyone"
  ON badge_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badge definitions"
  ON badge_definitions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true
      )
    )
  );

-- E. user_badges RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User badges viewable by everyone"
  ON user_badges FOR SELECT
  USING (true);

CREATE POLICY "Admins and coordinators can manage user badges"
  ON user_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true OR
        (p.roles->>'hermano')::boolean = true
      )
    )
  );

-- F. novena_progress RLS
ALTER TABLE novena_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own novena progress"
  ON novena_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own novena progress"
  ON novena_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own novena progress"
  ON novena_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own novena progress"
  ON novena_progress FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 9. Grants
-- ----------------------------------------------------------------------------
GRANT SELECT ON community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON community_posts TO authenticated;

GRANT SELECT ON community_post_reactions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON community_post_reactions TO authenticated;

GRANT SELECT ON community_post_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON community_post_comments TO authenticated;

GRANT SELECT ON badge_definitions TO anon, authenticated;
GRANT ALL ON badge_definitions TO authenticated;

GRANT SELECT ON user_badges TO anon, authenticated;
GRANT ALL ON user_badges TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON novena_progress TO authenticated;
