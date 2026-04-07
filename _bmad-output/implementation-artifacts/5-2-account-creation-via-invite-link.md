# Story 5.2: Account Creation via Invite Link

Status: review

## Story

As an **attendee**,
I want to click my invite link and set a password to create my account,
So that I can access my Conventionals profile.

## Acceptance Criteria

**Given** I receive a badge email with an invite link (`/attendee/signup?token=[invite_token]`)
**When** I visit the link with a valid, unused token
**Then** I see an account setup page pre-filled with my name and email (read from the `attendees` row)
**When** I submit a password
**Then** `POST /api/attendee/auth/signup` creates an `attendee_accounts` row with a bcrypt-hashed password
**And** the `attendees` row `invite_used_at` is set to the current timestamp (token consumed)
**And** I am redirected to `/attendee/dashboard`
**When** I visit an already-used or non-existent invite token
**Then** I see an error: "This invite link has already been used or is invalid"

## Tasks / Subtasks

- [x] Task 1: Add DAL functions to `data/attendees.ts` (AC: token lookup, account creation, invite consumed)
  - [x] Added `getAttendeeByInviteToken(token)` — selects `id`, `name`, `email` WHERE `inviteToken = token AND inviteUsedAt IS NULL`
  - [x] Added `createAttendeeAccount(email, name, passwordHash)` — inserts into `attendeeAccounts`, returns `{ id }`
  - [x] Added `markInviteUsed(attendeeId)` — updates `inviteUsedAt = new Date().toISOString()`
  - [x] Added imports: `attendees`, `eq`, `isNull`, `and`

- [x] Task 2: Create `app/api/attendee/auth/signup/route.ts` — public POST
  - [x] Validates `token` + `password`, rejects `password.length > 1024`
  - [x] Re-validates token server-side via `getAttendeeByInviteToken`
  - [x] bcrypt hash (12 rounds), creates account, marks invite used, sets session, returns `{ success: true }`

- [x] Task 3: Create `app/attendee/signup/page.tsx` — public Server Component
  - [x] `await searchParams`, `ErrorCard` for missing/invalid token, renders `SignupForm` on success

- [x] Task 4: Create `app/attendee/signup/SignupForm.tsx` — Client Component (UX approved)
  - [x] Centered card, readonly name + email, password field, "Create Account" button, `router.push('/attendee/dashboard')` on success

- [x] Task 5: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` — 0 errors
  - [x] `npm run lint` — 0 errors, 1 pre-existing warning

## Dev Notes

### DAL Functions — `data/attendees.ts`

```typescript
import 'server-only'
import { db } from '@/lib/db'
import { attendeeAccounts, attendees } from '@/drizzle/schema'
import { eq, isNull, and } from 'drizzle-orm'

export async function getAttendeeByInviteToken(token: string) {
  const [row] = await db
    .select({ id: attendees.id, name: attendees.name, email: attendees.email })
    .from(attendees)
    .where(and(eq(attendees.inviteToken, token), isNull(attendees.inviteUsedAt)))
  return row ?? null
}

export async function createAttendeeAccount(email: string, name: string, passwordHash: string) {
  const [account] = await db
    .insert(attendeeAccounts)
    .values({ email, name, passwordHash })
    .returning({ id: attendeeAccounts.id })
  return account
}

export async function markInviteUsed(attendeeId: number) {
  await db
    .update(attendees)
    .set({ inviteUsedAt: new Date().toISOString() })
    .where(eq(attendees.id, attendeeId))
}
```

### Signup Route — `app/api/attendee/auth/signup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAttendeeByInviteToken, createAttendeeAccount, markInviteUsed } from '@/data/attendees'

