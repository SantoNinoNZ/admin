-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to trigger rebuild via webhook
CREATE OR REPLACE FUNCTION trigger_site_rebuild()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
  function_url TEXT;
BEGIN
  -- Only trigger rebuild if published status changed
  IF (TG_OP = 'UPDATE' AND OLD.published IS DISTINCT FROM NEW.published) OR
     (TG_OP = 'INSERT' AND NEW.published = true) OR
     (TG_OP = 'DELETE' AND OLD.published = true) THEN

    -- Construct edge function URL
    function_url := 'https://uvxrdmwmscevovbbrnky.supabase.co/functions/v1/trigger-rebuild';

    -- Make async HTTP request to edge function
    BEGIN
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_rebuild_on_publish ON posts;

-- Create trigger on posts table
CREATE TRIGGER trigger_rebuild_on_publish
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_site_rebuild();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_site_rebuild() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_site_rebuild() TO service_role;

-- Test: Check if trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_rebuild_on_publish';
