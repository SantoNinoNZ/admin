-- ============================================================================
-- Migration: 003_create_helper_functions.sql
-- Description: Create helper functions, triggers, and views
-- Run this in: Supabase Dashboard > SQL Editor
-- Prerequisites: Run 001 and 002 migrations first
-- ============================================================================

-- ============================================================================
-- FUNCTION: Auto-create author record on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.authors (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'author' -- Default role
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate insertions

  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER: Execute handle_new_user on user signup
-- ============================================================================

-- Drop trigger if it already exists (for re-running migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VIEW: posts_with_details
-- Description: Enriched view of posts with author, category, and tags
-- ============================================================================

CREATE OR REPLACE VIEW posts_with_details AS
SELECT
  p.*,
  -- Author details
  a.full_name as author_name,
  a.email as author_email,
  a.avatar_url as author_avatar,
  -- Category details
  c.name as category_name,
  c.slug as category_slug,
  c.color as category_color,
  -- Tags (aggregated as JSON array)
  COALESCE(
    json_agg(
      json_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug
      ) ORDER BY t.name
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::json
  ) as tags
FROM posts p
LEFT JOIN authors a ON p.author_id = a.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY
  p.id,
  a.full_name,
  a.email,
  a.avatar_url,
  c.name,
  c.slug,
  c.color;

-- Grant select permission on the view
GRANT SELECT ON posts_with_details TO authenticated, anon;

-- ============================================================================
-- FUNCTION: Get posts with pagination and filtering
-- Description: Helper function for efficient post retrieval with filters
-- ============================================================================

CREATE OR REPLACE FUNCTION get_posts(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_published BOOLEAN DEFAULT NULL,
  p_author_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS SETOF posts_with_details
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM posts_with_details
  WHERE
    (p_published IS NULL OR published = p_published)
    AND (p_author_id IS NULL OR author_id = p_author_id)
    AND (p_category_id IS NULL OR category_id = p_category_id)
    AND (
      p_search IS NULL
      OR title ILIKE '%' || p_search || '%'
      OR content ILIKE '%' || p_search || '%'
      OR excerpt ILIKE '%' || p_search || '%'
    )
  ORDER BY updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- FUNCTION: Generate unique slug from title
-- Description: Auto-generates URL-friendly slug ensuring uniqueness
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_unique_slug(p_title TEXT, p_exclude_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_counter INTEGER := 0;
  v_final_slug TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Generate base slug from title
  v_slug := lower(regexp_replace(p_title, '[^a-z0-9\s-]', '', 'g'));
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);

  -- If slug is empty, use 'untitled'
  IF v_slug = '' THEN
    v_slug := 'untitled';
  END IF;

  v_final_slug := v_slug;

  -- Check for uniqueness and append counter if needed
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM posts
      WHERE slug = v_final_slug
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;

    v_counter := v_counter + 1;
    v_final_slug := v_slug || '-' || v_counter;
  END LOOP;

  RETURN v_final_slug;
END;
$$;

-- ============================================================================
-- FUNCTION: Get post statistics
-- Description: Returns statistics about posts (total, published, drafts, etc.)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_post_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'published', COUNT(*) FILTER (WHERE published = true),
    'drafts', COUNT(*) FILTER (WHERE published = false),
    'with_category', COUNT(*) FILTER (WHERE category_id IS NOT NULL),
    'with_tags', COUNT(DISTINCT p.id) FILTER (WHERE pt.tag_id IS NOT NULL)
  )
  INTO v_stats
  FROM posts p
  LEFT JOIN post_tags pt ON p.id = pt.post_id;

  RETURN v_stats;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  trigger_count INTEGER;
  view_count INTEGER;
BEGIN
  -- Check trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created';

  -- Check view exists
  SELECT COUNT(*) INTO view_count
  FROM pg_views
  WHERE viewname = 'posts_with_details';

  IF trigger_count > 0 AND view_count > 0 THEN
    RAISE NOTICE '✓ Migration 003 completed successfully';
    RAISE NOTICE '  - Created handle_new_user() function';
    RAISE NOTICE '  - Created on_auth_user_created trigger';
    RAISE NOTICE '  - Created posts_with_details view';
    RAISE NOTICE '  - Created get_posts() helper function';
    RAISE NOTICE '  - Created generate_unique_slug() helper function';
    RAISE NOTICE '  - Created get_post_stats() helper function';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All migrations completed! Database is ready.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Create Storage bucket "post-media" in Supabase Dashboard';
    RAISE NOTICE '  2. Configure Google OAuth in Authentication > Providers';
    RAISE NOTICE '  3. Update .env.local with Supabase credentials';
  ELSE
    RAISE EXCEPTION 'Migration failed. Trigger count: %, View count: %', trigger_count, view_count;
  END IF;
END $$;
