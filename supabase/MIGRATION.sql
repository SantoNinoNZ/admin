-- ============================================================================
-- ============================================================================
--
--  SUPABASE DATABASE MIGRATION SCRIPT
--
--  Description: This single script contains all necessary SQL commands to
--               set up the database schema for the Santo Niño Admin CMS.
--
--  How to run:
--  1. Navigate to your Supabase project dashboard.
--  2. Go to the "SQL Editor" section.
--  3. Click "+ New query".
--  4. Copy the entire content of this file.
--  5. Paste it into the SQL Editor.
--  6. Click "RUN".
--  7. Check the output for "✅ All migrations completed!" to ensure success.
--
-- ============================================================================
-- ============================================================================


-- ============================================================================
-- MIGRATION 1: CREATE CORE DATABASE SCHEMA
-- Source: 001_create_posts_schema.sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE: authors
CREATE TABLE authors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('admin', 'editor', 'author')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image TEXT,
  author_id UUID REFERENCES authors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- TABLE: post_tags
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- INDEXES
CREATE INDEX idx_authors_email ON authors(email);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_updated_at ON posts(updated_at DESC);
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_tags_slug ON tags(slug);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_authors_updated_at BEFORE UPDATE ON authors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SEED DATA
INSERT INTO categories (name, slug, description, color) VALUES
  ('Uncategorized', 'uncategorized', 'Posts without a specific category', '#6b7280'),
  ('News', 'news', 'Latest news and updates', '#3b82f6'),
  ('Tutorials', 'tutorials', 'How-to guides and tutorials', '#10b981'),
  ('Announcements', 'announcements', 'Important announcements', '#f59e0b');

INSERT INTO tags (name, slug) VALUES
  ('Featured', 'featured'),
  ('Important', 'important'),
  ('Guide', 'guide'),
  ('Update', 'update');

DO $$ BEGIN RAISE NOTICE '==> MIGRATION 1 of 4: Schema created successfully.'; END $$;


-- ============================================================================
-- MIGRATION 2: CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- Source: 002_create_rls_policies.sql
-- ============================================================================

ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

-- Authors Policies
CREATE POLICY "Authors are viewable by everyone" ON authors FOR SELECT USING (true);
CREATE POLICY "Users can update their own author record" ON authors FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Categories Policies
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create categories" ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update categories" ON categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete categories" ON categories FOR DELETE USING (auth.role() = 'authenticated');

-- Tags Policies
CREATE POLICY "Tags are viewable by everyone" ON tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tags" ON tags FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete tags" ON tags FOR DELETE USING (auth.role() = 'authenticated');

-- Posts Policies
CREATE POLICY "Published posts are viewable by everyone, all posts by auth" ON posts FOR SELECT USING (published = true OR auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authors can update their own posts" ON posts FOR UPDATE USING (auth.role() = 'authenticated' AND (author_id = auth.uid() OR author_id IS NULL)) WITH CHECK (auth.role() = 'authenticated' AND (author_id = auth.uid() OR author_id IS NULL));
CREATE POLICY "Authors can delete their own posts" ON posts FOR DELETE USING (auth.role() = 'authenticated' AND (author_id = auth.uid() OR author_id IS NULL));

-- Post_Tags Policies
CREATE POLICY "Post tags are viewable by everyone" ON post_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create post tags" ON post_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete post tags" ON post_tags FOR DELETE USING (auth.role() = 'authenticated');

DO $$ BEGIN RAISE NOTICE '==> MIGRATION 2 of 4: RLS policies created successfully.'; END $$;


-- ============================================================================
-- MIGRATION 3: CREATE HELPER FUNCTIONS, TRIGGERS, AND VIEWS
-- Source: 003_create_helper_functions.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.authors (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'author'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE VIEW posts_with_details AS
SELECT
  p.*,
  a.full_name as author_name,
  a.email as author_email,
  a.avatar_url as author_avatar,
  c.name as category_name,
  c.slug as category_slug,
  c.color as category_color,
  COALESCE(
    (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug) ORDER BY t.name)
     FROM post_tags pt
     JOIN tags t ON pt.tag_id = t.id
     WHERE pt.post_id = p.id),
    '[]'::json
  ) as tags
FROM posts p
LEFT JOIN authors a ON p.author_id = a.id
LEFT JOIN categories c ON p.category_id = c.id;

GRANT SELECT ON posts_with_details TO authenticated, anon;

DO $$ BEGIN RAISE NOTICE '==> MIGRATION 3 of 4: Helper functions and views created successfully.'; END $$;


-- ============================================================================
-- MIGRATION 4: CREATE STORAGE POLICIES
-- Source: 004_create_storage_policies.sql
--
-- IMPORTANT: You must first manually create a PUBLIC bucket named "post-media"
-- in the Supabase Dashboard (Storage section).
-- ============================================================================

-- Policy 1: Allow public read access
CREATE POLICY "Public read access for post-media" ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
-- Policy 2: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload to post-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.role() = 'authenticated');
-- Policy 3: Allow authenticated users to update
CREATE POLICY "Authenticated users can update files in post-media" ON storage.objects FOR UPDATE USING (bucket_id = 'post-media' AND auth.role() = 'authenticated');
-- Policy 4: Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete files in post-media" ON storage.objects FOR DELETE USING (bucket_id = 'post-media' AND auth.role() = 'authenticated');

DO $$
BEGIN
    RAISE NOTICE '==> MIGRATION 4 of 4: Storage policies created successfully.';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All migrations completed! Your database is ready.';
END $$;
