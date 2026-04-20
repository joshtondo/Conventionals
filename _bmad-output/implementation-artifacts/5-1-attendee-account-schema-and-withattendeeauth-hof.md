# Story 5.1: Attendee Account Schema & withAttendeeAuth HOF

Status: review

## Story

As a **developer**,
I want the `attendee_accounts` table and attendee auth HOF in place,
So that all subsequent attendee stories have a foundation to build on.

## Acceptance Criteria

**Given** the Drizzle migration runs successfully
**When** the schema is applied
**Then** an `attendee_accounts` table exists with: `id`, `email`, `password_hash`, `name`, `company`, `job_title`, `bio`, `social_links` (JSONB), `is_public` (boolean, default `true`), `created_at`
**And** `lib/session.ts` exports `withAttendeeAuth` HOF — checks `session.attendeeAccountId`, returns HTTP 401 if missing
**And** `SessionData` type is updated to include optional `attendeeAccountId: number`
**And** `data/attendees.ts` is created with `import 'server-only'` for all attendee account DAL functions

## Tasks / Subtasks

- [x] Task 1: Verify `lib/session.ts` already satisfies `withAttendeeAuth` and `SessionData` ACs
  - [x] Confirmed `SessionData` has `attendeeAccountId?: number` — already present from story 1-3
  - [x] Confirmed `withAttendeeAuth` HOF is exported — already present from story 1-3
  - [x] No code changes needed

- [x] Task 2: Add `attendeeAccounts` table to `drizzle/schema.ts` (AC: table exists with correct columns)
  - [x] Added `jsonb` to `drizzle-orm/pg-core` imports
  - [x] Added `attendeeAccounts` table definition after `badges` table with all required columns

- [x] Task 3: Generate Drizzle migration (AC: migration file created)
  - [x] `npx drizzle-kit generate` — created `drizzle/migrations/0003_ambitious_squirrel_girl.sql`
  - [x] Reviewed SQL — correct: `CREATE TABLE "attendee_accounts"` with `jsonb` for `social_links`, all columns match

- [x] Task 4: Apply migration (AC: table available in DB)
  - [x] `npx drizzle-kit migrate` failed — `DIRECT_URL` not set locally (same as story 3-2)
  - [x] Migration file committed to repo; must be applied before deploying stories 5-2+

- [x] Task 5: Create `data/attendees.ts` — shell file (AC: DAL file exists with server-only)
  - [x] Created `conventionals/data/attendees.ts` with `import 'server-only'`, `db`, `attendeeAccounts` imports

- [x] Task 6: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` — 0 errors
  - [x] `npm run lint` — 0 errors; 3 warnings (1 pre-existing schema.ts, 2 expected unused imports in shell attendees.ts)

## Dev Notes

### `attendeeAccounts` Table Definition (from architecture.md)

```typescript
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
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})
```

**Check imports in `drizzle/schema.ts`:** Current imports include `pgTable, index, varchar, json, timestamp, foreignKey, unique, serial, integer, text, boolean, date, uuid`. Need to add `jsonb` — it is NOT the same as `json`. `jsonb` is binary JSON in PostgreSQL (indexed, queryable).

### `lib/session.ts` — Already Implemented

Both `withAttendeeAuth` and `SessionData.attendeeAccountId` are already present in `lib/session.ts` from story 1-3. No changes needed. Verify by reading the file.

### `data/attendees.ts` Shell

```typescript
import 'server-only'
import { db } from '@/lib/db'
import { attendeeAccounts } from '@/drizzle/schema'
```

No functions yet. Stories 5-2 through 6-2 will add functions here.

### Migration Workflow (Canonical)

```bash
# From conventionals/ directory:
npx drizzle-kit generate   # creates SQL in drizzle/migrations/
npx drizzle-kit migrate    # applies via DIRECT_URL (may fail locally if not set)
```

If `DIRECT_URL` is missing: only `generate` succeeds. Document in Dev Agent Record. The migration file must be committed so Vercel/prod can run it.

### Files to Create / Modify

```
conventionals/
├── drizzle/
│   ├── schema.ts              ← MODIFY: add attendeeAccounts table
│   └── migrations/
│       └── 0003_*.sql         ← GENERATED: CREATE TABLE attendee_accounts
├── data/
│   └── attendees.ts           ← CREATE: shell with server-only + imports
```

### Key Implementation Rules

**DO:**
- Use `jsonb` (not `json`) for `socialLinks` — architecture explicitly specifies JSONB
- `withTimezone: true, mode: 'string'` for `createdAt` — consistent with all other timestamps in schema
- Import `jsonb` from `drizzle-orm/pg-core` — it's separate from `json`
- Run `drizzle-kit generate` before `drizzle-kit migrate`
- Commit the generated migration SQL file

**DO NOT:**
- Write migration SQL by hand — always use `drizzle-kit generate` from `drizzle/schema.ts`
- Alter the Neon database directly
- Add any DAL functions to `data/attendees.ts` yet — those belong in stories 5-2 through 6-2
- Confuse `json` and `jsonb` — they are different Drizzle column types

### Architecture References

- [Source: architecture.md#Data Architecture] — `attendeeAccounts` table definition with exact column types
- [Source: architecture.md#Authentication & Security] — `withAttendeeAuth` HOF template, `SessionData` dual-field type
- [Source: architecture.md#Enforcement Guidelines] — rules 9 & 10: never write migration SQL by hand
- [Source: epics.md#Story 5.1] — schema requirements, `withAttendeeAuth`, `data/attendees.ts`

### Previous Story Learnings (1-5 through 4-4)

- All commands run from `conventionals/` directory
- `drizzle-kit migrate` requires `DIRECT_URL` — skip with documentation if not set (established in story 3-2)
- `import 'server-only'` mandatory first line of all `data/` files
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Project Structure After This Story

```
conventionals/
├── drizzle/
│   ├── schema.ts                ← MODIFIED: + attendeeAccounts
│   └── migrations/
│       └── 0003_*.sql           ← NEW: CREATE TABLE attendee_accounts
└── data/
    └── attendees.ts             ← NEW: shell with server-only
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `drizzle-kit migrate` failed: `DIRECT_URL` not set locally. Same pattern as story 3-2. Migration file `0003_ambitious_squirrel_girl.sql` committed; must be applied before deploying stories 5-2+.
- `data/attendees.ts` shell has 2 unused-import warnings (`db`, `attendeeAccounts`) — expected; will be used in story 5-2.

### Completion Notes List

- **Task 1 ✅**: `lib/session.ts` verified — `SessionData.attendeeAccountId` and `withAttendeeAuth` already present from story 1-3. No changes needed.
- **Task 2 ✅**: `drizzle/schema.ts` updated — added `jsonb` import, added `attendeeAccounts` table with all 10 columns matching architecture spec.
- **Task 3 ✅**: `npx drizzle-kit generate` — created `0003_ambitious_squirrel_girl.sql` with correct `CREATE TABLE "attendee_accounts"` SQL including `jsonb` for `social_links`.
- **Task 4 ✅**: `drizzle-kit migrate` skipped — `DIRECT_URL` missing locally. Documented.
- **Task 5 ✅**: `data/attendees.ts` created — `import 'server-only'`, `db`, `attendeeAccounts` imports only.
- **Task 6 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 3 warnings (expected).

### File List

- `conventionals/drizzle/schema.ts` (modified — added jsonb import, attendeeAccounts table)
- `conventionals/drizzle/migrations/0003_ambitious_squirrel_girl.sql` (generated)
- `conventionals/data/attendees.ts` (created — shell)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. 0 TypeScript errors, 0 lint errors.
