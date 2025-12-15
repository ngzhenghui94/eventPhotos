-- Allow events.date to be optional (Create Event can omit date)
ALTER TABLE "events" ALTER COLUMN "date" DROP NOT NULL;


