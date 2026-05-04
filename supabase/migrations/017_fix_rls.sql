-- Fix RLS infinite recursion issue
-- Run this AFTER running 006_cleanup.sql

-- 1. Create helper function with SECURITY DEFINER to bypass RLS
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

-- 2. Create RLS policies for invites table
CREATE POLICY "Admins can view invites"
  ON invites FOR SELECT
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

CREATE POLICY "Admins can create invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_admin(auth.uid()));

CREATE POLICY "Public can view invite by token"
  ON invites FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Allow invite consumption"
  ON invites FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 3. Create RLS policies for users table
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (is_authorized_admin(auth.uid()))
  WITH CHECK (is_authorized_admin(auth.uid()));

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_authorized_admin(auth.uid()));

CREATE POLICY "Users can insert own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Done! RLS policies are now fixed and won't cause infinite recursion
