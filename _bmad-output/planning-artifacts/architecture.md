---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-04-03'
lastStep: 8
lastUpdated: '2026-04-03'
updateReason: 'Added attendee accounts + connections scope (Epics 5-6): new DB tables, withAttendeeAuth HOF, Drizzle migration workflow, expanded project structure'
inputDocuments: ['_bmad-output/project-context.md', '_bmad-output/planning-artifacts/research/technical-nextjs-vercel-orm-research-2026-04-01.md']
workflowType: 'architecture'
project_name: 'Conventionals'
user_name: 'XdJos'
date: '2026-04-03'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- Event CRUD (organizer-scoped)
- Attendee management: CSV bulk upload + manual single add
- Badge generation: UUID token, QR code, email dispatch via SendGrid
- Badge check-in: QR scan → idempotent check-in endpoint
- Badge email resend per attendee
- Dashboard: attendance stats + attendee table with resend controls
- Public badge page: token-based, no auth required

**Non-Functional Requirements:**
- Security: All organizer data scoped by session `organizerId`; ownership verified on every mutation
- Email reliability: Failures are non-fatal — badge persisted with `email_sent = false`; organizer can resend
- Idempotency: Duplicate attendee emails silently skipped (CSV) or 409 (manual); double check-in returns `alreadyCheckedIn: true`
- File upload: Hard 4.5MB Vercel platform limit (current 5MB multer cap must drop to ≤4MB)
- Timeout: CSV upload + bulk email sends must complete within Vercel function limits (configure `maxDuration = 60`)

**Scale & Complexity:**
- Primary domain: Full-stack web (Next.js App Router)
- Complexity level: Low-Medium
- DB tables: 5 (`session`, `organizers`, `events`, `attendees`, `badges`)
- API surface: 11 endpoints → 11 Next.js Route Handlers
- Pages: 4 (Login, Dashboard, Upload, Badge)

### Technical Constraints & Dependencies

- Vercel serverless: no persistent process, no `pg.Pool` as-is, 4.5MB payload hard limit
- Node.js runtime required for all routes (no Edge Runtime — `@sendgrid/mail`, `qrcode`, `csv-parse` are Node.js-only)
- Two DB connection strings mandatory: pooled (Neon/PgBouncer) for runtime, direct for migrations
- `params` must be awaited in Next.js 15+ — async request API

### Cross-Cutting Concerns Identified

- **Authentication:** `iron-session v8` cookie verified in every protected Route Handler via `withAuth` HOF; also readable in Server Components (read-only)
- **Ownership authorization:** DAL functions enforce `organizerId` scope on every DB read/write — not middleware
- **Email delivery:** Non-fatal wrapper pattern preserved — try/send, catch silently, persist `email_sent` flag
- **DB access:** Single Drizzle client singleton in `lib/db.ts` with global guard for dev hot-reload
- **Environment config:** `APP_URL` → `NEXT_PUBLIC_APP_URL` (client-visible); all secrets remain unprefixed

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — Next.js 15 App Router on Vercel, migrating from Express/React Router SPA.

### Selected Starter: `create-next-app` (official)

**Rationale:** The project is small (4 pages, 11 routes) and all architectural decisions are pre-determined from research. No third-party boilerplate adds value here — `create-next-app` with TypeScript gives a clean, correct foundation without opinion overhead.

**Initialization Command:**

```bash
npx create-next-app@latest conventionals \
  --typescript \
  --eslint \
  --app \
  --turbopack \
  --import-alias "@/*" \
  --no-tailwind \
  --no-src-dir
```

> Note on Tailwind: Omit initially to preserve the existing inline-style convention during migration. Add Tailwind in a follow-up once the app is functional on Next.js.

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript 5.x with strict mode enabled
- Node.js >= 20.9 required
- `"module": "esnext"` — ESM throughout (replaces current CJS/ESM split)

**Build Tooling:**
- Turbopack (Next.js 15 default dev bundler — faster than Webpack)
- `next build` for production (Vercel auto-detects and runs this)

