# Story 4.3: Badge Email Resend

Status: review

## Story

As an **organizer**,
I want to resend a badge email to a specific attendee,
So that attendees who didn't receive or lost their email can get it again.

## Acceptance Criteria

**Given** I am logged in and viewing the attendee table for my event
**When** I click resend for an attendee
**Then** `POST /api/badges/[token]/resend` regenerates and resends the badge email including the invite link
**And** ownership is verified: the badge must belong to an event owned by my `organizerId` — returns HTTP 404 if not (not 403)
**And** on success, `email_sent` is updated to `true`
**And** `data/badges.ts` exports `resendBadge(token, organizerId)`

## Tasks / Subtasks

- [x] Task 1: Add `resendBadge` to `data/badges.ts` (AC: ownership check, resend email, update `email_sent`)
  - [x] Add `resendBadge(token: string, organizerId: number)` that joins `badges` → `attendees` → `events`, selecting: `badges.id`, `attendees.name`, `attendees.email`, `attendees.inviteToken`, `events.organizerId`, `badges.token`
  - [x] If no row found OR `row.organizerId !== organizerId`, return `null` (caller returns 404)
  - [x] Build `badgeUrl = \`${process.env.NEXT_PUBLIC_APP_URL}/badge/${token}\``
  - [x] Build `inviteUrl = \`${process.env.NEXT_PUBLIC_APP_URL}/attendee/signup?token=${row.inviteToken}\``
  - [x] Call `generateQR(badgeUrl)` to get `qrDataUrl`
  - [x] Call `sendBadgeEmail({ to: row.email, name: row.name, badgeUrl, qrDataUrl, inviteUrl })` — non-fatal, returns boolean
  - [x] If email sent successfully (`emailSent === true`): `db.update(badges).set({ emailSent: true }).where(eq(badges.id, row.id))`
  - [x] Return `{ success: true }`

- [x] Task 2: Create `app/api/badges/[token]/resend/route.ts` — authenticated POST (AC: withAuth, 404 not 403)
  - [x] Create `conventionals/app/api/badges/[token]/resend/route.ts`
  - [x] Export `POST` handler wrapped in `withAuth`
  - [x] `const { token } = await ctx.params`
  - [x] Call `resendBadge(token, ctx.session.organizerId!)`
  - [x] If result is `null`, return `NextResponse.json({ error: 'Not found' }, { status: 404 })`
  - [x] Otherwise return `NextResponse.json({ success: true })`

- [x] Task 3: Add Resend button to attendee table in `UploadForm.tsx` (AC: organizer can click resend per attendee)
  - [x] UX approved by user
  - [x] Added "Email" column (Sent/Not sent pill) and "Resend" column to attendee table
  - [x] Per-row state: `resendingTokens: Set<string>`, `resentTokens: Set<string>` via `useState`
  - [x] `handleResend(token)` POSTs to `/api/badges/${token}/resend`, sets sending/sent state, sets `resendError` on failure
  - [x] Added `resendButton`, `resendButtonDisabled`, `resendSuccess`, `emailSentBadge` styles to `s` object

- [x] Task 4: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### `resendBadge` — DAL Function

Add to `data/badges.ts`. File already imports `db`, `badges`, `attendees`, `events`, `eq`, `generateQR`, `sendBadgeEmail`:

```typescript
export async function resendBadge(token: string, organizerId: number) {
  const [row] = await db
    .select({
      id: badges.id,
      token: badges.token,
      name: attendees.name,
      email: attendees.email,
      inviteToken: attendees.inviteToken,
      organizerId: events.organizerId,
    })
    .from(badges)
    .innerJoin(attendees, eq(attendees.id, badges.attendeeId))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(badges.token, token))
  if (!row || row.organizerId !== organizerId) return null

  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/badge/${token}`
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/attendee/signup?token=${row.inviteToken}`
  const qrDataUrl = await generateQR(badgeUrl)
  const emailSent = await sendBadgeEmail({ to: row.email, name: row.name, badgeUrl, qrDataUrl, inviteUrl })

  if (emailSent) {
    await db.update(badges).set({ emailSent: true }).where(eq(badges.id, row.id))
  }

  return { success: true }
}
```

### Route — `app/api/badges/[token]/resend/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { resendBadge } from '@/data/badges'

