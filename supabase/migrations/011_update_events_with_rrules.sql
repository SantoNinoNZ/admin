-- Migration: Update migrated events with RRULEs
-- This adds proper RRULE to existing recurring events

-- Update Santo Nino Novena Mass with correct RRULE
-- "Every First and Third Friday of the Month" = FREQ=MONTHLY;BYDAY=1FR,3FR
UPDATE events
SET rrule = 'FREQ=MONTHLY;BYDAY=1FR,3FR'
WHERE slug = 'santo-nino-novena-mass' AND type = 'recurring';

-- Note: If you have other recurring events, add them here with their appropriate RRULEs
-- Examples:
-- UPDATE events SET rrule = 'FREQ=WEEKLY;BYDAY=SU' WHERE slug = 'sunday-mass';
-- UPDATE events SET rrule = 'FREQ=MONTHLY;BYDAY=1FR' WHERE slug = 'first-friday-devotion';
