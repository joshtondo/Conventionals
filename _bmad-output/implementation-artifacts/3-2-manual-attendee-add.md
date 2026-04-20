# Story 3.2: Manual Attendee Add

Status: review

## Story

As an **organizer**,
I want to manually add a single attendee by name and email,
So that I can register individuals who aren't in a CSV.

## Acceptance Criteria

**Given** I am on the upload page for an event I own
**When** I submit the manual add form with a valid name and email
**Then** `POST /api/events/[id]/attendees` (JSON body) inserts the attendee and a badge record with a `crypto.randomUUID()` badge token and a separate `crypto.randomUUID()` invite token
**And** the invite token is stored on the `attendees` row (`invite_token`, `invite_used_at` columns added via Drizzle migration)
**And** the attendee appears in the attendee list on the page
**And** submitting a duplicate email for the same event returns HTTP 409 with `{ error: 'Attendee already registered' }`
**And** `data/badges.ts` exports `createAttendeeAndBadge(organizerId, eventId, name, email)` with `import 'server-only'`
**And** name and email are trimmed; email is normalized to lowercase before storage

## Tasks / Subtasks

- [x] Task 1: Add `invite_token` and `invite_used_at` columns to `attendees` via Drizzle migration (AC: invite token stored on attendee row)
  - [x] Edit `conventionals/drizzle/schema.ts` — add to `attendees` table:
    - `inviteToken: uuid('invite_token').notNull().defaultRandom()`
    - `inviteUsedAt: timestamp('invite_used_at', { withTimezone: true, mode: 'string' })`
  - [x] Run `npx drizzle-kit generate` from `conventionals/` to generate migration file
  - [x] Commit the generated migration file (do NOT edit it by hand)
  - [x] Run `npx drizzle-kit migrate` — SKIPPED: `DIRECT_URL` not set in `.env.local` (see Dev Agent Record)

- [x] Task 2: Create `data/badges.ts` — `createAttendeeAndBadge` and `getAttendees` (AC: DAL functions)
  - [x] Create `conventionals/data/badges.ts`
  - [x] Begin with `import 'server-only'`
  - [x] Import `db` from `@/lib/db`, `attendees`, `badges` from `@/drizzle/schema`, `eq`, `and` from `drizzle-orm`
  - [x] Implement `createAttendeeAndBadge(organizerId: number, eventId: number, name: string, email: string)`
  - [x] Implement `getAttendees(eventId: number, organizerId: number)`

- [x] Task 3: Create `app/api/events/[id]/attendees/route.ts` — `POST` handler (AC: `POST /api/events/[id]/attendees`)
  - [x] Create directory `conventionals/app/api/events/[id]/attendees/` and file `route.ts`
  - [x] Use `withAuth` HOF
  - [x] `await ctx.params` before destructuring `id` (Next.js 15)
  - [x] Parse `eventId = parseInt(id, 10)` — return 400 if `isNaN`
  - [x] Verify organizer owns event: call `getEventById(eventId, session.organizerId!)` — return 404 if null
  - [x] Parse JSON body, validate name + email
  - [x] Call `createAttendeeAndBadge`, catch PG `23505` → 409
  - [x] Return 201 with `{ attendee, badge }`
  - [x] No `export const runtime = 'edge'`

- [x] Task 4: Update `app/event/[id]/upload/page.tsx` — fetch and pass attendee list (AC: attendee appears in list)
  - [x] Import `getAttendees` from `@/data/badges`
  - [x] After ownership check, call `const attendeeList = await getAttendees(eventId, session.organizerId)`
  - [x] Pass `attendees={attendeeList}` prop to `<UploadForm>`

- [x] Task 5: Update `app/event/[id]/upload/UploadForm.tsx` — manual add form + attendee list (AC: form UI + list)
  - [x] **⚠️ UX Approval Required** — confirmed by user
  - [x] Accept updated props: `eventId: number`, `eventName: string`, `attendees: AttendeeRow[]`
  - [x] Add form state: `name`, `email`, `error`, `submitting`
  - [x] On submit: `POST /api/events/${eventId}/attendees` with `{ name, email }`, clear form on success, `router.refresh()`
  - [x] On 409: show "Attendee already registered" error
  - [x] Render attendee table below form (name, email, badge token truncated)
  - [x] Removed placeholder "Attendee management coming soon." text

- [x] Task 6: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### ⚠️ UX Approval Required — Manual Add Form + Attendee List Design

Proposed layout for `UploadForm`:

