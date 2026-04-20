# Story 2.3: Delete Event

Status: review

## Story

As an **organizer**,
I want to delete an event from the dashboard,
So that I can remove events I no longer need.

## Acceptance Criteria

**Given** I am on the dashboard and see an event
**When** I click the delete button and confirm
**Then** a `DELETE /api/events/[id]` request is sent
**And** the server verifies I own the event (returns 404 if not found or not mine)
**And** the event is deleted (cascade: attendees and badges removed by DB)
**And** the event disappears from the dashboard list

## Tasks / Subtasks

- [x] Task 1: Add `deleteEvent` to `data/events.ts` (AC: ownership-verified delete)
  - [x] Add `deleteEvent(eventId: number, organizerId: number)` to existing `conventionals/data/events.ts`
  - [x] `DELETE FROM events WHERE id = eventId AND organizer_id = organizerId` using Drizzle `and(eq(...), eq(...))`
  - [x] Use `.returning({ id: events.id })` — returns array; if empty → event not found or not owned
  - [x] Return the deleted row or `null` if not found: `return result[0] ?? null`
  - [x] No try/catch — caller handles errors

- [x] Task 2: Create `app/api/events/[id]/route.ts` — `DELETE` handler (AC: `DELETE /api/events/[id]`)
  - [x] Create directory `conventionals/app/api/events/[id]/` and file `route.ts`
  - [x] Use `withAuth` HOF — do NOT inline session check
  - [x] `await params` before destructuring (Next.js 15 requirement — must be `const { id } = await ctx.params`)
  - [x] Parse `eventId = parseInt(id, 10)` — return 400 `{ error: 'Invalid event ID' }` if `isNaN(eventId)`
  - [x] Call `deleteEvent(eventId, session.organizerId!)`
  - [x] If result is `null` → return 404 `{ error: 'Event not found' }` (covers both missing and wrong-owner)
  - [x] If deleted → return 200 `{ success: true }`
  - [x] No `export const runtime = 'edge'`

- [x] Task 3: Add delete button to `app/dashboard/DashboardClient.tsx` (AC: delete button + confirm + event disappears)
  - [x] **⚠️ UX Approval Required** — confirmed by user
  - [x] Add `deleting` state: `Record<number, boolean>` (tracks per-event loading state)
  - [x] `handleDelete(eventId: number)`: `window.confirm('Delete this event?')` → if confirmed, `DELETE /api/events/${eventId}`, on success `router.refresh()`
  - [x] On error: show inline error or `window.alert` (simple fallback acceptable for MVP)
  - [x] Add delete button style to `s` object — no Tailwind

- [x] Task 4: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### ⚠️ UX Approval Required — Delete Button Design

Proposed: a small "Delete" button in the top-right corner of each event card, aligned with the event name row.

```
┌────────────────────────────────────────────────┐
│  Annual Tech Summit              [  Delete  ]  │
│  2026-06-15                                    │
└────────────────────────────────────────────────┘
```

- Delete button: small, outlined, `#b91c1c` text and border, transparent background
- While deleting that specific event: button text changes to "Deleting…", disabled
- Confirmation: `window.confirm('Delete this event? This cannot be undone.')`

**Do NOT implement Task 3 without the user confirming the above design is acceptable.**

### Files to Create / Modify

```
conventionals/
├── data/
│   └── events.ts                    ← MODIFY: add deleteEvent()
├── app/
│   ├── api/
│   │   └── events/
│   │       └── [id]/
│   │           └── route.ts         ← CREATE: DELETE /api/events/[id]
│   └── dashboard/
│       └── DashboardClient.tsx      ← MODIFY: add delete button
```

### `data/events.ts` — `deleteEvent` Addition

```typescript
export async function deleteEvent(eventId: number, organizerId: number) {
  const result = await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
    .returning({ id: events.id })
  return result[0] ?? null
}
```

Add `and` to the existing `drizzle-orm` import: `import { eq, desc, and } from 'drizzle-orm'`

### `app/api/events/[id]/route.ts` — Full Implementation

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { deleteEvent } from '@/data/events'

export const DELETE = withAuth(async (_req, ctx) => {
  const { id } = await ctx.params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  const deleted = await deleteEvent(eventId, ctx.session.organizerId!)
  if (!deleted) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
})
```

**Critical: `await ctx.params`** — Next.js 15 makes `params` a Promise. Always `await ctx.params` before destructuring. Do NOT destructure directly from `ctx.params`.

### `DashboardClient.tsx` — Delete State and Handler

```typescript
const [deleting, setDeleting] = useState<Record<number, boolean>>({})

