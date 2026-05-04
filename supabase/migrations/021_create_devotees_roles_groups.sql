-- ============================================================================
-- Devotees App - User Roles and Dance Groups
-- ============================================================================

-- Dance Groups
CREATE TABLE IF NOT EXISTS dance_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles (detailed role assignments with context)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'super_admin',
    'coordinator',
    'hermano',
    'dance_leader',
    'sinulog_queen',
    'dancer',
    'devotee'
  )),
  -- Context for role
  area_id UUID REFERENCES areas(id),
  dance_group_id UUID REFERENCES dance_groups(id),
  -- Additional metadata (e.g., queen year, title)
  metadata JSONB DEFAULT '{}',
  -- Status
  is_active BOOLEAN DEFAULT true,
  -- Audit
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  -- Ensure unique active roles per context
  UNIQUE NULLS NOT DISTINCT (user_id, role, area_id, dance_group_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_area ON user_roles(area_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_group ON user_roles(dance_group_id);

-- Dance Group Members
CREATE TABLE IF NOT EXISTS dance_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES dance_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'assistant', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(group_id, user_id)
);

-- Sinulog Queens Registry
CREATE TABLE IF NOT EXISTS sinulog_queens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  placement INTEGER,
  bio TEXT,
  photo_url TEXT,
  achievements TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, placement)
);

-- Practice Sessions for Dance Groups
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES dance_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_name TEXT NOT NULL,
  location_address TEXT,
  is_mandatory BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practice Attendance
CREATE TABLE IF NOT EXISTS practice_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attending', 'not_attending', 'maybe')),
  reason TEXT,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Function to sync roles to profile JSON
CREATE OR REPLACE FUNCTION sync_roles_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  role_json JSONB;
BEGIN
  -- Build roles JSON from user_roles table
  SELECT jsonb_object_agg(role, true)
  INTO role_json
  FROM user_roles
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND is_active = true;

  -- Default to devotee if no roles
  IF role_json IS NULL THEN
    role_json := '{"devotee": true}'::jsonb;
  END IF;

  -- Update profile
  UPDATE profiles
  SET roles = role_json, updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync roles
DROP TRIGGER IF EXISTS sync_user_roles ON user_roles;
CREATE TRIGGER sync_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_roles_to_profile();

-- RLS Policies for dance_groups
ALTER TABLE dance_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dance groups viewable by authenticated"
  ON dance_groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Dance groups manageable by leaders and admins"
  ON dance_groups FOR ALL
  USING (
    leader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        (profiles.roles->>'super_admin')::boolean = true OR
        (profiles.roles->>'dance_leader')::boolean = true
      )
    )
  );

-- RLS Policies for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
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

CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.roles->>'super_admin')::boolean = true
    )
  );

-- RLS for dance_group_members
ALTER TABLE dance_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members viewable by authenticated"
  ON dance_group_members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Members manageable by leaders"
  ON dance_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dance_groups
      WHERE dance_groups.id = dance_group_members.group_id
      AND dance_groups.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.roles->>'super_admin')::boolean = true
    )
  );

-- RLS for sinulog_queens
ALTER TABLE sinulog_queens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Queens viewable by all"
  ON sinulog_queens FOR SELECT
  USING (true);

CREATE POLICY "Queens manageable by admins"
  ON sinulog_queens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.roles->>'super_admin')::boolean = true
    )
  );

-- RLS for practice_sessions
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions viewable by group members"
  ON practice_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dance_group_members
      WHERE dance_group_members.group_id = practice_sessions.group_id
      AND dance_group_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        (profiles.roles->>'super_admin')::boolean = true OR
        (profiles.roles->>'dance_leader')::boolean = true
      )
    )
  );

CREATE POLICY "Sessions manageable by leaders"
  ON practice_sessions FOR ALL
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM dance_groups
      WHERE dance_groups.id = practice_sessions.group_id
      AND dance_groups.leader_id = auth.uid()
    )
  );

-- RLS for practice_attendance
ALTER TABLE practice_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attendance"
  ON practice_attendance FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Leaders can view all attendance"
  ON practice_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM practice_sessions ps
      JOIN dance_groups dg ON dg.id = ps.group_id
      WHERE ps.id = practice_attendance.session_id
      AND dg.leader_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON dance_groups TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON dance_group_members TO authenticated;
GRANT SELECT ON sinulog_queens TO authenticated;
GRANT SELECT ON practice_sessions TO authenticated;
GRANT ALL ON practice_attendance TO authenticated;
