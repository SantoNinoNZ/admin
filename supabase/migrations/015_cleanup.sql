-- Cleanup script for migration 006
-- Run this FIRST in Supabase SQL Editor to remove broken policies

-- Drop all RLS policies on users table
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert own record" ON users;

-- Drop all RLS policies on invites table
DROP POLICY IF EXISTS "Admins can view invites" ON invites;
DROP POLICY IF EXISTS "Admins can create invites" ON invites;
DROP POLICY IF EXISTS "Public can view invite by token" ON invites;
DROP POLICY IF EXISTS "Allow invite consumption" ON invites;

-- Drop the function (we'll recreate it with the fix)
DROP FUNCTION IF EXISTS is_authorized_admin(UUID);

-- Tables and other structures remain (users, invites, etc.)
-- We're just fixing the RLS policies that caused infinite recursion
