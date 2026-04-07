# Story 5.3: Attendee Login & Logout

Status: review

## Story

As an **attendee**,
I want to log in and out of my account,
So that I can access my profile securely from any device.

## Acceptance Criteria

**Given** I am on `/attendee/login`
**When** I submit valid email and password
**Then** `POST /api/attendee/auth/login` verifies with `bcryptjs`, sets `session.attendeeAccountId`, and redirects to `/attendee/dashboard`
**When** I submit invalid credentials
**Then** I receive a generic error — no indication of which field was wrong
**And** the timing-safe dummy hash pattern is used when the email is not found
**When** I click logout
**Then** `POST /api/attendee/auth/logout` clears `session.attendeeAccountId` and redirects to `/attendee/login`
**And** `/attendee/login` redirects to `/attendee/dashboard` if already authenticated

## Tasks / Subtasks

- [x] Task 1: Add `loginAttendee` to `data/attendees.ts` (AC: bcrypt verify, timing-safe, generic error)
  - [x] Added `DUMMY_HASH` constant and `bcrypt` import
  - [x] Added `loginAttendee` — normalizes email, always runs `bcrypt.compare`, returns `{ id, email }` or null

- [x] Task 2: Create `app/api/attendee/auth/login/route.ts` — public POST
  - [x] `password.length > 1024` guard, generic error message for all failures, sets `attendeeAccountId`

- [x] Task 3: Create `app/api/attendee/auth/logout/route.ts` — POST, no auth
  - [x] Clears `attendeeAccountId`, saves session, returns `{ success: true }`
  - [x] Removed unused `req: NextRequest` param (lint fix)

- [x] Task 4: Create `app/attendee/login/page.tsx` — Server Component
  - [x] Redirects to `/attendee/dashboard` if `attendeeAccountId` set, otherwise renders `AttendeeLoginForm`

- [x] Task 5: Create `app/attendee/login/AttendeeLoginForm.tsx` — Client Component (UX approved)
  - [x] Centered card, email + password, "Log in" button, generic error, `router.push('/attendee/dashboard')` on success, organizer link

- [x] Task 6: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` — 0 errors
  - [x] `npm run lint` — 0 errors, 1 pre-existing warning

## Dev Notes

### `loginAttendee` — `data/attendees.ts`

```typescript
import bcrypt from 'bcryptjs'

// Timing-safe dummy hash — prevents user enumeration via response time
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export async function loginAttendee(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [account] = await db
    .select({ id: attendeeAccounts.id, email: attendeeAccounts.email, passwordHash: attendeeAccounts.passwordHash })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.email, normalizedEmail))
  const hashToCompare = account?.passwordHash ?? DUMMY_HASH
  const isValid = await bcrypt.compare(password, hashToCompare)
  if (!account || !isValid) return null
  return { id: account.id, email: account.email }
}
```

### Login Route — `app/api/attendee/auth/login/route.ts`

Mirrors `app/api/auth/login/route.ts` pattern but sets `attendeeAccountId`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { loginAttendee } from '@/data/attendees'

export async function POST(req: NextRequest) {
  let body: { email?: unknown; password?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
  const { email, password } = body
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  }
  if (password.length > 1024) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  }
  try {
    const account = await loginAttendee(email, password)
    if (!account) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.organizerId = undefined
    session.attendeeAccountId = account.id
    await session.save()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Attendee login error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Logout Route — `app/api/attendee/auth/logout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.attendeeAccountId = undefined
  await session.save()
  return NextResponse.json({ success: true })
}
```

### `AttendeeLoginForm` — Logout Button

After login, the attendee dashboard (story 5+ later) will have a logout button. For now `AttendeeLoginForm` only handles login. The logout button is added when the dashboard is built (story 6-1).

However, the logout route must exist now so the attendee dashboard can call it.

### Files to Create / Modify

```
conventionals/
├── data/
│   └── attendees.ts                           ← MODIFY: add loginAttendee + bcrypt + DUMMY_HASH
├── app/
│   ├── api/
│   │   └── attendee/
│   │       └── auth/
│   │           ├── login/
│   │           │   └── route.ts              ← CREATE
│   │           └── logout/
│   │               └── route.ts              ← CREATE
│   └── attendee/
│       └── login/
│           ├── page.tsx                      ← CREATE
│           └── AttendeeLoginForm.tsx         ← CREATE
```

### Key Implementation Rules

**DO:**
- Always run `bcrypt.compare` even when email not found (dummy hash) — timing safety
- Generic error for both wrong email and wrong password — no field-level hints
- `password.length > 1024` guard before bcrypt
- Clear `session.organizerId = undefined` when setting attendee session (and vice versa)
- Client (`AttendeeLoginForm`) handles redirect via `router.push` — route returns `{ success: true }`

**DO NOT:**
- Return different errors for "email not found" vs "wrong password"
- Skip the dummy hash timing protection
- Add `withAttendeeAuth` to the logout route — session may already be invalid

### Architecture References

- [Source: architecture.md#Authentication & Security] — timing-safe login, dummy hash pattern for both auth paths
- [Source: epics.md#Story 5.3] — attendee login/logout, `session.attendeeAccountId`, redirect pattern

### Previous Story Learnings (1-5 through 5-2)

- Session pattern: `getIronSession`, set fields, `session.save()`, return `{ success: true }`; client `router.push`
- `password.length > 1024` guard before bcrypt
- UX changes require explicit user approval
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Project Structure After This Story

```
conventionals/
├── data/
│   └── attendees.ts           ← MODIFIED: + loginAttendee
└── app/
    ├── api/
    │   └── attendee/
    │       └── auth/
    │           ├── login/route.ts  ← NEW
    │           └── logout/route.ts ← NEW
    └── attendee/
        └── login/
            ├── page.tsx            ← NEW
            └── AttendeeLoginForm.tsx ← NEW
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Logout route had unused `req: NextRequest` param — removed from signature to fix lint warning.

### Completion Notes List

- **Task 1 ✅**: `data/attendees.ts` — `loginAttendee` added with `DUMMY_HASH` timing-safe pattern, normalizes email, always runs bcrypt.compare.
- **Task 2 ✅**: `app/api/attendee/auth/login/route.ts` — public POST, 1024 char guard, generic error, sets `attendeeAccountId`.
- **Task 3 ✅**: `app/api/attendee/auth/logout/route.ts` — `POST()` (no req param), clears `attendeeAccountId`.
- **Task 4 ✅**: `app/attendee/login/page.tsx` — redirects if `attendeeAccountId` set, renders `AttendeeLoginForm`.
- **Task 5 ✅**: `app/attendee/login/AttendeeLoginForm.tsx` — centered card, email/password fields, organizer link.
- **Task 6 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/attendees.ts` (modified — loginAttendee, DUMMY_HASH, bcrypt import)
- `conventionals/app/api/attendee/auth/login/route.ts` (created)
- `conventionals/app/api/attendee/auth/logout/route.ts` (created)
- `conventionals/app/attendee/login/page.tsx` (created)
- `conventionals/app/attendee/login/AttendeeLoginForm.tsx` (created)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. 0 TypeScript errors, 0 lint errors.
