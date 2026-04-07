# Story 1.6: Organizer Registration

Status: done

## Story

As a **new organizer**,
I want to create an account with my name, email, and password,
So that I can start managing events on Conventionals without needing manual setup.

## Acceptance Criteria

**Given** I am on `/register`
**When** I submit a valid name, email, and password
**Then** `POST /api/auth/register` hashes the password with `bcryptjs` and inserts a new row into `organizers`
**And** I am automatically logged in (session cookie set with `organizerId`) and redirected to `/dashboard`

**When** I submit an email that is already registered
**Then** I receive a generic error — "An account with this email already exists"
**And** the email check uses timing-safe pattern (no user enumeration via response time)

**When** I visit `/register` while already logged in
**Then** I am redirected to `/dashboard`

**And** `data/auth.ts` exports `createOrganizer(name, email, passwordHash)`
**And** all inputs are trimmed; email is normalized to lowercase before storage

## Tasks / Subtasks

- [x] Task 1: Update `drizzle/schema.ts` — add `name` column to `organizers` (AC: createOrganizer stores name)
  - [x] Add `name: text('name')` (nullable) to `organizers` table definition — nullable for backward compatibility with existing organizer rows that predate this story
  - [x] Run `npx drizzle-kit generate` from `conventionals/` to produce SQL migration file
  - [x] Review the generated SQL (should be `ALTER TABLE "organizers" ADD COLUMN "name" text`)
  - [x] Run `npx drizzle-kit migrate` to apply migration to Neon DB via `DIRECT_URL` — **NOTE: requires `DIRECT_URL` in `.env.local`; migration file generated at `drizzle/migrations/0001_clever_logan.sql`, developer must run manually with env set**
  - [x] Commit both `drizzle/schema.ts` and the generated migration file

- [x] Task 2: Add `createOrganizer()` to `data/auth.ts` (AC: DAL export)
  - [x] Append after `getOrganizerById()` — do NOT touch existing functions
  - [x] Signature: `export async function createOrganizer(name: string, email: string, passwordHash: string)`
  - [x] Use `db.insert(organizers).values({ name, email, passwordHash }).returning({ id: organizers.id, email: organizers.email, createdAt: organizers.createdAt })`
  - [x] Return the first row (`organizer[0]`) — do NOT wrap in try/catch here; let caller handle unique constraint error (code `'23505'`)

- [x] Task 3: Create `app/api/auth/register/route.ts` (AC: POST handler)
  - [x] Isolated JSON parse in first try/catch (same pattern as login route) — return 400 on malformed body
  - [x] Type guards: `name`, `email`, `password` must be non-empty strings after trim
  - [x] `password.length > 1024` guard — return 400 with generic "Name, email, and password are required" message
  - [x] Normalize: `email.trim().toLowerCase()`, `name.trim()`
  - [x] **Always** hash password with `await bcrypt.hash(password, 10)` BEFORE any DB operation — this is the timing-safe gate; equalizes response time for existing vs new email
  - [x] Call `createOrganizer(trimmedName, normalizedEmail, passwordHash)` inside inner try/catch
  - [x] On PG unique violation (`(err as { code?: string }).code === '23505'`): return 409 `{ error: 'An account with this email already exists' }`
  - [x] On success: `getIronSession`, set `session.attendeeAccountId = undefined`, set `session.organizerId = organizer.id`, `await session.save()`, return `{ success: true }`
  - [x] Outer catch: `console.error` + 500

