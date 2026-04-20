---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-04-03'
inputDocuments:
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/research/technical-nextjs-vercel-orm-research-2026-04-01.md'
workflowType: 'epics-and-stories'
project_name: 'Conventionals'
user_name: 'XdJos'
date: '2026-04-03'
---

# Conventionals - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Conventionals, decomposing requirements from the Architecture document and Project Context into implementable stories for the Next.js + Vercel migration.

---

## Requirements Inventory

### Functional Requirements

FR1: Organizer can self-register an account via `/register` page (name, email, password)
FR1b: Organizer can log in with email/password; session persists via HttpOnly cookie
FR2: Organizer can log out, destroying the session
FR3: Organizer can create a new event (name, date, description) scoped to their account
FR4: Organizer can view a list of their events on the dashboard
FR5: Organizer can delete an event (cascades to attendees and badges)
FR6: Organizer can upload a CSV file to bulk-add attendees to an event
FR7: Organizer can manually add a single attendee (name + email) to an event
FR8: System generates a unique UUID badge token and QR code image for each new attendee
FR9: System emails each new attendee their badge (QR code + badge URL) via SendGrid
FR10: Organizer can view per-event attendance statistics and an attendee table on the dashboard
FR11: Organizer can resend badge email to a specific attendee
FR12: Attendee or check-in staff can scan QR code to mark attendance (check-in endpoint, no auth required)
FR13: Public badge page is accessible by token URL — no authentication required
FR14: Badge email includes a separate one-time invite link for attendee account creation (distinct from badge token)
FR15: Attendee clicks invite link, sets a password, and creates a cross-event account (invite token single-use, valid indefinitely)
FR16: Attendee can log in and log out with email + password (separate auth path from organizer)
FR17: Attendee can edit their profile: name, company, job title, bio, social links
FR18: Attendee can toggle profile visibility: public (browseable and connectable) or private (manual connection only)
FR19: Attendee can view all events they have been invited to across their single cross-event account
FR20: Attendee can browse public attendees at any event they are part of
FR21: Attendee can connect with a public attendee (one-click) or manually add a private attendee as a connection
FR22: Each connection record stores name, contact info, and notes editable by the connection owner
FR23: Attendee can view, edit notes on, and manage their full connections list
FR24: A public marketing landing page at `/` introduces Conventionals to visitors with hero, features, how-it-works, and CTA sections
FR25: Visitors can navigate from the landing page to organizer registration, organizer login, or attendee login

### NonFunctional Requirements

NFR1: All organizer data reads and mutations must be scoped by session `organizerId` — ownership verified on every DB operation
NFR2: Email send failures are non-fatal — badge record persisted with `email_sent = false`; organizer can resend at any time
NFR3: Duplicate attendee email per event: silently skipped (CSV upload) or HTTP 409 returned (manual add)
NFR4: Double check-in scan returns `{ alreadyCheckedIn: true }` — not an error, not a state change
NFR5: File upload hard limit of 4MB (Vercel platform cap is 4.5MB — 4MB gives safety headroom)
NFR6: CSV upload + bulk email route must complete within 60 seconds (`export const maxDuration = 60`)
NFR7: Badge resend returns 404 (not 403) when organizer does not own the badge — prevents existence leaking
NFR8: Login must use timing-safe bcrypt comparison (dummy hash for missing users) to prevent user enumeration timing attacks
NFR9: All API error responses use shape `{ error: string }` — never expose internal error details
NFR10: Application must deploy and run on Vercel using Node.js runtime (no Edge Runtime)
NFR11: Attendee session uses iron-session with `attendeeAccountId` field — separate from organizer session (`organizerId`)
NFR12: Invite tokens are single-use — marked used on account creation; valid indefinitely until consumed
NFR13: Attendee profile visibility defaults to public on account creation; attendee can change at any time
NFR14: Connections are private to the attendee who created them — never visible to other users
NFR15: Attendee auth routes use the same timing-safe bcrypt dummy hash pattern as organizer auth

### Additional Requirements

From Architecture — technical requirements that directly shape implementation:

