# Story 2.1: Event List on Dashboard

Status: review

## Story

As an **organizer**,
I want to see my events listed on the dashboard,
So that I can view and manage the events I've created.

## Acceptance Criteria

**Given** I am logged in as an organizer
**When** `/dashboard` loads
**Then** a `GET /api/events` endpoint returns the organizer's events (scoped by `organizerId`)
**And** the dashboard renders each event in a list
**And** if no events exist, the dashboard renders the empty state "No events yet."

## Tasks / Subtasks

- [x] Task 1: Create `data/events.ts` — DAL function `getEvents(organizerId)` (AC: organizer-scoped event list)
  - [x] Create `conventionals/data/events.ts`
  - [x] Begin with `import 'server-only'` (mandatory — AR7)
  - [x] Import `db` from `@/lib/db` and `events` from `@/drizzle/schema`
  - [x] Implement `getEvents(organizerId: number)` — select `id`, `name`, `eventDate`, `createdAt` from `events` where `organizerId = organizerId`, ordered by `createdAt DESC`
  - [x] Export the function (no default export — matches `data/auth.ts` pattern)

- [x] Task 2: Create `app/api/events/route.ts` — `GET` handler (AC: `GET /api/events` returns organizer-scoped events)
  - [x] Create `conventionals/app/api/events/route.ts`
  - [x] Use `withAuth` HOF from `@/lib/session` — do NOT inline session check
  - [x] Export `GET = withAuth(async (_req, { session }) => { ... })` — call `getEvents(session.organizerId!)` from DAL
  - [x] Return `NextResponse.json(eventList)` with 200 (no wrapper object — raw array)
  - [x] No `export const runtime = 'edge'` (Node.js default)

- [x] Task 3: Update `app/dashboard/page.tsx` — fetch events server-side and pass as props (AC: dashboard renders event list)
  - [x] Import `getEvents` from `@/data/events`
  - [x] After session check, call `const eventList = await getEvents(session.organizerId!)` (non-null assert is safe — `withAuth` already ensured `organizerId` is defined; same pattern applies here)
  - [x] Pass `events={eventList}` prop to `<DashboardClient />`
  - [x] Update `DashboardClient` import signature to match new props

- [x] Task 4: Update `app/dashboard/DashboardClient.tsx` — render event list (AC: event list + empty state)
  - [x] **⚠️ UX Approval Required** — confirmed by user
  - [x] Accept `events` prop typed as `EventItem[]` (define `EventItem` type in this file)
  - [x] If `events.length === 0`: render existing `<p style={s.emptyState}>No events yet.</p>`
  - [x] If events exist: render a list of event items (see proposed design in Dev Notes)
  - [x] Add any new `s` style keys needed for event list and event items — no Tailwind

- [x] Task 5: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### ⚠️ UX Approval Required — Event List Item Design

The epics spec says "renders event list" without defining the per-item layout. Proposed minimal design for each event row:

```
┌──────────────────────────────────────────┐
│ [Event Name]                             │
│ [Date if available, else "No date set"]  │
└──────────────────────────────────────────┘
```

Proposed style: simple card row with a bottom border separator, event name in `#111827` (`fontWeight: 600`), date in `#6b7280` (`fontSize: 0.875rem`).

Empty state: already implemented as `<p style={s.emptyState}>No events yet.</p>` — no change needed.

**Do NOT implement Task 4 without the user confirming the above event item design is acceptable.**

### Files to Create / Modify

```
conventionals/
├── data/
│   └── events.ts              ← CREATE: getEvents(organizerId)
├── app/
│   ├── api/
│   │   └── events/
│   │       └── route.ts       ← CREATE: GET /api/events (withAuth)
│   └── dashboard/
│       ├── page.tsx           ← MODIFY: fetch events, pass as prop
│       └── DashboardClient.tsx ← MODIFY: render event list
```

### `data/events.ts` — Reference Implementation

```typescript
import 'server-only'
import { db } from '@/lib/db'
import { events } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'

export async function getEvents(organizerId: number) {
  return db
    .select({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(events.createdAt))
}
```

### `app/api/events/route.ts` — Reference Implementation

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { getEvents } from '@/data/events'

export const GET = withAuth(async (_req, { session }) => {
  const eventList = await getEvents(session.organizerId!)
  return NextResponse.json(eventList)
})
```

### `app/dashboard/page.tsx` — Updated

```typescript
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEvents } from '@/data/events'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.organizerId) {
    redirect('/login')
  }

  const eventList = await getEvents(session.organizerId)

  return <DashboardClient events={eventList} />
}
```

### `app/dashboard/DashboardClient.tsx` — Key Changes

Add `EventItem` type and `events` prop. New/modified style keys needed:

```typescript
type EventItem = {
  id: number
  name: string
  eventDate: string | null
  createdAt: string | null
}

