# Story 4.2: QR Scan Check-in

Status: review

## Story

As **check-in staff**,
I want to scan an attendee's QR code to mark them as checked in,
So that attendance is tracked in real time.

## Acceptance Criteria

**Given** an attendee has not yet checked in
**When** their QR code is scanned and `POST /api/badges/[token]/checkin` is called
**Then** the badge record is updated with `checked_in_at` timestamp and the response returns `{ checkedIn: true }`
**Given** the attendee has already checked in
**When** the same QR code is scanned again
**Then** the endpoint returns `{ alreadyCheckedIn: true }` — no state change, no error
**And** the check-in endpoint requires no authentication
**And** `data/badges.ts` exports `checkinBadge(token)`

## Tasks / Subtasks

- [x] Task 1: Add `checkinBadge` to `data/badges.ts` (AC: idempotent check-in, sets `checked_in_at`)
  - [x] Add `checkinBadge(token: string)` that first selects the badge by token (fields: `id`, `checkedIn`, `checkedInAt`)
  - [x] If no row found, return `null`
  - [x] If `badge.checkedIn` is `true`, return `{ alreadyCheckedIn: true }` — no DB update
  - [x] Otherwise: `db.update(badges).set({ checkedIn: true, checkedInAt: new Date().toISOString() }).where(eq(badges.id, badge.id))`; return `{ checkedIn: true }`

- [x] Task 2: Create `app/api/badges/[token]/checkin/route.ts` — no-auth POST (AC: 404 for unknown token, idempotent response)
  - [x] Create `conventionals/app/api/badges/[token]/checkin/route.ts`
  - [x] Export `POST` handler — no `withAuth` (public, check-in staff use case)
  - [x] `const { token } = await ctx.params`
  - [x] Call `checkinBadge(token)`
  - [x] If result is `null`, return `NextResponse.json({ error: 'Not found' }, { status: 404 })`
  - [x] Otherwise return `NextResponse.json(result)` — passes through `{ checkedIn: true }` or `{ alreadyCheckedIn: true }` as-is

- [x] Task 3: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### `checkinBadge` — DAL Function

Add to `data/badges.ts` (file already has `import 'server-only'`, `db`, `badges`, `eq`):

```typescript
export async function checkinBadge(token: string) {
  const [badge] = await db
    .select({ id: badges.id, checkedIn: badges.checkedIn })
    .from(badges)
    .where(eq(badges.token, token))
  if (!badge) return null
  if (badge.checkedIn) return { alreadyCheckedIn: true }
  await db
    .update(badges)
    .set({ checkedIn: true, checkedInAt: new Date().toISOString() })
    .where(eq(badges.id, badge.id))
  return { checkedIn: true }
}
```

`checkedInAt` column has `mode: 'string'` in the schema — `new Date().toISOString()` produces a valid ISO 8601 string that PostgreSQL parses as `timestamptz`.

### Route — `app/api/badges/[token]/checkin/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkinBadge } from '@/data/badges'

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const result = await checkinBadge(token)
  if (result === null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(result)
}
```

No request body needed — the token in the URL is the only input.

### Files to Create / Modify

```
conventionals/
├── data/
│   └── badges.ts                   ← MODIFY: add checkinBadge
└── app/
    └── api/
        └── badges/
            └── [token]/
                └── checkin/
                    └── route.ts    ← CREATE
```

No schema migration required — `badges.checkedIn` (boolean) and `badges.checkedInAt` (timestamptz) columns already exist from the original schema.

### Key Implementation Rules

**DO:**
- Return `null` (not throw) when badge token is not found — caller converts to 404
- Return the result object directly from `checkinBadge` — the route passes it through as-is
- `new Date().toISOString()` for `checkedInAt` — compatible with `mode: 'string'` column
- No authentication on `POST /api/badges/[token]/checkin` — staff check-in is intentionally public

**DO NOT:**
- Add `withAuth` to the check-in route handler
- Add `export const runtime = 'edge'`
- Return an error when `alreadyCheckedIn: true` — idempotency is explicit in the AC
- Query `checked_in_at` in the select — only `id` and `checkedIn` are needed to branch

### Architecture References

- [Source: architecture.md#Structure Patterns] — `app/api/badges/[token]/checkin/route.ts` (POST — no auth, idempotent)
- [Source: architecture.md#Requirements Coverage] — "Double check-in idempotency: `checkinBadge()` checks existing flag → `{ alreadyCheckedIn: true }`"
- [Source: epics.md#Story 4.2] — `checkinBadge(token)`, no auth, idempotent

### Previous Story Learnings (1-5 through 4-1)

- All commands run from `conventionals/` directory
- `import 'server-only'` mandatory first line of all `data/` files
- `await ctx.params` mandatory in Next.js 15 route handlers
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Project Structure After This Story

```
conventionals/
├── data/
│   └── badges.ts               ← MODIFIED: + checkinBadge
└── app/
    └── api/
        └── badges/
            └── [token]/
                └── checkin/
                    └── route.ts ← NEW
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations._

### Completion Notes List

- **Task 1 ✅**: `data/badges.ts` — `checkinBadge(token)` added; selects `id` + `checkedIn`, returns null for missing token, `{ alreadyCheckedIn: true }` for already-checked-in, otherwise updates `checkedIn = true` + `checkedInAt = new Date().toISOString()` and returns `{ checkedIn: true }`.
- **Task 2 ✅**: `app/api/badges/[token]/checkin/route.ts` created — public `POST`, `await ctx.params`, 404 for null result, passes result through as JSON.
- **Task 3 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/badges.ts` (modified — added checkinBadge)
- `conventionals/app/api/badges/[token]/checkin/route.ts` (created)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