```
← Back to Dashboard

Annual Tech Summit
──────────────────────────────────────

Add Attendee
  Name *    [_________________________]
  Email *   [_________________________]
            [  Add Attendee  ]
  [error if any]

──────────────────────────────────────
Attendees (3)

  Name            Email                  Badge Token    Checked In
  ─────────────────────────────────────────────────────────────────
  Alice Johnson   alice@example.com      abc123…        No
  Bob Smith       bob@example.com        def456…        No
```

- Form: white card with border (matches dashboard create-event form style)
- "Add Attendee" button: indigo filled
- Attendee table: simple, no borders on cells, alternating row style optional
- Badge token: show first 8 chars + "…"
- Empty state: "No attendees yet." paragraph

**Do NOT implement Task 5 without user confirming the above design.**

### Schema Migration — `attendees` Table

Add to `conventionals/drizzle/schema.ts` inside the `attendees` table definition:

```typescript
inviteToken: uuid('invite_token').notNull().defaultRandom(),
inviteUsedAt: timestamp('invite_used_at', { withTimezone: true, mode: 'string' }),
```

Full updated `attendees` table:
```typescript
export const attendees = pgTable("attendees", {
  id: serial().primaryKey().notNull(),
  eventId: integer("event_id").notNull(),
  name: text().notNull(),
  email: text().notNull(),
  badgeType: text("badge_type").default('General').notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  inviteToken: uuid('invite_token').notNull().defaultRandom(),
  inviteUsedAt: timestamp('invite_used_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
  foreignKey({
    columns: [table.eventId],
    foreignColumns: [events.id],
    name: "attendees_event_id_fkey"
  }).onDelete("cascade"),
  unique("attendees_event_id_email_key").on(table.eventId, table.email),
]);
```

**Migration workflow:**
```bash
cd conventionals
npx drizzle-kit generate   # generates migration file in drizzle/migrations/
npx drizzle-kit migrate    # requires DIRECT_URL in .env.local
```

If `DIRECT_URL` is not available locally: generate only, document in Dev Agent Record, migration must be run before deploying.

### `data/badges.ts` — Full Implementation

```typescript
import 'server-only'
import { db } from '@/lib/db'
import { attendees, badges, events } from '@/drizzle/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function createAttendeeAndBadge(
  organizerId: number,
  eventId: number,
  name: string,
  email: string
) {
  const trimmedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()

  const [attendee] = await db
    .insert(attendees)
    .values({ eventId, name: trimmedName, email: normalizedEmail })
    .returning({ id: attendees.id, name: attendees.name, email: attendees.email, inviteToken: attendees.inviteToken })

  const [badge] = await db
    .insert(badges)
    .values({ attendeeId: attendee.id, token: crypto.randomUUID() })
    .returning({ id: badges.id, token: badges.token, emailSent: badges.emailSent })

  return { attendee, badge }
}

export async function getAttendees(eventId: number, organizerId: number) {
  return db
    .select({
      id: attendees.id,
      name: attendees.name,
      email: attendees.email,
      createdAt: attendees.createdAt,
      badgeToken: badges.token,
      emailSent: badges.emailSent,
      checkedIn: badges.checkedIn,
    })
    .from(attendees)
    .innerJoin(badges, eq(badges.attendeeId, attendees.id))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(and(eq(attendees.eventId, eventId), eq(events.organizerId, organizerId)))
    .orderBy(asc(attendees.createdAt))
}
```

**Note:** `crypto.randomUUID()` is available in Node.js 14.17+ globally — no import needed.

### `app/api/events/[id]/attendees/route.ts` — Full Implementation

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { getEventById } from '@/data/events'
import { createAttendeeAndBadge } from '@/data/badges'

