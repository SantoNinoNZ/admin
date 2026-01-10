-- Create a function to trigger rebuild via webhook
CREATE OR REPLACE FUNCTION trigger_site_rebuild()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get Supabase project URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Only trigger rebuild if published status changed
  IF (TG_OP = 'UPDATE' AND OLD.published IS DISTINCT FROM NEW.published) OR
     (TG_OP = 'INSERT' AND NEW.published = true) THEN

    -- Make async HTTP request to edge function
    -- Using pg_net extension (if available) or http extension
    BEGIN
      -- Try using pg_net if available
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/trigger-rebuild',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'event', TG_OP,
          'post_id', NEW.id,
          'published', NEW.published
        )
      ) INTO request_id;

      RAISE LOG 'Triggered rebuild request ID: %', request_id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to trigger rebuild: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on posts table
DROP TRIGGER IF EXISTS trigger_rebuild_on_publish ON posts;
CREATE TRIGGER trigger_rebuild_on_publish
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_site_rebuild();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_site_rebuild() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_site_rebuild() TO service_role;
