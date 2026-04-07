# Story 1.4: Organizer Login

Status: done

## Story

As an **organizer**,
I want to log in with my email and password,
So that I can access the protected dashboard.

## Acceptance Criteria

**Given** I am on the `/login` page
**When** I submit valid credentials
**Then** `POST /api/auth/login` verifies the password with `bcryptjs` and sets an iron-session cookie
**And** I am redirected to `/dashboard`

**When** I submit invalid credentials
**Then** I receive a generic error message — no indication of whether email or password was wrong

**And** the timing-safe dummy hash pattern is used when the organizer email is not found (prevents user enumeration via timing attack)

**And** the login page is a Server Component that redirects to `/dashboard` if a session already exists

## Tasks / Subtasks

- [x] Task 1: Create `data/auth.ts` DAL (AC: login verification, timing-safe)
  - [x] `import 'server-only'` as first line
  - [x] Export `login(email, password)` — normalizes email, queries `organizers`, always runs `bcrypt.compare`, returns organizer or null
  - [x] Use `DUMMY_HASH` constant for timing-safe path when organizer not found

- [x] Task 2: Create `app/login/LoginForm.tsx` Client Component (AC: form, error display, redirect)
  - [x] `'use client'` directive at top
  - [x] `useState` for email, password, error, loading
  - [x] `POST /api/auth/login` with `credentials: 'include'`
  - [x] On success: `router.push('/dashboard')` via `useRouter`
  - [x] On error: display generic message from response body
  - [x] Inline styles using `s` object; primary brand color `#4f46e5`

- [x] Task 3: Create `app/login/page.tsx` Server Component (AC: session check, redirect if logged in)
  - [x] Read session via `getIronSession<SessionData>(await cookies(), sessionOptions)`
  - [x] If `session.organizerId` exists → `redirect('/dashboard')` (outside try/catch)
  - [x] Otherwise render `<LoginForm />`

- [x] Task 4: Create `app/api/auth/login/route.ts` Route Handler (AC: bcrypt verify, set session)
  - [x] `export async function POST(req: NextRequest)`
  - [x] No `withAuth` wrapper — this is the unauthenticated login endpoint
  - [x] Parse body: `const { email, password } = await req.json()`
  - [x] Validate: if missing email or password → 400 `{ error: 'Missing email or password' }`
  - [x] Call `login(email, password)` from `@/data/auth`
  - [x] If null → 401 `{ error: 'Invalid email or password' }`
  - [x] Get session via `getIronSession`, set `session.organizerId`, call `session.save()`
  - [x] Return 200 `{ success: true }`
  - [x] Wrap in try/catch with `console.error` + 500 fallback

- [x] Task 5: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — must pass with zero errors
  - [x] `npm run lint` — must pass with zero errors

## Dev Notes

### Files to Create

```
conventionals/
├── data/
│   └── auth.ts          ← NEW: DAL — login(), timing-safe bcrypt
├── app/
│   ├── login/
│   │   ├── page.tsx     ← NEW: Server Component — session check + render LoginForm
│   │   └── LoginForm.tsx ← NEW: Client Component — form + fetch + redirect
│   └── api/
│       └── auth/
│           └── login/
│               └── route.ts ← NEW: POST handler — bcrypt verify + iron-session set
```

Note: `data/` directory does not exist yet — create it.

### `data/auth.ts` — Exact Implementation

```ts
import 'server-only'
import { db } from '@/lib/db'
import { organizers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

// Timing-safe dummy hash — prevents user enumeration via timing attack
// When email not found, compare against this so response time is identical to a real check
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [organizer] = await db
    .select()
    .from(organizers)
    .where(eq(organizers.email, normalizedEmail))

  // Always run bcrypt.compare — even when organizer not found — to prevent timing attacks
  const hashToCompare = organizer?.passwordHash ?? DUMMY_HASH
  const isValid = await bcrypt.compare(password, hashToCompare)

  if (!organizer || !isValid) return null
  return organizer
}
```

**Do NOT add `getOrganizerById()` in this story** — that function is used by `GET /api/auth/me` which belongs to Story 1.5. Add it then.

### `app/api/auth/login/route.ts` — Exact Implementation

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { login } from '@/data/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const organizer = await login(email, password)

    if (!organizer) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.organizerId = organizer.id
    await session.save()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Login error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Key notes:**