- AR1: Project initialized with `npx create-next-app@latest conventionals --typescript --eslint --app --turbopack --import-alias "@/*" --no-tailwind --no-src-dir`
- AR2: Drizzle schema introspected from existing Neon DB via `drizzle-kit pull` — not written from scratch
- AR3: Two DB connection strings required: `DATABASE_URL` (pooled, Neon/PgBouncer, runtime) and `DIRECT_URL` (direct, migrations only)
- AR4: Environment variable `APP_URL` renamed to `NEXT_PUBLIC_APP_URL` (badge URL must be client-visible)
- AR5: All Route Handler dynamic params must use `await params` before destructuring (Next.js 15 async request API)
- AR6: No route may use `export const runtime = 'edge'` — sendgrid/qrcode/csv-parse require Node.js
- AR7: All files in `data/` must begin with `import 'server-only'` — enforces DAL server boundary
- AR8: Session auth via `withAuth` HOF wrapping each protected Route Handler (replaces Express `requireAuth` middleware)
- AR9: Inline styles via `s`/`styles` objects preserved during migration — Tailwind deferred post-MVP
- AR10: `escapeHtml()` helper preserved and moved to `lib/email.ts`
- AR11: `bcryptjs` hashing logic preserved and moved to `data/auth.ts`
- AR12: All existing API response shapes preserved unchanged — no client-side changes required

From Project Context — patterns that must survive migration:

- AR13: CSV rows missing `name` or `email` silently skipped (added to `skipped` array), not errored
- AR14: Integer counts from PostgreSQL always `parseInt(value, 10)` before returning to client
- AR15: All user string inputs trimmed; emails normalized to lowercase before storage
- AR16: Ownership check always returns 404 (not 403) for badge resend — avoids leaking existence
- AR17: `lib/db.ts` Drizzle singleton must include global guard for dev hot-reload (`globalThis` pattern)

New tables required (architecture update):
- AR18: New table `attendee_accounts` — id, email, password_hash, name, company, job_title, bio, social_links (JSONB), is_public (default true), invite_token, invite_used_at, created_at
- AR19: `attendees` rows link to `attendee_accounts` via email match after account creation
- AR20: New table `connections` — id, owner_id (attendee_account_id FK), connected_name, contact_info (JSONB), notes (text), event_id (nullable FK), created_at, updated_at
- AR21: New `withAttendeeAuth` HOF in `lib/session.ts` for attendee-protected routes (checks `session.attendeeAccountId`)

### UX Design Requirements

No formal UX design document exists. UI/UX improvements are in scope for this migration, but **all design changes must be presented to the user for approval before implementation**. Agents must never apply visual or interaction changes silently.

The existing design baseline to reference and potentially improve upon:
- Inline styles via `s`/`styles` objects per component (no CSS files, no UI library)
- Primary brand color: `#4f46e5` (indigo); success green: `#15803d`; error red: `#b91c1c`
- Pages: Login, Dashboard, Upload (CSV + manual attendee), public Badge page
- No responsive/mobile design currently exists

UX-DR1: Any proposed visual changes (layout, color, spacing, typography) must be described and approved by the organizer before being included in a story's acceptance criteria
UX-DR2: Any proposed interaction improvements (loading states, error messaging, empty states, form feedback) must be described and approved before implementation
UX-DR3: Tailwind CSS adoption (post-MVP) must be explicitly requested — do not add it during migration stories

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Organizer self-registration |
| FR1b | Epic 1 | Login with timing-safe auth |
| FR2 | Epic 1 | Logout / session destroy |
| FR24 | Epic 1 | Public marketing landing page |
| FR25 | Epic 1 | Landing page navigation to auth pages |
| FR3 | Epic 2 | Create event |
| FR4 | Epic 2 | List events on dashboard |
| FR5 | Epic 2 | Delete event (cascade) |
| FR6 | Epic 3 | CSV bulk attendee upload |
| FR7 | Epic 3 | Manual single attendee add |
| FR8 | Epic 3 | UUID token + QR code generation |
| FR9 | Epic 3 | Badge email via SendGrid |
| FR10 | Epic 4 | Dashboard attendance stats |
| FR11 | Epic 4 | Resend badge email |
| FR12 | Epic 4 | QR scan check-in (idempotent) |
| FR13 | Epic 4 | Public badge page (token-based) |
| FR14 | Epic 5 | Invite link included in badge email |
| FR15 | Epic 5 | Account creation via invite link |
| FR16 | Epic 5 | Attendee login / logout |
| FR17 | Epic 5 | Profile editing (name, company, job title, bio, social links) |
| FR18 | Epic 5 | Profile visibility toggle (public/private) |
| FR19 | Epic 6 | Attendee event history |
| FR20 | Epic 6 | Browse public attendees at an event |
| FR21 | Epic 6 | Connect with attendee (public one-click or manual) |
| FR22 | Epic 6 | Connection record: name, contact info, notes |
| FR23 | Epic 6 | View and manage connections list |

