-- Prayer Requests table
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  contact TEXT,
  prayer_request TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'praying', 'completed')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID,
  read_by_email TEXT,
  actioned_by UUID,
  actioned_by_email TEXT,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Home Visit Requests table
CREATE TABLE IF NOT EXISTS home_visit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  contact TEXT,
  address TEXT,
  requested_datetime TEXT NOT NULL,
  scheduled_date DATE,
  scheduled_time TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'completed', 'cancelled')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID,
  read_by_email TEXT,
  actioned_by UUID,
  actioned_by_email TEXT,
  actioned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID,
  read_by_email TEXT,
  replied_by UUID,
  replied_by_email TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anon can INSERT (public form submissions)
CREATE POLICY "Public can submit prayer requests" ON prayer_requests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can submit home visit requests" ON home_visit_requests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can submit contact messages" ON contact_messages
  FOR INSERT TO anon WITH CHECK (true);

-- Authenticated admins can SELECT, UPDATE, DELETE
CREATE POLICY "Admins can view prayer requests" ON prayer_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update prayer requests" ON prayer_requests
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete prayer requests" ON prayer_requests
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admins can view home visit requests" ON home_visit_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update home visit requests" ON home_visit_requests
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete home visit requests" ON home_visit_requests
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admins can view contact messages" ON contact_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update contact messages" ON contact_messages
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete contact messages" ON contact_messages
  FOR DELETE TO authenticated USING (true);
