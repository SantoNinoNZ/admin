-- Migration: Create invites system for admin authorization
-- This ensures only invited users can access the admin panel

-- 1. Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_pending_invite UNIQUE (email, used_at)
);

-- 2. Add index for performance
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_expires_at ON invites(expires_at);

-- 3. Add is_admin flag to users table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- 4. Add invited_by to users table to track who invited them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE users ADD COLUMN invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Create function to generate invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to validate and consume invite
CREATE OR REPLACE FUNCTION consume_invite(invite_token TEXT, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Find valid invite
  SELECT * INTO invite_record
  FROM invites
  WHERE token = invite_token
    AND used_at IS NULL
    AND expires_at > NOW();

  -- If no valid invite found
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Mark invite as used
  UPDATE invites
  SET used_at = NOW(),
      used_by = user_id
  WHERE id = invite_record.id;

  -- Create or update user record
  INSERT INTO users (id, email, invited_by, is_admin)
  VALUES (user_id, invite_record.email, invite_record.created_by, TRUE)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      invited_by = EXCLUDED.invited_by,
      is_admin = TRUE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to check if user is authorized admin
CREATE OR REPLACE FUNCTION is_authorized_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable RLS on invites table
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for invites
-- Allow authenticated admins to view all invites
CREATE POLICY "Admins can view invites"
  ON invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

-- Allow authenticated admins to create invites
CREATE POLICY "Admins can create invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

-- Allow public to view their own invite by token (for validation)
CREATE POLICY "Public can view invite by token"
  ON invites FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- 10. Update existing users to be admins (for migration)
UPDATE users SET is_admin = TRUE WHERE is_admin IS NULL;

-- 11. Add RLS policies for users table updates
-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow admins to update other users' admin status
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS current_user
      WHERE current_user.id = auth.uid() AND current_user.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS current_user
      WHERE current_user.id = auth.uid() AND current_user.is_admin = TRUE
    )
  );

-- Allow admins to view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS current_user
      WHERE current_user.id = auth.uid() AND current_user.is_admin = TRUE
    )
  );

-- 12. Add comment
COMMENT ON TABLE invites IS 'Stores invitation tokens for admin access control';
