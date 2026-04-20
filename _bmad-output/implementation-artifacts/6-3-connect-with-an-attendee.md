# Story 6.3: Connect with an Attendee

Status: review

## Story

As an **attendee**,
I want to connect with another attendee,
so that I can keep track of people I met at an event.

## Acceptance Criteria

**Given** I am browsing public attendees at an event
**When** I click "Connect" on a public attendee's profile
**Then** `POST /api/attendee/connections` creates a connection record pre-filled with their name, contact info, and event context
**And** the same attendee cannot be connected with twice for the same event — returns HTTP 409 if duplicate
**And** a Drizzle migration creates the `connections` table
**And** `data/connections.ts` exports `createConnection(ownerAccountId, fields)` with `import 'server-only'`
**And** connections are private — never visible to anyone other than the owner

## Tasks / Subtasks

- [x] Task 1: Add `connections` table to `drizzle/schema.ts` and generate migration (AC: table created)
  - [x] Add `connections` table to `conventionals/drizzle/schema.ts` (see schema definition below)
  - [x] Run `npx drizzle-kit generate` from `conventionals/` to generate migration file
  - [x] Verify migration SQL is created in `conventionals/drizzle/migrations/`
  - [x] Run `npx drizzle-kit migrate` if `DIRECT_URL` is set; skip and document if not — migration file committed for Vercel

- [x] Task 2: Create `data/connections.ts` with `createConnection` (AC: inserts row, returns 409 signal on duplicate)
  - [x] `import 'server-only'` at top
  - [x] Import `db` from `@/lib/db`; import `connections`, `attendeeAccounts` from `@/drizzle/schema`; import `eq`, `and` from `drizzle-orm`
  - [x] Define `CreateConnectionFields` type: `{ connectedName: string; contactInfo?: { email?: string; linkedin?: string; twitter?: string; website?: string } | null; eventId?: number | null }`
  - [x] Export `createConnection(ownerAccountId, fields)`: check for existing connection (same `ownerId` + `eventId` + `connectedName`); return `{ duplicate: true }` if found; else INSERT and return `{ id }`

- [x] Task 3: Create `POST /api/attendee/connections/route.ts` (AC: creates connection, 409 on duplicate)
  - [x] Create `conventionals/app/api/attendee/connections/route.ts`
  - [x] Export `POST` wrapped in `withAttendeeAuth`
  - [x] Parse body: `{ connectedName, contactInfo, eventId }` — `connectedName` required non-empty string; return 400 if missing/invalid
  - [x] Call `createConnection(ctx.session.attendeeAccountId!, fields)`
  - [x] Return 409 `{ error: 'Already connected' }` if `result.duplicate`; else 201 `{ id: result.id }`

- [x] Task 4: Add "Connect" button to people page (AC: button POSTs connection, shows feedback)
  - [x] **UX APPROVAL REQUIRED** — describe change and get explicit "y" before implementing
  - [x] Proposed UX: small "Connect" button on each profile card; click POSTs `{ connectedName: person.name, contactInfo: { linkedin, twitter, website from socialLinks }, eventId }`; states: default "Connect", loading "Connecting…", success "Connected ✓" (disabled, green text), duplicate "Already connected" (disabled, muted); implemented as `ConnectButton.tsx` client component; people page (`page.tsx`) remains Server Component
  - [x] Create `app/attendee/event/[id]/people/ConnectButton.tsx` — Client Component
  - [x] Import and render `<ConnectButton>` inside each person card in `page.tsx`
  - [x] Pass `connectedName`, `contactInfo`, `eventId` as props to `ConnectButton`

- [x] Task 5: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors

## Dev Notes

### `connections` Table Schema (Task 1)

Add to `conventionals/drizzle/schema.ts` (after `attendeeAccounts`):

```typescript
export const connections = pgTable('connections', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').notNull().references(() => attendeeAccounts.id, { onDelete: 'cascade' }),
  connectedName: varchar('connected_name', { length: 255 }).notNull(),
  contactInfo: jsonb('contact_info').$type<{ email?: string; linkedin?: string; twitter?: string; website?: string }>(),
  notes: text('notes'),
  eventId: integer('event_id').references(() => events.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})
```

