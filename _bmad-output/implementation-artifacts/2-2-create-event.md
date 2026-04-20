# Story 2.2: Create Event

Status: review

## Story

As an **organizer**,
I want to create a new event from the dashboard,
So that I can start managing attendees for it.

## Acceptance Criteria

**Given** I am on the dashboard
**When** I submit the create-event form with an event name (and optional date)
**Then** a `POST /api/events` request is sent with `{ name, date }` body
**And** the server inserts a new event scoped to my `organizerId`
**And** the new event appears in the dashboard event list

**And** if `name` is missing or empty
**Then** the API returns HTTP 400 `{ error: string }`

## Tasks / Subtasks

- [x] Task 1: Add `createEvent` to `data/events.ts` (AC: insert organizer-scoped event)
  - [x] Add `createEvent(organizerId: number, name: string, date: string | null)` to existing `conventionals/data/events.ts`
  - [x] Insert into `events` table with `{ organizerId, name, eventDate: date }` — use `.returning({ id: events.id, name: events.name, eventDate: events.eventDate, createdAt: events.createdAt })`
  - [x] No try/catch — caller (route handler) handles errors

- [x] Task 2: Add `POST` handler to `app/api/events/route.ts` (AC: `POST /api/events` creates event)
  - [x] Add `export const POST = withAuth(async (req, { session }) => { ... })` to existing `conventionals/app/api/events/route.ts`
  - [x] Parse body: `let body: { name?: unknown; date?: unknown }; try { body = await req.json() } catch { return 400 }`
  - [x] Validate: `name` must be a non-empty string — return 400 `{ error: 'Event name is required' }` if not
  - [x] `date`: accept string or null/undefined — pass `typeof body.date === 'string' && body.date.trim() ? body.date.trim() : null` to DAL
  - [x] Call `createEvent(session.organizerId!, name.trim(), date)`
  - [x] Return `NextResponse.json(newEvent, { status: 201 })`
  - [x] No `export const runtime = 'edge'`

- [x] Task 3: Add create-event form to `app/dashboard/DashboardClient.tsx` (AC: form UI + event appears after creation)
  - [x] **⚠️ UX Approval Required** — confirmed by user
  - [x] Add form state: `name` (string), `date` (string), `error` (string | null), `submitting` (boolean)
  - [x] On submit: `POST /api/events` with `{ name, date: date || null }`, set `submitting` during fetch
  - [x] On success (201): clear form fields, clear error, call `router.refresh()` to re-fetch server-side event list
  - [x] On error (400/500): set `error` from response JSON or fallback message
  - [x] Add new style keys to `s` object — no Tailwind

- [x] Task 4: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### ⚠️ UX Approval Required — Create Event Form Design

Proposed form layout, placed above the event list in `<main>`:

```
┌─────────────────────────────────────────────────┐
│  Event Name *          [____________________]   │
│  Date (optional)       [____________________]   │
│                        [  Create Event  ]        │
│  [error message if any]                          │
└─────────────────────────────────────────────────┘
```

- "Event Name" — `<input type="text">`, required
- "Date (optional)" — `<input type="date">`, optional
- "Create Event" button — indigo filled (`#4f46e5` bg, white text), disabled while submitting
- Error message — `#b91c1c` (error red), shown below button
- Form has a bottom margin / separator before the event list

**Do NOT implement Task 3 without the user confirming the above form design is acceptable.**

### Files to Create / Modify

```
conventionals/
├── data/
│   └── events.ts              ← MODIFY: add createEvent()
├── app/
│   ├── api/
│   │   └── events/
│   │       └── route.ts       ← MODIFY: add POST handler
│   └── dashboard/
│       └── DashboardClient.tsx ← MODIFY: add create-event form
```

### `data/events.ts` — `createEvent` Addition

```typescript
export async function createEvent(organizerId: number, name: string, date: string | null) {
  const [event] = await db
    .insert(events)
    .values({ organizerId, name, eventDate: date })
    .returning({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
      createdAt: events.createdAt,
    })
  return event
}
```

### `app/api/events/route.ts` — POST Addition

```typescript
export const POST = withAuth(async (req, { session }) => {
  let body: { name?: unknown; date?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { name, date } = body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
  }

  const normalizedDate = typeof date === 'string' && date.trim() ? date.trim() : null

  const newEvent = await createEvent(session.organizerId!, name.trim(), normalizedDate)
  return NextResponse.json(newEvent, { status: 201 })
})
```

### `DashboardClient.tsx` — Form State and Handlers

```typescript
const [name, setName] = useState('')
const [date, setDate] = useState('')
const [error, setError] = useState<string | null>(null)
const [submitting, setSubmitting] = useState(false)

async function handleCreate(e: React.FormEvent) {
  e.preventDefault()
  setError(null)
  setSubmitting(true)
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, date: date || null }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create event')
      return
    }
    setName('')
    setDate('')
    router.refresh()
  } catch {
    setError('Network error — please try again')
  } finally {
    setSubmitting(false)
  }
}
```