**Code Organization:**
- `app/` directory — App Router file-based routing
- `@/*` import alias mapped to project root
- No `src/` directory — `app/`, `lib/`, `data/` at root level

**Development Experience:**
- `next dev --turbo` for hot reload
- ESLint with `eslint-config-next` (Next.js-aware rules)
- TypeScript plugin for VS Code (use workspace version)

**Note:** Project initialization using this command should be the first implementation story.

---

## Core Architectural Decisions

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | **Drizzle ORM 0.45** | 7.4KB bundle, 75ms cold start, plain SQL migrations, native serverless |
| DB driver | **`@neondatabase/serverless` HTTP** | No TCP connection state; ideal for stateless serverless functions |
| DB host | **Neon (via Vercel Postgres)** | Built-in PgBouncer, Vercel integration, serverless-native |
| Connection strings | **Two required** | `DATABASE_URL` (pooled, runtime) + `DIRECT_URL` (non-pooled, migrations) |
| Schema — initial | **`drizzle-kit pull` → baseline migration** | Introspects existing Express DB; never write schema from scratch |
| Schema — ongoing | **Edit `drizzle/schema.ts` → `drizzle-kit generate` → `drizzle-kit migrate`** | All DB changes go through Drizzle; plain SQL files committed to repo |
| Caching | **None (MVP)** | Badge page ISR `revalidate` is a post-MVP optimization |

**Database Schema Management (canonical workflow):**

All schema changes — adding tables, columns, indexes, constraints — MUST follow this workflow:

```
1. Edit drizzle/schema.ts  ← single source of truth for DB shape
2. npx drizzle-kit generate  ← produces plain SQL migration file in drizzle/migrations/
3. Review the generated SQL file
4. npx drizzle-kit migrate  ← applies migration to DB via DIRECT_URL
5. Commit both schema.ts and the migration file
```

**NEVER** alter the Neon database directly via `psql` or the Neon console. All schema state must be derivable from `drizzle/migrations/` history.

**DB Tables (7 total):**

| Table | Purpose | Added |
|-------|---------|-------|
| `session` | iron-session server-side store (if used) | Existing |
| `organizers` | Event organizer accounts | Existing |
| `events` | Events scoped to organizers | Existing |
| `attendees` | Per-event attendee records + badge + invite token | Existing + `invite_token`, `invite_used_at` columns added |
| `badges` | Badge tokens, QR data, check-in state, email status | Existing |
| `attendee_accounts` | Cross-event attendee identity, profile, auth | New (Epic 5) |
| `connections` | Attendee-owned connection records with notes | New (Epic 6) |

**New table definitions:**

