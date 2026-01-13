-- Migration: Update events_with_details view to include rrule column
-- The view needs to be recreated after adding the rrule column

DROP VIEW IF EXISTS events_with_details;

CREATE OR REPLACE VIEW events_with_details AS
SELECT
  e.*,
  -- Creator details
  c.email AS creator_email,
  c.full_name AS creator_name,
  c.avatar_url AS creator_avatar,
  -- Last modifier details
  m.email AS last_modified_by_email,
  m.full_name AS last_modified_by_name,
  m.avatar_url AS last_modified_by_avatar,
  -- Aggregated days (as JSON)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', ed.id,
        'dayNumber', ed.day_number,
        'date', ed.date,
        'choir', ed.choir,
        'sponsorsPilgrims', ed.sponsors_pilgrims,
        'areaCoordinators', ed.area_coordinators
      )
    ) FILTER (WHERE ed.id IS NOT NULL),
    '[]'::json
  ) AS days,
  -- Aggregated suspensions (as JSON)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', es.id,
        'startDate', es.start_date,
        'endDate', es.end_date,
        'reason', es.reason
      )
    ) FILTER (WHERE es.id IS NOT NULL),
    '[]'::json
  ) AS suspensions
FROM events e
LEFT JOIN authors c ON e.created_by = c.id
LEFT JOIN authors m ON e.last_modified_by = m.id
LEFT JOIN event_days ed ON e.id = ed.event_id
LEFT JOIN event_suspensions es ON e.id = es.event_id
GROUP BY
  e.id,
  e.slug,
  e.title,
  e.type,
  e.recurrence,
  e.time,
  e.rrule,
  e.start_date,
  e.end_date,
  e.rosary_time,
  e.parking_info,
  e.venue,
  e.address,
  e.content,
  e.published,
  e.created_at,
  e.updated_at,
  e.created_by,
  e.last_modified_by,
  c.email,
  c.full_name,
  c.avatar_url,
  m.email,
  m.full_name,
  m.avatar_url;
