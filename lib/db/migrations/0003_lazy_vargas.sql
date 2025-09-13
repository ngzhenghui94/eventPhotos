ALTER TABLE "event_messages" DROP CONSTRAINT "event_messages_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "event_messages" ADD CONSTRAINT "event_messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_messages_event_id_id_idx" ON "event_messages" USING btree ("event_id","id");