```ts
// attendee_accounts
export const attendeeAccounts = pgTable('attendee_accounts', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  bio: text('bio'),
  socialLinks: jsonb('social_links').$type<{ linkedin?: string; twitter?: string; website?: string }>(),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// connections
export const connections = pgTable('connections', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').notNull().references(() => attendeeAccounts.id, { onDelete: 'cascade' }),
  connectedName: varchar('connected_name', { length: 255 }).notNull(),
  contactInfo: jsonb('contact_info').$type<{ email?: string; phone?: string; linkedin?: string }>(),
  notes: text('notes'),
  eventId: integer('event_id').references(() => events.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**New columns on `attendees`:**
```ts
inviteToken: uuid('invite_token').notNull().defaultRandom(),
inviteUsedAt: timestamp('invite_used_at'),
```

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session | **iron-session v8** | Stateless encrypted HttpOnly cookie; no infra needed; officially listed in Next.js auth docs |
| Organizer auth guard | **`withAuth` HOF per route** | Checks `session.organizerId`; replaces Express `requireAuth` |
| Attendee auth guard | **`withAttendeeAuth` HOF per route** | Checks `session.attendeeAccountId`; same pattern as `withAuth` |
| Session type | **Single cookie, two optional fields** | `SessionData` has `organizerId?: number` and `attendeeAccountId?: number` — one session, two auth paths |
| Auth perimeter | **DAL (Data Access Layer)** | `data/auth.ts`, `data/events.ts`, `data/badges.ts`, `data/attendees.ts`, `data/connections.ts` — ownership checks live here |
| Password hashing | **bcryptjs** | Same library for both organizer and attendee auth |
| Timing-safe login | **Preserved for both auth paths** | Dummy hash pattern in both `data/auth.ts` and attendee auth DAL |
| HTML email escaping | **`escapeHtml()` preserved** | Moved to `lib/email.ts`; applied to all user-supplied email content |
| Invite token | **UUID, single-use, no expiry** | Generated at attendee creation; stored on `attendees.invite_token`; consumed on account setup |
| Connections ownership | **`owner_id` checked on every read/write** | Connections are private; return 404 (not 403) for wrong owner |

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API pattern | **REST Route Handlers** | 11 existing Express endpoints map 1:1 to `app/api/.../route.ts` files |
| Request parsing | **Web API native** | `request.json()`, `request.formData()`, `request.text()` — no Express body-parser |
| File upload | **`request.formData()` + `csv-parse/sync`** | Replaces multer + stream callback; simpler in App Router |
| File size limit | **4MB** (down from 5MB) | Vercel hard 4.5MB platform limit; 4MB gives headroom |
| Timeout config | **`export const maxDuration = 60`** on upload route | Protects against bulk CSV + email timeout on Hobby plan |
| Error shape | **`{ error: string }` unchanged** | Same response contract; no client changes required |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Routing | **Next.js App Router file-based** | Replaces React Router; 4 pages map cleanly |
| Rendering | **Server Components for reads** | Dashboard data, badge page — no `useEffect` fetching needed |
| Mutations | **Client Components + fetch** | Existing form/button interactions preserved; Server Actions are optional future improvement |
| State management | **`useState` local (unchanged)** | No global state manager; Dashboard component state preserved |
| Styling | **Inline styles (unchanged initially)** | Preserve `s`/`styles` object pattern during migration; Tailwind post-MVP |
| Auth check | **`iron-session` in Server Component** | Replaces `ProtectedRoute` component + `/api/auth/me` fetch |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | **Vercel** | Target platform; Git-connected auto-deploy |
| Compute | **Fluid Compute (Node.js runtime)** | Default since Apr 2025; CPU-only billing; ideal for I/O-heavy email/DB workloads |
| Runtime config | **No `export const runtime`** | Default Node.js; never add `edge` to routes using sendgrid/qrcode/csv-parse |
| CI/CD | **Vercel Git integration** | Push-to-deploy; preview deployments on PRs |
| Env vars | **Vercel Dashboard + `vercel env pull`** | All secrets server-only; `NEXT_PUBLIC_APP_URL` is the only client-exposed var |
| Monitoring | **`console.error` + Vercel logs (MVP)** | Sentry or similar post-MVP |

### Decision Priority Analysis

**Critical (block implementation):**
- Drizzle ORM + Neon setup with two connection strings
- iron-session v8 session config with dual-field `SessionData`
- DAL structure (`data/auth.ts`, `data/events.ts`, `data/badges.ts`, `data/attendees.ts`, `data/connections.ts`)
- `withAuth` + `withAttendeeAuth` HOF implementation
- Drizzle `generate` → `migrate` workflow as the ONLY path for schema changes

**Important (shape architecture):**
- File size limit drop to 4MB
- `maxDuration = 60` on upload route
- `NEXT_PUBLIC_APP_URL` env var rename
- `attendee_accounts` and `connections` tables via Drizzle migrations (not manual SQL)
- `invite_token` + `invite_used_at` columns on `attendees` via Drizzle migration

**Deferred (post-MVP):**
- Tailwind CSS migration
- Server Actions for form mutations
- ISR caching on badge page
- Background jobs for large CSV uploads
- Resend as SendGrid alternative
- AI-assisted outreach/email generation from connections notes

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

| Scope | Convention | Example |
|-------|-----------|---------|
| DB tables/columns | `snake_case` | `organizer_id`, `email_sent`, `checked_in_at` |
| Drizzle schema TS props | `camelCase` | `organizerId`, `emailSent`, `checkedInAt` |
| API route segments | `kebab-case`, plural | `/api/events`, `/api/badges` |
| Route Handler files | `route.ts` in segment dir | `app/api/events/[id]/route.ts` |
| Page files | `page.tsx` in segment dir | `app/dashboard/page.tsx` |
| DAL files | lowercase noun | `data/events.ts`, `data/badges.ts` |
| Lib helpers | lowercase noun | `lib/email.ts`, `lib/qr.ts`, `lib/session.ts` |
| Client Components | PascalCase with `.tsx` | `DashboardClient.tsx`, `UploadForm.tsx` |

### Structure Patterns

```
conventionals/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout (no auth check here)
│   ├── page.tsx                 # Redirect → /login
│   ├── login/
│   │   └── page.tsx             # Login page (Server Component)
│   ├── dashboard/
│   │   ├── page.tsx             # Server Component — reads session, fetches data
│   │   └── DashboardClient.tsx  # Client Component — interactive table/resend
│   ├── event/
│   │   └── [id]/
│   │       └── upload/
│   │           ├── page.tsx     # Server Component — auth check
│   │           └── UploadForm.tsx # Client Component — CSV form
│   ├── badge/
│   │   └── [token]/
│   │       └── page.tsx         # Public Server Component — no auth
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── me/route.ts
│       ├── events/
│       │   ├── route.ts         # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts     # GET one, DELETE
│       │       └── attendees/
│       │           └── route.ts # POST add attendee + badge
│       └── badges/
│           └── [token]/
│               ├── route.ts     # GET public badge
│               ├── checkin/
│               │   └── route.ts # POST check-in
│               └── resend/
│                   └── route.ts # POST resend email
├── data/                        # DAL — server-only, never imported by Client Components
│   ├── auth.ts                  # login(), getOrganizer()
│   ├── events.ts                # getEvents(), getEvent(), createEvent(), deleteEvent()
│   └── badges.ts                # createBadge(), getBadge(), checkinBadge(), resendBadge()
├── lib/                         # Shared server + client helpers
│   ├── db.ts                    # Drizzle singleton + schema imports
│   ├── session.ts               # iron-session config + withAuth HOF
│   ├── email.ts                 # sendBadgeEmail(), escapeHtml()
│   └── qr.ts                   # generateQR()
├── drizzle/                     # Drizzle ORM
│   ├── schema.ts                # Table definitions (introspected from existing DB)
│   └── migrations/              # Plain SQL migration files
├── public/                      # Static assets
├── next.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── package.json
└── .env.local
```

**Boundary rules:**
- `data/` files MUST start with `import 'server-only'` — never imported by `'use client'` components
- `lib/db.ts` is also server-only — never imported client-side
- `lib/email.ts` and `lib/qr.ts` are server-only — Node.js APIs only
- `lib/session.ts` exports `withAuth` and session config — server-only

### Format Patterns

**API response shape (unchanged from Express):**
```ts
// Success — varies by endpoint, e.g.:
{ attendee: {...}, badge: {...} }
{ events: [...] }
{ alreadyCheckedIn: true }

