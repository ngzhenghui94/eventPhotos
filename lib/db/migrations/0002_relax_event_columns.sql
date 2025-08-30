-- Allow nullable description and location on events to match app schema
DO $$ BEGIN
  ALTER TABLE "events" ALTER COLUMN "description" DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "events" ALTER COLUMN "location" DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;