---

## Epic List

### Epic 1: Working Application — Auth & Infrastructure
Organizers can log in to a live Next.js app deployed on Vercel, connected to the existing database, and log out. Covers full project bootstrap: create-next-app, Drizzle schema introspection, Neon connection, iron-session, withAuth HOF, DAL foundation, login/logout pages and API routes.
**FRs covered:** FR1, FR2
**ARs covered:** AR1–AR17
**NFRs covered:** NFR1, NFR8, NFR9, NFR10

### Epic 2: Event Management
Organizers can create events, view their full event list on the dashboard, and delete events. Covers dashboard page (Server Component), event CRUD route handlers, and data/events.ts DAL.
**FRs covered:** FR3, FR4, FR5
**NFRs covered:** NFR1

### Epic 3: Attendee Registration & Badge Delivery
Organizers can upload a CSV or manually add attendees — the system generates QR-coded badges, emails them, and the upload page is fully functional. Covers upload page, attendees route handler, data/badges.ts DAL, lib/qr.ts, lib/email.ts, and all idempotency/non-fatal-email logic.
**FRs covered:** FR6, FR7, FR8, FR9
**NFRs covered:** NFR2, NFR3, NFR5, NFR6, NFR9

### Epic 4: Check-in, Resend & Attendance Tracking
Staff can check in attendees via QR, organizers can view attendance stats and resend badges, and attendees can access their public badge page. Covers check-in and resend route handlers, getDashboardStats() DAL, dashboard stats Client Component, and public badge page.
**FRs covered:** FR10, FR11, FR12, FR13
**NFRs covered:** NFR4, NFR7

### Epic 5: Attendee Accounts & Profiles
Attendees can create an account from their badge invite link, log in, and manage their profile and visibility. Covers invite token generation, account creation flow, attendee auth HOF, profile editing, and public/private toggle. New DB tables: `attendee_accounts`.
**FRs covered:** FR14, FR15, FR16, FR17, FR18
**NFRs covered:** NFR11, NFR12, NFR13, NFR15
**ARs covered:** AR18, AR19, AR21

### Epic 6: Event History & Connections
Attendees can view their event history, browse public attendees, connect with others, and manage a personal connections list with editable notes. New DB table: `connections`.
**FRs covered:** FR19, FR20, FR21, FR22, FR23
**NFRs covered:** NFR14

---

## Epic 1: Working Application — Auth & Infrastructure

Organizers can log in to a live Next.js app deployed on Vercel, connected to the existing database, and log out.

### Story 1.1: Project Initialization & Vercel Deployment

As an **organizer**,
I want the Conventionals app to exist as a Next.js application deployed on Vercel,
So that I have a live URL I can navigate to.

**Acceptance Criteria:**

