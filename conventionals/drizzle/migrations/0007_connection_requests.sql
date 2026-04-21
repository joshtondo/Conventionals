CREATE TABLE "connection_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_account_id" integer NOT NULL,
	"to_account_id" integer NOT NULL,
	"event_id" integer,
	"status" text NOT NULL DEFAULT 'pending',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	CONSTRAINT "connection_requests_from_to_key" UNIQUE("from_account_id","to_account_id")
);

ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_from_account_id_fk"
  FOREIGN KEY ("from_account_id") REFERENCES "attendee_accounts"("id") ON DELETE cascade;
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_to_account_id_fk"
  FOREIGN KEY ("to_account_id") REFERENCES "attendee_accounts"("id") ON DELETE cascade;
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_event_id_fk"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE set null;