New style keys to add to `s` object:
```typescript
form: {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1.5rem',
  marginBottom: '2rem',
} as React.CSSProperties,
formRow: {
  marginBottom: '1rem',
} as React.CSSProperties,
label: {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.375rem',
} as React.CSSProperties,
input: {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  color: '#111827',
  boxSizing: 'border-box' as const,
} as React.CSSProperties,
submitButton: {
  padding: '0.5rem 1.25rem',
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
} as React.CSSProperties,
submitButtonDisabled: {
  padding: '0.5rem 1.25rem',
  backgroundColor: '#a5b4fc',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'not-allowed',
} as React.CSSProperties,
formError: {
  color: '#b91c1c',
  fontSize: '0.875rem',
  marginTop: '0.5rem',
} as React.CSSProperties,
```

### `router.refresh()` — App Router Data Refresh Pattern

`router.refresh()` from `next/navigation` signals Next.js to re-run the Server Component (`DashboardPage`) — which re-calls `getEvents()` and passes fresh data down to `DashboardClient`. This is the correct pattern for post-mutation refresh in App Router without a full page reload. It does NOT reset Client Component state.

`useState` must be imported since this is the first story using form state in `DashboardClient`.

### Key Implementation Rules

**DO:**
- Add `createEvent` to the existing `data/events.ts` — do NOT create a new file
- Add `POST` to the existing `app/api/events/route.ts` — both `GET` and `POST` live in the same file
- Use `withAuth` for the `POST` handler — ownership is enforced via `session.organizerId!`
- Use `router.refresh()` after successful creation (not `router.push` — keeps user on dashboard)
- Use `useState` for form state — add `useState` to the React import (it's a Client Component)
- `boxSizing: 'border-box' as const` on inputs — required for `width: '100%'` to work correctly

**DO NOT:**
- Create a separate form component file — keep the form in `DashboardClient.tsx`
- Add `import 'server-only'` to route handler files — only `data/` and `lib/` files need it
- Skip JSON parse error handling — the `try/catch` on `req.json()` is required
- Use `router.push('/dashboard')` — that causes a full navigation; use `router.refresh()` instead

### Previous Story Learnings (Stories 1-5 through 2-1)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- No Tailwind — inline styles via `s` object with `as React.CSSProperties`
- Brand color `#4f46e5` (indigo); error red `#b91c1c`; `#111827` dark; `#6b7280` muted
- ESLint does NOT ignore `_` prefix vars — avoid unused destructuring
- Pre-existing lint warning in `drizzle/schema.ts` (`sql` unused) — do not address
- Pattern for isolated JSON parse: `try { body = await req.json() } catch { return 400 }` — established in story 1-6
- Timing-safe pattern not needed here (no password comparison)
- `'use client'` already on `DashboardClient.tsx` — no need to add it
- `router` already used in `DashboardClient.tsx` via `useRouter()` — already imported

### Architecture References

- [Source: architecture.md#Authentication & Security] — `withAuth` HOF for all protected routes
- [Source: architecture.md#API & Communication Patterns] — `{ error: string }` error shape, JSON request parsing
- [Source: architecture.md#Frontend Architecture] — Client Components for mutations; `router.refresh()` for post-mutation data sync
- [Source: architecture.md#Enforcement Guidelines] — rules 1–6
- [Source: epics.md#Story 2.2] — `createEvent(organizerId, name, date)`, 400 for missing fields

### Project Structure After This Story

```
conventionals/
├── data/
│   └── events.ts              ← MODIFIED: + createEvent()
├── app/
│   ├── api/
│   │   └── events/
│   │       └── route.ts       ← MODIFIED: + POST handler
│   └── dashboard/
│       └── DashboardClient.tsx ← MODIFIED: + create-event form
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations. All implementation matched reference exactly. Verified via `npx tsc --noEmit` (0 errors) and `npm run lint` (0 errors, 1 pre-existing warning)._

### Completion Notes List

- **Task 1 ✅**: `createEvent(organizerId, name, date)` added to `data/events.ts` — inserts into `events` table, returns `id`, `name`, `eventDate`, `createdAt`.
- **Task 2 ✅**: `POST = withAuth(...)` added to `app/api/events/route.ts` — validates `name`, normalizes `date`, calls `createEvent`, returns 201.
- **Task 3 ✅**: `DashboardClient.tsx` updated — `useState` added for form state (`name`, `date`, `error`, `submitting`), `handleCreate` POSTs to `/api/events`, calls `router.refresh()` on success. UX design confirmed by user before implementation.
- **Task 4 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/events.ts` (modified — added `createEvent`)
- `conventionals/app/api/events/route.ts` (modified — added `POST` handler)
- `conventionals/app/dashboard/DashboardClient.tsx` (modified — added create-event form)

### Change Log

- 2026-04-06: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
