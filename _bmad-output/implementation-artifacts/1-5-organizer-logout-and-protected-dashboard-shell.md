# Story 1.5: Organizer Logout & Protected Dashboard Shell

Status: done

## Story

As an **organizer**,
I want to log out and have the dashboard protected from unauthenticated access,
So that my account is secure and only I can view my data.

## Acceptance Criteria

**Given** I am logged in and on `/dashboard`
**When** I click logout
**Then** `POST /api/auth/logout` destroys the session cookie
**And** I am redirected to `/login`

**Given** I visit `/dashboard` without a session
**When** the page loads
**Then** I am redirected to `/login`

**And** the dashboard page renders a shell (heading, empty event list placeholder) when authenticated — full content comes in Epic 2

**And** `GET /api/auth/me` returns `{ organizerId }` for the current session (used by Client Components)

## Tasks / Subtasks

- [x] Task 1: Add `getOrganizerById()` to `data/auth.ts` (AC: dashboard data access)
  - [x] Export `getOrganizerById(id: number)` — selects organizer by `id`, returns `{ id, email, createdAt }` or null
  - [x] No passwordHash in return (same safe-field pattern as `login()`)

- [x] Task 2: Create `app/api/auth/logout/route.ts` (AC: session destruction)
  - [x] `export async function POST()` — no `withAuth` (logout is always safe to call)
  - [x] Call `getIronSession`, then `session.destroy()` (synchronous — no await)
  - [x] Return 200 `{ success: true }`
  - [x] Wrap in try/catch with `console.error` + 500 fallback

- [x] Task 3: Create `app/api/auth/me/route.ts` (AC: `GET /api/auth/me` returns `{ organizerId }`)
  - [x] `export const GET = withAuth(...)` — first real usage of the `withAuth` HOF
  - [x] Return `NextResponse.json({ organizerId: session.organizerId })`

- [x] Task 4: Create `app/dashboard/DashboardClient.tsx` Client Component (AC: shell with logout)
  - [x] `'use client'` directive
  - [x] Logout button: `POST /api/auth/logout` with `credentials: 'include'`, then `router.push('/login')`
  - [x] Shell UI: heading "My Events", empty state placeholder "No events yet."
  - [x] Inline styles via `s` object
  - [x] Note: `organizerId` prop omitted for this story (no lint warning); Epic 2 adds it when event fetching is needed

- [x] Task 5: Create `app/dashboard/page.tsx` Server Component (AC: redirect if no session)
  - [x] Read session via `getIronSession<SessionData>(await cookies(), sessionOptions)`
  - [x] If `!session.organizerId` → `redirect('/login')` (outside try/catch)
  - [x] Renders `<DashboardClient />` when authenticated

- [x] Task 6: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors, 1 pre-existing warning in `drizzle/schema.ts` (not from this story)

## Dev Notes

### Files to Create / Modify

```
conventionals/
├── data/
│   └── auth.ts          ← MODIFY: add getOrganizerById()
├── app/
│   ├── dashboard/
│   │   ├── page.tsx     ← CREATE: Server Component — session check + render DashboardClient
│   │   └── DashboardClient.tsx ← CREATE: Client Component — shell UI + logout
│   └── api/
│       └── auth/
│           ├── logout/
│           │   └── route.ts ← CREATE: POST — session.destroy()
│           └── me/
│               └── route.ts ← CREATE: GET — withAuth, return { organizerId }
```

### `data/auth.ts` — Add `getOrganizerById()`

Append to the existing file (after `login()`):

```ts
export async function getOrganizerById(id: number) {
  const [organizer] = await db
    .select()
    .from(organizers)
    .where(eq(organizers.id, id))
  if (!organizer) return null
  return { id: organizer.id, email: organizer.email, createdAt: organizer.createdAt }
}
```

**Do NOT touch the existing `login()` function.** Only append the new export.

### `app/api/auth/logout/route.ts` — Exact Implementation

```ts
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.destroy() // synchronous — clears cookie in response; no await
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Logout error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Key notes:**
- `session.destroy()` is synchronous in iron-session v8 — do NOT await it
- No `withAuth` wrapper — calling logout on an unauthenticated session is harmless (idempotent)
- No request body needed — no `req: NextRequest` parameter; use `POST()` with no args
- Client handles redirect to `/login` after receiving `{ success: true }`

### `app/api/auth/me/route.ts` — Exact Implementation

```ts
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/session'
import type { SessionData } from '@/lib/session'

export const GET = withAuth(
  async (_req: NextRequest, { session }: { params: Promise<Record<string, string>>; session: SessionData }) => {
    return NextResponse.json({ organizerId: session.organizerId })
  }
)
```

**Simpler equivalent (preferred):**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'

export const GET = withAuth(async (_req, { session }) => {
  return NextResponse.json({ organizerId: session.organizerId })
})
```

