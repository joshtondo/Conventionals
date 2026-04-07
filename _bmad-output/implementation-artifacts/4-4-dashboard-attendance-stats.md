# Story 4.4: Dashboard Attendance Stats

Status: review

## Story

As an **organizer**,
I want to see attendance statistics for each event on my dashboard,
So that I can track how many attendees have checked in.

## Acceptance Criteria

**Given** I am on the dashboard
**When** the page loads
**Then** each event shows total attendees, checked-in count, and emails sent count
**And** `data/badges.ts` exports `getDashboardStats(organizerId)` returning per-event stats
**And** PostgreSQL COUNT values are coerced with `parseInt(value, 10)` before returning to the client
**And** the attendee table shows each attendee's name, email, check-in status, email status, and a resend button

## Tasks / Subtasks

- [x] Task 1: Add `getDashboardStats` to `data/badges.ts` (AC: per-event stats, parseInt coercion)
  - [x] Import `sql` from `drizzle-orm` (add to existing import)
  - [x] Add `getDashboardStats(organizerId: number)` that LEFT JOINs `events` → `attendees` → `badges`, groups by `events.id`
  - [x] Use `sql<string>\`count(${badges.id})\`` for `total`, `sql<string>\`count(case when ${badges.checkedIn} = true then 1 end)\`` for `checkedIn`, `sql<string>\`count(case when ${badges.emailSent} = true then 1 end)\`` for `emailsSent`
  - [x] WHERE `eq(events.organizerId, organizerId)`
  - [x] Map results: `parseInt(r.total, 10)`, `parseInt(r.checkedIn, 10)`, `parseInt(r.emailsSent, 10)`
  - [x] Return array of `{ eventId: number, total: number, checkedIn: number, emailsSent: number }`

- [x] Task 2: Update `app/dashboard/page.tsx` — fetch and pass stats (AC: stats available in DashboardClient)
  - [x] Import `getDashboardStats` from `@/data/badges`
  - [x] Call `getDashboardStats(session.organizerId)` alongside existing `getEvents` call via `Promise.all`
  - [x] Convert stats array to lookup map keyed by `eventId`
  - [x] Pass `stats` map as prop to `DashboardClient`