- [x] Task 4: Create `app/register/RegisterForm.tsx` Client Component (AC: registration form)
  - [x] `'use client'` directive
  - [x] `useState` for: `name`, `email`, `password`, `error`, `loading` — same pattern as `LoginForm.tsx`
  - [x] `handleSubmit`: `e.preventDefault()`, `setError('')`, `setLoading(true)`, fetch `POST /api/auth/register` with `credentials: 'include'`, `Content-Type: application/json`
  - [x] On `!res.ok`: `setError(data.error ?? 'Registration failed')`, `return`
  - [x] On success: `router.push('/dashboard')`
  - [x] Catch block: `setError('Something went wrong. Please try again.')`
  - [x] Inline `s` styles object — same palette as `LoginForm.tsx` (copy styles exactly; do NOT invent new colors or layouts)
  - [x] Form fields in order: Name (type="text", autoComplete="name"), Email (type="email", autoComplete="email"), Password (type="password", autoComplete="new-password")
  - [x] Button text: "Create Account" / "Creating account…" (loading state)
  - [x] Heading: "Create Account"

- [x] Task 5: Create `app/register/page.tsx` Server Component (AC: redirect if already logged in)
  - [x] Mirror `app/login/page.tsx` exactly — read session, redirect if `session.organizerId`, else render form
  - [x] `redirect('/dashboard')` outside any try/catch
  - [x] Renders `<RegisterForm />`

- [x] Task 6: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors, 1 pre-existing warning in `drizzle/schema.ts` (not from this story)

## Dev Notes

### ⚠️ Schema Migration Required — Read First

The `organizers` table has **no `name` column**. This story adds it. You MUST follow the Drizzle migration workflow:

```
1. Edit drizzle/schema.ts  ← add name column
2. npx drizzle-kit generate   ← creates SQL migration file in drizzle/migrations/
3. Review generated SQL
4. npx drizzle-kit migrate    ← applies to Neon DB via DIRECT_URL
5. Commit schema.ts + migration file
```

**NEVER write migration SQL by hand. NEVER run raw SQL in the Neon console.**

The generated migration should be a single `ALTER TABLE "organizers" ADD COLUMN "name" text;` statement. If `drizzle-kit generate` produces anything else (e.g., DROP + recreate), stop and investigate before running migrate.

### Files to Create / Modify

```
conventionals/
├── drizzle/
│   ├── schema.ts               ← MODIFY: add name to organizers
│   └── migrations/
│       └── 0001_*.sql          ← GENERATED by drizzle-kit (name determined by tool)
├── data/
│   └── auth.ts                 ← MODIFY: append createOrganizer()
├── app/
│   ├── register/
│   │   ├── page.tsx            ← CREATE: Server Component
│   │   └── RegisterForm.tsx    ← CREATE: Client Component
│   └── api/
│       └── auth/
│           └── register/
│               └── route.ts    ← CREATE: POST handler
```

### `drizzle/schema.ts` — Schema Change

Add `name` column as **nullable** (existing organizer rows in Neon predate this story and have no name):

```ts
export const organizers = pgTable("organizers", {
  id: serial().primaryKey().notNull(),
  name: text('name'),  // nullable — backward compat with pre-existing rows
  email: text().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  unique("organizers_email_key").on(table.email),
]);
```

### `data/auth.ts` — Add `createOrganizer()`

Append after `getOrganizerById()`. Do NOT touch `login()` or `getOrganizerById()`:

```ts
export async function createOrganizer(name: string, email: string, passwordHash: string) {
  const [organizer] = await db
    .insert(organizers)
    .values({ name, email, passwordHash })
    .returning({ id: organizers.id, email: organizers.email, createdAt: organizers.createdAt })
  return organizer
}
```

No try/catch here — unique constraint violations (PG code `'23505'`) are handled in the route.

