CREATE TABLE "event_organizers" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"invited_email" text NOT NULL,
	"organizer_id" integer,
	"invited_by_id" integer NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "event_organizers_token_key" UNIQUE("token"),
	CONSTRAINT "event_organizers_event_email_key" UNIQUE("event_id","invited_email")
);
--> statement-breakpoint
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_invited_by_id_organizers_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;