- [x] Task 3: Update `DashboardClient.tsx` — display stats per event card (AC: total attendees, checked-in, emails sent per event)
  - [x] UX approved by user
  - [x] Added `StatsItem` type and `stats` prop to `DashboardClient`
  - [x] Added `statsText` style (0.8rem, #9ca3af)
  - [x] Rendered "X attendees · Y checked in · Z emails sent" below event date, defaulting to zeros if missing

- [x] Task 4: Verify note on attendee table AC
  - [x] Confirmed: story 4-3 already added Email status + Resend columns to UploadForm.tsx attendee table — AC satisfied

- [x] Task 5: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### `getDashboardStats` — DAL Function

Add to `data/badges.ts`. Add `sql` to the existing drizzle-orm import:

```typescript
import { eq, and, asc, sql } from 'drizzle-orm'

export async function getDashboardStats(organizerId: number) {
  const rows = await db
    .select({
      eventId: events.id,
      total: sql<string>`count(${badges.id})`,
      checkedIn: sql<string>`count(case when ${badges.checkedIn} = true then 1 end)`,
      emailsSent: sql<string>`count(case when ${badges.emailSent} = true then 1 end)`,
    })
    .from(events)
    .leftJoin(attendees, eq(attendees.eventId, events.id))
    .leftJoin(badges, eq(badges.attendeeId, attendees.id))
    .where(eq(events.organizerId, organizerId))
    .groupBy(events.id)

  return rows.map(r => ({
    eventId: r.eventId,
    total: parseInt(r.total, 10),
    checkedIn: parseInt(r.checkedIn, 10),
    emailsSent: parseInt(r.emailsSent, 10),
  }))
}
```

LEFT JOINs are required so events with zero attendees still appear (COUNT returns 0, not NULL).

### `dashboard/page.tsx` Update

```typescript
import { getDashboardStats } from '@/data/badges'

// Inside DashboardPage:
const [eventList, statsList] = await Promise.all([
  getEvents(session.organizerId),
  getDashboardStats(session.organizerId),
])

const stats = Object.fromEntries(
  statsList.map(s => [s.eventId, { total: s.total, checkedIn: s.checkedIn, emailsSent: s.emailsSent }])
) as Record<number, { total: number; checkedIn: number; emailsSent: number }>

return <DashboardClient events={eventList} stats={stats} />
```

### `DashboardClient.tsx` Update (UX APPROVAL REQUIRED)

**Proposed UI:** Below the event date line, add a small stats row:
```
12 attendees · 8 checked in · 10 emails sent
```

```tsx
// New prop type:
type StatsItem = { total: number; checkedIn: number; emailsSent: number }

// In component signature:
export default function DashboardClient({
  events,
  stats,
}: {
  events: EventItem[]
  stats: Record<number, StatsItem>
}) { ... }

// New style:
statsText: {
  fontSize: '0.8rem',
  color: '#9ca3af',
  margin: '0.25rem 0 0',
} as React.CSSProperties,

// In each event card, after <p style={s.eventDate}>:
const eventStats = stats[event.id] ?? { total: 0, checkedIn: 0, emailsSent: 0 }
<p style={s.statsText}>
  {eventStats.total} attendees · {eventStats.checkedIn} checked in · {eventStats.emailsSent} emails sent
</p>
```

### Attendee Table AC Note

The AC "attendee table shows each attendee's name, email, check-in status, email status, and a resend button" refers to the table in `UploadForm.tsx` (the "Manage attendees" page). Story 4-3 already added Email status and Resend columns to that table. This AC is already satisfied — no new implementation needed.

### Files to Create / Modify

```
conventionals/
├── data/
│   └── badges.ts              ← MODIFY: add getDashboardStats, add sql to import
├── app/
│   └── dashboard/
│       ├── page.tsx           ← MODIFY: fetch stats, pass to DashboardClient
│       └── DashboardClient.tsx ← MODIFY: accept stats prop, render stats row per event
```

### Key Implementation Rules

**DO:**
- `LEFT JOIN` (not INNER JOIN) for attendees and badges — events with zero attendees must still appear
- `parseInt(r.total, 10)` — PG COUNT returns string in Drizzle; coerce before returning
- Use `Promise.all` to fetch events and stats in parallel in the Server Component
- Default to `{ total: 0, checkedIn: 0, emailsSent: 0 }` if a given `eventId` has no stats entry

**DO NOT:**
- Use `sql<number>` for COUNT — PG returns count as string; `sql<string>` is correct
- Use INNER JOIN — events with no attendees would be excluded from the result
- Fetch stats in `DashboardClient` (Client Component) — fetch in Server Component `page.tsx`

### Architecture References

- [Source: architecture.md#Data Architecture] — "PostgreSQL COUNT values are coerced with `parseInt(value, 10)`"
- [Source: architecture.md#Frontend Architecture] — Server Components for reads; Client Components for interactive state
- [Source: epics.md#Story 4.4] — `getDashboardStats(organizerId)`, per-event stats in dashboard

### Previous Story Learnings (1-5 through 4-3)

- All commands run from `conventionals/` directory
- `import 'server-only'` mandatory first line of all `data/` files
- Server Components call DAL directly — no API calls in page.tsx
- UX changes require explicit user approval before implementation
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Project Structure After This Story

```
conventionals/
├── data/
│   └── badges.ts               ← MODIFIED: + getDashboardStats, + sql import
└── app/
    └── dashboard/
        ├── page.tsx             ← MODIFIED: + getDashboardStats call, stats prop
        └── DashboardClient.tsx  ← MODIFIED: + stats prop, stats row per event card
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations._

### Completion Notes List

- **Task 1 ✅**: `data/badges.ts` — `getDashboardStats(organizerId)` added; LEFT JOINs events → attendees → badges, groups by event id, uses `sql<string>` COUNT expressions, coerces all counts with `parseInt`.
- **Task 2 ✅**: `app/dashboard/page.tsx` — `Promise.all` fetches events + stats in parallel; stats array converted to Record keyed by eventId; passed as `stats` prop to DashboardClient.
- **Task 3 ✅**: `DashboardClient.tsx` — `StatsItem` type + `stats` prop added; `statsText` style added; stats row rendered per event card below date line; defaults to zeros for events with no stats entry.
- **Task 4 ✅**: AC confirmed satisfied by story 4-3 (UploadForm.tsx already has email status + resend columns).
- **Task 5 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/badges.ts` (modified — added getDashboardStats, added sql to import)
- `conventionals/app/dashboard/page.tsx` (modified — Promise.all, stats prop)
- `conventionals/app/dashboard/DashboardClient.tsx` (modified — StatsItem type, stats prop, statsText style, stats row)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
