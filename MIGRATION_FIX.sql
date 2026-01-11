-- Run this ONCE in Supabase SQL Editor to mark existing migrations as applied
-- This tells Supabase that migrations 001-005 have already been run

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES
  ('001', ARRAY[]::text[], '001_create_posts_schema.sql'),
  ('002', ARRAY[]::text[], '002_create_rls_policies.sql'),
  ('003', ARRAY[]::text[], '003_create_helper_functions.sql'),
  ('004', ARRAY[]::text[], '004_create_storage_policies.sql'),
  ('005', ARRAY[]::text[], '005_auto_rebuild_trigger.sql')
ON CONFLICT (version) DO NOTHING;

-- After running this, future migrations will work automatically
-- Now you can run migration 006 either manually or via the workflow
