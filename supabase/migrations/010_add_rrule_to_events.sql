-- Migration: Add RRULE support for recurring events
-- RRULE follows iCalendar RFC 5545 standard

-- 1. Add rrule column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS rrule TEXT;

-- 2. Add comment
COMMENT ON COLUMN events.rrule IS 'iCalendar RRULE format for recurring events (e.g., FREQ=MONTHLY;BYDAY=1FR,3FR)';

-- 3. Update existing recurring event with proper RRULE
-- "Every First and Third Friday of the Month" = FREQ=MONTHLY;BYDAY=1FR,3FR
UPDATE events
SET rrule = 'FREQ=MONTHLY;BYDAY=1FR,3FR'
WHERE slug = 'santo-nino-novena-mass' AND type = 'recurring';

-- Note: RRULE examples:
-- Every Monday: FREQ=WEEKLY;BYDAY=MO
-- Every Sunday: FREQ=WEEKLY;BYDAY=SU
-- First Friday: FREQ=MONTHLY;BYDAY=1FR
-- Last Sunday: FREQ=MONTHLY;BYDAY=-1SU
-- Daily: FREQ=DAILY
-- First and Third Friday: FREQ=MONTHLY;BYDAY=1FR,3FR
