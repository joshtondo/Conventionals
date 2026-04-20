# Story 6.4: Connections List & Notes

Status: review

## Story

As an **attendee**,
I want to view all my connections and edit notes on each one,
so that I can remember details about people I met and prepare for outreach.

## Acceptance Criteria

**Given** I am logged in and on `/attendee/connections`
**When** the page loads
**Then** all my connections are listed with name, contact info, event context, and saved notes
**And** connections are sorted by most recently created or updated
**When** I edit the notes field on a connection and save
**Then** `PATCH /api/attendee/connections/[id]` updates the `notes` field for that connection
**And** only the connection owner can view or edit — `owner_id` verified on every read/write
**And** `data/connections.ts` exports `getConnections(ownerAccountId)` and `updateConnectionNotes(connectionId, ownerAccountId, notes)`

## Tasks / Subtasks

- [x] Task 1: Add `getConnections` and `updateConnectionNotes` to `data/connections.ts` (AC: owner-scoped reads/writes)
  - [x] Add `events` to schema import; add `desc` to drizzle-orm imports
  - [x] Export `getConnections(ownerAccountId)`: SELECT `connections.*` + `events.name` as `eventName` from `connections` LEFT JOIN `events` WHERE `connections.ownerId = ownerAccountId` ORDER BY `connections.updatedAt DESC`
  - [x] Export `updateConnectionNotes(connectionId, ownerAccountId, notes)`: UPDATE `connections` SET `notes`, `updatedAt = new Date().toISOString()` WHERE `id = connectionId AND ownerId = ownerAccountId`; return `null` if no row updated (not found / wrong owner); else return `{ id }`

- [x] Task 2: Create `PATCH /api/attendee/connections/[id]/route.ts` (AC: updates notes, owner verified)
  - [x] Create `conventionals/app/api/attendee/connections/[id]/route.ts`
  - [x] `await params` before destructuring to get `id` (Next.js 16 requirement)
  - [x] Export `PATCH` wrapped in `withAttendeeAuth`
  - [x] Parse `connectionId = parseInt(id)` — return 400 if `isNaN`
  - [x] Parse body: `{ notes }` — must be string or null; return 400 if invalid type
  - [x] Call `updateConnectionNotes(connectionId, ctx.session.attendeeAccountId!, notes)`
  - [x] Return 404 `{ error: 'Not found' }` if result is `null`; else 200 `{ success: true }`

- [x] Task 3: Create `app/attendee/connections/ConnectionCard.tsx` — Client Component (AC: editable notes, Save button)
  - [x] **UX APPROVAL REQUIRED** — describe change and get explicit "y" before implementing
  - [x] Proposed UX: card with bold name, contact info links (LinkedIn/Twitter/Website), event name if present (muted), notes textarea pre-filled with saved notes, "Save" button; feedback states: default "Save", loading "Saving…" (disabled), success shows "Saved!" text briefly; inline styles matching existing attendee page patterns
  - [x] Props: `id`, `connectedName`, `contactInfo`, `eventName`, `notes` (initial value)
  - [x] PATCH `/api/attendee/connections/${id}` with `{ notes }` on save

- [x] Task 4: Create `app/attendee/connections/page.tsx` — Server Component (AC: lists connections, pre-filled notes)
  - [x] Session guard: `getIronSession` → if no `attendeeAccountId` → `redirect('/attendee/login')`
  - [x] Call `getConnections(session.attendeeAccountId)` — pass result to render
  - [x] Render `<ConnectionCard>` per connection; empty state "No connections yet."
  - [x] Back link: "← My Events" → `/attendee/dashboard`; heading: "My Connections"

- [x] Task 5: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors

## Dev Notes

### `getConnections` DAL (Task 1)

Extend imports in `data/connections.ts`:
- Add `events` to schema import: `import { connections, events } from '@/drizzle/schema'`
- Add `desc` to drizzle-orm import: `import { eq, and, isNull, desc } from 'drizzle-orm'`

```typescript
export async function getConnections(ownerAccountId: number) {
  return db
    .select({
      id: connections.id,
      connectedName: connections.connectedName,
      contactInfo: connections.contactInfo,
      notes: connections.notes,
      eventId: connections.eventId,
      eventName: events.name,
      createdAt: connections.createdAt,
      updatedAt: connections.updatedAt,
    })
    .from(connections)
    .leftJoin(events, eq(connections.eventId, events.id))
    .where(eq(connections.ownerId, ownerAccountId))
    .orderBy(desc(connections.updatedAt))
}
```

### `updateConnectionNotes` DAL (Task 1)

```typescript
export async function updateConnectionNotes(
  connectionId: number,
  ownerAccountId: number,
  notes: string | null
) {
  const result = await db
    .update(connections)
    .set({ notes, updatedAt: new Date().toISOString() })
    .where(and(eq(connections.id, connectionId), eq(connections.ownerId, ownerAccountId)))
    .returning({ id: connections.id })
  return result[0] ?? null
}
```

### PATCH Route (Task 2)

