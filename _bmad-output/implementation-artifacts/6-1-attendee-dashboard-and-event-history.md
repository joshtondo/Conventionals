# Story 6.1: Attendee Dashboard & Event History

Status: review

## Story

As an **attendee**,
I want to see all the events I've been invited to,
so that I have a record of every convention I've attended.

## Acceptance Criteria

**Given** I am logged in as an attendee and on `/attendee/dashboard`
**When** the page loads
**Then** all events where an `attendees` row exists with my email are listed (matched via `attendee_accounts.email`)
**And** each event shows the event name, date, and organizer
**And** events are sorted by date descending (most recent first)
**And** `data/attendees.ts` exports `getEventHistory(attendeeAccountId)`

## Tasks / Subtasks

- [x] Task 1: Add `getEventHistory` to `data/attendees.ts` (AC: returns events sorted by date desc)
  - [x] Import `events`, `organizers` from `@/drizzle/schema`; add `desc` to drizzle-orm imports
  - [x] Look up `attendeeAccounts.email` by `attendeeAccountId`; return `[]` if account not found
  - [x] JOIN: `attendees` → `events` (inner) → `organizers` (inner) WHERE `attendees.email = account.email`
  - [x] SELECT: `events.id` as `eventId`, `events.name` as `eventName`, `events.eventDate`, `organizers.name` as `organizerName`
  - [x] ORDER BY `events.eventDate` DESC

- [x] Task 2: Create `app/attendee/dashboard/page.tsx` — Server Component (AC: protected, pre-fetches event history)
  - [x] Session guard: `getIronSession` → if no `attendeeAccountId` → `redirect('/attendee/login')`
  - [x] Call `getAttendeeAccount(session.attendeeAccountId)` — if null → `redirect('/attendee/login')`
  - [x] Call `getEventHistory(session.attendeeAccountId)` — pass result to render
  - [x] Render inline (pure Server Component — no interactive elements, no client wrapper needed)

- [x] Task 3: Render event history UI in `page.tsx` (AC: shows name, date, organizer per event)
  - [x] **UX APPROVAL REQUIRED** — describe change and get explicit "y" before implementing
  - [x] Proposed UX: light gray background; "← Profile" link top-left; "My Events" heading; vertical list of event cards (bold event name, date below, organizer name below); empty state "No events yet."; all inline styles matching existing attendee page patterns (no CSS framework)
  - [x] Format date: use `new Date(eventDate).toLocaleDateString()` — guard against null date with fallback "TBD"

- [x] Task 4: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors

## Dev Notes

### How the Email Join Works

`attendee_accounts` is the cross-event identity. `attendees` is per-event. They are linked by **email**:

```
attendee_accounts.email ←→ attendees.email
```

The query must:
1. Fetch `attendee_accounts.email` for the logged-in account
2. Find all `attendees` rows where `attendees.email = account.email`
3. Join to `events` and `organizers` to get display data

### `getEventHistory` DAL (Task 1)

Add to `data/attendees.ts`:

```typescript
export async function getEventHistory(attendeeAccountId: number) {
  const [account] = await db
    .select({ email: attendeeAccounts.email })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.id, attendeeAccountId))
  if (!account) return []

  return db
    .select({
      eventId: events.id,
      eventName: events.name,
      eventDate: events.eventDate,
      organizerName: organizers.name,
    })
    .from(attendees)
    .innerJoin(events, eq(attendees.eventId, events.id))
    .innerJoin(organizers, eq(events.organizerId, organizers.id))
    .where(eq(attendees.email, account.email))
    .orderBy(desc(events.eventDate))
}
```

**Import additions needed at top of `data/attendees.ts`:**
- Add `events`, `organizers` to schema import: `import { attendeeAccounts, attendees, events, organizers } from '@/drizzle/schema'`
- Add `desc` to drizzle-orm import: `import { eq, isNull, and, desc } from 'drizzle-orm'`

### Dashboard Page (Tasks 2 & 3)

Pure Server Component — no `'use client'` directive, no client wrapper.

```typescript
// app/attendee/dashboard/page.tsx
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAttendeeAccount, getEventHistory } from '@/data/attendees'
import React from 'react'

export default async function AttendeeDashboardPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')
  const account = await getAttendeeAccount(session.attendeeAccountId)
  if (!account) redirect('/attendee/login')
  const eventHistory = await getEventHistory(session.attendeeAccountId)

  // inline styles + JSX render (see Task 3 UX proposal)
}
```

### Inline Style Pattern (match existing attendee pages)

Follow the `const s = { ... } as React.CSSProperties` pattern from `ProfileForm.tsx` and `AttendeeLoginForm.tsx`:
- `container`: `minHeight: '100vh'`, `backgroundColor: '#f9fafb'`, `padding: '2rem'`
- `backLink`: `color: '#6b7280'`, `fontSize: '0.875rem'`, `textDecoration: 'none'`
- `heading`: `fontSize: '1.25rem'`, `fontWeight: '700'`, `color: '#111827'`
- `card`: `backgroundColor: '#fff'`, `border: '1px solid #e5e7eb'`, `borderRadius: '8px'`, `padding: '1rem 1.5rem'`, `marginBottom: '0.75rem'`
- `eventName`: `fontWeight: '600'`, `color: '#111827'`, `margin: '0 0 0.25rem'`
- `eventMeta`: `fontSize: '0.875rem'`, `color: '#6b7280'`, `margin: 0`

### Key Patterns (from Epic 5 learnings)

- `import 'server-only'` already in `data/attendees.ts` — do not add again
- `getIronSession` + `await cookies()` + `sessionOptions` pattern already established — reuse exactly
- `getAttendeeAccount` already exported from `data/attendees.ts` — reuse, do not recreate
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`
- `React` import needed in Server Components when using JSX without `'use client'`
- UX changes require explicit user approval (project policy)
- `events.eventDate` is `date | null` in Drizzle schema — guard null in display

### What Already Exists (DO NOT recreate)

- `attendeeAccounts`, `attendees` already in schema — import from `@/drizzle/schema`
- `events`, `organizers` already in schema — import from `@/drizzle/schema`
- `getAttendeeAccount` already in `data/attendees.ts` — reuse
- Session utilities: `getIronSession`, `sessionOptions`, `SessionData` from `@/lib/session`

### Files to Create / Modify

```
conventionals/
├── data/
│   └── attendees.ts                        ← MODIFY: add getEventHistory
└── app/
    └── attendee/
        └── dashboard/
            └── page.tsx                    ← CREATE
```

No new schema changes. No new tables. No migration needed.

### Architecture References

- [Source: architecture.md#Database Schema] — `attendees.email` links to `attendee_accounts.email` for event history join
- [Source: architecture.md#Authentication & Security] — Server Component session check (not `withAttendeeAuth` HOF — HOF is for Route Handlers only)
- [Source: epics.md#Story 6.1] — `getEventHistory(attendeeAccountId)` joining `attendees → events` by email match

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None_

### Completion Notes List

- Added `getEventHistory` with two-step query: fetch account email, then JOIN attendees → events → organizers filtered by email, ORDER BY date DESC
- Extended imports in `data/attendees.ts`: added `events`, `organizers` to schema import; added `desc` to drizzle-orm import
- Created pure Server Component dashboard with session guard, event card list, and empty state
- `npx tsc --noEmit` — 0 errors; `npm run lint` — 0 errors

### File List

- `conventionals/data/attendees.ts` — MODIFIED: added `getEventHistory`, extended imports
- `conventionals/app/attendee/dashboard/page.tsx` — CREATED

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete, status → review.
