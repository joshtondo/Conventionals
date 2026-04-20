# Story 1.3: Session Configuration & Auth HOF

Status: done

## Story

As a **developer**,
I want a reusable `withAuth` higher-order function and session config,
So that all protected Route Handlers can verify the organizer's session with a single wrapper.

## Acceptance Criteria

1. `lib/session.ts` exports `sessionOptions`, `withAuth`, `withAttendeeAuth`, and the `SessionData` TypeScript type
2. Requests wrapped by `withAuth` with a valid iron-session cookie have `session.organizerId` available in the handler context
3. Requests wrapped by `withAuth` without a valid session receive `{ error: 'Unauthorized' }` with HTTP 401
4. Session cookie is `httpOnly: true`, `secure: true` in production, with 8-hour max age
5. `SESSION_SECRET` is sourced from `process.env.SESSION_SECRET` — fail fast with a descriptive error if unset

## Tasks / Subtasks

- [x] Task 1: Create `lib/session.ts` (AC: 1–5)
  - [x] Export `SessionData` interface with `organizerId?: number` and `attendeeAccountId?: number`
  - [x] Export `sessionOptions` using `SESSION_SECRET` with `httpOnly: true`, `secure` in production, 8-hour maxAge
  - [x] Export `withAuth` HOF — checks `session.organizerId`, returns 401 if missing
  - [x] Export `withAttendeeAuth` HOF — checks `session.attendeeAccountId`, returns 401 if missing
  - [x] Add startup guard: throw descriptive error if `SESSION_SECRET` is not set

- [x] Task 2: Verify TypeScript compiles cleanly
  - [x] Run `npx tsc --noEmit` from `conventionals/` — must pass with zero errors
  - [x] Run `npm run lint` — must pass with zero errors

## Dev Notes

### `lib/session.ts` — Exact Implementation

```ts
import 'server-only'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is not set')
}

export interface SessionData {
  organizerId?: number       // set on organizer login
  attendeeAccountId?: number // set on attendee login
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'conventionals-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 hours in seconds
  },
}

export function withAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>>; session: SessionData }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.organizerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, { ...ctx, session })
  }
}

export function withAttendeeAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>>; session: SessionData }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.attendeeAccountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, { ...ctx, session })
  }
}
```

### Key Implementation Notes

**`import 'server-only'`** must be the first line — same rule as `lib/db.ts`. Prevents Client Components from importing session logic.

**`SESSION_SECRET` guard** follows the same fail-fast pattern established in `lib/db.ts` for `DATABASE_URL`. Throw at module load time with a descriptive message rather than a cryptic iron-session error.

**`sessionOptions.password`** — iron-session v8 requires the secret to be at least 32 characters. The `.env.example` already documents this. No need to re-validate length here; the startup guard is sufficient.

**`cookieName`** — use `'conventionals-session'` (consistent, namespaced). Do not use the iron-session default.

**`secure` in production only** — `process.env.NODE_ENV === 'production'` evaluates to `false` in local dev, allowing HTTP cookies for `localhost`. In Vercel production it is always `true`.

**`maxAge: 60 * 60 * 8`** — iron-session v8 uses seconds (not milliseconds). 8 hours = 28800 seconds.

**`getIronSession` import** — from `'iron-session'` (v8 API). Do NOT use the old v6/v7 `withIronSession` wrapper.

**`cookies()` from `'next/headers'`** — must be awaited in Next.js 15+ App Router: `await cookies()`.

**`withAuth` and `withAttendeeAuth` are symmetric** — same pattern, different session field checked (`organizerId` vs `attendeeAccountId`). Both are needed from this story so future stories never have to create them.

### How `withAuth` is Used (for context — do NOT implement these yet)

```ts
// app/api/events/route.ts  ← Story 2.1
export const GET = withAuth(async (req, { session }) => {
  const events = await getEvents(session.organizerId!)
  return NextResponse.json({ events })
})
```

The HOF passes `session` through the context so handlers never call `getIronSession` directly — they always receive an already-validated session object.

### What This Story Does NOT Build

