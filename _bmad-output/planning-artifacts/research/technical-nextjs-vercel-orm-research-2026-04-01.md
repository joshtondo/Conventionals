---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Next.js + Vercel migration and ORM selection (Prisma vs Drizzle)'
research_goals: 'Evaluate feasibility and approach for migrating Conventionals from Express/React/PostgreSQL to Next.js on Vercel, with an ORM replacing raw pg queries'
user_name: 'XdJos'
date: '2026-04-01'
web_research_enabled: true
source_verification: true
---

# Next.js + Vercel Migration: Comprehensive Technical Research for Conventionals

**Date:** 2026-04-01
**Author:** XdJos
**Research Type:** Technical

---

## Executive Summary

Migrating Conventionals from its current Express/React/PostgreSQL stack to Next.js on Vercel is **feasible with moderate effort** and represents a well-trodden path with strong tooling support. The app is small (5 DB tables, 4 pages, 11 API routes), which significantly reduces migration risk. All three key third-party services (`@sendgrid/mail`, `qrcode`, `csv-parse`) work unchanged in Next.js App Router with the Node.js runtime. The most significant architectural changes are: replacing `express-session` with `iron-session v8`, replacing `multer` with native `request.formData()`, and introducing a Data Access Layer (DAL) to centralize ownership checks.

The ORM choice comes down to preference. **Drizzle ORM** (7.4KB, 75ms cold start, plain SQL migrations, native serverless) is the lighter and faster choice that aligns well with this codebase's SQL-fluent style. **Prisma 7** is fully viable now that the Rust binary engine is gone (WASM-based, 1.6MB), and offers a more abstracted DX. Both support schema introspection from the existing database. Neon (Vercel Postgres) with PgBouncer connection pooling is the recommended database hosting path.

