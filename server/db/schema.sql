-- Conventials Database Schema
-- Run: psql $DATABASE_URL -f server/db/schema.sql

-- Session store (required by connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default",
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);

-- Organizers (admin users)
CREATE TABLE IF NOT EXISTS organizers (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  organizer_id INTEGER NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  event_date  DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Attendees
CREATE TABLE IF NOT EXISTS attendees (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  badge_type TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, email)
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id          SERIAL PRIMARY KEY,
  attendee_id INTEGER NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  email_sent  BOOLEAN DEFAULT FALSE,
  checked_in  BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: Admin organizer and default event are seeded at server startup (server/index.js).
-- Do not add data seeds here — the organizers table will be empty when this schema is applied.
