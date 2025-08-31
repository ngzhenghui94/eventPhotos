-- Add email verification support
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" varchar(255) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
