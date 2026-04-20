# Story 3.3: QR Code Generation

Status: review

## Story

As an **organizer**,
I want each badge to include a QR code image,
So that attendees can be checked in by scanning their badge.

## Acceptance Criteria

**Given** a new attendee is being added
**When** `createAttendeeAndBadge` runs
**Then** `lib/qr.ts: generateQR(badgeUrl)` produces a base64 PNG data URL from `NEXT_PUBLIC_APP_URL/badge/[token]`
**And** the QR data URL is available for inclusion in the badge email
**And** `lib/qr.ts` uses the `qrcode` package with Node.js runtime only (never edge)

## Tasks / Subtasks

- [x] Task 1: Create `lib/qr.ts` — `generateQR(badgeUrl)` (AC: generates base64 PNG data URL)
  - [x] Create `conventionals/lib/qr.ts`
  - [x] Begin with `import 'server-only'`
  - [x] Import `QRCode` from `qrcode`
  - [x] Implement `generateQR(badgeUrl: string): Promise<string>` — calls `QRCode.toDataURL(badgeUrl)`, returns the base64 PNG data URL string
  - [x] Export the function (named export, no default)

- [x] Task 2: Update `data/badges.ts` — call `generateQR` in `createAttendeeAndBadge` and return QR data URL (AC: QR data URL available for badge email)
  - [x] Import `generateQR` from `@/lib/qr`
  - [x] After badge insert, call `const qrDataUrl = await generateQR(`${process.env.NEXT_PUBLIC_APP_URL}/badge/${badge.token}`)`
  - [x] Return `{ attendee, badge, qrDataUrl }` (adds `qrDataUrl` to the return value)
  - [x] No error handling for QR generation — allow exceptions to propagate (non-fatal pattern added in story 3.4)

- [x] Task 3: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### Package Already Installed

`qrcode@^1.5.4` and `@types/qrcode@^1.5.6` are already in `package.json` — do NOT run `npm install`.

### `lib/qr.ts` — Full Implementation

```typescript
import 'server-only'
import QRCode from 'qrcode'

export async function generateQR(badgeUrl: string): Promise<string> {
  return QRCode.toDataURL(badgeUrl)
}
```

`QRCode.toDataURL` returns a `Promise<string>` with a `data:image/png;base64,...` URL. Node.js runtime only — never add `export const runtime = 'edge'` to any route that calls this.

### `data/badges.ts` — Updated `createAttendeeAndBadge`

```typescript
import { generateQR } from '@/lib/qr'

export async function createAttendeeAndBadge(
  organizerId: number,
  eventId: number,
  name: string,
  email: string
) {
  const trimmedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()

  const [attendee] = await db
    .insert(attendees)
    .values({ eventId, name: trimmedName, email: normalizedEmail })
    .returning({ id: attendees.id, name: attendees.name, email: attendees.email, inviteToken: attendees.inviteToken })

  const [badge] = await db
    .insert(badges)
    .values({ attendeeId: attendee.id, token: crypto.randomUUID() })
    .returning({ id: badges.id, token: badges.token, emailSent: badges.emailSent })

  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/badge/${badge.token}`
  const qrDataUrl = await generateQR(badgeUrl)

  return { attendee, badge, qrDataUrl }
}
```

**Note:** `organizerId` parameter is accepted but not used directly in this function — it's used by the caller (route handler) for ownership verification before calling this function. Keep the parameter in the signature for API consistency.

**Note:** `NEXT_PUBLIC_APP_URL` is a server-side env var used here in a server-only DAL function — this is correct. It is also client-accessible (NEXT_PUBLIC_ prefix) for use in email templates.

### Files to Create / Modify

```
conventionals/
├── lib/
│   └── qr.ts              ← CREATE
└── data/
    └── badges.ts          ← MODIFY: import generateQR, call after badge insert, return qrDataUrl
```

### Key Implementation Rules

**DO:**
- `import 'server-only'` in `lib/qr.ts` — prevents accidental client bundle inclusion
- Return the full `data:image/png;base64,...` string from `generateQR` — this is what goes in the `<img src>` in the email HTML
- Keep `organizerId` in `createAttendeeAndBadge` signature even though it's unused in the function body — callers rely on this signature and it documents the ownership context

**DO NOT:**
- Add error handling around `generateQR` in `createAttendeeAndBadge` — story 3.4 adds non-fatal email failure handling; for now let QR errors propagate
- Import `qrcode` as `import { toDataURL } from 'qrcode'` — the default import `QRCode` is the correct usage for the `qrcode` package
- Use `QRCode.toString()` (returns SVG string by default) — use `QRCode.toDataURL()` for PNG base64

### Previous Story Learnings (1-5 through 3-2)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- `import 'server-only'` mandatory first line of all `lib/` and `data/` files
- No Tailwind, inline `s` styles only
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Architecture References

- [Source: architecture.md#Enforcement Guidelines] — rule 2: never skip `import 'server-only'` in `lib/` files
- [Source: architecture.md#Enforcement Guidelines] — rule 1: no `export const runtime = 'edge'` (qrcode requires Node.js)
- [Source: epics.md#Story 3.3] — `generateQR(badgeUrl)`, base64 PNG data URL, Node.js only

### Project Structure After This Story

```
conventionals/
├── lib/
│   └── qr.ts              ← NEW
└── data/
    └── badges.ts          ← MODIFIED: + generateQR call, updated return type
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations. Straightforward implementation._

### Completion Notes List

- **Task 1 ✅**: `lib/qr.ts` created — `import 'server-only'`, `generateQR(badgeUrl)` calls `QRCode.toDataURL(badgeUrl)`, returns `Promise<string>` base64 PNG data URL.
- **Task 2 ✅**: `data/badges.ts` updated — imports `generateQR`, builds `badgeUrl` from `NEXT_PUBLIC_APP_URL`, calls `generateQR`, returns `{ attendee, badge, qrDataUrl }`.
- **Task 3 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/lib/qr.ts` (created)
- `conventionals/data/badges.ts` (modified — added generateQR import and call, updated return)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
