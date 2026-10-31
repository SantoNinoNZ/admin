-- Update auto-rebuild trigger to fire on all published post and event edits
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trigger_site_rebuild()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
  function_url TEXT;
  should_rebuild BOOLEAN := false;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.published = true) OR
     (TG_OP = 'DELETE' AND OLD.published = true) OR
     (TG_OP = 'UPDATE' AND (OLD.published = true OR NEW.published = true)) THEN
    should_rebuild := true;
  END IF;

  IF should_rebuild THEN
    function_url := 'https://uvxrdmwmscevovbbrnky.supabase.co/functions/v1/trigger-rebuild';

    BEGIN
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'table', TG_TABLE_NAME,
          'event', TG_OP,
          'record_id', COALESCE(NEW.id, OLD.id),
          'published', COALESCE(NEW.published, OLD.published),
          'timestamp', NOW()
        )
      ) INTO request_id;

      RAISE LOG 'Triggered rebuild request ID: % for %.%', request_id, TG_TABLE_NAME, TG_OP;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger rebuild: %', SQLERRM;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_rebuild_on_publish ON posts;
CREATE TRIGGER trigger_rebuild_on_publish
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_site_rebuild();

DROP TRIGGER IF EXISTS trigger_rebuild_on_event_change ON events;
CREATE TRIGGER trigger_rebuild_on_event_change
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_site_rebuild();

GRANT EXECUTE ON FUNCTION trigger_site_rebuild() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_site_rebuild() TO service_role;
