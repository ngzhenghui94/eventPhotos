
ALTER TABLE "events" ADD COLUMN "category" varchar(32) DEFAULT 'General' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_start" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_end" timestamp;--> statement-breakpoint