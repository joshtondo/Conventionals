# Story 5.4: Profile Editing

Status: review

## Story

As an **attendee**,
I want to edit my profile information,
So that other attendees can learn about me and I can keep my details current.

## Acceptance Criteria

**Given** I am logged in and on `/attendee/profile`
**When** I update any profile field (name, company, job title, bio, social links) and save
**Then** `PATCH /api/attendee/profile` updates my `attendee_accounts` row
**And** all fields are trimmed before storage
**And** `social_links` is stored as JSONB (e.g. `{ linkedin, twitter, website }`)
**And** the form reflects my current saved values on load
**And** `data/attendees.ts` exports `updateProfile(attendeeAccountId, fields)`

## Tasks / Subtasks

- [x] Task 1: Add DAL functions to `data/attendees.ts` (AC: get profile, update profile)
  - [x] Add `getAttendeeAccount(attendeeAccountId: number)` — SELECT all profile fields from `attendeeAccounts` WHERE `id = attendeeAccountId`; return full row or `null`
  - [x] Add `updateProfile(attendeeAccountId: number, fields: ProfileUpdateFields)` — PATCH `attendeeAccounts` SET trimmed fields WHERE `id = attendeeAccountId`
  - [x] Define `ProfileUpdateFields` type: `{ name?: string; company?: string | null; jobTitle?: string | null; bio?: string | null; socialLinks?: { linkedin?: string; twitter?: string; website?: string } | null }`
  - [x] Trim all string fields before storing: empty string after trim → `null` for optional fields; `name` must be non-empty (route validates before calling)

- [x] Task 2: Create `app/api/attendee/profile/route.ts` — `withAttendeeAuth` PATCH (AC: updates profile, trimmed fields)
  - [x] Create `conventionals/app/api/attendee/profile/route.ts`
  - [x] Export `PATCH` handler wrapped in `withAttendeeAuth`
  - [x] Parse body: `{ name, company, jobTitle, bio, socialLinks }` — all optional except name must be non-empty string if provided
  - [x] Validate: if `name` is provided it must be a non-empty string after trim; return 400 otherwise
  - [x] Call `updateProfile(ctx.session.attendeeAccountId!, fields)`
  - [x] Return `NextResponse.json({ success: true })`

- [x] Task 3: Create `app/attendee/profile/page.tsx` — Server Component (AC: form pre-filled with current values)
  - [x] Create `conventionals/app/attendee/profile/page.tsx`
  - [x] Read session — if no `attendeeAccountId` → `redirect('/attendee/login')`
  - [x] Call `getAttendeeAccount(session.attendeeAccountId)` — if null → `redirect('/attendee/login')`
  - [x] Render `<ProfileForm account={account} />`

- [x] Task 4: Create `app/attendee/profile/ProfileForm.tsx` — Client Component (AC: editable form, save on submit)
  - [x] **UX APPROVAL REQUIRED** — describe the change and get user approval before implementing UI
  - [x] Proposed: card with heading "My Profile"; fields: Name (required), Company, Job Title, Bio (textarea), LinkedIn URL, Twitter URL, Website URL; "Save" button; success message "Saved!" shown briefly on save; error display
  - [x] Accept prop: `account` with current profile values
  - [x] `PATCH /api/attendee/profile` with changed fields
  - [x] Back link to `/attendee/dashboard`

- [x] Task 5: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning OK)

## Dev Notes

### DAL Functions — `data/attendees.ts`

```typescript
type ProfileUpdateFields = {
  name?: string
  company?: string | null
  jobTitle?: string | null
  bio?: string | null
  socialLinks?: { linkedin?: string; twitter?: string; website?: string } | null
}

export async function getAttendeeAccount(attendeeAccountId: number) {
  const [account] = await db
    .select({
      id: attendeeAccounts.id,
      email: attendeeAccounts.email,
      name: attendeeAccounts.name,
      company: attendeeAccounts.company,
      jobTitle: attendeeAccounts.jobTitle,
      bio: attendeeAccounts.bio,
      socialLinks: attendeeAccounts.socialLinks,
      isPublic: attendeeAccounts.isPublic,
    })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.id, attendeeAccountId))
  return account ?? null
}

export async function updateProfile(attendeeAccountId: number, fields: ProfileUpdateFields) {
  const update: Partial<typeof attendeeAccounts.$inferInsert> = {}
  if (fields.name !== undefined) update.name = fields.name.trim()
  if (fields.company !== undefined) update.company = fields.company ? fields.company.trim() || null : null
  if (fields.jobTitle !== undefined) update.jobTitle = fields.jobTitle ? fields.jobTitle.trim() || null : null
  if (fields.bio !== undefined) update.bio = fields.bio ? fields.bio.trim() || null : null
  if (fields.socialLinks !== undefined) update.socialLinks = fields.socialLinks
  await db.update(attendeeAccounts).set(update).where(eq(attendeeAccounts.id, attendeeAccounts.id))
}
```

