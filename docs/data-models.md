# Conventionals — Data Models

Schema defined in `conventionals/drizzle/schema.ts`. Database: PostgreSQL (Neon).

## Entity Relationship Overview

```
organizers (1) ──────── (N) events
events (1) ─────────── (N) attendees
attendees (1) ──────── (1) badges
attendee_accounts (1) ─ (N) connections
attendee_accounts ←──── attendees   (linked by email, no FK)
connections (N) ──────→ events      (nullable FK)
```

## Tables

### `organizers`
Organizer login accounts.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | serial | PK | |
| `name` | text | nullable | May be null for legacy rows |
| `email` | text | NOT NULL, UNIQUE | Normalized to lowercase |
| `password_hash` | text | NOT NULL | bcrypt cost=10 |
| `created_at` | timestamptz | DEFAULT NOW() | |

### `events`
Events created by organizers.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | serial | PK | |
| `organizer_id` | integer | NOT NULL, FK→organizers(id) ON DELETE CASCADE | |
| `name` | text | NOT NULL | |
| `event_date` | date | nullable | Optional; displayed as "TBD" if null |
| `created_at` | timestamptz | DEFAULT NOW() | |

### `attendees`
Per-event attendee registrations (created by organizers).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | serial | PK | |
| `event_id` | integer | NOT NULL, FK→events(id) ON DELETE CASCADE | |
| `name` | text | NOT NULL | |
| `email` | text | NOT NULL | Normalized to lowercase; **identity bridge** to `attendee_accounts` |
| `badge_type` | text | NOT NULL, DEFAULT 'General' | |
| `invite_token` | uuid | NOT NULL, DEFAULT random | Used for account creation invite link; nulled out on use via `invite_used_at` |
| `invite_used_at` | timestamptz | nullable | Set when account is created; prevents token reuse |
| `created_at` | timestamptz | DEFAULT NOW() | |

**Unique constraint**: `(event_id, email)` — one registration per email per event.

### `badges`
QR code badges, one per attendee registration.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | serial | PK | |
| `attendee_id` | integer | NOT NULL, FK→attendees(id) ON DELETE CASCADE | |
| `token` | text | NOT NULL, UNIQUE | `crypto.randomUUID()`, used in badge URL and QR |
| `email_sent` | boolean | DEFAULT false | Updated to true after SendGrid success |
| `checked_in` | boolean | DEFAULT false | |
| `checked_in_at` | timestamptz | nullable | Set on check-in |
| `created_at` | timestamptz | DEFAULT NOW() | |

### `attendee_accounts`
Cross-event attendee login accounts (self-created via invite link).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | serial | PK | |
| `email` | varchar(255) | NOT NULL, UNIQUE | Must match an `attendees.email` to link history |
| `password_hash` | varchar(255) | NOT NULL | bcrypt cost=12 |
| `name` | varchar(255) | NOT NULL | Seeded from `attendees.name` at signup |
| `company` | varchar(255) | nullable | Editable by attendee |
| `job_title` | varchar(255) | nullable | |
| `bio` | text | nullable | |
| `social_links` | jsonb | nullable | `{ linkedin?, twitter?, website? }` |
| `is_public` | boolean | NOT NULL, DEFAULT true | Controls visibility on people-browse pages |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | |

### `connections`
Attendee-saved connections (like a contact book).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | serial | PK | |
| `owner_id` | integer | NOT NULL, FK→attendee_accounts(id) ON DELETE CASCADE | The attendee who saved the connection |
| `connected_name` | varchar(255) | NOT NULL | Name of the person connected with |
| `contact_info` | jsonb | nullable | `{ email?, linkedin?, twitter?, website? }` |
| `notes` | text | nullable | Editable notes (user-facing textarea) |
| `event_id` | integer | nullable, FK→events(id) ON DELETE SET NULL | Which event the connection was made at |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | |
| `updated_at` | timestamptz | NOT NULL, DEFAULT NOW() | Manually updated on notes patch |

**Duplicate logic**: A connection is considered duplicate if `(owner_id, connected_name, event_id)` already exists. `event_id` NULL is handled via `isNull()` not `eq(..., null)`.

### `session`
Legacy iron-session storage table (present in schema from initial migration; not used by iron-session v8 which is cookie-based).

| Column | Type | Notes |
|---|---|---|
| `sid` | varchar | PK |
| `sess` | json | |
| `expire` | timestamp(6) | Indexed for expiry cleanup |

## Migrations

Located in `conventionals/drizzle/migrations/`:

| File | Contents |
|---|---|
| `0000_baseline.sql` | Initial tables: session, organizers, events, attendees, badges |
| `0001_clever_logan.sql` | invite_token, invite_used_at columns on attendees |
| `0002_previous_payback.sql` | Intermediate schema changes |
| `0003_ambitious_squirrel_girl.sql` | attendee_accounts table |
| `0004_misty_carnage.sql` | connections table |

Run migrations with `DIRECT_URL` set (non-pooled Neon connection):
```bash
cd conventionals && npx drizzle-kit migrate
```