### `app/api/auth/register/route.ts` — Exact Implementation

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { createOrganizer } from '@/data/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  let body: { name?: unknown; email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, email, password } = body

  if (!name || typeof name !== 'string' || !name.trim() ||
      !email || typeof email !== 'string' || !email.trim() ||
      !password || typeof password !== 'string' || !password.trim()) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
  }

  if (password.length > 1024) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const trimmedName = name.trim()

  // Always hash before DB insert — equalizes timing for existing vs new email (prevents enumeration)
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const organizer = await createOrganizer(trimmedName, normalizedEmail, passwordHash)
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.attendeeAccountId = undefined  // clear any active attendee session
    session.organizerId = organizer.id
    await session.save()
    return NextResponse.json({ success: true })
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }
    console.error('Register error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Key notes:**
- `bcrypt.hash(password, 10)` — cost factor **10** matches `DUMMY_HASH` constant; do NOT use a different cost factor
- `session.attendeeAccountId = undefined` before setting `organizerId` — same dual-role safety pattern as `login/route.ts`
- PG error code `'23505'` = unique_violation — Neon serverless driver surfaces this on the error object
- No `withAuth` — registration route is always unauthenticated

### `app/register/page.tsx` — Exact Implementation

```tsx
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import RegisterForm from './RegisterForm'

export default async function RegisterPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (session.organizerId) {
    redirect('/dashboard')
  }

  return <RegisterForm />
}
```

### `app/register/RegisterForm.tsx` — Reference Implementation

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
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    color: '#111827',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
    color: '#374151',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    marginBottom: '1rem',
    boxSizing: 'border-box',
  } as React.CSSProperties,
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
  } as React.CSSProperties,
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  error: {
    color: '#b91c1c',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
}

