# Story 6.2: Browse Public Attendees at an Event

Status: review

## Story

As an **attendee**,
I want to browse other public attendees at an event I attended,
so that I can discover people I might want to connect with.

## Acceptance Criteria

**Given** I am logged in and viewing an event from my history
**When** I visit `/attendee/event/[id]/people`
**Then** I see a list of attendees at that event whose `attendee_accounts.is_public = true`
**And** each public profile shows name, company, job title, bio, and social links
**And** my own profile is excluded from the list
**And** the page returns 404 if I was not invited to this event (no `attendees` row for my email + eventId)
**And** `data/attendees.ts` exports `getPublicAttendeesForEvent(eventId, myAttendeeAccountId)`

## Tasks / Subtasks

- [x] Task 1: Add `getPublicAttendeesForEvent` to `data/attendees.ts` (AC: filters public, excludes self, 404 guard)
  - [x] Add `ne` to drizzle-orm imports
  - [x] Step 1 — access check: look up `attendeeAccounts.email` by `myAttendeeAccountId`; check an `attendees` row exists for `(eventId, email)`; return `null` if either lookup fails (caller returns 404)
  - [x] Step 2 — query: JOIN `attendees` (WHERE `eventId = eventId`) → `attendeeAccounts` (ON `attendees.email = attendeeAccounts.email`) WHERE `attendeeAccounts.isPublic = true` AND `attendeeAccounts.id != myAttendeeAccountId`
  - [x] SELECT: `id`, `name`, `company`, `jobTitle`, `bio`, `socialLinks` from `attendeeAccounts`
  - [x] Return `null` (not found/no access) or array (may be empty)

- [x] Task 2: Create `app/attendee/event/[id]/people/page.tsx` — Server Component (AC: 404 guard, renders list)
  - [x] `await params` before destructuring to get `id` (Next.js 16 requirement)
  - [x] Session guard: `getIronSession` → if no `attendeeAccountId` → `redirect('/attendee/login')`
  - [x] Parse `eventId = parseInt(id)` — `notFound()` if `isNaN(eventId)`
  - [x] Call `getPublicAttendeesForEvent(eventId, session.attendeeAccountId)` — `notFound()` if result is `null`
  - [x] Render attendee profile list (see Task 3 UX)

- [x] Task 3: Render public attendees UI in `page.tsx` (AC: shows name, company, job title, bio, social links)
  - [x] **UX APPROVAL REQUIRED** — describe change and get explicit "y" before implementing
  - [x] Proposed UX: light gray background; "← My Events" link to `/attendee/dashboard`; "Attendees" heading; profile cards — bold name, company + job title on one muted line, bio below, social link labels (LinkedIn / Twitter / Website) as small anchor tags; empty state "No public attendees at this event."; pure Server Component, inline styles matching existing attendee page patterns
  - [x] Only render social link anchors that have values (skip undefined/empty)

- [x] Task 4: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors

## Dev Notes

### How the Join Works

`attendees` (per-event rows) and `attendee_accounts` (cross-event identity) are linked by **email**:

```
attendees.email ←→ attendee_accounts.email
```

Access check (two queries):
1. Fetch `attendee_accounts.email` for `myAttendeeAccountId`
2. Confirm `attendees` row exists for `(eventId, myEmail)` — this proves the user was invited

Public attendees query (single JOIN):
```
attendees JOIN attendee_accounts ON attendees.email = attendee_accounts.email
WHERE attendees.event_id = eventId
  AND attendee_accounts.is_public = true
  AND attendee_accounts.id != myAttendeeAccountId
```

### `getPublicAttendeesForEvent` DAL (Task 1)

Add `ne` to imports: `import { eq, isNull, and, desc, ne } from 'drizzle-orm'`