**Given** the project does not yet exist as a Next.js app
**When** the developer runs the documented init command and pushes to Git
**Then** a Next.js 15 app with TypeScript, ESLint, App Router, Turbopack, and `@/*` alias is created (no Tailwind, no `src/`)
**And** the app is connected to Vercel via Git integration and deploys automatically on push
**And** all required environment variables are configured in Vercel Dashboard: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`
**And** visiting the root URL redirects to `/login`

---

### Story 1.2: Database Connection & Schema

As a **developer**,
I want the app connected to the existing Neon database with Drizzle ORM,
So that all subsequent stories can query the database without additional setup.

**Acceptance Criteria:**

**Given** `DATABASE_URL` and `DIRECT_URL` are set in the environment
**When** `npx drizzle-kit pull` is run against the existing Neon DB
**Then** `drizzle/schema.ts` contains table definitions for `session`, `organizers`, `events`, `attendees`, and `badges`
**And** `lib/db.ts` exports a single Drizzle client singleton using the `globalThis` hot-reload guard pattern
**And** `drizzle.config.ts` points to `DIRECT_URL` for migrations and `./drizzle/schema.ts` for schema
**And** a baseline migration file exists at `drizzle/migrations/0000_baseline.sql`

---

### Story 1.3: Session Configuration & Auth HOF

As a **developer**,
I want a reusable `withAuth` higher-order function and session config,
So that all protected Route Handlers can verify the organizer's session with a single wrapper.

**Acceptance Criteria:**

**Given** `SESSION_SECRET` is set in the environment
**When** `withAuth` wraps a Route Handler
**Then** requests with a valid iron-session cookie have `session.organizerId` injected into the handler context
**And** requests without a valid session receive `{ error: 'Unauthorized' }` with HTTP 401
**And** `lib/session.ts` exports `sessionOptions`, `withAuth`, and the `SessionData` TypeScript type
**And** session cookie is `httpOnly: true`, `secure: true` in production, with 8-hour max age

---

### Story 1.4: Organizer Login

As an **organizer**,
I want to log in with my email and password,
So that I can access the protected dashboard.

**Acceptance Criteria:**

**Given** I am on the `/login` page
**When** I submit valid credentials
**Then** `POST /api/auth/login` verifies the password with `bcryptjs` and sets an iron-session cookie
**And** I am redirected to `/dashboard`
**When** I submit invalid credentials
**Then** I receive a generic error message — no indication of whether email or password was wrong
**And** the timing-safe dummy hash pattern is used when the organizer email is not found (prevents user enumeration)
**And** the login page is a Server Component that redirects to `/dashboard` if a session already exists

---

### Story 1.5: Organizer Logout & Protected Dashboard Shell

As an **organizer**,
I want to log out and have the dashboard protected from unauthenticated access,
So that my account is secure and only I can view my data.

**Acceptance Criteria:**

**Given** I am logged in and on `/dashboard`
**When** I click logout
**Then** `POST /api/auth/logout` destroys the session cookie
**And** I am redirected to `/login`
**Given** I visit `/dashboard` without a session
**When** the page loads
**Then** I am redirected to `/login`
**And** the dashboard page renders a shell (heading, empty event list placeholder) when authenticated — full content comes in Epic 2
**And** `GET /api/auth/me` returns `{ organizerId }` for the current session (used by Client Components)

---

### Story 1.6: Organizer Registration

As a **new organizer**,
I want to create an account with my name, email, and password,
So that I can start managing events on Conventionals without needing manual setup.

**Acceptance Criteria:**

**Given** I am on `/register`
**When** I submit a valid name, email, and password
**Then** `POST /api/auth/register` hashes the password with `bcryptjs` and inserts a new row into `organizers`
**And** I am automatically logged in (session cookie set with `organizerId`) and redirected to `/dashboard`
**When** I submit an email that is already registered
**Then** I receive a generic error — "An account with this email already exists"
**And** the email check uses timing-safe pattern (no user enumeration via response time)
**When** I visit `/register` while already logged in
**Then** I am redirected to `/dashboard`
**And** `data/auth.ts` exports `createOrganizer(name, email, passwordHash)`
**And** all inputs are trimmed; email is normalized to lowercase before storage

---

### Story 1.7: Marketing Landing Page

As a **visitor**,
I want to see a professional landing page when I visit Conventionals,
So that I understand what the platform does and can sign up or log in.

**Acceptance Criteria:**

**Given** I visit `/`
**When** the page loads
**Then** I see a full marketing landing page — not a redirect — with the following sections in order:
  1. Sticky navigation bar: Conventionals logo (indigo), nav links (Features, How It Works, For Attendees), "Attendee Login" outlined button, "Organizer Login" filled indigo button
  2. Hero section: indigo gradient background, headline "Run Better Events. Build Lasting Connections.", subheadline, "Get Started →" CTA linking to `/register`, secondary "Organizer Login" link
  3. Features grid (3×2): six feature cards using `lucide-react` icons (Ticket, Upload, ScanLine, LayoutDashboard, Users, ShieldCheck) with title and one-line description each
  4. How It Works: three numbered steps (indigo circle indicators) — Create event → Add attendees → Check in & connect
  5. CTA banner: indigo gradient, "Ready to run your next convention?" with "Create Your First Event →" button linking to `/register`
  6. Footer: logo + tagline, navigation links, Organizer Login + Attendee Login links
**And** the page uses indigo (`#4f46e5`) as the primary brand color with inline styles (no Tailwind)
**And** `lucide-react` is installed as a dependency
**And** the page is a Server Component (no `'use client'` needed — no interactivity)
**And** "Get Started" and "Create Your First Event" both link to `/register`
**And** "Attendee Login" links to `/attendee/login`
**And** "Organizer Login" links to `/login`

