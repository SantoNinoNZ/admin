-- Migration: Create events management system
-- Supports both recurring and dated events with suspension date ranges

-- 1. Create event_type enum
CREATE TYPE event_type AS ENUM ('recurring', 'dated');

-- 2. Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type event_type NOT NULL,

  -- Recurring event fields
  recurrence TEXT, -- e.g., "Every First and Third Friday of the Month"
  time TEXT, -- e.g., "7:30 PM"

  -- Dated event fields
  start_date TEXT, -- Stored as text to match original format: "January 9, 2026"
  end_date TEXT,
  rosary_time TEXT,
  parking_info TEXT,

  -- Common fields
  venue TEXT NOT NULL,
  address TEXT NOT NULL,
  content TEXT, -- Markdown content
  published BOOLEAN DEFAULT TRUE,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES authors(id) ON DELETE SET NULL,
  last_modified_by UUID REFERENCES authors(id) ON DELETE SET NULL
);

-- 3. Create event_days table (for dated events schedule)
CREATE TABLE IF NOT EXISTS event_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date TEXT NOT NULL, -- e.g., "Friday, 9 January 2026"
  choir TEXT NOT NULL,
  sponsors_pilgrims TEXT NOT NULL,
  area_coordinators TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure day numbers are sequential per event
  CONSTRAINT unique_event_day UNIQUE (event_id, day_number)
);

-- 4. Create event_suspensions table (for recurring event date range exclusions)
CREATE TABLE IF NOT EXISTS event_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT, -- e.g., "Novena Fiesta 2026"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES authors(id) ON DELETE SET NULL,

  -- Ensure end_date is after or equal to start_date
  CONSTRAINT valid_suspension_dates CHECK (end_date >= start_date)
);

-- 5. Create indexes for performance
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_published ON events(published);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_event_days_event_id ON event_days(event_id);
CREATE INDEX idx_event_suspensions_event_id ON event_suspensions(event_id);
CREATE INDEX idx_event_suspensions_dates ON event_suspensions(start_date, end_date);

-- 6. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF auth.uid() IS NOT NULL THEN
    NEW.last_modified_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_events_timestamp ON events;
CREATE TRIGGER update_events_timestamp
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- 7. Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_suspensions ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for events table

-- Public can view published events
CREATE POLICY "Anyone can view published events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (published = TRUE);

-- Admins can view all events
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

-- Admins can create events
CREATE POLICY "Admins can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_admin(auth.uid()));

-- Admins can update events
CREATE POLICY "Admins can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (is_authorized_admin(auth.uid()))
  WITH CHECK (is_authorized_admin(auth.uid()));

-- Admins can delete events
CREATE POLICY "Admins can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

-- 9. Create RLS policies for event_days table

-- Public can view days of published events
CREATE POLICY "Anyone can view days of published events"
  ON event_days FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_days.event_id
      AND events.published = TRUE
    )
  );

-- Admins can view all event days
CREATE POLICY "Admins can view all event days"
  ON event_days FOR SELECT
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

-- Admins can manage event days
CREATE POLICY "Admins can insert event days"
  ON event_days FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_admin(auth.uid()));

CREATE POLICY "Admins can update event days"
  ON event_days FOR UPDATE
  TO authenticated
  USING (is_authorized_admin(auth.uid()))
  WITH CHECK (is_authorized_admin(auth.uid()));

CREATE POLICY "Admins can delete event days"
  ON event_days FOR DELETE
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

-- 10. Create RLS policies for event_suspensions table

-- Public can view suspensions of published recurring events
CREATE POLICY "Anyone can view suspensions of published events"
  ON event_suspensions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_suspensions.event_id
      AND events.published = TRUE
    )
  );

-- Admins can view all suspensions
CREATE POLICY "Admins can view all suspensions"
  ON event_suspensions FOR SELECT
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

-- Admins can manage suspensions
CREATE POLICY "Admins can insert suspensions"
  ON event_suspensions FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_admin(auth.uid()));

CREATE POLICY "Admins can update suspensions"
  ON event_suspensions FOR UPDATE
  TO authenticated
  USING (is_authorized_admin(auth.uid()))
  WITH CHECK (is_authorized_admin(auth.uid()));

CREATE POLICY "Admins can delete suspensions"
  ON event_suspensions FOR DELETE
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

-- 11. Create view for events with related data
CREATE OR REPLACE VIEW events_with_details AS
SELECT
  e.*,
  -- Creator details
  c.email AS creator_email,
  c.full_name AS creator_name,
  c.avatar_url AS creator_avatar,
  -- Last modifier details
  m.email AS last_modified_by_email,
  m.full_name AS last_modified_by_name,
  m.avatar_url AS last_modified_by_avatar,
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
LEFT JOIN event_days ed ON e.id = ed.event_id
LEFT JOIN event_suspensions es ON e.id = es.event_id
GROUP BY
  e.id,
  c.email, c.full_name, c.avatar_url,
  m.email, m.full_name, m.avatar_url;

-- 12. Add comments
COMMENT ON TABLE events IS 'Stores both recurring and dated events';
COMMENT ON TABLE event_days IS 'Stores day-by-day schedule for dated events';
COMMENT ON TABLE event_suspensions IS 'Stores date ranges when recurring events should not occur';
COMMENT ON COLUMN events.recurrence IS 'For recurring events: pattern description (e.g., "Every First Friday")';
COMMENT ON COLUMN events.time IS 'For recurring events: event time (e.g., "7:30 PM")';
COMMENT ON COLUMN events.start_date IS 'For dated events: start date as text (e.g., "January 9, 2026")';
COMMENT ON COLUMN events.end_date IS 'For dated events: end date as text (e.g., "January 17, 2026")';