// New style keys to add to s object:
eventList: {
  listStyle: 'none',
  margin: 0,
  padding: 0,
} as React.CSSProperties,
eventItem: {
  padding: '1rem',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  marginBottom: '0.75rem',
} as React.CSSProperties,
eventName: {
  fontWeight: '600',
  color: '#111827',
  fontSize: '1rem',
  margin: '0 0 0.25rem',
} as React.CSSProperties,
eventDate: {
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: 0,
} as React.CSSProperties,
```

Render logic in the `<main>` section:
```tsx
<main style={s.main}>
  {events.length === 0 ? (
    <p style={s.emptyState}>No events yet.</p>
  ) : (
    <ul style={s.eventList}>
      {events.map((event) => (
        <li key={event.id} style={s.eventItem}>
          <p style={s.eventName}>{event.name}</p>
          <p style={s.eventDate}>
            {event.eventDate ?? 'No date set'}
          </p>
        </li>
      ))}
    </ul>
  )}
</main>
```

### Key Implementation Rules

**DO:**
- `import 'server-only'` as the first line of `data/events.ts` — mandatory (AR7)
- Use `eq` and `desc` from `drizzle-orm` — already used in `data/auth.ts`
- Use `withAuth` HOF — never inline session checks in Route Handlers (enforcement rule 3)
- Call DAL from Server Component directly — Server Components do NOT `fetch()` their own API
- Pass `events` as a prop from Server Component → Client Component (SSR data flow pattern)
- Use `session.organizerId!` non-null assertion inside `withAuth` handler and after the guard in `page.tsx` — TypeScript doesn't narrow the optional, but `withAuth` and the `if (!session.organizerId) redirect()` guard both ensure it's set

**DO NOT:**
- Skip `import 'server-only'` in `data/events.ts` — hard enforcement rule
- Create a new Drizzle client — import `db` from `@/lib/db` (enforcement rule 6)
- Write raw SQL — use Drizzle query builder (enforcement rule 5)
- Add `export const runtime = 'edge'` — must be Node.js runtime (enforcement rule 1)
- Use `fetch('/api/events')` in the Server Component — call the DAL directly
- Add Tailwind — inline `s` styles only (UX-DR3)

### Previous Story Learnings (Stories 1-5 through 1-7)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- No Tailwind — inline styles via `s` object with `as React.CSSProperties`
- Brand color `#4f46e5` (indigo); error red `#b91c1c`; `#111827` dark text; `#6b7280` muted
- ESLint does NOT ignore `_` prefix vars — avoid unused destructuring
- Pre-existing lint warning in `drizzle/schema.ts` (`sql` unused) — do not address
- `session.organizerId` is `number | undefined` in TypeScript even after the `withAuth` guard — use `!` non-null assertion

### Architecture References

- [Source: architecture.md#Data Architecture] — Drizzle ORM, `@neondatabase/serverless`, singleton `db`
- [Source: architecture.md#Authentication & Security] — `withAuth` HOF pattern
- [Source: architecture.md#Enforcement Guidelines] — rules 1–6 directly apply to this story
- [Source: architecture.md#Frontend Architecture] — Server Components for reads, props passed to Client Components
- [Source: epics.md#Story 2.1] — `getEvents(organizerId)` with `import 'server-only'`

### Project Structure After This Story

```
conventionals/
├── data/
│   ├── auth.ts
│   └── events.ts              ← NEW
├── app/
│   ├── api/
│   │   └── events/
│   │       └── route.ts       ← NEW
│   └── dashboard/
│       ├── page.tsx           ← MODIFIED
│       └── DashboardClient.tsx ← MODIFIED
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations. Implementation followed reference exactly. No test framework configured — verified via `npx tsc --noEmit` (0 errors) and `npm run lint` (0 errors, 1 pre-existing warning)._

### Completion Notes List

- **Task 1 ✅**: `data/events.ts` created — `import 'server-only'`, `getEvents(organizerId)` selects `id`, `name`, `eventDate`, `createdAt` ordered by `createdAt DESC`.
- **Task 2 ✅**: `app/api/events/route.ts` created — `GET = withAuth(...)` calls `getEvents(session.organizerId!)`, returns raw array.
- **Task 3 ✅**: `app/dashboard/page.tsx` updated — calls `getEvents(session.organizerId)` server-side, passes result as `events` prop to `DashboardClient`.
- **Task 4 ✅**: `app/dashboard/DashboardClient.tsx` updated — accepts `events: EventItem[]` prop, renders event list (name + date) or empty state "No events yet." UX design approved by user before implementation.
- **Task 5 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/events.ts` (created)
- `conventionals/app/api/events/route.ts` (created)
- `conventionals/app/dashboard/page.tsx` (modified)
- `conventionals/app/dashboard/DashboardClient.tsx` (modified)

### Change Log

- 2026-04-06: Story created.
- 2026-04-06: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