### PATCH Route

```typescript
export const PATCH = withAttendeeAuth(async (req, ctx) => {
  let body: { name?: unknown; company?: unknown; jobTitle?: unknown; bio?: unknown; socialLinks?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }
  }

  const fields: ProfileUpdateFields = {}
  if (body.name !== undefined) fields.name = body.name as string
  if (body.company !== undefined) fields.company = typeof body.company === 'string' ? body.company : null
  if (body.jobTitle !== undefined) fields.jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle : null
  if (body.bio !== undefined) fields.bio = typeof body.bio === 'string' ? body.bio : null
  if (body.socialLinks !== undefined && typeof body.socialLinks === 'object' && body.socialLinks !== null) {
    const sl = body.socialLinks as Record<string, unknown>
    fields.socialLinks = {
      linkedin: typeof sl.linkedin === 'string' ? sl.linkedin : undefined,
      twitter: typeof sl.twitter === 'string' ? sl.twitter : undefined,
      website: typeof sl.website === 'string' ? sl.website : undefined,
    }
  }

  await updateProfile(ctx.session.attendeeAccountId!, fields)
  return NextResponse.json({ success: true })
})
```

### `ProfileUpdateFields` type export

Define `ProfileUpdateFields` as a local type in `data/attendees.ts` — it's only used internally and in the route (route can infer from usage).

### Files to Create / Modify

```
conventionals/
├── data/
│   └── attendees.ts                        ← MODIFY: add getAttendeeAccount + updateProfile
├── app/
│   ├── api/
│   │   └── attendee/
│   │       └── profile/
│   │           └── route.ts               ← CREATE
│   └── attendee/
│       └── profile/
│           ├── page.tsx                   ← CREATE
│           └── ProfileForm.tsx            ← CREATE
```

### Key Implementation Rules

**DO:**
- `withAttendeeAuth` on the PATCH route
- Trim all string values in `updateProfile` before storing
- Empty string after trim → null for optional fields (company, jobTitle, bio)
- `isPublic` is NOT updated here — story 5-5 handles that separately

**DO NOT:**
- Return the full profile in the PATCH response — just `{ success: true }`
- Allow `name` to be set to empty string — validate in route before calling DAL
- Update `email` or `passwordHash` from this endpoint — profile fields only

### Architecture References

- [Source: architecture.md#Authentication & Security] — `withAttendeeAuth` HOF for all attendee-protected routes
- [Source: epics.md#Story 5.4] — `updateProfile(attendeeAccountId, fields)`, trim, JSONB social_links

### Previous Story Learnings (1-5 through 5-3)

- `withAttendeeAuth` wraps route handlers — same pattern as `withAuth`
- Server Components read DAL directly (not via API)
- UX changes require explicit user approval
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Project Structure After This Story

```
conventionals/
├── data/
│   └── attendees.ts           ← MODIFIED: + getAttendeeAccount + updateProfile
└── app/
    ├── api/
    │   └── attendee/
    │       └── profile/
    │           └── route.ts   ← NEW
    └── attendee/
        └── profile/
            ├── page.tsx       ← NEW
            └── ProfileForm.tsx ← NEW
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Removed unused `sql` import from `drizzle/schema.ts` — lint warning (defined but never used)

### Completion Notes List

- All 4 files created/modified as specified
- `npx tsc --noEmit` — 0 errors
- `npm run lint` — 0 errors after removing stale `sql` import from schema.ts
- `drizzle-kit migrate` deferred — DIRECT_URL not set in `.env.local`; migration file `0003_ambitious_squirrel_girl.sql` committed for Vercel deployment

### File List

- `conventionals/data/attendees.ts` — MODIFIED: added `getAttendeeAccount`, `updateProfile`, `ProfileUpdateFields` type
- `conventionals/app/api/attendee/profile/route.ts` — CREATED
- `conventionals/app/attendee/profile/page.tsx` — CREATED
- `conventionals/app/attendee/profile/ProfileForm.tsx` — CREATED
- `conventionals/drizzle/schema.ts` — MODIFIED: removed unused `sql` import

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete, status → review.