**Import additions needed in `schema.ts`:** `text` is already imported. All needed types (`serial`, `integer`, `varchar`, `jsonb`, `text`, `timestamp`) are already imported in line 1 — no new imports needed.

### drizzle-kit generate command

```bash
cd conventionals && npx drizzle-kit generate
```

If `DIRECT_URL` not set → skip `drizzle-kit migrate`, document in story. Migration file will be committed and applied on Vercel.

### `data/connections.ts` (Task 2)

```typescript
import 'server-only'
import { db } from '@/lib/db'
import { connections } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

type CreateConnectionFields = {
  connectedName: string
  contactInfo?: { email?: string; linkedin?: string; twitter?: string; website?: string } | null
  eventId?: number | null
}

export async function createConnection(ownerAccountId: number, fields: CreateConnectionFields) {
  // Duplicate check: same owner + event + name
  const [existing] = await db
    .select({ id: connections.id })
    .from(connections)
    .where(and(
      eq(connections.ownerId, ownerAccountId),
      eq(connections.eventId, fields.eventId ?? null),
      eq(connections.connectedName, fields.connectedName)
    ))
  if (existing) return { duplicate: true as const }

  const [row] = await db
    .insert(connections)
    .values({
      ownerId: ownerAccountId,
      connectedName: fields.connectedName,
      contactInfo: fields.contactInfo ?? null,
      eventId: fields.eventId ?? null,
    })
    .returning({ id: connections.id })
  return { id: row.id }
}
```

**NOTE on null eventId in duplicate check:** `eq(connections.eventId, null)` won't work in SQL — NULL != NULL. If `eventId` is null (manual connection not tied to an event), duplicate check should use `isNull`. Use conditional logic:

```typescript
import { eq, and, isNull } from 'drizzle-orm'

// In duplicate check:
const eventCondition = fields.eventId != null
  ? eq(connections.eventId, fields.eventId)
  : isNull(connections.eventId)

const [existing] = await db
  .select({ id: connections.id })
  .from(connections)
  .where(and(
    eq(connections.ownerId, ownerAccountId),
    eventCondition,
    eq(connections.connectedName, fields.connectedName)
  ))
```

### POST Route (Task 3)

```typescript
// app/api/attendee/connections/route.ts
import { NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { createConnection } from '@/data/connections'

export const POST = withAttendeeAuth(async (req, ctx) => {
  let body: { connectedName?: unknown; contactInfo?: unknown; eventId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (typeof body.connectedName !== 'string' || !body.connectedName.trim()) {
    return NextResponse.json({ error: 'connectedName is required' }, { status: 400 })
  }

  const fields = {
    connectedName: body.connectedName.trim(),
    contactInfo: typeof body.contactInfo === 'object' && body.contactInfo !== null
      ? body.contactInfo as { linkedin?: string; twitter?: string; website?: string }
      : null,
    eventId: typeof body.eventId === 'number' ? body.eventId : null,
  }

  const result = await createConnection(ctx.session.attendeeAccountId!, fields)
  if ('duplicate' in result) return NextResponse.json({ error: 'Already connected' }, { status: 409 })
  return NextResponse.json({ id: result.id }, { status: 201 })
})
```

### `ConnectButton.tsx` Client Component (Task 4)

```typescript
// app/attendee/event/[id]/people/ConnectButton.tsx
'use client'
import { useState } from 'react'

type Props = {
  connectedName: string
  contactInfo: { linkedin?: string; twitter?: string; website?: string } | null
  eventId: number
}

export default function ConnectButton({ connectedName, contactInfo, eventId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'duplicate'>('idle')

  async function handleConnect() {
    setState('loading')
    try {
      const res = await fetch('/api/attendee/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ connectedName, contactInfo, eventId }),
      })
      setState(res.status === 409 ? 'duplicate' : res.ok ? 'done' : 'idle')
    } catch {
      setState('idle')
    }
  }

  if (state === 'done') return <span style={{ fontSize: '0.75rem', color: '#059669' }}>Connected ✓</span>
  if (state === 'duplicate') return <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Already connected</span>

  return (
    <button
      onClick={handleConnect}
      disabled={state === 'loading'}
      style={{
        fontSize: '0.75rem',
        padding: '0.25rem 0.75rem',
        backgroundColor: state === 'loading' ? '#a5b4fc' : '#4f46e5',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        marginTop: '0.5rem',
      }}
    >
      {state === 'loading' ? 'Connecting…' : 'Connect'}
    </button>
  )
}
```

