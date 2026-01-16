-- Fix the rebuild trigger to include proper authorization
--
-- IMPORTANT: After running this migration, you need to redeploy the edge function with:
--   supabase functions deploy trigger-rebuild --no-verify-jwt
--
-- This allows the database trigger to call the edge function without JWT authentication.
-- The edge function can optionally verify a shared secret for security.

-- Update the trigger function with anon key authorization
CREATE OR REPLACE FUNCTION trigger_site_rebuild()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
  function_url TEXT;
  anon_key TEXT;
BEGIN
  -- Only trigger rebuild if published status changed
  IF (TG_OP = 'UPDATE' AND OLD.published IS DISTINCT FROM NEW.published) OR
     (TG_OP = 'INSERT' AND NEW.published = true) OR
     (TG_OP = 'DELETE' AND OLD.published = true) THEN

    -- Construct edge function URL
    function_url := 'https://uvxrdmwmscevovbbrnky.supabase.co/functions/v1/trigger-rebuild';

    -- Supabase anon key (public, safe to include)
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2eHJkbXdtc2Nldm92YmJybmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMjY3NTAsImV4cCI6MjA1MTYwMjc1MH0.bLJqE8fCFXLZ2jPpk_vqN05jS_y5F6M9bG-b9Y2xqeY';

    -- Make async HTTP request to edge function
    BEGIN
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key,
          'apikey', anon_key
        ),
        body := jsonb_build_object(
          'event', TG_OP,
          'post_id', COALESCE(NEW.id, OLD.id),
          'published', COALESCE(NEW.published, OLD.published),
          'timestamp', NOW()
        )
      ) INTO request_id;

      RAISE LOG 'Triggered rebuild request ID: %', request_id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to trigger rebuild: %', SQLERRM;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_rebuild_on_publish ON posts;

CREATE TRIGGER trigger_rebuild_on_publish
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_site_rebuild();