- `redirect()` is NOT called here — the client handles navigation after receiving `{ success: true }`
- `getIronSession` is called directly (no `withAuth` — this route is unauthenticated)
- `session.save()` must be awaited — do not forget the `await`
- `redirect` from `next/navigation` throws NEXT_REDIRECT; calling it inside `try/catch` would catch it and return a 500. Keep redirect outside try/catch in Server Components. In Route Handlers, use `NextResponse.redirect()` if needed.

### `app/login/page.tsx` — Exact Implementation

```tsx
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (session.organizerId) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
```

**Key notes:**
- `redirect('/dashboard')` is outside any try/catch — it throws NEXT_REDIRECT which Next.js handles
- No `import 'server-only'` needed — pages are server-only by default in App Router
- `LoginForm` is a Client Component in the same directory — import without `'use client'` here

### `app/login/LoginForm.tsx` — Reference Implementation

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const s = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    color: '#111827',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    marginBottom: '1rem',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: '0.625rem',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    color: '#b91c1c',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
}

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Login failed')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.heading}>Organizer Login</h1>
        {error && <p style={s.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label style={s.label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            style={s.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <label style={s.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            style={s.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="submit"
            style={{ ...s.button, ...(loading ? s.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### Key Implementation Rules

**DO:**
- `import 'server-only'` as first line in `data/auth.ts`
- Always run `bcrypt.compare()` regardless of whether organizer was found (timing safety)
- `await session.save()` after setting `session.organizerId`
- `credentials: 'include'` on all fetch calls (required for iron-session cookie)
- `email.trim().toLowerCase()` inside `login()` in the DAL (already normalized before DB query)

**DO NOT:**
- Use `withAuth` on the login route — it's a public endpoint
- Call `redirect()` from `next/navigation` inside a `try/catch` block — it throws an exception that gets swallowed
- Add `export const runtime = 'edge'` — `bcryptjs` requires Node.js runtime
- Inline session checks in the Route Handler — the DAL handles credential validation
- Import from `next/server` in `data/auth.ts` — it's a pure DAL file, no HTTP concerns

### `organizers` Table Schema (Current)

```ts
// drizzle/schema.ts
export const organizers = pgTable("organizers", {
  id: serial().primaryKey().notNull(),
  email: text().notNull(),            // unique constraint exists
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
})
```

**Note:** No `name` column exists yet. Story 1.6 (Registration) will add it. Do NOT add it here.

### bcryptjs v3 API (installed: `^3.0.3`)

```ts
import bcrypt from 'bcryptjs'

// Async compare — returns Promise<boolean>
const isValid = await bcrypt.compare(plaintext, hash)

// Async hash (for registration, Story 1.6)
const hash = await bcrypt.hash(plaintext, 10)
```

No API breaking changes from v2 for the async methods used in this story. `@types/bcryptjs` v2.4.6 covers the types correctly.

### Session Operations in Route Handlers (not via `withAuth`)

The login route calls `getIronSession` directly because it's unauthenticated:

```ts
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

// In the POST handler body:
const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
session.organizerId = organizer.id
await session.save()  // ← MUST await
```

### Architecture References

- [Source: architecture.md#Process Patterns] — DAL function template, error handling pattern
- [Source: architecture.md#Authentication & Security] — timing-safe login, bcryptjs, iron-session
- [Source: architecture.md#Enforcement Guidelines] — no inline session checks in Route Handlers (DAL handles auth logic)
- [Source: architecture.md#File Structure] — `data/auth.ts`, `app/login/`, `app/api/auth/login/route.ts`
- [Source: architecture.md#Frontend Architecture] — Server Components for auth check, inline styles, `useState` only

### Previous Story Learnings (from Stories 1.1–1.3)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root — use `@/data/auth`, `@/lib/session`, `@/lib/db`, `@/drizzle/schema`
- `import 'server-only'` must be first line in all `data/` and `lib/` server files
- Follow fail-fast env guard pattern already set in `lib/db.ts` and `lib/session.ts`
- `lib/session.ts` now exports: `sessionOptions`, `withAuth`, `withAttendeeAuth`, `SessionData` (Story 1.3)
- `lib/session.ts` `SESSION_SECRET` guard now also checks `length < 32` (Story 1.3 patch)
- `lib/db.ts` exports the Drizzle singleton `db` — always import it, never create a new instance

### Project Structure After This Story

```
conventionals/
├── data/
│   └── auth.ts        ← CREATED: login(), timing-safe bcrypt, email normalization
├── app/
│   ├── login/
│   │   ├── page.tsx   ← CREATED: Server Component, session check, redirect if logged in
│   │   └── LoginForm.tsx ← CREATED: Client Component, form, fetch, useRouter redirect
│   └── api/
│       └── auth/
│           └── login/
│               └── route.ts ← CREATED: POST — bcrypt verify + iron-session set
├── lib/
│   ├── db.ts          ← done (Story 1.2)
│   └── session.ts     ← done (Story 1.3)
└── drizzle/
    └── schema.ts      ← done (Story 1.2) — organizers table used here, no changes
```

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
_none — implementation matched story spec exactly, no deviations_

### Completion Notes List
- **Task 1 ✅**: `data/auth.ts` created with `import 'server-only'`, `DUMMY_HASH` constant, `login()` with email normalization and timing-safe bcrypt compare. Returns organizer row or null.
- **Task 2 ✅**: `app/login/LoginForm.tsx` created as `'use client'` component. `useState` for form state, `fetch POST /api/auth/login` with `credentials: 'include'`, `useRouter().push('/dashboard')` on success, error display on failure. Inline styles via `s` object, `#4f46e5` brand color.
- **Task 3 ✅**: `app/login/page.tsx` created as async Server Component. Reads iron-session via `getIronSession`, redirects to `/dashboard` if `session.organizerId` set (redirect outside try/catch). Renders `<LoginForm />` when unauthenticated.
- **Task 4 ✅**: `app/api/auth/login/route.ts` created. `POST` handler — validates body, calls `login()` DAL, sets `session.organizerId`, `session.save()`, returns `{ success: true }`. No `withAuth` wrapper (public endpoint). Try/catch with `console.error` + 500 fallback.
- **Task 5 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning in `drizzle/schema.ts` (not introduced by this story).

### File List
- `conventionals/data/auth.ts` (created)
- `conventionals/app/login/page.tsx` (created)
- `conventionals/app/login/LoginForm.tsx` (created)
- `conventionals/app/api/auth/login/route.ts` (created)

### Review Findings

#### Code Review (AI) — 2026-04-05 | Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor

- [x] [Review][Patch] `login()` returns full organizer row including `passwordHash` — returns `{ id, email, createdAt }` explicitly [`conventionals/data/auth.ts:23`]
- [x] [Review][Patch] `req.json()` parse failure falls into outer `catch` and returns 500 — parse isolated in its own try/catch, returns 400 on malformed JSON [`conventionals/app/api/auth/login/route.ts:9`]
- [x] [Review][Patch] Whitespace-only `email` or `password` passes `!email || !password` check — added `.trim()` + `typeof` guards [`conventionals/app/api/auth/login/route.ts:10`]
- [x] [Review][Patch] `session.attendeeAccountId` not cleared on organizer login — `session.attendeeAccountId = undefined` set before `session.organizerId` [`conventionals/app/api/auth/login/route.ts:21`]
- [x] [Review][Patch] No max-length guard on `password` — `password.length > 1024` returns 400 [`conventionals/app/api/auth/login/route.ts:10`]
- [x] [Review][Defer] No rate limiting on login endpoint — infrastructure-level; deferred to pre-launch hardening story [`conventionals/app/api/auth/login/route.ts`]
- [x] [Review][Defer] `DUMMY_HASH` is publicly known — `!organizer` guard prevents auth regardless; deferred [`conventionals/data/auth.ts:9`]
- [x] [Review][Defer] No CSRF protection on login route — infrastructure-level; iron-session SameSite default mitigates [`conventionals/app/api/auth/login/route.ts`]
- [x] [Review][Defer] `DUMMY_HASH` cost factor 10 may not match production hash cost — Story 1.6 sets the cost factor at registration time [`conventionals/data/auth.ts:9`]
- [x] [Review][Defer] Email case in DB not guaranteed lowercase — Story 1.6 must normalize email on insert [`conventionals/data/auth.ts:12`]
- [x] [Review][Defer] `console.error` logs raw error message — established project pattern; acceptable for MVP [`conventionals/app/api/auth/login/route.ts:27`]

### Change Log
- 2026-04-05: Story created.
- 2026-04-05: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
- 2026-04-05: Code review complete. 5 patches, 6 deferred, 7 dismissed.
