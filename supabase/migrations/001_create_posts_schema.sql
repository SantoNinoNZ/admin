-- ============================================================================
-- Migration: 001_create_posts_schema.sql
-- Description: Create core database schema for CMS (authors, categories, tags, posts)
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: authors
-- Description: User profiles (auto-created on signup via trigger)
-- ============================================================================
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

-- ============================================================================
-- TABLE: categories
-- Description: Content categories (one-to-one with posts)
-- ============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT, -- For UI theming (e.g., "#3b82f6")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: tags
-- Description: Content tags (many-to-many with posts via post_tags)
-- ============================================================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: posts
-- Description: Main content table with rich metadata
-- ============================================================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic content
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  image_url TEXT,

  -- Publishing
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,

  -- SEO metadata
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image TEXT,

  -- Relations
  author_id UUID REFERENCES authors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- ============================================================================
-- TABLE: post_tags
-- Description: Junction table for many-to-many relationship between posts and tags
-- ============================================================================
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Authors
CREATE INDEX idx_authors_email ON authors(email);

-- Posts
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_updated_at ON posts(updated_at DESC);

-- Post Tags
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

-- Categories
CREATE INDEX idx_categories_slug ON categories(slug);

-- Tags
CREATE INDEX idx_tags_slug ON tags(slug);

-- ============================================================================
-- TRIGGERS for updated_at columns
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to authors table
CREATE TRIGGER update_authors_updated_at
  BEFORE UPDATE ON authors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to categories table
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to posts table
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default categories and tags
-- ============================================================================

-- Insert default categories
INSERT INTO categories (name, slug, description, color) VALUES
  ('Uncategorized', 'uncategorized', 'Posts without a specific category', '#6b7280'),
  ('News', 'news', 'Latest news and updates', '#3b82f6'),
  ('Tutorials', 'tutorials', 'How-to guides and tutorials', '#10b981'),
  ('Announcements', 'announcements', 'Important announcements', '#f59e0b');

-- Insert default tags
INSERT INTO tags (name, slug) VALUES
  ('Featured', 'featured'),
  ('Important', 'important'),
  ('Guide', 'guide'),
  ('Update', 'update');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 001 completed successfully';
  RAISE NOTICE '  - Created tables: authors, categories, tags, posts, post_tags';
  RAISE NOTICE '  - Created indexes for performance';
  RAISE NOTICE '  - Created triggers for updated_at columns';
  RAISE NOTICE '  - Seeded default categories and tags';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run migration 002_create_rls_policies.sql';
END $$;