---

## Epic 2: Event Management

Organizers can create events, view their full event list on the dashboard, and delete events.

### Story 2.1: Event List on Dashboard

As an **organizer**,
I want to see all my events listed on the dashboard,
So that I know what events I've created.

**Acceptance Criteria:**

**Given** I am logged in and on `/dashboard`
**When** the page loads
**Then** `GET /api/events` returns only events where `organizer_id` matches my session
**And** the dashboard Server Component fetches and renders the event list
**And** `data/events.ts` exports `getEvents(organizerId)` with `import 'server-only'`
**And** when no events exist, an empty state message is shown (e.g. "No events yet")

---

### Story 2.2: Create Event

As an **organizer**,
I want to create a new event with a name and date,
So that I can start managing attendees for it.

**Acceptance Criteria:**

**Given** I am on the dashboard
**When** I submit the create event form with a name and date
**Then** `POST /api/events` inserts a new event with `organizer_id` set to my session's `organizerId`
**And** the new event appears in my event list
**And** submitting with missing required fields returns `{ error: string }` with HTTP 400
**And** `data/events.ts` exports `createEvent(organizerId, name, date)`

---

### Story 2.3: Delete Event

As an **organizer**,
I want to delete an event,
So that I can remove events I no longer need.

**Acceptance Criteria:**

**Given** I own an event and click delete
**When** the delete is confirmed
**Then** `DELETE /api/events/[id]` verifies ownership (`organizer_id = session.organizerId`) before deleting
**And** the event and all its attendees and badges are removed (cascade enforced by DB schema)
**And** attempting to delete an event I don't own returns HTTP 404
**And** the event disappears from my dashboard list after deletion
**And** `data/events.ts` exports `deleteEvent(eventId, organizerId)`

---

## Epic 3: Attendee Registration & Badge Delivery

Organizers can add attendees (CSV + manual), system generates QR-coded badges, emails them with an account invite link.

### Story 3.1: Upload Page & Navigation

As an **organizer**,
I want to navigate to an upload page for a specific event,
So that I have a dedicated place to manage attendees.

**Acceptance Criteria:**

**Given** I am on the dashboard and have at least one event
**When** I click the manage/upload link for an event
**Then** I am taken to `/event/[id]/upload`
**And** the upload page Server Component verifies my session and confirms I own the event (HTTP 404 if not)
**And** the page renders with the event name and an `UploadForm` Client Component shell
**And** `await params` is used before destructuring `id` from the route params

---

### Story 3.2: Manual Attendee Add

As an **organizer**,
I want to manually add a single attendee by name and email,
So that I can register individuals who aren't in a CSV.

**Acceptance Criteria:**

**Given** I am on the upload page for an event I own
**When** I submit the manual add form with a valid name and email
**Then** `POST /api/events/[id]/attendees` (JSON body) inserts the attendee and a badge record with a `crypto.randomUUID()` badge token and a separate `crypto.randomUUID()` invite token
**And** the invite token is stored on the `attendees` row (`invite_token`, `invite_used_at` columns added via Drizzle migration)
**And** the attendee appears in the attendee list on the page
**And** submitting a duplicate email for the same event returns HTTP 409 with `{ error: 'Attendee already registered' }`
**And** `data/badges.ts` exports `createAttendeeAndBadge(organizerId, eventId, name, email)` with `import 'server-only'`
**And** name and email are trimmed; email is normalized to lowercase before storage

