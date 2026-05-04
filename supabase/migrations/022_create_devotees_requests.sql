-- ============================================================================
-- Devotees App - Prayer & House Visit Requests
-- ============================================================================

-- Request Types Enum
DO $$ BEGIN
  CREATE TYPE request_type AS ENUM (
    'prayer',
    'house_visit',
    'counseling',
    'blessing',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Request Status Enum
DO $$ BEGIN
  CREATE TYPE request_status AS ENUM (
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Requests Table
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type request_type NOT NULL,

  -- Requester Info (can be anonymous)
  requester_id UUID REFERENCES profiles(id),
  requester_name TEXT,
  requester_email TEXT,
  requester_phone TEXT,

  -- Request Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,

  -- For house visits
  visit_address TEXT,
  preferred_date DATE,
  preferred_time_slot TEXT CHECK (preferred_time_slot IN ('morning', 'afternoon', 'evening', 'flexible')),

  -- Routing
  area_id UUID REFERENCES areas(id),

  -- Assignment
  status request_status DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_area ON requests(area_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_assigned ON requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type);

-- Request Notes (for communication between handlers)
CREATE TABLE IF NOT EXISTS request_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_notes_request ON request_notes(request_id);

-- Function to update request timestamp
CREATE OR REPLACE FUNCTION update_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_requests_timestamp ON requests;
CREATE TRIGGER update_requests_timestamp
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_request_timestamp();

-- Function to auto-assign area based on requester profile
CREATE OR REPLACE FUNCTION auto_assign_request_area()
RETURNS TRIGGER AS $$
BEGIN
  -- If area not specified but requester has an area, use that
  IF NEW.area_id IS NULL AND NEW.requester_id IS NOT NULL THEN
    SELECT area_id INTO NEW.area_id
    FROM profiles
    WHERE id = NEW.requester_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_area ON requests;
CREATE TRIGGER auto_assign_area
  BEFORE INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_request_area();

-- RLS Policies for requests
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Requesters can view their own requests
CREATE POLICY "Requesters can view own requests"
  ON requests FOR SELECT
  USING (requester_id = auth.uid());

-- Handlers (hermanos, coordinators) can view requests in their area
CREATE POLICY "Handlers can view area requests"
  ON requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'hermano')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true
      )
      AND (
        -- Super admins see all
        (p.roles->>'super_admin')::boolean = true OR
        -- Others see their area or unassigned
        requests.area_id IS NULL OR
        requests.area_id = p.area_id
      )
    )
  );

-- Users can create requests
CREATE POLICY "Authenticated users can create requests"
  ON requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Requesters can update own pending requests
CREATE POLICY "Requesters can update own pending requests"
  ON requests FOR UPDATE
  USING (
    requester_id = auth.uid() AND
    status = 'pending'
  );

-- Handlers can update assigned requests
CREATE POLICY "Handlers can update requests"
  ON requests FOR UPDATE
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.roles->>'super_admin')::boolean = true OR
        (p.roles->>'hermano')::boolean = true OR
        (p.roles->>'coordinator')::boolean = true
      )
    )
  );

-- RLS Policies for request_notes
ALTER TABLE request_notes ENABLE ROW LEVEL SECURITY;

-- Notes visible based on request access and internal flag
CREATE POLICY "Notes visible to participants"
  ON request_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_notes.request_id
      AND (
        -- Requester can see non-internal notes
        (r.requester_id = auth.uid() AND NOT request_notes.is_internal) OR
        -- Handlers can see all notes
        r.assigned_to = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND (
            (p.roles->>'super_admin')::boolean = true OR
            (p.roles->>'hermano')::boolean = true OR
            (p.roles->>'coordinator')::boolean = true
          )
        )
      )
    )
  );

-- Authenticated users can add notes to accessible requests
CREATE POLICY "Users can add notes"
  ON request_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_notes.request_id
      AND (
        r.requester_id = auth.uid() OR
        r.assigned_to = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND (
            (p.roles->>'super_admin')::boolean = true OR
            (p.roles->>'hermano')::boolean = true OR
            (p.roles->>'coordinator')::boolean = true
          )
        )
      )
    )
  );

-- Grant permissions
GRANT ALL ON requests TO authenticated;
GRANT ALL ON request_notes TO authenticated;