export const POST = withAuth(async (req, ctx) => {
  const { id } = await ctx.params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  const event = await getEventById(eventId, ctx.session.organizerId!)
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  let body: { name?: unknown; email?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { name, email } = body
  if (!name || typeof name !== 'string' || !name.trim() ||
      !email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  try {
    const result = await createAttendeeAndBadge(ctx.session.organizerId!, eventId, name, email)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Attendee already registered' }, { status: 409 })
    }
    console.error('Add attendee error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
```

### `app/event/[id]/upload/page.tsx` — Updated

```typescript
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEventById } from '@/data/events'
import { getAttendees } from '@/data/badges'
import UploadForm from './UploadForm'

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) notFound()

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const event = await getEventById(eventId, session.organizerId)
  if (!event) notFound()

  const attendeeList = await getAttendees(eventId, session.organizerId)

  return <UploadForm eventId={event.id} eventName={event.name} attendees={attendeeList} />
}
```

### `UploadForm.tsx` — Key Props/Types

```typescript
type AttendeeRow = {
  id: number
  name: string
  email: string
  createdAt: string | null
  badgeToken: string
  emailSent: boolean | null
  checkedIn: boolean | null
}
```

Badge token display: `badge.token.slice(0, 8) + '…'`

### Key Implementation Rules

**DO:**
- `import 'server-only'` as first line of `data/badges.ts` (mandatory — AR7)
- Use `crypto.randomUUID()` globally (no import) for badge token
- `inviteToken` is generated by Drizzle `defaultRandom()` (DB-level UUID) — do NOT pass it manually in `values()`
- Ownership verification in route handler: call `getEventById` before inserting — prevents inserting into events the organizer doesn't own
- Catch PG `23505` at route handler level — do NOT add try/catch in DAL

**DO NOT:**
- Write migration SQL by hand — only `drizzle-kit generate` produces valid migrations
- Add `import 'server-only'` to route handler files
- Skip ownership check on the attendees route — attacker could POST to any event ID
- Forget `asc` in the drizzle-orm import for `getAttendees`

### Previous Story Learnings (1-5 through 3-1)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- No Tailwind — inline `s` styles with `as React.CSSProperties`
- `router.refresh()` for post-mutation data sync in Client Components
- ESLint does NOT ignore `_` prefix vars — avoid unused destructuring in function params
- PG `23505` catch pattern established in story 1-6: `(err as { code?: string }).code === '23505'`
- `drizzle-kit migrate` requires `DIRECT_URL` — if not set locally, generate only and document
- `await ctx.params` mandatory in Next.js 15 route handlers (established in story 2-3)
- `await params` mandatory in Next.js 15 page components (established in story 3-1)

### Architecture References

- [Source: architecture.md#Database Schema] — `attendees` table, new `inviteToken`/`inviteUsedAt` columns
- [Source: architecture.md#Enforcement Guidelines] — `import 'server-only'`, ownership in DAL, no hand-written SQL
- [Source: architecture.md#Authentication & Security] — `withAuth` HOF, ownership check before mutation
- [Source: epics.md#Story 3.2] — `createAttendeeAndBadge`, 409 for duplicate, invite token

### Project Structure After This Story

```
conventionals/
├── data/
│   └── badges.ts                          ← NEW
├── app/
│   ├── api/
│   │   └── events/
│   │       └── [id]/
│   │           └── attendees/
│   │               └── route.ts           ← NEW
│   └── event/
│       └── [id]/
│           └── upload/
│               ├── page.tsx               ← MODIFIED: + getAttendees
│               └── UploadForm.tsx         ← MODIFIED: + form + attendee list
├── drizzle/
│   ├── schema.ts                          ← MODIFIED: + inviteToken, inviteUsedAt on attendees
│   └── migrations/
│       └── 0002_*.sql                     ← NEW (generated by drizzle-kit)
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_`drizzle-kit migrate` skipped — `DIRECT_URL` not set in `.env.local`. Migration file `0002_previous_payback.sql` generated successfully. Must be applied before deploying (run `npx drizzle-kit migrate` with `DIRECT_URL` set)._

### Completion Notes List

- **Task 1 ✅**: Schema updated — `inviteToken` (uuid, defaultRandom, notNull) and `inviteUsedAt` (timestamp, nullable) added to `attendees`. Migration `0002_previous_payback.sql` generated. `drizzle-kit migrate` skipped (no `DIRECT_URL` locally).
- **Task 2 ✅**: `data/badges.ts` created — `createAttendeeAndBadge` inserts attendee + badge (crypto.randomUUID token), returns both. `getAttendees` joins attendees + badges + events with ownership check, ordered by `createdAt ASC`.
- **Task 3 ✅**: `app/api/events/[id]/attendees/route.ts` created — POST with withAuth, ownership check, 23505 → 409, returns 201.
- **Task 4 ✅**: `page.tsx` updated — calls `getAttendees`, passes `attendees` prop to `UploadForm`.
- **Task 5 ✅**: `UploadForm.tsx` fully replaced — manual add form, attendee table with token truncation. UX confirmed by user.
- **Task 6 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/drizzle/schema.ts` (modified — added `inviteToken`, `inviteUsedAt` to attendees; added `uuid` import)
- `conventionals/drizzle/migrations/0002_previous_payback.sql` (created by drizzle-kit generate)
- `conventionals/data/badges.ts` (created)
- `conventionals/app/api/events/[id]/attendees/route.ts` (created)
- `conventionals/app/event/[id]/upload/page.tsx` (modified — added getAttendees)
- `conventionals/app/event/[id]/upload/UploadForm.tsx` (replaced — full form + attendee table)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors. Migration generated but not applied locally (DIRECT_URL not set).
