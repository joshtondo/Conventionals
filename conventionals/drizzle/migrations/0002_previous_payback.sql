ALTER TABLE "attendees" ADD COLUMN "invite_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "invite_used_at" timestamp with time zone;