# Story 4.1: Public Badge Page

Status: review

## Story

As an **attendee**,
I want to access my badge by navigating to my badge URL,
So that I can show it for check-in or share it.

## Acceptance Criteria

**Given** a badge token exists
**When** anyone visits `NEXT_PUBLIC_APP_URL/badge/[token]`
**Then** the page renders the attendee's name, event name, and QR code — no authentication required
**And** `GET /api/badges/[token]` returns the badge data (attendee name, event name, token)
**And** visiting a non-existent token returns HTTP 404
**And** `data/badges.ts` exports `getBadgeByToken(token)`

## Tasks / Subtasks

- [x] Task 1: Add `getBadgeByToken` to `data/badges.ts` (AC: DAL function for public badge lookup)
  - [x] Add `getBadgeByToken(token: string)` that joins `badges` → `attendees` → `events`, returning `{ attendeeName: string, eventName: string, token: string } | null`
  - [x] Use `eq(badges.token, token)` as the WHERE clause — no auth / organizerId scope (public)
  - [x] Return `null` if not found (caller handles 404)

- [x] Task 2: Create `app/api/badges/[token]/route.ts` — public GET (AC: API returns badge data, 404 for unknown token)
  - [x] Create `conventionals/app/api/badges/[token]/route.ts`
  - [x] Export `GET` handler — no `withAuth` (public endpoint)
  - [x] `await ctx.params` to get `token`; call `getBadgeByToken(token)`
  - [x] If null, return `NextResponse.json({ error: 'Not found' }, { status: 404 })`
  - [x] On success, return `NextResponse.json({ name: badge.attendeeName, eventName: badge.eventName, token: badge.token })`

- [x] Task 3: Create `app/badge/[token]/page.tsx` — public Server Component (AC: renders name, event name, QR code, 404 for unknown token)
  - [x] Create `conventionals/app/badge/[token]/page.tsx`
  - [x] Server Component (no `'use client'`); `export default async function BadgePage({ params }: { params: Promise<{ token: string }> })`
  - [x] `const { token } = await params`
  - [x] Call `getBadgeByToken(token)`; if null call `notFound()` from `next/navigation`
  - [x] Build `badgeUrl = \`${process.env.NEXT_PUBLIC_APP_URL}/badge/${token}\``
  - [x] Call `generateQR(badgeUrl)` from `@/lib/qr` — returns base64 PNG data URL
  - [x] Render a centered card with: attendee name (heading), event name (subheading), QR code `<img>` (200×200), and badge URL as text
  - [x] Inline styles consistent with existing pages (no Tailwind, `s` object pattern)

- [x] Task 4: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### `getBadgeByToken` — DAL Function

Add to `data/badges.ts` (existing file — already imports `db`, schema tables, `eq`, `and`, etc.):

```typescript
export async function getBadgeByToken(token: string) {
  const [row] = await db
    .select({
      attendeeName: attendees.name,
      eventName: events.name,
      token: badges.token,
    })
    .from(badges)
    .innerJoin(attendees, eq(attendees.id, badges.attendeeId))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(badges.token, token))
  return row ?? null
}
```

Note: `events` is already imported in `data/badges.ts`. Add `attendees` to the import from `@/drizzle/schema` if not already present (it is — check the existing import line).

### API Route — `app/api/badges/[token]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getBadgeByToken } from '@/data/badges'

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const badge = await getBadgeByToken(token)
  if (!badge) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ name: badge.attendeeName, eventName: badge.eventName, token: badge.token })
}
```

No `withAuth` — this endpoint is intentionally public (QR scanner compatibility).

### Badge Page — `app/badge/[token]/page.tsx`

```typescript
import { notFound } from 'next/navigation'
import { getBadgeByToken } from '@/data/badges'
import { generateQR } from '@/lib/qr'

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center' as const,
    maxWidth: '400px',
    width: '100%',
  } as React.CSSProperties,
  name: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.5rem',
  } as React.CSSProperties,
  eventName: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0 0 1.5rem',
  } as React.CSSProperties,
  qr: {
    width: '200px',
    height: '200px',
    margin: '0 auto 1.5rem',
    display: 'block',
  } as React.CSSProperties,
  tokenLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    wordBreak: 'break-all' as const,
  } as React.CSSProperties,
}