**Key notes:**
- This is the **first real usage of `withAuth`** in a Route Handler
- Returns 401 automatically if session has no `organizerId` (handled by `withAuth`)
- Returns `{ organizerId: number }` when authenticated
- Underscore prefix `_req` avoids lint warning for unused `req` parameter

### `app/dashboard/page.tsx` — Exact Implementation

```tsx
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.organizerId) {
    redirect('/login')
  }

  return <DashboardClient organizerId={session.organizerId!} />
}
```

**Key notes:**
- `redirect('/login')` called outside any try/catch — throws NEXT_REDIRECT, terminates render
- `session.organizerId!` — non-null assertion safe here because `redirect()` has return type `never`; TypeScript flow analysis confirms the value is defined after the guard
- No `import 'server-only'` needed — pages are server-only by default in App Router

### `app/dashboard/DashboardClient.tsx` — Reference Implementation

```tsx
'use client'

import { useRouter } from 'next/navigation'

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  } as React.CSSProperties,
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  } as React.CSSProperties,
  logoutButton: {
    padding: '0.375rem 0.875rem',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  main: {
    padding: '2rem',
  } as React.CSSProperties,
  emptyState: {
    color: '#6b7280',
    fontSize: '0.875rem',
  } as React.CSSProperties,
}

interface Props {
  organizerId: number
}

export default function DashboardClient({ organizerId: _ }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    router.push('/login')
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <h1 style={s.heading}>My Events</h1>
        <button style={s.logoutButton} onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main style={s.main}>
        <p style={s.emptyState}>No events yet.</p>
      </main>
    </div>
  )
}
```

**Note on `organizerId` prop:** The prop is accepted for forward compatibility (Epic 2 will use it to fetch events). For this story's shell it is unused — prefix with `_` in destructuring to satisfy lint: `{ organizerId: _ }`. Epic 2 will rename it.

### iron-session v8 `session.destroy()` Behavior

In iron-session v8:
- `session.destroy()` is **synchronous** — removes all session data and marks the cookie for deletion
- The cookie deletion is applied to the response automatically via the `cookies()` store from `next/headers`
- No `session.save()` call needed after `destroy()`
- No `await` needed — do NOT write `await session.destroy()`

### `withAuth` HOF Usage Pattern (first real usage)

```ts
// Route Handler using withAuth:
export const GET = withAuth(async (_req, { session }) => {
  // session.organizerId is guaranteed non-undefined here
  return NextResponse.json({ organizerId: session.organizerId })
})
```

`withAuth` injects `session: SessionData` into the handler context. Returns 401 automatically when `session.organizerId` is falsy. No need to check again inside the handler.

### Key Implementation Rules

**DO:**
- `session.destroy()` — synchronous, no await
- `withAuth` for `/api/auth/me` — HOF handles the 401
- `redirect('/login')` outside try/catch in Server Components
- `session.organizerId!` non-null assertion after the guard check
- `credentials: 'include'` on logout fetch from client
- `_req` prefix for unused `req` param in `GET` handler (avoids lint warning)
- `_` prefix for unused `organizerId` prop in DashboardClient (avoids lint warning)

**DO NOT:**
- `await session.destroy()` — it's synchronous
- `withAuth` on the logout route — always safe to call regardless of auth state
- Forget `credentials: 'include'` on the logout fetch
- Add event list data fetching in this story — that is Epic 2 scope

### Architecture References

