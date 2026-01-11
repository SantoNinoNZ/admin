-- Migration: Add last modified by tracking to posts
-- This tracks who last modified each post

-- 1. Add last_modified_by column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES authors(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_posts_last_modified_by ON posts(last_modified_by);

-- 3. Create trigger to automatically set last_modified_by on updates
CREATE OR REPLACE FUNCTION set_last_modified_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if the user is authenticated
  IF auth.uid() IS NOT NULL THEN
    NEW.last_modified_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply trigger to posts table (fires before update)
DROP TRIGGER IF EXISTS set_posts_last_modified_by ON posts;
CREATE TRIGGER set_posts_last_modified_by
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION set_last_modified_by();

-- 5. Update the posts_with_details view to include modifier information
DROP VIEW IF EXISTS posts_with_details;

CREATE VIEW posts_with_details AS
SELECT
  p.*,

  -- Author details
  a.email AS author_email,
  a.full_name AS author_name,
  a.avatar_url AS author_avatar,

  -- Last modifier details
  m.email AS last_modified_by_email,
  m.full_name AS last_modified_by_name,
  m.avatar_url AS last_modified_by_avatar,

  -- Category details
  c.name AS category_name,
  c.slug AS category_slug,
  c.color AS category_color,

  -- Tags as JSON array
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug
      )
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::json
  ) AS tags

FROM posts p
LEFT JOIN authors a ON p.author_id = a.id
LEFT JOIN authors m ON p.last_modified_by = m.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id, a.email, a.full_name, a.avatar_url,
         m.email, m.full_name, m.avatar_url,
         c.name, c.slug, c.color;

-- 6. Add comment
COMMENT ON COLUMN posts.last_modified_by IS 'User who last modified this post';