export async function POST(req: NextRequest) {
  let body: { token?: unknown; password?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { token, password } = body
  if (!token || typeof token !== 'string' || !password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
  }
  if (password.length > 1024) {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
  }

  const attendee = await getAttendeeByInviteToken(token)
  if (!attendee) {
    return NextResponse.json({ error: 'This invite link has already been used or is invalid' }, { status: 400 })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const account = await createAttendeeAccount(attendee.email, attendee.name, passwordHash)
    await markInviteUsed(attendee.id)

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.organizerId = undefined
    session.attendeeAccountId = account.id
    await session.save()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Signup error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Signup Page — `app/attendee/signup/page.tsx`

```typescript
import { getAttendeeByInviteToken } from '@/data/attendees'
import SignupForm from './SignupForm'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams

  if (!token) {
    return <ErrorCard message="This invite link has already been used or is invalid" />
  }

  const attendee = await getAttendeeByInviteToken(token)
  if (!attendee) {
    return <ErrorCard message="This invite link has already been used or is invalid" />
  }

  return <SignupForm token={token} name={attendee.name} email={attendee.email} />
}
```

Use an inline `ErrorCard` function component or simple JSX — no need for a separate file.

### SignupForm UI (UX APPROVAL REQUIRED)

Proposed layout — centered card:
- Heading: "Create your Conventionals account"
- Subheading: "Welcome, [name]! Set a password to get started."
- Name field: readonly, pre-filled
- Email field: readonly, pre-filled
- Password field: required
- "Create Account" button
- Error display below button

### `searchParams` in Next.js 15

`searchParams` must be awaited — same async API as `params`:
```typescript
const { token } = await searchParams
```

### Files to Create / Modify

```
conventionals/
├── data/
│   └── attendees.ts                           ← MODIFY: add 3 DAL functions + imports
├── app/
│   ├── api/
│   │   └── attendee/
│   │       └── auth/
│   │           └── signup/
│   │               └── route.ts              ← CREATE
│   └── attendee/
│       └── signup/
│           ├── page.tsx                      ← CREATE
│           └── SignupForm.tsx                ← CREATE
```

### Key Implementation Rules

**DO:**
- `await searchParams` in the signup page — mandatory in Next.js 15
- Check `password.length > 1024` before `bcrypt.hash` — prevents bcrypt DoS
- Clear `session.organizerId = undefined` when setting attendee session
- `bcrypt.hash(password, 12)` — 12 rounds, consistent with organizer auth
- Re-validate token server-side in the route handler (don't trust client)
- Return 400 (not 401) for invalid/used invite token — no auth context exists yet

**DO NOT:**
- Skip the `password.length > 1024` guard
- Set both `organizerId` and `attendeeAccountId` in the same session
- Trust the pre-filled name/email from the client — use values from the DB row in `createAttendeeAccount`
- Use `redirect()` in the route handler — return `{ success: true }` and let `SignupForm` call `router.push`

### Architecture References

- [Source: architecture.md#Authentication & Security] — invite token: UUID, single-use, no expiry; consumed on account setup
- [Source: architecture.md#Authentication & Security] — `bcryptjs` for both auth paths; timing-safe patterns
- [Source: epics.md#Story 5.2] — signup flow, `invite_used_at`, redirect to `/attendee/dashboard`

### Previous Story Learnings (1-5 through 5-1)

- All commands run from `conventionals/` directory
- `await searchParams` mandatory in Next.js 15 pages (same as `await params`)
- Session pattern: `getIronSession`, set fields, `session.save()`, return `{ success: true }`; client does `router.push`
- UX changes require explicit user approval before implementation
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Project Structure After This Story

```
conventionals/
├── data/
│   └── attendees.ts           ← MODIFIED: + 3 DAL functions
└── app/
    ├── api/
    │   └── attendee/
    │       └── auth/
    │           └── signup/
    │               └── route.ts ← NEW
    └── attendee/
        └── signup/
            ├── page.tsx         ← NEW
            └── SignupForm.tsx   ← NEW
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations._

### Completion Notes List

- **Task 1 ✅**: `data/attendees.ts` — replaced shell with full implementation: `getAttendeeByInviteToken` (unused token check via `isNull`), `createAttendeeAccount` (insert + returning id), `markInviteUsed` (set inviteUsedAt).
- **Task 2 ✅**: `app/api/attendee/auth/signup/route.ts` — public POST; bcrypt 12 rounds; server-side token re-validation; session set with `attendeeAccountId`, `organizerId` cleared.
- **Task 3 ✅**: `app/attendee/signup/page.tsx` — Server Component; `await searchParams`; inline `ErrorCard` for invalid token; delegates to `SignupForm`.
- **Task 4 ✅**: `app/attendee/signup/SignupForm.tsx` — Client Component; readonly name/email; password field; POSTs to `/api/attendee/auth/signup`; `router.push('/attendee/dashboard')` on success.
- **Task 5 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/attendees.ts` (modified — added 3 DAL functions, updated imports)
- `conventionals/app/api/attendee/auth/signup/route.ts` (created)
- `conventionals/app/attendee/signup/page.tsx` (created)
- `conventionals/app/attendee/signup/SignupForm.tsx` (created)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. 0 TypeScript errors, 0 lint errors.