```typescript
// app/api/attendee/connections/[id]/route.ts
import { NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { updateConnectionNotes } from '@/data/connections'

export const PATCH = withAttendeeAuth(async (req, ctx) => {
  const { id } = await ctx.params
  const connectionId = parseInt(id)
  if (isNaN(connectionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  let body: { notes?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (body.notes !== null && typeof body.notes !== 'string') {
    return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 })
  }

  const result = await updateConnectionNotes(connectionId, ctx.session.attendeeAccountId!, body.notes ?? null)
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
})
```

### `ConnectionCard.tsx` Client Component (Task 3)

```typescript
'use client'
import { useState } from 'react'

type ContactInfo = { email?: string; linkedin?: string; twitter?: string; website?: string } | null

type Props = {
  id: number
  connectedName: string
  contactInfo: ContactInfo
  eventName: string | null
  notes: string | null
}

export default function ConnectionCard({ id, connectedName, contactInfo, eventName, notes: initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function handleSave() {
    setStatus('saving')
    try {
      await fetch(`/api/attendee/connections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: notes || null }),
      })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('idle')
    }
  }

  // render card with name, contact links, eventName, notes textarea, save button
}
```

### `ConnectionCard` ContactInfo type alignment

`contactInfo` in the DB schema is typed as `{ email?: string; linkedin?: string; twitter?: string; website?: string } | null`. When passed as a prop from the Server Component, cast it appropriately — `getConnections` returns the Drizzle-inferred type.

### Connections Page (Task 4)

```typescript
// app/attendee/connections/page.tsx
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getConnections } from '@/data/connections'
import ConnectionCard from './ConnectionCard'

export default async function ConnectionsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const connectionsList = await getConnections(session.attendeeAccountId)

  // render with ConnectionCard per item
}
```

### Inline Style Pattern (match existing attendee pages)

Follow the `const s = { ... } as React.CSSProperties` pattern from `dashboard/page.tsx`:
- `container`, `backLink`, `heading`, `empty`: identical to dashboard
- `card`: same card style (`#fff`, border, borderRadius, padding, marginBottom, maxWidth: '600px')
- `name`: `fontWeight: '600'`, `color: '#111827'`, `margin: '0 0 0.25rem'`
- `meta`: `fontSize: '0.875rem'`, `color: '#6b7280'`, `margin: '0 0 0.5rem'`
- `link`: `fontSize: '0.75rem'`, `color: '#4f46e5'`, `marginRight: '0.75rem'`, `textDecoration: 'none'`
- `textarea`: width `100%`, `minHeight: '80px'`, border, borderRadius, fontSize, padding, resize vertical, boxSizing border-box
- `saveButton` / `saveButtonDisabled`: same pattern as `ProfileForm.tsx` submit buttons

### Key Patterns (from 6-3 learnings)

- `import 'server-only'` already in `data/connections.ts` — do not add again
- `withAttendeeAuth` on PATCH route — `ctx.params` is accessible from the HOF context
- `await params` / `await ctx.params` BEFORE destructuring — mandatory in Next.js 16
- Ownership check done in DAL (`AND ownerId = ownerAccountId`) — never in route handler
- Return `null` from DAL for not-found (never throw) — route converts to 404
- LEFT JOIN for event name (connection may not have an eventId)
- `updatedAt` must be manually set to `new Date().toISOString()` on update — no DB-level auto-update trigger
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`
- UX changes require explicit user approval (project policy)

### Files to Create / Modify

```
conventionals/
├── data/
│   └── connections.ts                              ← MODIFY: add getConnections + updateConnectionNotes
├── app/
│   ├── api/
│   │   └── attendee/
│   │       └── connections/
│   │           └── [id]/
│   │               └── route.ts                   ← CREATE
│   └── attendee/
│       └── connections/
│           ├── page.tsx                           ← CREATE
│           └── ConnectionCard.tsx                 ← CREATE
```

### Architecture References

- [Source: architecture.md#Database Schema] — `connections` table; `owner_id` FK; `contact_info` JSONB; `updated_at` must be set on every update
- [Source: architecture.md#Authentication & Security] — `withAttendeeAuth` HOF; ownership check `owner_id = session.attendeeAccountId` on every read/write
- [Source: epics.md#Story 6.4] — `getConnections(ownerAccountId)`, `updateConnectionNotes(connectionId, ownerAccountId, notes)`, sorted by most recently updated
- [Source: epics.md#Story 6.4] — connections private — NFR14: never visible to non-owner

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None_

### Completion Notes List

- Extended `data/connections.ts` with `getConnections` (LEFT JOIN events, ORDER BY updatedAt DESC) and `updateConnectionNotes` (ownership-scoped UPDATE, manual updatedAt)
- Created PATCH route with `await ctx.params`, 400 on invalid id/body, 404 on null DAL result
- Created `ConnectionCard.tsx` client component with 3-state save feedback (idle/saving/saved)
- Created `connections/page.tsx` Server Component with session guard and ConnectionCard per item
- `npx tsc --noEmit` — 0 errors; `npm run lint` — 0 errors

### File List

- `conventionals/data/connections.ts` — MODIFIED: added `getConnections`, `updateConnectionNotes`, extended imports
- `conventionals/app/api/attendee/connections/[id]/route.ts` — CREATED
- `conventionals/app/attendee/connections/ConnectionCard.tsx` — CREATED
- `conventionals/app/attendee/connections/page.tsx` — CREATED

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete, status → review.
