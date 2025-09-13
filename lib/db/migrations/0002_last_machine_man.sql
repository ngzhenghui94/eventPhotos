CREATE TABLE "event_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"sender_user_id" integer,
	"guest_name" varchar(100),
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "event_messages" ADD CONSTRAINT "event_messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_messages" ADD CONSTRAINT "event_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;