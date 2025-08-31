-- Add is_owner boolean column to users with default false
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_owner" boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