export default async function BadgePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const badge = await getBadgeByToken(token)
  if (!badge) notFound()

  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/badge/${token}`
  const qrDataUrl = await generateQR(badgeUrl)

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.name}>{badge.attendeeName}</h1>
        <p style={s.eventName}>{badge.eventName}</p>
        <img src={qrDataUrl} alt="QR Code" style={s.qr} />
        <p style={s.tokenLabel}>{badgeUrl}</p>
      </div>
    </div>
  )
}
```

### Files to Create / Modify

```
conventionals/
├── data/
│   └── badges.ts              ← MODIFY: add getBadgeByToken
├── app/
│   ├── api/
│   │   └── badges/
│   │       └── [token]/
│   │           └── route.ts   ← CREATE
│   └── badge/
│       └── [token]/
│           └── page.tsx       ← CREATE
```

### Key Implementation Rules

**DO:**
- Server Component for `app/badge/[token]/page.tsx` — no `'use client'`, can call `getBadgeByToken` and `generateQR` directly
- `await params` before destructuring — mandatory in Next.js 15
- `notFound()` from `next/navigation` for missing token — renders Next.js 404 page
- No authentication on the badge API or badge page — intentionally public
- `import { notFound } from 'next/navigation'` — not from `next/router`

**DO NOT:**
- Add `withAuth` to the `GET /api/badges/[token]` handler
- Add `export const runtime = 'edge'` — `generateQR` (qrcode package) requires Node.js
- Import `getBadgeByToken` in a Client Component — it's from `data/` which is `server-only`

### Existing Imports in `data/badges.ts`

Current imports: `db`, `attendees`, `badges`, `events` from schema, `eq`, `and`, `asc` from drizzle-orm, `generateQR`, `sendBadgeEmail`. All needed for `getBadgeByToken` are already imported.

### Architecture References

- [Source: architecture.md#Structure Patterns] — `app/badge/[token]/page.tsx` (Public Server Component — no auth)
- [Source: architecture.md#Structure Patterns] — `app/api/badges/[token]/route.ts` (GET — public, no auth)
- [Source: architecture.md#Enforcement Guidelines] — rule 7: always `await params`
- [Source: epics.md#Story 4.1] — public badge page, getBadgeByToken, 404 for non-existent token

### Previous Story Learnings (1-5 through 3-5)

- All commands run from `conventionals/` directory
- `import 'server-only'` mandatory first line of all `lib/` and `data/` files
- `await params` mandatory in Next.js 15 for both page components and route handlers
- `notFound()` from `next/navigation` used in Server Components for 404
- No Tailwind — inline `s` styles only, `as React.CSSProperties` cast
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`
- ESLint does NOT ignore `_` prefix vars — don't destructure unused params

### Project Structure After This Story

```
conventionals/
├── data/
│   └── badges.ts              ← MODIFIED: + getBadgeByToken
├── app/
│   ├── api/
│   │   └── badges/
│   │       └── [token]/
│   │           └── route.ts   ← NEW
│   └── badge/
│       └── [token]/
│           └── page.tsx       ← NEW
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `<img>` ESLint warning on badge page: `next/image` doesn't support base64 data URLs; suppressed with `eslint-disable-next-line @next/next/no-img-element`.

### Completion Notes List

- **Task 1 ✅**: `data/badges.ts` — `getBadgeByToken(token)` added; joins badges → attendees → events, selects `attendeeName`, `eventName`, `token`, returns null if not found.
- **Task 2 ✅**: `app/api/badges/[token]/route.ts` created — public `GET`, `await ctx.params`, 404 for unknown token, returns `{ name, eventName, token }`.
- **Task 3 ✅**: `app/badge/[token]/page.tsx` created — public Server Component, `await params`, `notFound()` for missing token, generates QR via `generateQR`, centered card with name/event/QR/badge URL.
- **Task 4 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/badges.ts` (modified — added getBadgeByToken)
- `conventionals/app/api/badges/[token]/route.ts` (created)
- `conventionals/app/badge/[token]/page.tsx` (created)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
