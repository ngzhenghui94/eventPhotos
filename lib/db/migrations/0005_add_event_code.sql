-- Add event_code to events, backfill, and enforce constraints
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_code varchar(50);

-- Backfill existing rows with an 8-character uppercase code if null
UPDATE events
SET event_code = UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8))
WHERE event_code IS NULL;

-- Make column NOT NULL
ALTER TABLE events ALTER COLUMN event_code SET NOT NULL;

-- Ensure uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'events_event_code_unique'
  ) THEN
    CREATE UNIQUE INDEX events_event_code_unique ON events (event_code);
  END IF;
END $$;
