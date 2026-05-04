-- ============================================================================
-- Extend Events System for Devotees App
-- Adds visibility, access control, and RSVP features while maintaining
-- backward compatibility with admin/web
-- ============================================================================

-- Add event category enum (more descriptive than just recurring/dated)
DO $$ BEGIN
  CREATE TYPE event_category AS ENUM (
    'sinulog',
    'novena',
    'community',
    'internal',
    'practice',
    'pageant',
    'mass',
    'procession',
    'meeting',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to events table for devotees features
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS category event_category DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS visibility event_visibility DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS featured_image TEXT,
  -- Access control
  ADD COLUMN IF NOT EXISTS allowed_roles TEXT[],
  ADD COLUMN IF NOT EXISTS allowed_areas UUID[],
  ADD COLUMN IF NOT EXISTS allowed_groups UUID[],
  -- Location details
  ADD COLUMN IF NOT EXISTS location_coords POINT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_link TEXT,
  -- Date/time (proper types for devotees, keeping old text fields for admin)
  ADD COLUMN IF NOT EXISTS event_start_date DATE,
  ADD COLUMN IF NOT EXISTS event_end_date DATE,
  ADD COLUMN IF NOT EXISTS event_start_time TIME,
  ADD COLUMN IF NOT EXISTS event_end_time TIME,
  ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false,
  -- For linking to profiles instead of just authors
  ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES profiles(id);

-- Create Event RSVPs table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create Event Invitations table (for invite-only events)
CREATE TABLE IF NOT EXISTS event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(event_start_date);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_event ON event_invitations(event_id);

-- Function to check if user can view event
CREATE OR REPLACE FUNCTION can_view_event(user_uuid UUID, p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_event events;
  v_profile profiles;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT v_event.published THEN RETURN false; END IF;

  -- If visibility is null or public, anyone can view
  IF v_event.visibility IS NULL OR v_event.visibility = 'public' THEN
    RETURN true;
  END IF;

  -- For other visibility types, need to be authenticated
  IF user_uuid IS NULL THEN RETURN false; END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = user_uuid;
  IF NOT FOUND THEN RETURN false; END IF;

  CASE v_event.visibility
    WHEN 'members' THEN
      RETURN true; -- Any authenticated member
    WHEN 'area' THEN
      RETURN v_profile.area_id = ANY(v_event.allowed_areas) OR v_event.allowed_areas IS NULL;
    WHEN 'role' THEN
      RETURN v_event.allowed_roles IS NULL OR EXISTS (
        SELECT 1 FROM unnest(v_event.allowed_roles) AS r
        WHERE (v_profile.roles->>r)::boolean = true
      );
    WHEN 'group' THEN
      RETURN v_event.allowed_groups IS NULL OR EXISTS (
        SELECT 1 FROM dance_group_members dgm
        WHERE dgm.user_id = user_uuid
        AND dgm.group_id = ANY(v_event.allowed_groups)
      );
    WHEN 'invited' THEN
      RETURN EXISTS (
        SELECT 1 FROM event_invitations ei
        WHERE ei.event_id = p_event_id
        AND ei.user_id = user_uuid
      );
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update events view to include new fields
DROP VIEW IF EXISTS events_with_details;
CREATE OR REPLACE VIEW events_with_details AS
SELECT
  e.*,
  -- Creator details (from authors - for admin compatibility)
  c.email AS creator_email,
  c.full_name AS creator_name,
  c.avatar_url AS creator_avatar,
  -- Last modifier details
  m.email AS last_modified_by_email,
  m.full_name AS last_modified_by_name,
  m.avatar_url AS last_modified_by_avatar,
  -- Organizer details (from profiles - for devotees)
  p.display_name AS organizer_name,
  p.avatar_url AS organizer_avatar,
  -- RSVP counts
  (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'going') AS rsvp_going_count,
  (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'maybe') AS rsvp_maybe_count,
  -- Aggregated days (as JSON)
  COALESCE(
    json_agg(
      json_build_object(
        'id', ed.id,
        'dayNumber', ed.day_number,
        'date', ed.date,
        'choir', ed.choir,
        'sponsorsPilgrims', ed.sponsors_pilgrims,
        'areaCoordinators', ed.area_coordinators
      ) ORDER BY ed.day_number
    ) FILTER (WHERE ed.id IS NOT NULL),
    '[]'::json
  ) AS days,
  -- Aggregated suspensions (as JSON)
  COALESCE(
    json_agg(
      json_build_object(
        'id', es.id,
        'startDate', es.start_date,
        'endDate', es.end_date,
        'reason', es.reason
      ) ORDER BY es.start_date
    ) FILTER (WHERE es.id IS NOT NULL),
    '[]'::json
  ) AS suspensions
FROM events e
LEFT JOIN authors c ON e.created_by = c.id
LEFT JOIN authors m ON e.last_modified_by = m.id
LEFT JOIN profiles p ON e.organizer_id = p.id
LEFT JOIN event_days ed ON e.id = ed.event_id
LEFT JOIN event_suspensions es ON e.id = es.event_id
GROUP BY
  e.id,
  c.email, c.full_name, c.avatar_url,
  m.email, m.full_name, m.avatar_url,
  p.display_name, p.avatar_url;

-- RLS for event_rsvps
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view RSVPs for events they can see"
  ON event_rsvps FOR SELECT
  USING (
    can_view_event(auth.uid(), event_id)
  );

CREATE POLICY "Users can manage own RSVPs"
  ON event_rsvps FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    can_view_event(auth.uid(), event_id)
  );

CREATE POLICY "Users can update own RSVPs"
  ON event_rsvps FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own RSVPs"
  ON event_rsvps FOR DELETE
  USING (user_id = auth.uid());

-- RLS for event_invitations
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invitations"
  ON event_invitations FOR SELECT
  USING (user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "Event organizers can manage invitations"
  ON event_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_invitations.event_id
      AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true
      )
    )
  );

-- Add policy for devotees to view events based on visibility
CREATE POLICY "Devotees can view events based on visibility"
  ON events FOR SELECT
  TO authenticated
  USING (can_view_event(auth.uid(), id));

-- Grant permissions
GRANT SELECT ON event_rsvps TO authenticated;
GRANT ALL ON event_rsvps TO authenticated;
GRANT SELECT ON event_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_event TO authenticated;
