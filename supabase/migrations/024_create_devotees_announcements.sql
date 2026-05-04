-- ============================================================================
-- Devotees App - Announcements, Casting Calls & Notifications
-- ============================================================================

-- Event Visibility Enum (shared with events)
DO $$ BEGIN
  CREATE TYPE event_visibility AS ENUM (
    'public',
    'members',
    'area',
    'role',
    'group',
    'invited'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL CHECK (announcement_type IN ('general', 'casting_call', 'urgent', 'event')),

  -- Targeting
  visibility event_visibility DEFAULT 'public',
  target_roles TEXT[],
  target_areas UUID[],
  target_groups UUID[],

  -- Casting Call Specific
  application_deadline TIMESTAMPTZ,
  requirements TEXT,
  how_to_apply TEXT,

  -- Metadata
  featured_image TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned);

-- Casting Call Applications
CREATE TABLE IF NOT EXISTS casting_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  application_data JSONB,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'accepted', 'rejected', 'withdrawn')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- Push Subscriptions for Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  notification_type TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  events_enabled BOOLEAN DEFAULT true,
  prayer_requests_enabled BOOLEAN DEFAULT true,
  announcements_enabled BOOLEAN DEFAULT true,
  dance_schedules_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Function to check announcement visibility
CREATE OR REPLACE FUNCTION can_view_announcement(user_uuid UUID, announcement_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_announcement announcements;
  v_profile profiles;
BEGIN
  SELECT * INTO v_announcement FROM announcements WHERE id = announcement_id;
  SELECT * INTO v_profile FROM profiles WHERE id = user_uuid;

  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT v_announcement.is_published THEN RETURN false; END IF;

  -- Check visibility
  CASE v_announcement.visibility
    WHEN 'public' THEN
      RETURN true;
    WHEN 'members' THEN
      RETURN user_uuid IS NOT NULL;
    WHEN 'area' THEN
      RETURN v_profile.area_id = ANY(v_announcement.target_areas);
    WHEN 'role' THEN
      RETURN EXISTS (
        SELECT 1 FROM unnest(v_announcement.target_roles) AS r
        WHERE (v_profile.roles->>r)::boolean = true
      );
    WHEN 'group' THEN
      RETURN EXISTS (
        SELECT 1 FROM dance_group_members dgm
        WHERE dgm.user_id = user_uuid
        AND dgm.group_id = ANY(v_announcement.target_groups)
      );
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, body, data, notification_type)
  VALUES (p_user_id, p_title, p_body, p_data, p_type)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published announcements viewable based on visibility"
  ON announcements FOR SELECT
  USING (
    is_published = true AND
    can_view_announcement(auth.uid(), id)
  );

CREATE POLICY "Creators can view own announcements"
  ON announcements FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        (profiles.roles->>'super_admin')::boolean = true OR
        (profiles.roles->>'coordinator')::boolean = true OR
        (profiles.roles->>'hermano')::boolean = true
      )
    )
  );

-- RLS for casting_applications
ALTER TABLE casting_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON casting_applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can submit applications"
  ON casting_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending applications"
  ON casting_applications FOR UPDATE
  USING (user_id = auth.uid() AND status = 'submitted');

CREATE POLICY "Admins can manage applications"
  ON casting_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        (profiles.roles->>'super_admin')::boolean = true OR
        (profiles.roles->>'coordinator')::boolean = true
      )
    )
  );

-- RLS for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid());

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- RLS for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT ON announcements TO authenticated;
GRANT ALL ON casting_applications TO authenticated;
GRANT ALL ON push_subscriptions TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_announcement TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