export const POST = withAuth(async (req, ctx) => {
  const { token } = await ctx.params
  const result = await resendBadge(token, ctx.session.organizerId!)
  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
})
```

### UploadForm.tsx — Resend Button (UX APPROVAL REQUIRED)

Before implementing Task 3, describe and get explicit user approval for the UI change:

**Proposed UI:** Add two new columns to the attendee table:
- "Email" — shows "Sent" (green) or "Not sent" (gray) based on `emailSent`
- "Resend" — button per row; disabled while sending; shows "Sent ✓" briefly after success

This requires adding `emailSent` display (already in `AttendeeRow`) and per-row resend state.

```tsx
// State additions:
const [resendingTokens, setResendingTokens] = useState<Set<string>>(new Set())
const [resentTokens, setResentTokens] = useState<Set<string>>(new Set())
const [resendError, setResendError] = useState<string | null>(null)

async function handleResend(token: string) {
  setResendError(null)
  setResendingTokens(prev => new Set(prev).add(token))
  try {
    const res = await fetch(`/api/badges/${token}/resend`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setResendError(data.error ?? 'Resend failed')
      return
    }
    setResentTokens(prev => new Set(prev).add(token))
  } catch {
    setResendError('Network error — please try again')
  } finally {
    setResendingTokens(prev => { const s = new Set(prev); s.delete(token); return s })
  }
}
```

### Files to Create / Modify

```
conventionals/
├── data/
│   └── badges.ts                   ← MODIFY: add resendBadge
├── app/
│   ├── api/
│   │   └── badges/
│   │       └── [token]/
│   │           └── resend/
│   │               └── route.ts    ← CREATE
│   └── event/
│       └── [id]/
│           └── upload/
│               └── UploadForm.tsx  ← MODIFY: add Resend button column
```

### Key Implementation Rules

**DO:**
- Return `null` when `row.organizerId !== organizerId` — 404 not 403 (prevents existence leaking)
- Follow the non-fatal email pattern from story 3-4: `sendBadgeEmail` catches its own errors; only update `email_sent` if returned `true`
- `withAuth` wraps the resend route — organizer session required
- Get UX approval before implementing Task 3

**DO NOT:**
- Return 403 for ownership mismatch — must be 404
- Throw from `resendBadge` if email fails — catch is inside `sendBadgeEmail`
- Skip the `organizerId` ownership check — badge tokens are public, anyone could call this endpoint without auth check in DAL

### Architecture References

- [Source: architecture.md#Structure Patterns] — `app/api/badges/[token]/resend/route.ts` (POST — withAuth, 404 not 403)
- [Source: architecture.md#Requirements Coverage] — "Badge email resend: withAuth, 404 not 403"
- [Source: epics.md#Story 4.3] — `resendBadge(token, organizerId)`, non-fatal email, `email_sent` update

### Previous Story Learnings (1-5 through 4-2)

- All commands run from `conventionals/` directory
- `import 'server-only'` mandatory first line of all `data/` files
- `await ctx.params` mandatory in Next.js 15 route handlers
- Non-fatal email pattern: `sendBadgeEmail` returns boolean, update DB only on success
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`
- UX changes require explicit user approval before implementation

### Project Structure After This Story

```
conventionals/
├── data/
│   └── badges.ts               ← MODIFIED: + resendBadge
├── app/
│   ├── api/
│   │   └── badges/
│   │       └── [token]/
│   │           └── resend/
│   │               └── route.ts ← NEW
│   └── event/
│       └── [id]/
│           └── upload/
│               └── UploadForm.tsx ← MODIFIED: + Resend button
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations._

### Completion Notes List

- **Task 1 ✅**: `data/badges.ts` — `resendBadge(token, organizerId)` joins badges → attendees → events, ownership check (null if mismatch), regenerates QR + resends email (non-fatal), updates `email_sent = true` on success, returns `{ success: true }`.
- **Task 2 ✅**: `app/api/badges/[token]/resend/route.ts` created — `withAuth` POST, `await ctx.params`, 404 for null result.
- **Task 3 ✅**: `UploadForm.tsx` updated — "Email" (Sent/Not sent pill) and "Resend" columns added to attendee table. Per-row `resendingTokens`/`resentTokens` state, `handleResend` function, `resendError` state. New styles: `emailSentBadge`, `resendButton`, `resendButtonDisabled`, `resendSuccess`.
- **Task 4 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/badges.ts` (modified — added resendBadge)
- `conventionals/app/api/badges/[token]/resend/route.ts` (created)
- `conventionals/app/event/[id]/upload/UploadForm.tsx` (modified — Email + Resend columns)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