### Updating `people/page.tsx` to include `ConnectButton` (Task 4)

Pass `eventId` (already available from parsed `params`) and person data to each card:

```tsx
import ConnectButton from './ConnectButton'

// Inside each person card:
<ConnectButton
  connectedName={person.name}
  contactInfo={person.socialLinks ?? null}
  eventId={eventId}
/>
```

### Key Patterns (from Epic 5/6 learnings)

- `import 'server-only'` required at top of all `data/` files — new `data/connections.ts` needs it
- Never create a second Drizzle client — import singleton from `@/lib/db`
- `withAttendeeAuth` on the POST route — same pattern as profile PATCH
- Return `null` (or sentinel object like `{ duplicate: true }`) from DAL — no thrown errors
- `isNull()` from drizzle-orm for NULL comparisons — `eq(col, null)` does NOT work in SQL
- `await params` before destructuring (already done in `page.tsx`)
- Connections are private — no GET on this endpoint that returns other people's connections
- `drizzle-kit generate` → commit migration → `drizzle-kit migrate` (if DIRECT_URL available)

### Files to Create / Modify

```
conventionals/
├── drizzle/
│   ├── schema.ts                                  ← MODIFY: add connections table
│   └── migrations/                                ← NEW migration file (generated)
├── data/
│   └── connections.ts                             ← CREATE
├── app/
│   ├── api/
│   │   └── attendee/
│   │       └── connections/
│   │           └── route.ts                       ← CREATE
│   └── attendee/
│       └── event/
│           └── [id]/
│               └── people/
│                   ├── page.tsx                   ← MODIFY: import ConnectButton, pass props
│                   └── ConnectButton.tsx          ← CREATE
```

### Architecture References

- [Source: architecture.md#Database Schema] — `connections` table definition with JSONB `contact_info`
- [Source: architecture.md#Authentication & Security] — `withAttendeeAuth` HOF; ownership: `owner_id = session.attendeeAccountId`
- [Source: architecture.md#Enforcement Rules] — Never alter DB schema directly; use `drizzle-kit generate`
- [Source: epics.md#Story 6.3] — `createConnection(ownerAccountId, fields)`, 409 on duplicate, connections private (NFR14)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `drizzle-kit migrate` skipped — DIRECT_URL not set in `.env.local`; migration `0004_misty_carnage.sql` committed for Vercel

### Completion Notes List

- Added `connections` table to schema; `drizzle-kit generate` produced `0004_misty_carnage.sql`
- Created `data/connections.ts` with `isNull()` for null eventId duplicate check (SQL NULL != NULL via `eq`)
- Created `POST /api/attendee/connections` with `withAttendeeAuth`, 400 validation, 409 on duplicate, 201 on success
- Created `ConnectButton.tsx` client component with idle/loading/done/duplicate states
- Updated `people/page.tsx` to import and render `ConnectButton` per card
- `npx tsc --noEmit` — 0 errors; `npm run lint` — 0 errors

### File List

- `conventionals/drizzle/schema.ts` — MODIFIED: added `connections` table
- `conventionals/drizzle/migrations/0004_misty_carnage.sql` — CREATED (generated)
- `conventionals/data/connections.ts` — CREATED
- `conventionals/app/api/attendee/connections/route.ts` — CREATED
- `conventionals/app/attendee/event/[id]/people/ConnectButton.tsx` — CREATED
- `conventionals/app/attendee/event/[id]/people/page.tsx` — MODIFIED: added ConnectButton import + render

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete, status → review.
