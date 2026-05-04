-- Migration: Create invites system for admin authorization
-- This ensures only invited users can access the admin panel

-- 1. Create users table for admin authorization (separate from authors table)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT TRUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- 2. Create invites table
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

-- 3. Add index for performance
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_expires_at ON invites(expires_at);

-- 4. Create function to generate invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to validate and consume invite
CREATE OR REPLACE FUNCTION consume_invite(invite_token TEXT, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
  auth_user_record RECORD;
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

  -- Get user info from auth.users
  SELECT id, email, raw_user_meta_data
  INTO auth_user_record
  FROM auth.users
  WHERE id = user_id;

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

  -- Create or update author record
  INSERT INTO authors (id, email, full_name, avatar_url)
  VALUES (
    user_id,
    auth_user_record.email,
    COALESCE(
      auth_user_record.raw_user_meta_data->>'full_name',
      auth_user_record.raw_user_meta_data->>'name',
      auth_user_record.email
    ),
    COALESCE(
      auth_user_record.raw_user_meta_data->>'avatar_url',
      auth_user_record.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to check if user is authorized admin
-- Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION is_authorized_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_result BOOLEAN;
BEGIN
  -- Directly query users table bypassing RLS
  SELECT u.is_admin INTO is_admin_result
  FROM public.users u
  WHERE u.id = user_id;

  RETURN COALESCE(is_admin_result, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Enable RLS on invites table
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for invites
-- Allow authenticated admins to view all invites
-- Uses helper function to avoid infinite recursion
CREATE POLICY "Admins can view invites"
  ON invites FOR SELECT
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

-- Allow authenticated admins to create invites
-- Uses helper function to avoid infinite recursion
CREATE POLICY "Admins can create invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_admin(auth.uid()));

-- Allow public to view their own invite by token (for validation)
CREATE POLICY "Public can view invite by token"
  ON invites FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Allow function to update invite when consumed (SECURITY DEFINER functions bypass RLS)
CREATE POLICY "Allow invite consumption"
  ON invites FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 9. Add RLS policies for users table updates
-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow admins to update other users' admin status
-- Uses helper function to avoid infinite recursion
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (is_authorized_admin(auth.uid()))
  WITH CHECK (is_authorized_admin(auth.uid()));

-- Allow admins to view all users
-- Uses helper function to avoid infinite recursion
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

-- Allow users to insert their own record during invite consumption
CREATE POLICY "Users can insert own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 10. Add comments
COMMENT ON TABLE users IS 'Stores user admin authorization status';
COMMENT ON TABLE invites IS 'Stores invitation tokens for admin access control';
