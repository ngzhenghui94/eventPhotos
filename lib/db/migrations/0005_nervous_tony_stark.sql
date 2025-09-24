CREATE TABLE IF NOT EXISTS "event_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='quiz_participants') THEN
		EXECUTE 'ALTER TABLE "quiz_participants" DISABLE ROW LEVEL SECURITY';
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='quiz_questions') THEN
		EXECUTE 'ALTER TABLE "quiz_questions" DISABLE ROW LEVEL SECURITY';
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='quiz_responses') THEN
		EXECUTE 'ALTER TABLE "quiz_responses" DISABLE ROW LEVEL SECURITY';
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='quiz_sessions') THEN
		EXECUTE 'ALTER TABLE "quiz_sessions" DISABLE ROW LEVEL SECURITY';
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='quizzes') THEN
		EXECUTE 'ALTER TABLE "quizzes" DISABLE ROW LEVEL SECURITY';
	END IF;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "quiz_participants" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "quiz_questions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "quiz_responses" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "quiz_sessions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "quizzes" CASCADE;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "event_id" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "chat_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "slideshow_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "timeline_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event_members" ADD CONSTRAINT "event_members_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event_members" ADD CONSTRAINT "event_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure unique membership index exists
CREATE UNIQUE INDEX IF NOT EXISTS "event_members_event_user_uidx" ON "event_members" ("event_id", "user_id");

-- Backfill host membership for existing events
INSERT INTO "event_members" (event_id, user_id, role)
SELECT e.id, e.created_by, 'host'
FROM events e
ON CONFLICT DO NOTHING;