// Error — always this shape:
{ error: string }
```

**PG COUNT coercion — always parseInt:**
```ts
const count = parseInt(result[0].count as string, 10)
```

**Email normalization — always on ingest:**
```ts
email.trim().toLowerCase()
```

**Route param validation:**
```ts
const id = parseInt(params.id, 10)
if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
```

### Process Patterns

**`withAuth` HOF template:**
```ts
// lib/session.ts
export function withAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string,string>>; session: SessionData }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string,string>> }) => {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.organizerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, { ...ctx, session })
  }
}
```

**DAL function template:**
```ts
// data/events.ts
import 'server-only'
import { db } from '@/lib/db'
import { events } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export async function getEvent(eventId: number, organizerId: number) {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
  return event ?? null
}
```

**Non-fatal email failure pattern:**
```ts
let emailSent = false
try {
  await sendBadgeEmail(attendee.email, attendee.name, badgeUrl, qrDataUrl)
  emailSent = true
} catch (err) {
  console.error('Badge email failed:', (err as Error).message)
}
await db.update(badges).set({ emailSent }).where(eq(badges.id, badge.id))
```

**Error handling pattern:**
```ts
try {
  // ...
} catch (err) {
  console.error('Context label:', (err as Error).message)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

**`await params` pattern (Next.js 15 required):**
```ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
```

### Enforcement Guidelines

**Mandatory for all agents:**
1. Never use `export const runtime = 'edge'` — all routes use Node.js runtime
2. Never skip `import 'server-only'` in `data/` and server-lib files
3. Never inline session checks in Route Handlers — use `withAuth` (organizer) or `withAttendeeAuth` (attendee)
4. Never inline ownership checks in Route Handlers — always call DAL function with scoped ID
5. Never use string interpolation in SQL — parameterized Drizzle queries only
6. Never create a second Drizzle client — import singleton from `@/lib/db`
7. Always `await params` before destructuring in Next.js 15 Route Handlers and pages
8. Always normalize emails: `email.trim().toLowerCase()` before any DB operation
9. Never alter DB schema directly — always edit `drizzle/schema.ts`, run `drizzle-kit generate`, commit the migration file, then run `drizzle-kit migrate`
10. Never write migration SQL files by hand — `drizzle-kit generate` is the only approved source

**`withAttendeeAuth` HOF template:**
```ts
export function withAttendeeAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string,string>>; session: SessionData }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string,string>> }) => {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.attendeeAccountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, { ...ctx, session })
  }
}
```

**`SessionData` type (both auth paths):**
```ts
export interface SessionData {
  organizerId?: number       // set on organizer login
  attendeeAccountId?: number // set on attendee login
}
```

**Anti-patterns to reject:**
- `export const runtime = 'edge'` on any route (breaks sendgrid/qrcode/csv-parse)
- `req.session` / `req.body` — Express API, not Next.js
- Direct DB queries in Route Handlers — must go through DAL
- `new Pool()` — use Drizzle singleton
- `process.env.APP_URL` client-side — use `process.env.NEXT_PUBLIC_APP_URL`
- Editing the Neon DB directly via `psql` or console — all schema changes via `drizzle-kit generate` + `drizzle-kit migrate`
- Writing new SQL migration files by hand — always use `drizzle-kit generate` from `drizzle/schema.ts`
- Reading connections without verifying `owner_id = session.attendeeAccountId`

---

## Project Structure & Boundaries

### Requirements to Structure Mapping

| FR Category | Lives In |
|-------------|----------|
| Auth (login/logout/session check) | `app/login/`, `app/api/auth/`, `data/auth.ts` |
| Event CRUD | `app/dashboard/`, `app/api/events/`, `data/events.ts` |
| Attendee management (CSV + manual) | `app/event/[id]/upload/`, `app/api/events/[id]/attendees/`, `data/badges.ts` |
| Badge generation (QR + email) | `lib/qr.ts`, `lib/email.ts`, `data/badges.ts` |
| Badge check-in (QR scan) | `app/api/badges/[token]/checkin/`, `data/badges.ts` |
| Badge email resend | `app/api/badges/[token]/resend/`, `data/badges.ts` |
| Dashboard (stats + table) | `app/dashboard/page.tsx` (Server), `app/dashboard/DashboardClient.tsx` (Client) |
| Public badge page | `app/badge/[token]/page.tsx` (no auth, public) |

**Cross-cutting concerns:**

| Concern | Location |
|---------|----------|
| Session auth + `withAuth` HOF | `lib/session.ts` |
| Drizzle client singleton | `lib/db.ts` |
| Drizzle schema (introspected) | `drizzle/schema.ts` |
| Plain SQL migrations | `drizzle/migrations/` |
| SendGrid email + escapeHtml | `lib/email.ts` |
| QR code generation | `lib/qr.ts` |
| `bcryptjs` password hashing | `data/auth.ts` |

### Complete Project Directory Structure

```
conventionals/
├── .env.local                       # DATABASE_URL, DIRECT_URL, SESSION_SECRET,
│                                    # SENDGRID_API_KEY, SENDGRID_FROM_EMAIL,
│                                    # NEXT_PUBLIC_APP_URL
├── .env.example                     # Template with all required var names (no secrets)
├── .gitignore                       # node_modules, .env.local, .next
├── next.config.ts                   # No special config needed for MVP
├── tsconfig.json                    # strict: true, paths: { "@/*": ["./*"] }
├── drizzle.config.ts                # dialect: 'postgresql', schema + migrations paths
├── package.json
│
├── app/                             # Next.js App Router
│   ├── layout.tsx                   # Root HTML shell (no auth logic here)
│   ├── page.tsx                     # redirect('/login')
│   │
│   ├── login/
│   │   └── page.tsx                 # Server Component: if session → /dashboard
│   │                                # renders LoginForm (Client Component)
│   │
│   ├── dashboard/
│   │   ├── page.tsx                 # Server Component: reads session, fetches data
│   │   └── DashboardClient.tsx      # 'use client' — interactive table, resend,
│   │                                # create event, delete event
│   │
│   ├── event/
│   │   └── [id]/
│   │       └── upload/
│   │           ├── page.tsx         # Server Component: auth check, passes eventId
│   │           └── UploadForm.tsx   # 'use client' — CSV file input + manual add form
│   │
│   ├── badge/
│   │   └── [token]/
│   │       └── page.tsx             # Public Server Component — no auth
│   │
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts       # POST — bcrypt verify, set session
│       │   ├── logout/route.ts      # POST — destroy session
│       │   └── me/route.ts          # GET — return session organizerId
│       ├── events/
│       │   ├── route.ts             # GET list, POST create — withAuth
│       │   └── [id]/
│       │       ├── route.ts         # GET one, DELETE — withAuth + ownership
│       │       └── attendees/
│       │           └── route.ts     # POST add attendee + badge — withAuth
│       │                            # export const maxDuration = 60
│       ├── badges/
│       │   └── [token]/
│       │       ├── route.ts         # GET — public, no auth
│       │       ├── checkin/route.ts # POST — no auth, idempotent
│       │       └── resend/route.ts  # POST — withAuth, 404 not 403
│       └── attendee/
│           ├── auth/
│           │   ├── signup/route.ts  # POST — consume invite token, create account
│           │   ├── login/route.ts   # POST — withAttendeeAuth sets attendeeAccountId
│           │   └── logout/route.ts  # POST — clears attendeeAccountId
│           ├── profile/
│           │   └── route.ts         # GET + PATCH — withAttendeeAuth
│           └── connections/
│               ├── route.ts         # GET list, POST create — withAttendeeAuth
│               └── [id]/
│                   └── route.ts     # PATCH notes — withAttendeeAuth + ownership
│
├── attendee/                        # Attendee-facing pages
│   ├── signup/
│   │   └── page.tsx                 # Public — invite token in query param
│   ├── login/
│   │   └── page.tsx                 # Public — redirects if already authed
│   ├── dashboard/
│   │   └── page.tsx                 # withAttendeeAuth — event history
│   ├── profile/
│   │   └── page.tsx                 # withAttendeeAuth — edit profile + visibility
│   ├── event/
│   │   └── [id]/
│   │       └── people/
│   │           └── page.tsx         # withAttendeeAuth — browse public attendees
│   └── connections/
│       └── page.tsx                 # withAttendeeAuth — connections list + notes
│
├── data/                            # DAL — server-only
│   ├── auth.ts                      # getOrganizerByEmail(), verifyPassword()
│   ├── events.ts                    # getEvents(), getEvent(), createEvent(), deleteEvent()
│   ├── badges.ts                    # createAttendeeAndBadge(), getBadgeByToken(),
│   │                                # checkinBadge(), resendBadge(),
│   │                                # getAttendeesByEvent(), getDashboardStats()
│   ├── attendees.ts                 # getAttendeeByInviteToken(), createAttendeeAccount(),
│   │                                # getAttendeeAccountByEmail(), updateProfile(),
│   │                                # getEventHistory(), getPublicAttendeesForEvent()
│   └── connections.ts               # createConnection(), getConnections(),
│                                    # updateConnectionNotes()
│
├── lib/
│   ├── db.ts                        # Drizzle client singleton + global guard
│   ├── session.ts                   # iron-session config, withAuth HOF, SessionData type
│   ├── email.ts                     # sendBadgeEmail(), escapeHtml()
│   └── qr.ts                        # generateQR() → base64 data URL
│
├── drizzle/
│   ├── schema.ts                    # Table definitions introspected from existing DB
│   └── migrations/
│       └── 0000_baseline.sql        # Baseline from drizzle-kit pull
│
└── public/                          # Static assets (none currently needed)
```

### Architectural Boundaries

**API Boundaries:**
- All organizer-scoped endpoints: `withAuth` HOF → session `organizerId` injected
- Public endpoints: `GET /api/badges/[token]` + `POST /api/badges/[token]/checkin` — no session
- DAL is the authorization perimeter — every `data/` function receives and enforces `organizerId`
- 404 (not 403) for resource not owned — prevents existence leaking

**Component Boundaries:**
- Server Components own: initial data fetch, session read, redirect logic
- Client Components own: form state, interactive events, per-row loading state (resend)
- Client Components call `/api` routes directly — no server-to-client data prop drilling after initial load
- No global state; `useState` local per Client Component

**Data Boundaries:**
- `data/` → Drizzle → Neon HTTP driver — server-only, no TCP connection state
- `lib/db.ts` exports the single Drizzle instance — global singleton with dev hot-reload guard
- No direct DB calls from Route Handlers — all DB access through DAL
- Two connection strings: `DATABASE_URL` (pooled runtime) / `DIRECT_URL` (direct migrations only)

**External Integrations:**
- SendGrid: `lib/email.ts` → called from `data/badges.ts` — non-fatal, badge persisted regardless
- QR Code: `lib/qr.ts` → called from `data/badges.ts` during badge creation
- Neon: `lib/db.ts` → `@neondatabase/serverless` HTTP driver
- Vercel: Git-push auto-deploy; env vars via Vercel Dashboard + `vercel env pull`

**Data Flow — Badge Creation:**
```
POST /api/events/[id]/attendees
  → withAuth → session.organizerId
  → request.formData() / request.json()
  → data/badges.ts: createAttendeeAndBadge(organizerId, eventId, name, email)
      → verify event ownership (WHERE id = $1 AND organizer_id = $2)
      → INSERT attendee ON CONFLICT DO NOTHING
      → crypto.randomUUID() → INSERT badge
      → lib/qr.ts: generateQR(badgeUrl)
      → lib/email.ts: sendBadgeEmail(...)  ← non-fatal try/catch
      → UPDATE badge SET email_sent
  → NextResponse.json({ attendee, badge })
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible. `@neondatabase/serverless` HTTP driver works inside Vercel Fluid Compute (Node.js runtime). `@sendgrid/mail`, `qrcode`, and `csv-parse` are Node.js-only — all routes intentionally use Node.js runtime (no `edge`). `iron-session v8` is compatible with Next.js 15 App Router `cookies()` API. Drizzle 0.45 + `@neondatabase/serverless` is a documented, tested pairing. `bcryptjs` (pure JS) works in Node.js serverless — no native bindings needed.

**Pattern Consistency:**
`withAuth` HOF pattern is consistent with Route Handler structure. DAL `import 'server-only'` enforced at the boundary. `await params` documented in both patterns and enforcement rules. Error shape `{ error: string }` used consistently. `parseInt` for PG COUNT documented in format patterns.

**Structure Alignment:**
Flat `app/api/` tree matches the 11-endpoint surface (9 route files, multiple HTTP methods per file). `data/` separation mirrors the existing Express `server/routes/` → `server/services/` split. No `src/` directory aligns with `--no-src-dir` initialization.

### Requirements Coverage Validation ✅

| Functional Requirement | Architectural Support |
|------------------------|----------------------|
| Event CRUD | `app/api/events/` routes + `data/events.ts` |
| CSV bulk upload | `app/api/events/[id]/attendees/route.ts` + `request.formData()` + `csv-parse/sync` + `maxDuration=60` |
| Manual attendee add | Same route, JSON body path |
| Badge generation | `data/badges.ts` + `lib/qr.ts` + `crypto.randomUUID()` |
| Email dispatch | `lib/email.ts` + `@sendgrid/mail` — non-fatal pattern |
| Badge check-in | `app/api/badges/[token]/checkin/route.ts` — idempotent, no auth |
| Badge email resend | `app/api/badges/[token]/resend/route.ts` — `withAuth`, 404 not 403 |
| Dashboard stats | `data/badges.ts: getDashboardStats()` in Server Component |
| Public badge page | `app/badge/[token]/page.tsx` — no auth |

| Non-Functional Requirement | Architectural Support |
|---------------------------|----------------------|
| Session scoping by organizerId | `withAuth` HOF + DAL ownership param on every query |
| Email non-fatal | try/catch in `data/badges.ts`, `email_sent` flag persisted |
| Duplicate email idempotency | `ON CONFLICT (event_id, email) DO NOTHING` |
| Double check-in idempotency | `checkinBadge()` checks existing flag → `{ alreadyCheckedIn: true }` |
| 4MB file size limit | Vercel 4.5MB hard limit; 4MB documented as cap |
| 60s timeout for upload | `export const maxDuration = 60` on attendees route |
| `NEXT_PUBLIC_APP_URL` | Documented in env vars and anti-patterns |
| Timing-safe login | Dummy hash constant in `data/auth.ts` |

### Implementation Readiness Validation ✅

**Decision Completeness:** All 5 decision tables have specific versions, rationale, and alternatives considered. Critical decisions have code templates.

**Structure Completeness:** Every file in the project tree is annotated with its purpose. No placeholder directories. Routes map 1:1 to Express endpoints.

**Pattern Completeness:** 8 mandatory rules + 5 anti-patterns explicitly documented. Templates provided for `withAuth`, DAL functions, error handling, email failure, and `await params`.

### Gap Analysis Results

**Critical Gaps:** None.

**Important — documented here for agents:**

`lib/db.ts` singleton implementation:
```ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '@/drizzle/schema'

const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle> }