**Key Technical Findings:**
- All existing packages work in Next.js Node.js runtime — no service replacements required
- Vercel's 4.5MB hard payload limit requires dropping the current 5MB multer cap
- `params` must be awaited in Next.js 15+ (`const { id } = await params`) — run the official codemod
- Fluid Compute (Vercel's default since Apr 2025) only charges for CPU time, not I/O wait — email/DB-heavy routes are cheaper than traditional serverless billing
- The DAL pattern is the core architectural addition: one server-only module per resource, centralizing auth + ownership verification

**Recommendations:**
1. Use **Next.js 15 App Router** — App Router is the only forward-supported path on Vercel
2. Use **Drizzle ORM + `@neondatabase/serverless` HTTP driver** — smallest bundle, fastest cold starts, plain SQL migrations
3. Use **iron-session v8** — stateless encrypted cookie session, drop-in for current pattern
4. Use **Neon** (via Vercel Postgres) — two connection strings: pooled for runtime, direct for migrations
5. Build a **DAL immediately** — `data/events.ts`, `data/badges.ts` as the security perimeter, replacing scattered `AND organizer_id = $n` checks

---

## Table of Contents

1. [Technical Research Scope](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
3. [Integration Patterns Analysis](#integration-patterns-analysis)
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
5. [Implementation Approaches](#implementation-approaches)
6. [Risk Assessment](#risk-assessment)
7. [Strategic Recommendations](#strategic-recommendations)

---

## Research Overview

This document covers technical research into migrating Conventionals (Express/React/PostgreSQL) to Next.js hosted on Vercel, with an ORM replacing raw `pg` queries. Research conducted using current web sources (April 2026) with multi-source verification. All findings are grounded in official documentation and current community sources.

---

## Technical Research Scope Confirmation

**Research Topic:** Next.js + Vercel migration and ORM selection (Prisma vs Drizzle)
**Research Goals:** Evaluate feasibility and approach for migrating Conventionals from Express/React/PostgreSQL to Next.js on Vercel, with an ORM replacing raw pg queries

**Technical Research Scope:**
- Architecture Analysis - Next.js App vs Pages Router, serverless constraints, API route patterns
- Implementation Approaches - session handling, file uploads, auth on serverless
- Technology Stack - Next.js, Vercel Postgres/Neon, Prisma 7 vs Drizzle, connection pooling
- Integration Patterns - SendGrid, QR generation, CSV parsing in Next.js API routes
- Performance Considerations - cold starts, connection limits, ORM query overhead

**Scope Confirmed:** 2026-04-01

---

## Technology Stack Analysis

### Next.js: App Router vs Pages Router

**Recommendation: App Router for all new projects.**

The App Router (stabilized in Next.js 14, refined in 15) is now the default and future-directed choice. Vercel has moved Pages Router into maintenance mode — bug fixes and security patches only, no new features. Vercel's own starter templates now exclusively use the App Router.

**Key differences relevant to this migration:**
- **Rendering:** App Router uses React Server Components by default — zero client JS unless you add `"use client"`. Pages Router defaults to client-side hydration.
- **Data fetching:** App Router uses `async/await` in Server Components directly (no `getServerSideProps`). Pages Router still requires those legacy patterns.
- **API routes:** Both support route handlers, but App Router uses the Web Standard `Request`/`Response` API — not Express-style `req`/`res`.
- **Server Actions:** App Router supports Server Actions for form mutations without explicit API routes.
- **Layouts:** Nested layouts via `layout.tsx` — shared UI across routes without re-rendering.

_Source: [Next.js App Router Docs](https://nextjs.org/docs/app), [Next.js 15 App vs Pages Router — Medium](https://medium.com/@sehouli.hamza/the-nextjs-15-app-router-vs-pages-router-explained-heres-what-you-need-to-know-for-2025-f66e5eb834ff)_

---

### Session Management on Vercel Serverless

**Why `express-session` cannot be used:**
Vercel serverless functions are stateless and ephemeral. Each invocation is isolated with no persistent memory. `express-session` is Express middleware requiring `IncomingMessage`/`ServerResponse` — not the Web Standard `Request`/`Response` used by Next.js Route Handlers. Even with a PostgreSQL store, it cannot work in this model.

**Current alternatives (ranked for this project):**

| Option | Best For | Notes |
|--------|----------|-------|
| **iron-session v8** | Simple credential auth (our case) | Encrypts session data directly into an HttpOnly cookie. No server-side store needed. Officially listed in Next.js auth docs. |
| **jose (JWT manual)** | Full control over token shape | Lower-level than iron-session; Next.js docs use this in their own auth example. |
| **Auth.js v5 (NextAuth)** | OAuth/social logins needed | Overkill for email+password only; useful if social login is added later. |
| **Clerk / WorkOS** | Enterprise / managed auth | Offloads all complexity; adds third-party dependency. |

**Recommendation for Conventionals:** `iron-session v8` — stateless, no infra changes, drop-in replacement for the current session pattern. Session data (organizerId) is encrypted into a cookie.

_Source: [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication), [iron-session GitHub](https://github.com/vvo/iron-session)_

---

### File Uploads on Vercel

**Critical constraint: Vercel enforces a hard 4.5 MB payload limit** on serverless functions at the platform level. This cannot be overridden — Vercel rejects the payload before the function runs.

**Why `multer` cannot be used:**
Multer wraps Express's `IncomingMessage` stream. Next.js Route Handlers use Web Standard `Request` objects. Multer cannot process these without fragile shimming.

**Options for Conventionals (CSV uploads — typically well under 4.5 MB):**

- **App Router:** Use native `request.formData()` — no library needed.
- **Pages Router:** Use `formidable` v3+ with `export const config = { api: { bodyParser: false } }`.

**For files > 4.5 MB (not currently needed, but worth noting):** Use client-direct uploads to Vercel Blob or presigned S3/R2 URLs — the serverless function only receives metadata.

The current 5 MB multer limit in Conventionals sits just above Vercel's 4.5 MB hard cap. **This limit will need to drop to ≤4.5 MB** (or move to direct-to-storage uploads for large CSVs) after migration.

_Source: [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations), [FUNCTION_PAYLOAD_TOO_LARGE](https://vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE)_

---

### ORM Comparison: Prisma 7 vs Drizzle

| Factor | Prisma 7 | Drizzle 0.45 |
|--------|----------|--------------|
| Bundle size | ~1.6MB (600KB gzipped) | ~7.4KB — 28x smaller |
| Cold start | ~115ms | ~75ms |
| Schema style | `.prisma` DSL file | TypeScript code-first |
| Type safety | Generated types (stale until regenerated) | Inferred directly, always current |
| SQL control | Abstracted | SQL-like, transparent |
| Edge/serverless | Yes (WASM in v7) | Yes (native, always) |
| Migrations | Mature, automatic SQL gen | Plain SQL files, manual but auditable |
| Ecosystem maturity | Very mature, large community | ~5M weekly downloads, 33k⭐, growing fast |
| Introspect existing schema | Yes (`prisma db pull`) | Yes (`drizzle-kit introspect`) |

**Prisma 7 notes:** Dropped the Rust binary engine — now WASM-based. 88% bundle size reduction vs v6. Full edge runtime support. Best if you prefer schema-first and want the most mature ecosystem.

**Drizzle notes:** Code-first, SQL-like query syntax. Plain SQL migration files you can inspect and audit. Best for teams that want maximum transparency and minimal magic.

**Recommendation for Conventionals:** Either works well. **Drizzle** is the lighter, faster choice with more explicit SQL control — good match for a small, SQL-fluent codebase. **Prisma** if you prefer the `.prisma` schema abstraction and want `prisma studio` for database browsing.

_Source: [Drizzle vs Prisma 2026 — MakerKit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma), [Prisma Blog — Rust to TypeScript](https://www.prisma.io/blog/from-rust-to-typescript-a-new-chapter-for-prisma-orm)_

---

### PostgreSQL Connection Pooling on Vercel

**Why `pg.Pool` fails on standard Vercel serverless:**
Under load, Vercel spins up many concurrent function instances — each with its own pool. This rapidly exhausts PostgreSQL's `max_connections` (typically 100 on hobby tiers). Connections also leak if functions exit before cleanup.

**Recommended solutions:**

1. **Neon + `@neondatabase/serverless` HTTP driver** — Best for simple queries. Each query is an HTTP fetch. No connection state, no pooling config needed. Fastest cold start.
2. **Neon pooled connection string (PgBouncer transaction mode)** — Best for ORM usage (Prisma/Drizzle). Use the pooled URL at runtime, direct URL for migrations only.
3. **Vercel Fluid Compute + `attachDatabasePool`** — Newer model that keeps instances warm; allows `pg.Pool` reuse across invocations. Only for Fluid compute.

**Critical migration rule:** Always use **two connection strings**:
- `DATABASE_URL` (pooled/PgBouncer) → runtime queries via ORM
- `DIRECT_URL` or `DATABASE_URL_NON_POOLING` → migrations only (DDL fails through PgBouncer transaction mode)

_Source: [Neon Connection Pooling Docs](https://neon.com/docs/connect/connection-pooling), [Vercel Connection Pooling KB](https://vercel.com/kb/guide/connection-pooling-with-functions)_

---

### Technology Adoption Trends

- **Next.js App Router** is the clear winner for new projects as of 2026 — full Vercel investment, React ecosystem alignment
- **Drizzle ORM** is the fastest-growing ORM in the TypeScript ecosystem (5M weekly npm downloads, April 2026)
- **Neon** is the dominant serverless PostgreSQL provider; Vercel Postgres is Neon under the hood
- **iron-session** remains the go-to for simple credential-based sessions in Next.js
- **Vercel deprecated `@vercel/postgres` SDK** — recommends migrating to `@neondatabase/serverless` directly

---

## Integration Patterns Analysis

### Service Compatibility Summary

All three third-party services used by Conventionals work in Next.js App Router Route Handlers running the default **Node.js runtime**. None are compatible with the Edge Runtime — do not add `export const runtime = 'edge'` to any route that uses these packages.

| Package | Works in App Router? | Edge Runtime | Key Change vs Express |
|---------|---------------------|--------------|----------------------|
| `@sendgrid/mail` | ✅ Yes | ❌ No | Identical usage; consider Resend as modern alternative |
| `qrcode` | ✅ Yes | ❌ No | Use `toBuffer()` — avoid `canvas` addon in serverless |
| `csv-parse` | ✅ Yes | ❌ No | Use `csv-parse/sync` + `request.text()` instead of stream piping |

### Replacing Express Routes with Next.js Route Handlers

**File structure pattern:**
```
app/
  api/
    auth/
      login/route.ts       ← POST /api/auth/login
      logout/route.ts      ← POST /api/auth/logout
      me/route.ts          ← GET /api/auth/me
    events/
      route.ts             ← GET, POST /api/events
      [id]/
        route.ts           ← GET /api/events/:id
        attendees/route.ts ← POST /api/events/:id/attendees
        upload/route.ts    ← POST /api/events/:id/upload
        stats/route.ts     ← GET /api/events/:id/stats
    badges/
      [token]/
        route.ts           ← GET /api/badges/:token
        checkin/route.ts   ← POST /api/badges/:token/checkin
        resend/route.ts    ← POST /api/badges/:token/resend
lib/
  db.ts                    ← singleton ORM client
  auth.ts                  ← withAuth HOF + session helpers
  session.ts               ← iron-session config
```

**Replacing `requireAuth` middleware — Higher-Order Function pattern:**
```ts
// lib/auth.ts
type Handler = (req: NextRequest, ctx: any) => Promise<Response>;

export function withAuth(handler: Handler): Handler {
  return async (req, ctx) => {
    const session = await getSession(req);
    if (!session?.organizerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, ctx);
  };
}

// Usage in route handler:
export const GET = withAuth(async (req) => { ... });
```

**Key architectural notes:**
- Route Handlers use Web Standard `Request`/`Response` — not Express `req`/`res`
- Route params (`[id]`, `[token]`) are accessed via the second argument: `async (req, { params }) => { const id = params.id }`
- Root `middleware.ts` (Edge Runtime) is best for coarse auth redirects only; resource ownership checks stay in route handlers
- Official Next.js guidance (2025): security checks should happen in the Data Access Layer, not middleware alone

_Source: [Building APIs with Next.js](https://nextjs.org/blog/building-apis-with-nextjs), [Next.js Route Handlers docs](https://nextjs.org/docs/app/getting-started/route-handlers)_

---

### CSV Parsing Pattern (replacing multer + csv-parse stream)

**Current Express pattern:**
```js
multer memoryStorage → buffer → csv-parse callback
```

**Next.js App Router equivalent:**
```ts
import { parse } from 'csv-parse/sync';

export const POST = withAuth(async (req, { params }) => {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const text = await file.text();
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
  // rows is a plain array — same as current codebase
});
```

**Key change:** Use `csv-parse/sync` (synchronous) with `request.formData()` + `file.text()` — avoids Node.js stream bridging complexity entirely.

_Source: [csv-parse npm](https://www.npmjs.com/package/csv-parse), [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)_

---

### Vercel Execution Time Limits

For bulk CSV uploads with email sends (the most time-intensive operation in Conventionals):

| Plan | Default | Max (Serverless) | Max (Fluid Compute) |
|------|---------|-----------------|---------------------|
| Hobby | 10s | 60s | 300s |
| Pro | 15s | 300s | 800s |

**Risk:** Uploading a large CSV with 500+ attendees and sending 500 SendGrid emails sequentially could exceed the default 10–15s timeout.

**Mitigations:**
- Configure `export const maxDuration = 60` on the upload route (Hobby: 60s max)
- For large lists, switch to background job processing (Vercel Cron, Inngest, or queue-based)
- Or fire-and-forget email sends (respond to client immediately, process emails async)

_Source: [Vercel Functions Limits](https://vercel.com/docs/functions/limitations), [Configuring maxDuration](https://vercel.com/docs/functions/configuring-functions/duration)_

---

## Architectural Patterns and Design

### Data Access Layer (DAL) Pattern

Next.js officially recommends a DAL for all new App Router projects (docs updated March 2026). It is the critical architectural pattern that replaces the "Express route as security perimeter" model.

**What it is:** A server-only module (`import 'server-only'`) that centralizes all DB access, session verification, and authorization checks. Server Actions and Route Handlers become thin entry points that call DAL functions.

**Why it matters for Conventionals:** The current codebase does ownership verification inside each route handler (`AND organizer_id = $n`). In Next.js, without a DAL, this check would need to be duplicated in every Server Action and Route Handler separately. The DAL makes it the single place.

```ts
// data/events.ts
import 'server-only'
import { getCurrentOrganizer } from './auth'
import { db } from '@/lib/db'

export async function getEvent(eventId: number) {
  const organizer = await getCurrentOrganizer() // cached per-request
  if (!organizer) throw new Error('Unauthorized')
  const event = await db.query.events.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, eventId), eq(e.organizerId, organizer.id))
  })
  if (!event) throw new Error('Not found')
  return event
}
```

**Critical security note:** Middleware is NOT a safe auth perimeter in Next.js. Auth must be re-verified in every Server Action and DAL function — a page-level redirect does not protect Server Actions.

_Source: [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security), [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication)_

---

### Server Components vs Route Handlers vs Server Actions

For a CRUD app like Conventionals:

| Use Case | Pattern |
|----------|---------|
| Read data for page render (dashboard, badge page) | Server Component — fetch directly from DB, no API hop |
| Mutations from your own UI (create event, add attendee) | Server Action — thin wrapper calling DAL |
| External API access (mobile app, third party, badge QR scan from any client) | Route Handler (`app/api/.../route.ts`) |
| Webhooks | Route Handler |

**Current recommendation (Next.js official blog, Feb 2025):** "If you plan to use Server Actions and expose a public API, move the core logic to a DAL and call the same logic from both." Route Handlers and Server Actions are two entry points into the same DAL.

For Conventionals, the badge page (`GET /api/badges/:token`) must remain a Route Handler — it's called by external QR scanners with no session. The dashboard data could move to Server Components entirely.

_Source: [Building APIs with Next.js](https://nextjs.org/blog/building-apis-with-nextjs), [Server Actions vs Route Handlers — MakerKit](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers)_

---

### Express to Next.js Migration Pattern

**Recommended strategy: Strangler Fig with parallel `/app` directory**

1. Keep current React Router SPA intact as `/pages` (or migrate wholesale — Conventionals is small enough)
2. Build App Router routes in `/app` alongside
3. Test with URL rewrites before cutting over
4. Remove Pages Router once App Router is stable

**Express gotchas with no direct equivalent:**

| Express Pattern | Next.js Approach |
|---|---|
| `req.body` | `await request.json()` |
| `req.params.id` | `const { id } = await params` — **Promise in Next.js 15+, must be awaited** |
| `app.use(middleware)` | HOF wrappers per route (`withAuth(handler)`) |
| `express-session` | `iron-session` v8 (encrypted cookie) |
| `app.listen()` startup seed | DB singleton + lazy init on first request |
| `res.locals` | React `cache()` or per-request closures |
| WebSockets | Not supported on Vercel — needs external service (Pusher/Ably) |

**Run this codemod after installing Next.js 15:**
```bash
npx @next/codemod@latest next-async-request-api
```
This auto-fixes synchronous `params`/`searchParams` destructuring (a common breakage point).

_Source: [Next.js App Router Migration Guide](https://nextjs.org/docs/app/guides/migrating/app-router-migration), [WorkOS Zero-Downtime Migration](https://workos.com/blog/migrating-to-next-js-app-router-with-zero-downtime)_

---

### Vercel Deployment Architecture

**Compute model overview (2025/2026):**

| Model | Use Case | Notes |
|-------|----------|-------|
| **Fluid Compute (Node.js)** | Route Handlers, Server Actions, SSR | Default for all new projects Apr 2025. Pay for CPU time only — not I/O wait. Instances shared across concurrent requests. |
| **Edge Runtime (V8)** | `middleware.ts` only | ~9x faster cold starts globally, but no Node.js APIs, no DB drivers. Use only for routing/redirects/auth token checks. |
| **CDN (Static)** | Pages with no dynamic data | Zero compute cost, automatically applied at build time. |

**Key reversal from Vercel (2024/2025):** Vercel walked back edge-first guidance. The current recommendation is **Node.js runtime on Fluid Compute for everything**, Edge only for lightweight `middleware.ts` routing logic.

**Fluid Compute advantage for Conventionals:** DB queries and SendGrid calls are I/O-heavy. Fluid Compute charges only for active CPU — I/O wait is free. This makes the email-heavy CSV upload workflow dramatically cheaper than traditional serverless billing.

**Static optimization:** The `/badge/:token` page (public, read-heavy) could be ISR-cached on Vercel's CDN with `revalidate` — reducing DB hits for repeated badge scans.

_Source: [Fluid Compute — Vercel Docs](https://vercel.com/docs/fluid-compute), [Vercel Blog: How We Built Serverless Servers](https://vercel.com/blog/fluid-how-we-built-serverless-servers)_

---

## Implementation Approaches

### Project Setup

```bash
npx create-next-app@latest conventionals --yes
# Requirements: Node.js >= 20.9
```

Accept TypeScript, ESLint, App Router, Turbopack defaults. Skip React Compiler for now.

**Recommended folder structure:**
```
app/
  (auth)/login/page.tsx
  dashboard/page.tsx
  badge/[token]/page.tsx
  api/
    auth/login/route.ts
    auth/logout/route.ts
    auth/me/route.ts
    events/route.ts
    events/[id]/route.ts
    events/[id]/attendees/route.ts
    events/[id]/upload/route.ts
    events/[id]/stats/route.ts
    badges/[token]/route.ts
    badges/[token]/checkin/route.ts
    badges/[token]/resend/route.ts
lib/
  db.ts           ← ORM singleton
  session.ts      ← iron-session config
  email.ts        ← SendGrid helper
  qr.ts           ← QR generation helper
data/             ← DAL (server-only)
  auth.ts
  events.ts
  badges.ts
drizzle/          ← generated schema + migrations
```

_Source: [Next.js 15 Installation](https://nextjs.org/docs/app/getting-started/installation)_

---

### ORM Schema Introspection

**Drizzle (recommended):**
```bash
npm install drizzle-orm @neondatabase/serverless dotenv
npm install -D drizzle-kit

# Introspect existing schema
npx drizzle-kit pull
```

Copy generated `drizzle/schema.ts` to `src/db/schema.ts`. Then baseline existing DB:
```bash
npx drizzle-kit pull --init  # marks current schema as baseline
```

Set `introspectCasing: 'camel'` in `drizzle.config.ts` to convert `snake_case` DB columns to `camelCase` TypeScript properties.

**Prisma (alternative):**
```bash
npx prisma init
npx prisma db pull        # generates prisma/schema.prisma from existing DB
npx prisma generate       # generates TypeScript client
# Then baseline migrations to avoid re-running existing DDL
```

**Critical for both:** Use separate connection strings — pooled URL for runtime, direct URL for migrations (DDL fails through PgBouncer transaction mode).

_Source: [Drizzle: Get Started with existing PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql-existing), [Prisma: Add to existing project](https://www.prisma.io/docs/getting-started/prisma-orm/add-to-existing-project/postgresql)_

---

### Session Migration (express-session → iron-session v8)

**`lib/session.ts`:**
```typescript
import type { SessionOptions } from 'iron-session'

export interface SessionData {
  organizerId?: number
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,  // >= 32 chars
  cookieName: 'conventionals-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,  // 8 hours — matches current Express config
  },
}
```

**Key v8 gotchas:**
- `cookies()` is **async** in Next.js 15 — always `await cookies()` before passing to `getIronSession`
- `session.save()` is async — must be awaited before returning response
- `session.destroy()` is synchronous
- Session data is read-only inside Server Components — writes require Route Handlers or Server Actions

_Source: [iron-session GitHub](https://github.com/vvo/iron-session)_

---

### Environment Variables

**Vercel variable naming rules:**

| Variable | Prefix | Where available |
|----------|--------|----------------|
| `DATABASE_URL` | None | Server only |
| `DIRECT_URL` | None | Server only (migrations) |
| `SESSION_SECRET` | None | Server only |
| `SENDGRID_API_KEY` | None | Server only |
| `SENDGRID_FROM_EMAIL` | None | Server only |
| `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_` | Server + browser |

**Note:** Current `APP_URL` env var must become `NEXT_PUBLIC_APP_URL` since the badge URL (`/badge/:token`) is displayed client-side. All secret keys stay unprefixed.

**Setup:**
1. Add all variables in Vercel Dashboard → Project → Settings → Environment Variables
2. Run `vercel env pull .env.local` to sync development variables locally
3. `NEXT_PUBLIC_` variables are inlined at build time — changing them requires a redeploy

_Source: [Vercel: How to add env variables](https://vercel.com/kb/guide/how-to-add-vercel-environment-variables)_

---

### DB Client Singleton Pattern

Prevent connection exhaustion during Next.js hot reload in development:

```typescript
// lib/db.ts (Drizzle + Neon)
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@/drizzle/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const globalForDb = globalThis as unknown as { db: typeof db }
export const database = globalForDb.db ?? db
if (process.env.NODE_ENV !== 'production') globalForDb.db = database
```

_Source: [Next.js 15 Production Setup](https://janhesters.com/blog/how-to-set-up-nextjs-15-for-production-in-2025)_

---

### Migration Implementation Order

Recommended sequence for Conventionals:

1. **Bootstrap** — `create-next-app`, install deps (Drizzle/Prisma, iron-session, @sendgrid/mail, qrcode, csv-parse)
2. **DB** — Introspect existing schema → generate TypeScript schema → configure two connection strings (pooled + direct)
3. **Session** — Implement `lib/session.ts` + `getCurrentOrganizer()` DAL function
4. **DAL** — Implement `data/auth.ts`, `data/events.ts`, `data/badges.ts` with ownership checks
5. **Auth routes** — `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` Route Handlers
6. **Event/badge routes** — Port all Express routes to Route Handlers using `withAuth` HOF
7. **Pages** — Convert React Router pages to App Router Server Components + Client Components
8. **CSV upload** — Replace multer + stream callback with native `request.formData()` + `csv-parse/sync`
9. **Email** — Port `services/email.ts` → `lib/email.ts` (identical logic, ESM imports)
10. **Deploy to Vercel** — Connect repo, add env vars, deploy
11. **Run codemod** — `npx @next/codemod@latest next-async-request-api` to fix async params

_Source: [Migrating from Vite + Express to Next.js 15 — Medium](https://medium.com/@steinarvdesign/migrating-from-a-react-vite-express-stack-to-next-js-15-part-1-bc3728d0aa74)_

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| CSV upload timeout on Hobby plan (bulk attendee lists + email sends) | High | Medium | Set `export const maxDuration = 60` on upload route; move to batch/async processing for lists > ~100 |
| Vercel 4.5MB hard payload limit (current multer cap is 5MB) | High | Low | Drop file size limit to 4MB in upload route; CSVs are typically tiny |
| `params` async breakage in Next.js 15 | Medium | High | Run `npx @next/codemod@latest next-async-request-api` immediately after setup |
| DB connection exhaustion (pg.Pool on serverless) | High | High | Mitigated by Neon HTTP driver (no persistent connection) or PgBouncer pooled URL |
| Session migration breakage (existing users lose sessions) | Medium | High | Expected — users will need to re-login post-migration; acceptable for this app |
| `iron-session` cookie different from `express-session` cookie | Low | High | Expected; sessions are not portable across the migration — plan for re-login |
| TypeScript strict mode friction | Low | Medium | `create-next-app` enables strict by default; ORM-generated types handle most of this |
| ORM migration baseline failure (re-running DDL on existing DB) | High | Medium | Baseline with `drizzle-kit pull --init` or `prisma migrate resolve --applied` before any migration runs |
| Edge Runtime incompatibility (`@sendgrid/mail`, `qrcode`, `csv-parse`) | High | Low | Mitigated by staying on Node.js runtime (default); never add `export const runtime = 'edge'` to these routes |

---

## Strategic Recommendations

### Technology Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Next.js router | **App Router** | Only forward-supported path; Pages Router is maintenance-only |
| ORM | **Drizzle + `@neondatabase/serverless`** | 7.4KB bundle, 75ms cold start, plain SQL migrations, native serverless |
| Session | **iron-session v8** | Stateless encrypted cookie; no infra changes; officially listed in Next.js auth docs |
| Database hosting | **Neon (via Vercel Postgres)** | Built-in PgBouncer, serverless HTTP driver, deep Vercel integration |
| Compute model | **Fluid Compute (default)** | CPU-only billing; ideal for I/O-heavy email/DB workflows |
| Email | **Keep `@sendgrid/mail`** | Works unchanged; Resend is a viable future alternative if SendGrid is dropped |
| Inline styles | **Keep current pattern initially** | Migrate to Tailwind CSS (included in `create-next-app`) incrementally |

### Migration Approach

Given Conventionals' small size (4 pages, 11 API routes, 5 DB tables), a **wholesale rewrite** is more practical than the strangler fig pattern. The codebase is simple enough that a parallel build and cut-over will be faster than maintaining two systems.

**Suggested milestone sequence:**
1. New Next.js repo with DB introspection + session working
2. All API routes ported + tested locally
3. All pages ported + tested locally
4. Deploy to Vercel preview environment
5. Validate against production DB (read-only testing)
6. Cut over DNS / deploy to production

---

**Research Completion Date:** 2026-04-01
**Source Verification:** All technical facts cited with current sources (April 2026)
**Confidence Level:** High — based on multiple authoritative sources including official Next.js, Vercel, Drizzle, Prisma, iron-session, and Neon documentation

_This research document provides the technical foundation for the Conventionals → Next.js + Vercel migration decision. Next recommended step: Create Architecture document (`[CA]`) to formalize the stack decisions before implementation._