```typescript
export async function getPublicAttendeesForEvent(
  eventId: number,
  myAttendeeAccountId: number
) {
  // Step 1: verify access
  const [myAccount] = await db
    .select({ email: attendeeAccounts.email })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.id, myAttendeeAccountId))
  if (!myAccount) return null

  const [myRow] = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(and(eq(attendees.eventId, eventId), eq(attendees.email, myAccount.email)))
  if (!myRow) return null  // not invited → caller calls notFound()

  // Step 2: public attendees
  return db
    .select({
      id: attendeeAccounts.id,
      name: attendeeAccounts.name,
      company: attendeeAccounts.company,
      jobTitle: attendeeAccounts.jobTitle,
      bio: attendeeAccounts.bio,
      socialLinks: attendeeAccounts.socialLinks,
    })
    .from(attendees)
    .innerJoin(attendeeAccounts, eq(attendees.email, attendeeAccounts.email))
    .where(and(
      eq(attendees.eventId, eventId),
      eq(attendeeAccounts.isPublic, true),
      ne(attendeeAccounts.id, myAttendeeAccountId)
    ))
}
```

### Page Route (Task 2)

```typescript
// app/attendee/event/[id]/people/page.tsx
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getPublicAttendeesForEvent } from '@/data/attendees'

export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const eventId = parseInt(id)
  if (isNaN(eventId)) notFound()

  const people = await getPublicAttendeesForEvent(eventId, session.attendeeAccountId)
  if (people === null) notFound()

  // render list...
}
```

### Inline Style Pattern (match existing attendee pages)

Follow the `const s = { ... } as React.CSSProperties` pattern from `dashboard/page.tsx`:
- `container`, `backLink`, `heading`: identical to dashboard page
- `card`: `backgroundColor: '#fff'`, `border: '1px solid #e5e7eb'`, `borderRadius: '8px'`, `padding: '1rem 1.5rem'`, `marginBottom: '0.75rem'`, `maxWidth: '600px'`
- `personName`: `fontWeight: '600'`, `color: '#111827'`, `margin: '0 0 0.25rem'`, `fontSize: '1rem'`
- `personMeta`: `fontSize: '0.875rem'`, `color: '#6b7280'`, `margin: '0 0 0.5rem'`
- `personBio`: `fontSize: '0.875rem'`, `color: '#374151'`, `margin: '0 0 0.5rem'`
- `socialLink`: `fontSize: '0.75rem'`, `color: '#4f46e5'`, `marginRight: '0.75rem'`, `textDecoration: 'none'`

### Key Patterns (from Epic 5/6-1 learnings)

- `await params` BEFORE destructuring — mandatory in Next.js 16 (see AGENTS.md)
- `import 'server-only'` already in `data/attendees.ts` — do not add again
- `notFound()` from `next/navigation` for 404 — already used in badge page
- Return `null` from DAL (not throw) to signal not-found; page calls `notFound()`
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`
- UX changes require explicit user approval (project policy)
- `socialLinks` is `{ linkedin?: string; twitter?: string; website?: string } | null` — guard null before rendering anchors

### Files to Create / Modify

```
conventionals/
├── data/
│   └── attendees.ts                              ← MODIFY: add getPublicAttendeesForEvent, add ne import
└── app/
    └── attendee/
        └── event/
            └── [id]/
                └── people/
                    └── page.tsx                  ← CREATE
```

No new schema changes. No migration needed.

### Architecture References

- [Source: architecture.md#Database Schema] — `attendees.email` joins to `attendee_accounts.email`; `attendee_accounts.is_public` flag
- [Source: architecture.md#Authentication & Security] — Server Component session check (not `withAttendeeAuth` HOF — HOF is for Route Handlers only)
- [Source: epics.md#Story 6.2] — `getPublicAttendeesForEvent(eventId, myAttendeeAccountId)` with 404 if not invited

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None_

### Completion Notes List

- Added `getPublicAttendeesForEvent` with two-step access check (account email lookup + attendees row check) then JOIN query with `ne` filter
- Added `ne` to drizzle-orm imports in `data/attendees.ts`
- Created pure Server Component page with `await params`, session guard, `notFound()` on null result
- Filters social link anchors — only rendered when value is present
- `npx tsc --noEmit` — 0 errors; `npm run lint` — 0 errors

### File List

- `conventionals/data/attendees.ts` — MODIFIED: added `getPublicAttendeesForEvent`, added `ne` to imports
- `conventionals/app/attendee/event/[id]/people/page.tsx` — CREATED

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete, status → review.