export const db = globalForDb.db ?? drizzle(neon(process.env.DATABASE_URL!), { schema })

if (process.env.NODE_ENV !== 'production') globalForDb.db = db
```

`drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: { url: process.env.DIRECT_URL! },
})
```

**Nice-to-Have (post-MVP):** Admin organizer seeding script, test structure, Sentry integration.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Low-Medium, 4 pages, 11 routes)
- [x] Technical constraints identified (Vercel 4.5MB, Node.js only, async params)
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed (maxDuration, Fluid Compute, HTTP driver)

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory tree defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High** — Migration of existing working code to a well-understood target stack. All decisions grounded in research and validated against actual platform constraints.

**Key Strengths:**
- Exact 1:1 mapping from Express routes to Next.js Route Handlers — no logic translation needed
- DAL pattern preserves all existing ownership and security semantics
- Non-fatal email and idempotency patterns explicitly preserved
- Pure migration scope — no new features reduces risk significantly

**Areas for Future Enhancement:**
- Tailwind CSS migration (post-MVP)
- Server Actions for form mutations (post-MVP)
- ISR caching on badge page (`export const revalidate = 3600`)
- Sentry error monitoring

### Implementation Handoff

**First Implementation Step:**
```bash
npx create-next-app@latest conventionals \
  --typescript --eslint --app --turbopack \
  --import-alias "@/*" --no-tailwind --no-src-dir
```

**Then install dependencies:**
```bash
npm install drizzle-orm @neondatabase/serverless iron-session bcryptjs @sendgrid/mail qrcode csv-parse
npm install -D drizzle-kit @types/bcryptjs @types/qrcode
```

**Then introspect existing schema:**
```bash
npx drizzle-kit pull  # requires DIRECT_URL in .env.local
```

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and `server-only` boundaries
- Refer to this document for all architectural questions