async function handleDelete(eventId: number) {
  if (!window.confirm('Delete this event? This cannot be undone.')) return
  setDeleting((prev) => ({ ...prev, [eventId]: true }))
  try {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      window.alert('Failed to delete event. Please try again.')
      return
    }
    router.refresh()
  } catch {
    window.alert('Network error — please try again.')
  } finally {
    setDeleting((prev) => ({ ...prev, [eventId]: false }))
  }
}
```

New/modified style keys:

```typescript
eventItemHeader: {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
} as React.CSSProperties,
deleteButton: {
  padding: '0.25rem 0.625rem',
  backgroundColor: 'transparent',
  color: '#b91c1c',
  border: '1px solid #b91c1c',
  borderRadius: '4px',
  fontSize: '0.75rem',
  cursor: 'pointer',
  flexShrink: 0,
} as React.CSSProperties,
deleteButtonDisabled: {
  padding: '0.25rem 0.625rem',
  backgroundColor: 'transparent',
  color: '#9ca3af',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '0.75rem',
  cursor: 'not-allowed',
  flexShrink: 0,
} as React.CSSProperties,
```

Updated event item JSX (replaces current `<li>` content):

```tsx
<li key={event.id} style={s.eventItem}>
  <div style={s.eventItemHeader}>
    <p style={s.eventName}>{event.name}</p>
    <button
      style={deleting[event.id] ? s.deleteButtonDisabled : s.deleteButton}
      onClick={() => handleDelete(event.id)}
      disabled={!!deleting[event.id]}
    >
      {deleting[event.id] ? 'Deleting…' : 'Delete'}
    </button>
  </div>
  <p style={s.eventDate}>{event.eventDate ?? 'No date set'}</p>
</li>
```

### Key Implementation Rules

**DO:**
- Add `and` to the existing `drizzle-orm` import in `data/events.ts` (it's not imported yet)
- `await ctx.params` before destructuring in the route handler (Next.js 15 mandatory)
- Return 404 for both "not found" and "wrong owner" — do NOT return 403 (architecture AR14)
- Use `Record<number, boolean>` for per-event deleting state — tracks each event independently
- DB cascade handles attendees/badges deletion automatically — no manual cascade in DAL needed

**DO NOT:**
- Return 403 for ownership failure — always 404 (prevents owner enumeration)
- Destructure `ctx.params` without `await` — this will fail silently in Next.js 15
- Add `import 'server-only'` to route handler files — only `data/` and `lib/` files
- Create a new Drizzle client — import `db` from `@/lib/db`
- Manually delete attendees or badges — schema cascade handles this

### Previous Story Learnings (Stories 1-5 through 2-2)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- No Tailwind — inline styles via `s` object with `as React.CSSProperties`
- Brand color `#4f46e5` (indigo); error red `#b91c1c`; `#111827` dark; `#6b7280` muted
- ESLint does NOT ignore `_` prefix vars — use `_req` when request is unused
- Pre-existing lint warning in `drizzle/schema.ts` (`sql` unused) — do not address
- `router.refresh()` re-runs Server Component data fetch — correct post-mutation pattern
- `window.confirm` / `window.alert` are only available in Client Components — safe here

### Architecture References

- [Source: architecture.md#Authentication & Security] — `withAuth` HOF, 404 not 403 for ownership
- [Source: architecture.md#Enforcement Guidelines] — `await params`, no `runtime = 'edge'`, DAL ownership
- [Source: epics.md#Story 2.3] — `deleteEvent(eventId, organizerId)` with cascade, 404 for non-owner
- [Source: drizzle/schema.ts] — `events → attendees → badges` all have `onDelete: 'cascade'`

### Project Structure After This Story

```
conventionals/
├── data/
│   └── events.ts                    ← MODIFIED: + deleteEvent()
├── app/
│   ├── api/
│   │   └── events/
│   │       └── [id]/
│   │           └── route.ts         ← NEW
│   └── dashboard/
│       └── DashboardClient.tsx      ← MODIFIED: + delete button
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations. All implementation matched reference exactly. Verified via `npx tsc --noEmit` (0 errors) and `npm run lint` (0 errors, 1 pre-existing warning)._

### Completion Notes List

- **Task 1 ✅**: `deleteEvent(eventId, organizerId)` added to `data/events.ts` — Drizzle `delete().where(and(...))` with `.returning({ id })`, returns `null` if not found/not owned. Added `and` to drizzle-orm import.
- **Task 2 ✅**: `conventionals/app/api/events/[id]/route.ts` created — `DELETE = withAuth(...)`, `await ctx.params` before destructuring, parseInt validation, 404 for null result, 200 `{ success: true }` on delete.
- **Task 3 ✅**: `DashboardClient.tsx` updated — `deleting: Record<number, boolean>` state, `handleDelete` with `window.confirm`, `router.refresh()` on success, `window.alert` on error. Delete button styled in red, disabled with gray while deleting. UX confirmed by user.
- **Task 4 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/events.ts` (modified — added `deleteEvent`, added `and` import)
- `conventionals/app/api/events/[id]/route.ts` (created)
- `conventionals/app/dashboard/DashboardClient.tsx` (modified — added delete button + state)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