---

### Story 3.3: QR Code Generation

As an **organizer**,
I want each badge to include a QR code image,
So that attendees can be checked in by scanning their badge.

**Acceptance Criteria:**

**Given** a new attendee is being added
**When** `createAttendeeAndBadge` runs
**Then** `lib/qr.ts: generateQR(badgeUrl)` produces a base64 PNG data URL from `NEXT_PUBLIC_APP_URL/badge/[token]`
**And** the QR data URL is available for inclusion in the badge email
**And** `lib/qr.ts` uses the `qrcode` package with Node.js runtime only (never edge)

---

### Story 3.4: Badge Email with Invite Link

As an **attendee**,
I want to receive an email with my badge, QR code, and an invite link to create my account,
So that I have everything I need to check in and optionally set up my Conventionals profile.

**Acceptance Criteria:**

**Given** a new attendee and badge have been created
**When** `sendBadgeEmail` is called
**Then** the attendee receives an HTML email via SendGrid containing their name, QR code image, badge URL, and a separate account setup link (`NEXT_PUBLIC_APP_URL/attendee/signup?token=[invite_token]`)
**And** all user-supplied strings (name) are escaped with `escapeHtml()` before interpolation into email HTML
**And** `badgeUrl`, `qrDataUrl`, and `inviteUrl` are internally generated — safe to interpolate directly
**And** if email send fails, badge record is persisted with `email_sent = false` — attendee and badge rows are never rolled back
**And** if email succeeds, `email_sent` is updated to `true`
**And** `lib/email.ts` exports `sendBadgeEmail()` and `escapeHtml()`

---

### Story 3.5: CSV Bulk Upload

As an **organizer**,
I want to upload a CSV file to register multiple attendees at once,
So that I can quickly onboard a large group without manual entry.

**Acceptance Criteria:**

**Given** I am on the upload page for an event I own
**When** I submit a CSV file with `name` and `email` columns (case-insensitive headers)
**Then** `POST /api/events/[id]/attendees` receives the file via `request.formData()` and parses it with `csv-parse/sync`
**And** each valid row runs `createAttendeeAndBadge` — creating attendee, badge, invite token, QR code, and email (non-fatal)
**And** rows missing `name` or `email` are silently added to a `skipped` array
**And** duplicate emails for the event are silently skipped (`ON CONFLICT DO NOTHING`)
**And** the response includes `{ added, skipped }`
**And** files larger than 4MB are rejected with HTTP 413
**And** the route exports `export const maxDuration = 60`

---

## Epic 4: Check-in, Resend & Attendance Tracking

Staff can check in attendees via QR, organizers view stats and resend badges, attendees access their public badge page.

### Story 4.1: Public Badge Page

As an **attendee**,
I want to access my badge by navigating to my badge URL,
So that I can show it for check-in or share it.

**Acceptance Criteria:**

**Given** a badge token exists
**When** anyone visits `NEXT_PUBLIC_APP_URL/badge/[token]`
**Then** the page renders the attendee's name, event name, and QR code — no authentication required
**And** `GET /api/badges/[token]` returns the badge data (attendee name, event name, token)
**And** visiting a non-existent token returns HTTP 404
**And** `data/badges.ts` exports `getBadgeByToken(token)`

---

### Story 4.2: QR Scan Check-in

As **check-in staff**,
I want to scan an attendee's QR code to mark them as checked in,
So that attendance is tracked in real time.

**Acceptance Criteria:**

**Given** an attendee has not yet checked in
**When** their QR code is scanned and `POST /api/badges/[token]/checkin` is called
**Then** the badge record is updated with `checked_in_at` timestamp and the response returns `{ checkedIn: true }`
**Given** the attendee has already checked in
**When** the same QR code is scanned again
**Then** the endpoint returns `{ alreadyCheckedIn: true }` — no state change, no error
**And** the check-in endpoint requires no authentication
**And** `data/badges.ts` exports `checkinBadge(token)`