- [Source: architecture.md#Structure Patterns] — `app/dashboard/page.tsx`, `app/dashboard/DashboardClient.tsx`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts`
- [Source: architecture.md#Enforcement Guidelines] — `withAuth` for protected routes, never inline session checks
- [Source: architecture.md#Frontend Architecture] — Server Components for auth check, Client Components for mutations

### Previous Story Learnings (Stories 1.1–1.4)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- `import 'server-only'` first line in all `data/` files — `auth.ts` already has it
- `redirect()` throws NEXT_REDIRECT — call outside try/catch
- Inline styles via `s` object; brand color `#4f46e5`; error red `#b91c1c`
- `credentials: 'include'` on every client fetch
- `router.push()` from `useRouter` for client-side redirects after API calls
- Route handler body: JSON parse in isolated try/catch, auth logic in inner try/catch
- `withAuth` HOF signature: `handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>>; session: SessionData }) => Promise<NextResponse>`
- Story 1.4 patch: `session.attendeeAccountId = undefined` before setting `organizerId` on login. Mirror this: on logout `session.destroy()` clears both fields automatically.
- `login()` in `data/auth.ts` now returns `{ id, email, createdAt }` — no `passwordHash`. `getOrganizerById()` should follow the same safe-return pattern.
- Pre-existing lint warning in `drizzle/schema.ts` (`sql` unused) — do not address, not from this story

### Project Structure After This Story

```
conventionals/
├── data/
│   └── auth.ts        ← MODIFIED: + getOrganizerById()
├── app/
│   ├── dashboard/
│   │   ├── page.tsx   ← CREATED: Server Component, session check, redirect if unauthenticated
│   │   └── DashboardClient.tsx ← CREATED: shell UI, logout button, empty state
│   └── api/
│       └── auth/
│           ├── login/route.ts  ← done (Story 1.4)
│           ├── logout/
│           │   └── route.ts   ← CREATED: POST — session.destroy()
│           └── me/
│               └── route.ts   ← CREATED: GET — withAuth → { organizerId }
├── lib/
│   └── session.ts      ← done (Story 1.3) — withAuth HOF used here for first time
└── drizzle/
    └── schema.ts       ← unchanged
```

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
_none — implementation matched story spec exactly, with one deviation: `organizerId` prop removed from `DashboardClient` to avoid lint warning; Epic 2 adds it when event fetching is implemented_

### Completion Notes List
- **Task 1 ✅**: `getOrganizerById(id)` added to `data/auth.ts` — returns `{ id, email, createdAt }` or null, follows safe-field pattern from `login()`.
- **Task 2 ✅**: `app/api/auth/logout/route.ts` created — `POST()` with no args, `getIronSession` + `session.destroy()` (synchronous), returns `{ success: true }`, try/catch with 500 fallback.
- **Task 3 ✅**: `app/api/auth/me/route.ts` created — `withAuth` HOF used for first time, returns `{ organizerId: session.organizerId }`.
- **Task 4 ✅**: `app/dashboard/DashboardClient.tsx` created — `'use client'`, logout button with `fetch POST /api/auth/logout` + `router.push('/login')`, shell UI with "My Events" heading and "No events yet." empty state, inline `s` styles. `organizerId` prop removed (Epic 2 scope).
- **Task 5 ✅**: `app/dashboard/page.tsx` created — async Server Component, `getIronSession` session check, `redirect('/login')` if no `organizerId`, renders `<DashboardClient />`.
- **Task 6 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning in `drizzle/schema.ts`.

### File List
- `conventionals/data/auth.ts` (modified — add getOrganizerById)
- `conventionals/app/api/auth/logout/route.ts` (created)
- `conventionals/app/api/auth/me/route.ts` (created)
- `conventionals/app/dashboard/page.tsx` (created)
- `conventionals/app/dashboard/DashboardClient.tsx` (created)

### Change Log
- 2026-04-05: Story created.
- 2026-04-05: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
- 2026-04-05: Code review complete. 1 decision-needed, 1 patch, 8 deferred, 4 dismissed.

### Review Findings

- [x] [Review][Dismiss] `session.destroy()` behavior verified against iron-session source — IS synchronous, calls `cookieStore.set(name, "", { maxAge: 0 })` directly, cookie reliably cleared. Spec correct. [`app/api/auth/logout/route.ts:9`]
- [x] [Review][Patch] `handleLogout` has no error handling — `router.push('/login')` fires unconditionally after fetch; network error or 500 leaves session cookie active but client navigates away, creating a potential redirect loop [`app/dashboard/DashboardClient.tsx:45-50`]
- [x] [Review][Defer] Dashboard does not verify organizer still exists via `getOrganizerById` — stale/deleted organizer ID in cookie grants dashboard access until cookie expires (8h) [`app/dashboard/page.tsx:8-12`] — deferred, pre-existing
- [x] [Review][Defer] `organizerId` prop not passed to `DashboardClient` — intentional deviation, Epic 2 scope, documented in Dev Agent Record [`app/dashboard/page.tsx:14`] — deferred, intentional
- [x] [Review][Defer] Email normalization in `login()` not enforced at registration — users registered with mixed-case email may be locked out [`data/auth.ts:12`] — deferred, pre-existing from story 1-4 (already tracked)
- [x] [Review][Defer] No rate limiting on `POST /api/auth/login` — bcrypt DoS via concurrency saturation — deferred, pre-existing from story 1-4 (already tracked)
- [x] [Review][Defer] `/api/auth/me` exposes raw integer PK — IDOR stepping stone if future endpoints accept `organizerId` param without ownership checks [`app/api/auth/me/route.ts`] — deferred, pre-existing
- [x] [Review][Defer] No `middleware.ts` — all route protection is per-route; new routes added without guards are silently public — deferred, architectural gap
- [x] [Review][Defer] `password.trim()` validation gives misleading "Missing email or password" error when password is only whitespace — deferred, pre-existing from story 1-4 (already tracked)
- [x] [Review][Defer] `redirect('/login')` placement fragile — correct now but would break silently if wrapped in try/catch in future refactor [`app/dashboard/page.tsx:10-12`] — deferred, currently correct