- No Route Handlers (`app/api/auth/login`, `app/api/auth/logout`, `app/api/auth/me`) — Story 1.4/1.5
- No login page (`app/login/page.tsx`) — Story 1.4
- No DAL (`data/auth.ts`) — Story 1.4
- Do NOT use `withAuth` in any Route Handler yet — this story only creates the helper

### iron-session v8 API Reference

```ts
// Reading session in a Server Component (read-only):
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
const organizerId = session.organizerId // undefined if not logged in

// Setting session in a Route Handler (write):
session.organizerId = organizer.id
await session.save()

// Destroying session in a Route Handler (logout):
session.destroy()
```

### Project Structure After This Story

```
conventionals/
├── lib/
│   ├── db.ts       ← done (Story 1.2)
│   └── session.ts  ← CREATED: SessionData, sessionOptions, withAuth, withAttendeeAuth
└── ... (existing files)
```

### Architecture References

- [Source: architecture.md#Authentication & Security] — iron-session v8, withAuth HOF pattern, dual-field SessionData
- [Source: architecture.md#Process Patterns] — exact withAuth and withAttendeeAuth templates
- [Source: architecture.md#Enforcement Guidelines] — never inline session checks in Route Handlers, always use withAuth
- [Source: epics.md#Story 1.3] — acceptance criteria

### Previous Story Learnings (from Stories 1.1 & 1.2)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root — use `@/lib/session` for imports
- Follow the same fail-fast env guard pattern as `lib/db.ts` (throw with descriptive message if env var missing)
- `import 'server-only'` must be first line in all `lib/` server files

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
_none — implementation matched story spec exactly, no deviations_

### Completion Notes List
- **Task 1 ✅**: `lib/session.ts` created with `import 'server-only'`, SESSION_SECRET startup guard, `SessionData` interface, `sessionOptions` (httpOnly, secure in prod, 8h maxAge, cookieName `conventionals-session`), `withAuth` HOF, `withAttendeeAuth` HOF.
- **Task 2 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` from Story 1.2, not introduced by this story).

### File List
- `conventionals/lib/session.ts` (created)

### Review Findings

#### Code Review (AI) — 2026-04-05 | Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor

- [x] [Review][Decision] Session injected as `SessionData` not `IronSession<SessionData>` — resolved: Option A, `withAuth` is for read-only guards; login/logout call `getIronSession` directly [`conventionals/lib/session.ts:26,38`]
- [x] [Review][Patch] `sessionOptions.password` has ambiguous TypeScript narrowing — extracted to `const secret: string` after the guard [`conventionals/lib/session.ts:16`]
- [x] [Review][Patch] `SESSION_SECRET` length not validated — guard extended to also check `length < 32` with descriptive error message [`conventionals/lib/session.ts:6`]
- [x] [Review][Defer] No `sameSite` cookie attribute set — CSRF exposure; `sameSite: 'lax'` is the standard recommendation for session cookies [`conventionals/lib/session.ts:18-22`] — deferred, not in spec; low-risk given modern browser defaults
- [x] [Review][Defer] Dual-role session not mutually exclusive — a session with both `organizerId` and `attendeeAccountId` passes both `withAuth` and `withAttendeeAuth` [`conventionals/lib/session.ts:30,41`] — deferred, enforced by login handlers in Story 1.4/1.5; `withAuth` spec only requires checking its own field
- [x] [Review][Defer] `ttl` not set alongside `maxAge` — iron-session seal TTL defaults to 14 days while cookie expires after 8 hours; a stolen cookie remains valid server-side for 14 days [`conventionals/lib/session.ts:15-23`] — deferred, cookie expiry is the user-visible boundary
- [x] [Review][Defer] `path` cookie attribute not set — if iron-session doesn't default to `path: '/'`, cookie would be scoped to the login route path and not sent to other `/api/` routes [`conventionals/lib/session.ts:18-22`] — deferred, iron-session sets `path: '/'` by default

### Change Log
- 2026-04-03: All tasks complete. `lib/session.ts` created with exact implementation from story Dev Notes. TypeScript and lint pass.
- 2026-04-04: Code review complete. 2 patches, 3 deferred, 7 dismissed.
- 2026-04-05: Code review re-run. 1 decision-needed, 2 patches, 4 deferred, 3 dismissed.