---

### Story 4.3: Badge Email Resend

As an **organizer**,
I want to resend a badge email to a specific attendee,
So that attendees who didn't receive or lost their email can get it again.

**Acceptance Criteria:**

**Given** I am logged in and viewing the attendee table for my event
**When** I click resend for an attendee
**Then** `POST /api/badges/[token]/resend` regenerates and resends the badge email including the invite link
**And** ownership is verified: the badge must belong to an event owned by my `organizerId` — returns HTTP 404 if not (not 403)
**And** on success, `email_sent` is updated to `true`
**And** `data/badges.ts` exports `resendBadge(token, organizerId)`

---

### Story 4.4: Dashboard Attendance Stats

As an **organizer**,
I want to see attendance statistics for each event on my dashboard,
So that I can track how many attendees have checked in.

**Acceptance Criteria:**

**Given** I am on the dashboard
**When** the page loads
**Then** each event shows total attendees, checked-in count, and emails sent count
**And** `data/badges.ts` exports `getDashboardStats(organizerId)` returning per-event stats
**And** PostgreSQL COUNT values are coerced with `parseInt(value, 10)` before returning to the client
**And** the attendee table shows each attendee's name, email, check-in status, email status, and a resend button

---

## Epic 5: Attendee Accounts & Profiles

Attendees can create an account from their invite link, log in, edit their profile, and control their visibility.

### Story 5.1: Attendee Account Schema & withAttendeeAuth HOF

As a **developer**,
I want the `attendee_accounts` table and attendee auth HOF in place,
So that all subsequent attendee stories have a foundation to build on.

**Acceptance Criteria:**

**Given** the Drizzle migration runs successfully
**When** the schema is applied
**Then** an `attendee_accounts` table exists with: `id`, `email`, `password_hash`, `name`, `company`, `job_title`, `bio`, `social_links` (JSONB), `is_public` (boolean, default `true`), `created_at`
**And** `lib/session.ts` exports `withAttendeeAuth` HOF — checks `session.attendeeAccountId`, returns HTTP 401 if missing
**And** `SessionData` type is updated to include optional `attendeeAccountId: number`
**And** `data/attendees.ts` is created with `import 'server-only'` for all attendee account DAL functions

---

### Story 5.2: Account Creation via Invite Link

As an **attendee**,
I want to click my invite link and set a password to create my account,
So that I can access my Conventionals profile.

**Acceptance Criteria:**

**Given** I receive a badge email with an invite link (`/attendee/signup?token=[invite_token]`)
**When** I visit the link with a valid, unused token
**Then** I see an account setup page pre-filled with my name and email (read from the `attendees` row)
**When** I submit a password
**Then** `POST /api/attendee/auth/signup` creates an `attendee_accounts` row with a bcrypt-hashed password
**And** the `attendees` row `invite_used_at` is set to the current timestamp (token consumed)
**And** I am redirected to `/attendee/dashboard`
**When** I visit an already-used or non-existent invite token
**Then** I see an error: "This invite link has already been used or is invalid"

---

### Story 5.3: Attendee Login & Logout

As an **attendee**,
I want to log in and out of my account,
So that I can access my profile securely from any device.

**Acceptance Criteria:**

**Given** I am on `/attendee/login`
**When** I submit valid email and password
**Then** `POST /api/attendee/auth/login` verifies with `bcryptjs`, sets `session.attendeeAccountId`, and redirects to `/attendee/dashboard`
**When** I submit invalid credentials
**Then** I receive a generic error — no indication of which field was wrong
**And** the timing-safe dummy hash pattern is used when the email is not found (NFR15)
**When** I click logout
**Then** `POST /api/attendee/auth/logout` clears `session.attendeeAccountId` and redirects to `/attendee/login`
**And** `/attendee/login` redirects to `/attendee/dashboard` if already authenticated

---

### Story 5.4: Profile Editing

As an **attendee**,
I want to edit my profile information,
So that other attendees can learn about me and I can keep my details current.

**Acceptance Criteria:**

