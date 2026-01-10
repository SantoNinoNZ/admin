-- ============================================================================
-- Migration: 002_create_rls_policies.sql
-- Description: Enable Row Level Security (RLS) and create security policies
-- Run this in: Supabase Dashboard > SQL Editor
-- Prerequisites: Run 001_create_posts_schema.sql first
-- ============================================================================

-- ============================================================================
-- ENABLE RLS on all tables
-- ============================================================================

ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- AUTHORS POLICIES
-- ============================================================================

-- Anyone can view author profiles
CREATE POLICY "Authors are viewable by everyone"
  ON authors
  FOR SELECT
  USING (true);

-- Users can update their own author record
CREATE POLICY "Users can update their own author record"
  ON authors
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================

-- Anyone can view categories
CREATE POLICY "Categories are viewable by everyone"
  ON categories
  FOR SELECT
  USING (true);

-- Authenticated users can create categories
CREATE POLICY "Authenticated users can create categories"
  ON categories
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update categories
CREATE POLICY "Authenticated users can update categories"
  ON categories
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete categories
CREATE POLICY "Authenticated users can delete categories"
  ON categories
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- TAGS POLICIES
-- ============================================================================

-- Anyone can view tags
CREATE POLICY "Tags are viewable by everyone"
  ON tags
  FOR SELECT
  USING (true);

-- Authenticated users can create tags
CREATE POLICY "Authenticated users can create tags"
  ON tags
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update tags
CREATE POLICY "Authenticated users can update tags"
  ON tags
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete tags
CREATE POLICY "Authenticated users can delete tags"
  ON tags
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- POSTS POLICIES
-- ============================================================================

-- Anyone can view published posts
-- Authenticated users can view all posts (including drafts)
CREATE POLICY "Published posts are viewable by everyone, all posts by authenticated users"
  ON posts
  FOR SELECT
  USING (
    published = true
    OR auth.role() = 'authenticated'
  );

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON posts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authors can update their own posts
-- Or posts with no author (for migration/admin purposes)
CREATE POLICY "Authors can update their own posts"
  ON posts
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (author_id = auth.uid() OR author_id IS NULL)
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (author_id = auth.uid() OR author_id IS NULL)
  );

-- Authors can delete their own posts
-- Or posts with no author (for migration/admin purposes)
CREATE POLICY "Authors can delete their own posts"
  ON posts
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (author_id = auth.uid() OR author_id IS NULL)
  );

-- ============================================================================
-- POST_TAGS POLICIES
-- ============================================================================

-- Anyone can view post-tag relationships
CREATE POLICY "Post tags are viewable by everyone"
  ON post_tags
  FOR SELECT
  USING (true);

-- Authenticated users can create post-tag relationships
CREATE POLICY "Authenticated users can create post tags"
  ON post_tags
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete post-tag relationships
CREATE POLICY "Authenticated users can delete post tags"
  ON post_tags
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('authors', 'categories', 'tags', 'posts', 'post_tags')
    AND rowsecurity = true;

  IF rls_count = 5 THEN
    RAISE NOTICE '✓ Migration 002 completed successfully';
    RAISE NOTICE '  - Enabled RLS on all tables (% tables)', rls_count;
    RAISE NOTICE '  - Created policies for authors (2 policies)';
    RAISE NOTICE '  - Created policies for categories (4 policies)';
    RAISE NOTICE '  - Created policies for tags (4 policies)';
    RAISE NOTICE '  - Created policies for posts (4 policies)';
    RAISE NOTICE '  - Created policies for post_tags (3 policies)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Run migration 003_create_helper_functions.sql';
  ELSE
    RAISE EXCEPTION 'RLS not enabled on all tables. Expected 5, got %', rls_count;
  END IF;
END $$;
