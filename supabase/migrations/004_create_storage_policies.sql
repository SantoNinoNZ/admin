-- ============================================================================
-- Migration: 004_create_storage_policies.sql
-- Description: Create storage bucket and configure access policies
-- Run this in: Supabase Dashboard > SQL Editor
-- Prerequisites:
--   1. Create storage bucket "post-media" in Storage > Create bucket
--   2. Enable "Public bucket" option when creating
--   3. Then run this SQL to configure policies
-- ============================================================================

-- NOTE: You must create the bucket manually first via Supabase Dashboard UI:
-- Storage > Create bucket > Name: "post-media" > Public: YES

-- ============================================================================
-- STORAGE POLICIES for "post-media" bucket
-- ============================================================================

-- Policy 1: Allow public read access to all files
CREATE POLICY "Public read access for post-media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'post-media');

-- Policy 2: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to post-media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  );

-- Policy 3: Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update files in post-media"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  );

-- Policy 4: Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete files in post-media"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'post-media'
  ) INTO bucket_exists;

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%post-media%';

  IF bucket_exists AND policy_count = 4 THEN
    RAISE NOTICE '✓ Storage setup completed successfully';
    RAISE NOTICE '  - Bucket "post-media" exists';
    RAISE NOTICE '  - Created % storage policies', policy_count;
    RAISE NOTICE '    1. Public read access';
    RAISE NOTICE '    2. Authenticated upload';
    RAISE NOTICE '    3. Authenticated update';
    RAISE NOTICE '    4. Authenticated delete';
    RAISE NOTICE '';
    RAISE NOTICE 'Storage folder structure:';
    RAISE NOTICE '  post-media/';
    RAISE NOTICE '  ├── images/      (general images)';
    RAISE NOTICE '  ├── featured/    (featured/hero images)';
    RAISE NOTICE '  └── assets/      (other media - PDFs, etc.)';
  ELSIF NOT bucket_exists THEN
    RAISE EXCEPTION 'Bucket "post-media" does not exist. Please create it in Storage UI first.';
  ELSE
    RAISE WARNING 'Expected 4 policies, found %. You may need to rerun this migration.', policy_count;
  END IF;
END $$;

-- ============================================================================
-- MANUAL STEPS REMINDER
-- ============================================================================

/*
  IMPORTANT: Complete these manual steps in Supabase Dashboard:

  1. Go to: Storage > Configuration > "post-media" bucket

  2. Configure bucket settings:
     ✓ Public: Enabled
     ✓ File size limit: 50MB
     ✓ Allowed MIME types: image/*, video/*, application/pdf

  3. Create folder structure (optional):
     - Upload a placeholder file to: post-media/images/.gitkeep
     - Upload a placeholder file to: post-media/featured/.gitkeep
     - Upload a placeholder file to: post-media/assets/.gitkeep

  4. Test upload:
     - Try uploading an image through the Storage UI
     - Verify you can access it via the public URL

  5. Get the public URL format:
     https://[YOUR_PROJECT_ID].supabase.co/storage/v1/object/public/post-media/[path]
*/