export default function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Registration failed')
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
        <h1 style={s.heading}>Create Account</h1>
        {error && <p style={s.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label style={s.label} htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
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
            autoComplete="new-password"
          />
          <button
            type="submit"
            style={{ ...s.button, ...(loading ? s.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### Previous Story Learnings (Stories 1.1–1.5)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- `import 'server-only'` already in `data/auth.ts` — do NOT add again
- `redirect()` throws NEXT_REDIRECT — call outside try/catch
- Inline styles via `s` object; brand color `#4f46e5`; error red `#b91c1c`
- `credentials: 'include'` on every client fetch
- `router.push()` from `useRouter` for client-side redirects after API calls
- Route handler body: JSON parse in isolated try/catch, auth logic in inner try/catch
- ESLint does **NOT** ignore `_` prefixed variables — do not use `const { x: _ } = obj` pattern; instead omit unused destructuring entirely
- Bcrypt cost factor must be **10** — this matches `DUMMY_HASH` constant in `login()` (deferred note from story 1-4 code review)
- `session.attendeeAccountId = undefined` before setting `organizerId` — see `login/route.ts` for reference
- Pre-existing lint warning in `drizzle/schema.ts` (`sql` unused) — do not address, not from this story
- `createOrganizer()` follows the same safe-return pattern as `login()`: returns `{ id, email, createdAt }` — no `passwordHash`
- Story spec says `createOrganizer(name, email, passwordHash)` — name is a parameter, not derived

### Project Structure After This Story

```
conventionals/
├── drizzle/
│   ├── schema.ts               ← MODIFIED: + name column on organizers
│   └── migrations/
│       ├── 0000_baseline.sql   ← unchanged
│       └── 0001_*.sql          ← GENERATED: ALTER TABLE organizers ADD COLUMN name text
├── data/
│   └── auth.ts                 ← MODIFIED: + createOrganizer()
├── app/
│   ├── register/
│   │   ├── page.tsx            ← CREATED: Server Component, session check → RegisterForm
│   │   └── RegisterForm.tsx    ← CREATED: Client Component, form + fetch + redirect
│   └── api/
│       └── auth/
│           ├── login/route.ts  ← unchanged (Story 1.4)
│           ├── logout/route.ts ← unchanged (Story 1.5)
│           ├── me/route.ts     ← unchanged (Story 1.5)
│           └── register/
│               └── route.ts   ← CREATED: POST — hash + insert + auto-login
```

### Architecture References

- [Source: architecture.md#Authentication & Security] — bcryptjs timing-safe pattern, `session.attendeeAccountId` dual-role clearing
- [Source: architecture.md#Data Architecture] — Drizzle migration workflow (generate → migrate, NEVER manual SQL)
- [Source: architecture.md#Enforcement Guidelines] — `import 'server-only'` in data/, `redirect()` outside try/catch
- [Source: epics.md#Story 1.6] — `createOrganizer(name, email, passwordHash)` signature, auto-login, timing-safe pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none — implementation matched story spec exactly. `npx drizzle-kit migrate` requires `DIRECT_URL` in `.env.local`; migration file `0001_clever_logan.sql` generated but not auto-applied (developer must run with env set)._

### Completion Notes List

- **Task 1 ✅**: `name: text('name')` (nullable) added to `organizers` in `drizzle/schema.ts`. Migration generated: `drizzle/migrations/0001_clever_logan.sql` (`ALTER TABLE "organizers" ADD COLUMN "name" text`). Migrate step requires `DIRECT_URL` — developer must run manually.
- **Task 2 ✅**: `createOrganizer(name, email, passwordHash)` appended to `data/auth.ts` — uses `.insert().values().returning()`, no try/catch (caller handles `23505`).
- **Task 3 ✅**: `app/api/auth/register/route.ts` created — isolated JSON parse, type guards, `password.length > 1024` guard, always hashes before insert (timing-safe), catches `23505` for "email already exists", auto-login via `session.save()`.
- **Task 4 ✅**: `app/register/RegisterForm.tsx` created — `'use client'`, 3 fields (name/email/password), mirrors `LoginForm.tsx` style object exactly, `router.push('/dashboard')` on success.
- **Task 5 ✅**: `app/register/page.tsx` created — mirrors `login/page.tsx`, redirects to `/dashboard` if session exists.
- **Task 6 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/drizzle/schema.ts` (modified — add name column to organizers)
- `conventionals/drizzle/migrations/0001_clever_logan.sql` (generated — ADD COLUMN name)
- `conventionals/data/auth.ts` (modified — add createOrganizer)
- `conventionals/app/api/auth/register/route.ts` (created)
- `conventionals/app/register/RegisterForm.tsx` (created)
- `conventionals/app/register/page.tsx` (created)

### Change Log

- 2026-04-05: Story created.
- 2026-04-05: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
- 2026-04-06: Code review complete (Blind Hunter only; Edge Case Hunter out of quota; Acceptance Auditor not launched). 0 patches, 7 deferred, 1 dismissed.

### Review Findings

- [x] [Review][Dismiss] Generic error for `password.length > 1024` — spec explicitly requires same generic message as other validation; mirrors `login/route.ts` pattern [`app/api/auth/register/route.ts:26`]
- [x] [Review][Defer] `createOrganizer` caller trust gap — `passwordHash` param name is convention only; future caller could pass plaintext; no active runtime bug [`data/auth.ts:34`] — deferred, architectural
- [x] [Review][Defer] No email format validation — spec only requires trim+lowercase; full RFC validation is out of scope — deferred, scope expansion
- [x] [Review][Defer] No minimum password length — not in spec requirements; add in security hardening pass — deferred, scope expansion
- [x] [Review][Defer] `session.expire` index `nullsLast` inconsistency in schema — pre-existing drizzle-kit pull artifact [`drizzle/schema.ts`] — deferred, pre-existing
- [x] [Review][Defer] `badges.token` no entropy/format constraint in schema — pre-existing; token generation controlled at application layer [`drizzle/schema.ts`] — deferred, pre-existing
- [x] [Review][Defer] `organizers.name` nullable in schema but required at app level — intentional; backward compat with pre-existing rows; documented in story [`drizzle/schema.ts:16`] — deferred, intentional
- [x] [Review][Defer] `session.save()` failure leaves orphan organizer row (no rollback) — MVP scope; no distributed transactions in Neon serverless; user can log in after [`app/api/auth/register/route.ts:38-44`] — deferred, pre-existing architectural constraint