**Given** I am logged in and on `/attendee/profile`
**When** I update any profile field (name, company, job title, bio, social links) and save
**Then** `PATCH /api/attendee/profile` updates my `attendee_accounts` row
**And** all fields are trimmed before storage
**And** `social_links` is stored as JSONB (e.g. `{ linkedin, twitter, website }`)
**And** the form reflects my current saved values on load
**And** `data/attendees.ts` exports `updateProfile(attendeeAccountId, fields)`

---

### Story 5.5: Profile Visibility Toggle

As an **attendee**,
I want to control whether my profile is publicly visible,
So that I can choose whether other attendees can find and connect with me.

**Acceptance Criteria:**

**Given** I am on my profile page
**When** I toggle my visibility to private
**Then** `PATCH /api/attendee/profile` sets `is_public = false` on my `attendee_accounts` row
**And** my profile no longer appears in attendee browse lists for other attendees
**And** other attendees can still manually add me as a connection (without seeing my profile)
**When** I toggle back to public
**Then** my profile appears in browse lists again
**And** new accounts default to `is_public = true` (NFR13)

---

## Epic 6: Event History & Connections

Attendees can view their event history, browse public attendees, connect with others, and manage a personal connections list with editable notes.

### Story 6.1: Attendee Dashboard & Event History

As an **attendee**,
I want to see all the events I've been invited to,
So that I have a record of every convention I've attended.

**Acceptance Criteria:**

**Given** I am logged in as an attendee and on `/attendee/dashboard`
**When** the page loads
**Then** all events where an `attendees` row exists with my email are listed (matched via `attendee_accounts.email`)
**And** each event shows the event name, date, and organizer
**And** events are sorted by date descending (most recent first)
**And** `data/attendees.ts` exports `getEventHistory(attendeeAccountId)` joining `attendees` → `events` by email match

---

### Story 6.2: Browse Public Attendees at an Event

As an **attendee**,
I want to browse other public attendees at an event I attended,
So that I can discover people I might want to connect with.

**Acceptance Criteria:**

**Given** I am logged in and viewing an event from my history
**When** I visit `/attendee/event/[id]/people`
**Then** I see a list of attendees at that event whose `attendee_accounts.is_public = true`
**And** each public profile shows name, company, job title, bio, and social links
**And** my own profile is excluded from the list
**And** the page verifies I have an `attendees` row for this event — returns HTTP 404 if I was not invited
**And** `data/attendees.ts` exports `getPublicAttendeesForEvent(eventId, myAttendeeAccountId)`

---

### Story 6.3: Connect with an Attendee

As an **attendee**,
I want to connect with another attendee,
So that I can keep track of people I met at an event.

**Acceptance Criteria:**

**Given** I am browsing public attendees at an event
**When** I click "Connect" on a public attendee's profile
**Then** `POST /api/attendee/connections` creates a connection record pre-filled with their name, contact info (email), and the event context
**And** a connection is also created when I manually enter a name and contact info without selecting from the browse list (for private accounts)
**And** the same attendee cannot be connected with twice for the same event — returns HTTP 409 if duplicate
**And** a Drizzle migration creates the `connections` table: `id`, `owner_id` (FK → attendee_accounts), `connected_name`, `contact_info` (JSONB), `notes` (text), `event_id` (nullable FK → events), `created_at`, `updated_at`
**And** `data/connections.ts` exports `createConnection(ownerAccountId, fields)` with `import 'server-only'`
**And** connections are private — never visible to anyone other than the owner (NFR14)

---

### Story 6.4: Connections List & Notes

As an **attendee**,
I want to view all my connections and edit notes on each one,
So that I can remember details about people I met and prepare for outreach.

**Acceptance Criteria:**

**Given** I am logged in and on `/attendee/connections`
**When** the page loads
**Then** all my connections are listed with name, contact info, event context, and any saved notes
**And** connections are sorted by most recently created or updated
**When** I edit the notes field on a connection and save
**Then** `PATCH /api/attendee/connections/[id]` updates the `notes` field for that connection
**And** only the connection owner can view or edit their connections — `owner_id` verified on every read/write
**And** `data/connections.ts` exports `getConnections(ownerAccountId)` and `updateConnectionNotes(connectionId, ownerAccountId, notes)`
