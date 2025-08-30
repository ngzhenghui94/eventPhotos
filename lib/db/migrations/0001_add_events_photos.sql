-- Ensure events table and required columns exist
CREATE TABLE IF NOT EXISTS "events" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text,
  "date" timestamp NOT NULL,
  "location" varchar(255),
  "access_code" varchar(50) NOT NULL,
  "team_id" integer NOT NULL,
  "created_by" integer,
  "is_public" boolean DEFAULT false NOT NULL,
  "allow_guest_uploads" boolean DEFAULT true NOT NULL,
  "require_approval" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add/align columns for existing events table
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "name" varchar(200) NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "date" timestamp NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location" varchar(255);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "access_code" varchar(50) NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "team_id" integer NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "created_by" integer;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "allow_guest_uploads" boolean DEFAULT true NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "require_approval" boolean DEFAULT false NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint

-- Optional: rename legacy columns if present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'owner_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'created_by'
  ) THEN
    EXECUTE 'ALTER TABLE "events" RENAME COLUMN "owner_id" TO "created_by"';
  END IF;
END $$;
--> statement-breakpoint

-- Uniqueness and indexes
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "events_access_code_unique" ON "events" ("access_code");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
--> statement-breakpoint

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

-- Photos table
CREATE TABLE IF NOT EXISTS "photos" (
  "id" serial PRIMARY KEY NOT NULL,
  "filename" varchar(255) NOT NULL,
  "original_filename" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "file_size" integer NOT NULL,
  "file_path" text NOT NULL,
  "event_id" integer NOT NULL,
  "uploaded_by" integer,
  "guest_name" varchar(100),
  "guest_email" varchar(255),
  "is_approved" boolean DEFAULT true NOT NULL,
  "uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add/align columns for existing photos table
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "filename" varchar(255) NOT NULL;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "original_filename" varchar(255) NOT NULL;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "mime_type" varchar(100) NOT NULL;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "file_size" integer NOT NULL;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "file_path" text NOT NULL;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "event_id" integer NOT NULL;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "uploaded_by" integer;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "guest_name" varchar(100);
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "guest_email" varchar(255);
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "is_approved" boolean DEFAULT true NOT NULL;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "uploaded_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint

-- Foreign keys for photos
DO $$ BEGIN
  ALTER TABLE "photos" ADD CONSTRAINT "photos_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
