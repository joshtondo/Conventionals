# Story 1.1: Project Initialization & Vercel Deployment

Status: in-progress

## Story

As an **organizer**,
I want the Conventionals app to exist as a Next.js application deployed on Vercel,
so that I have a live URL I can navigate to.

## Acceptance Criteria

1. A Next.js 15 app with TypeScript, ESLint, App Router, Turbopack, and `@/*` alias is created — no Tailwind, no `src/` directory
2. The app is connected to Vercel via Git integration and deploys automatically on push to main
3. All required environment variables are configured in Vercel Dashboard: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`
4. Visiting the root URL `/` redirects to `/login`
5. A `.env.example` file exists at the repo root listing all required variable names (no secret values)
6. All runtime and dev dependencies are installed

## Tasks / Subtasks

- [x] Task 1: Initialize Next.js project (AC: 1)
  - [x] Run: `npx create-next-app@latest conventionals --typescript --eslint --app --turbopack --import-alias "@/*" --no-tailwind --no-src-dir`
  - [x] Verify output: `app/`, `public/`, `next.config.ts`, `tsconfig.json`, `package.json` at root — NO `src/` directory

- [x] Task 2: Install all project dependencies (AC: 6)
  - [x] Runtime: `npm install drizzle-orm @neondatabase/serverless iron-session bcryptjs @sendgrid/mail qrcode csv-parse`
  - [x] Dev: `npm install -D drizzle-kit @types/bcryptjs @types/qrcode`

- [x] Task 3: Configure root redirect (AC: 4)
  - [x] Replace content of `app/page.tsx` with a redirect to `/login`
  - [x] Use `redirect('/login')` from `next/navigation` — this is a Server Component, no `'use client'` needed

- [x] Task 4: Create `.env.example` (AC: 5)
  - [x] Create `.env.example` at repo root with all 6 required variable names, no values
  - [x] Ensure `.env.local` is in `.gitignore` (create-next-app adds this by default — verify)

- [ ] Task 5: Configure Vercel deployment (AC: 2, 3)
  - [ ] Push repo to GitHub
  - [ ] Connect repo to Vercel via Vercel Dashboard (Import Project)
  - [ ] Add all 6 environment variables in Vercel Dashboard → Settings → Environment Variables
  - [ ] Verify deployment succeeds and root URL redirects to `/login`

## Dev Notes

### Exact Init Command
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
**Do NOT deviate from these flags.** Adding `--tailwind` or `--src-dir` will break subsequent stories.

### Root Redirect Implementation
```tsx
// app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/login')
}
```
This is a **temporary placeholder only**. Story 1.7 will replace `app/page.tsx` with the full marketing landing page. Do not build the landing page here — just the redirect.

### `.env.example` Content
```
DATABASE_URL=
DIRECT_URL=
SESSION_SECRET=
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
```
- `NEXT_PUBLIC_APP_URL` is the only client-exposed variable (must have the prefix)
- All others are server-only secrets
- `DATABASE_URL` = pooled Neon connection (runtime)
- `DIRECT_URL` = direct Neon connection (migrations only — used by drizzle-kit)

### Dependency Inventory
**Runtime (go to `dependencies` in package.json):**
| Package | Purpose |
|---------|---------|
| `drizzle-orm` | ORM — DB queries |
| `@neondatabase/serverless` | Neon HTTP driver — no TCP state |
| `iron-session` | Stateless encrypted session cookie |
| `bcryptjs` | Password hashing (pure JS, no native bindings) |
| `@sendgrid/mail` | Badge email delivery |
| `qrcode` | QR code generation → base64 PNG |
| `csv-parse` | CSV parsing (sync API used) |

**Dev (go to `devDependencies`):**
| Package | Purpose |
|---------|---------|
| `drizzle-kit` | Schema introspection + migration generation |
| `@types/bcryptjs` | TypeScript types for bcryptjs |
| `@types/qrcode` | TypeScript types for qrcode |

### TypeScript Config Requirements
`create-next-app` generates `tsconfig.json` with `strict: true` and the `@/*` path alias pointing to `./*` (root). **Do not change this.** All imports in future stories use `@/lib/...`, `@/data/...`, `@/app/...`.

### What This Story Does NOT Build
- No `lib/db.ts` (Story 1.2)
- No `drizzle.config.ts` (Story 1.2)
- No `lib/session.ts` or `withAuth` (Story 1.3)
- No login page or auth routes (Story 1.4)
- No dashboard (Story 1.5+)
- No Drizzle schema (Story 1.2)

Do not create placeholder files for future stories. Build only what AC requires.

### Project Structure Notes
After this story, the repo root must look like:
```
conventionals/
├── app/
│   ├── layout.tsx      ← auto-generated, keep as-is
│   ├── page.tsx        ← MODIFIED: redirect('/login')
│   └── globals.css     ← auto-generated, keep as-is
├── public/             ← auto-generated
├── .env.example        ← CREATED by this story
├── .gitignore          ← auto-generated (verify .env.local is in it)
├── next.config.ts      ← auto-generated
├── tsconfig.json       ← auto-generated
├── eslint.config.mjs   ← auto-generated
└── package.json        ← auto-generated + deps installed
```
No other directories at root yet. `lib/`, `data/`, `drizzle/` are created in later stories.

### Vercel Configuration
- Framework preset: **Next.js** (auto-detected)
- Build command: `next build` (default — do not override)
- Output directory: `.next` (default)
- Node.js version: 20.x (select in Vercel project settings)
- Do **not** add a `vercel.json` file — defaults are correct for this project

### Architecture References
- [Source: architecture.md#Starter Template] — exact init command documented
- [Source: architecture.md#Infrastructure & Deployment] — Vercel Git integration, no `vercel.json`
- [Source: architecture.md#Implementation Handoff] — dependency install commands
- [Source: architecture.md#Enforcement Guidelines] — never add `export const runtime = 'edge'`
- [Source: epics.md#Story 1.1] — acceptance criteria

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Next.js init created version 16.2.2 (latest at time of implementation; story specified 15 — both use same App Router patterns)
- Next.js project created in `conventionals/` subdirectory of existing repo root (repo root had pre-existing Express+React code from prior implementation)
- `.gitignore` had `.env*` glob — added `!.env.example` exception so the example file is committable
- `npm run build` passes cleanly; `npx tsc --noEmit` passes; `npm run lint` passes
- Task 5 (Vercel deployment) requires manual human action — HALT for user

### Completion Notes List
- **Task 1 ✅**: Next.js 16.2.2 initialized in `conventionals/` subdir. All flags applied exactly. No `src/` dir. `app/`, `public/`, `next.config.ts`, `tsconfig.json`, `package.json` confirmed present. `@/*` alias confirmed in tsconfig.
- **Task 2 ✅**: All 7 runtime and 3 dev packages installed. Verified in `package.json`.
- **Task 3 ✅**: `app/page.tsx` replaced with `redirect('/login')` Server Component. Build confirms static prerender at `/`.
- **Task 4 ✅**: `.env.example` created with all 6 variable names (no values). `.gitignore` already covers `.env.local` via `.env*` glob; added `!.env.example` exception.
- **Task 5 ⏸ HALTED**: Requires manual Vercel Dashboard actions — push to GitHub, import project, configure env vars, verify live deployment.

### File List
- `conventionals/app/page.tsx` (modified — redirect to /login)
- `conventionals/.env.example` (created)
- `conventionals/.gitignore` (modified — added !.env.example exception)
- `conventionals/package.json` (modified — all deps added)
- `conventionals/package-lock.json` (modified)

### Change Log
- 2026-04-03: Tasks 1–4 implemented (Next.js init, deps install, root redirect, .env.example). Task 5 pending manual Vercel deployment by user.
