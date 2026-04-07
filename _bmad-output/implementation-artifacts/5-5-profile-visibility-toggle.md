# Story 5.5: Profile Visibility Toggle

Status: review

## Story

As an **attendee**,
I want to control whether my profile is publicly visible,
so that I can choose whether other attendees can find and connect with me.

## Acceptance Criteria

**Given** I am logged in and on `/attendee/profile`
**When** I toggle the visibility switch and save
**Then** `PATCH /api/attendee/profile` sets `is_public` on my `attendee_accounts` row
**And** toggling to private removes my profile from attendee browse lists
**And** toggling back to public makes my profile reappear in browse lists
**And** new accounts default to `is_public = true`

## Tasks / Subtasks

- [x] Task 1: Extend `updateProfile` in `data/attendees.ts` to handle `isPublic` (AC: sets `is_public` column)
  - [x] Add `isPublic?: boolean` to `ProfileUpdateFields` type
  - [x] In `updateProfile`, add: `if (fields.isPublic !== undefined) update.isPublic = fields.isPublic`

- [x] Task 2: Extend `PATCH /api/attendee/profile` route to accept `isPublic` (AC: updates `is_public`)
  - [x] Add `isPublic?: unknown` to body type declaration
  - [x] After existing field assignments, add: `if (body.isPublic !== undefined) fields.isPublic = body.isPublic === true`
  - [x] No separate validation needed — coerce to boolean (`=== true` treats non-true as false)

- [x] Task 3: Add visibility toggle to `ProfileForm.tsx` (AC: toggle saves `isPublic`)
  - [x] **UX APPROVAL REQUIRED** — describe change and get explicit "y" before implementing
  - [x] Proposed UX: below social links section, add a "Visibility" section heading; a checkbox with label "Make my profile public (visible to other attendees)"; checked = public, unchecked = private; default matches current `account.isPublic` value; submits `isPublic` alongside other fields
  - [x] Add `isPublic` state initialized from `account.isPublic ?? true`
  - [x] Include `isPublic` in the PATCH body
  - [x] Style: inline checkbox + label using existing `s.label` style; no new styles needed

- [x] Task 4: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors

## Dev Notes

### What Already Exists (DO NOT recreate)

- `attendeeAccounts.isPublic` column: `boolean('is_public').notNull().default(true)` — already in schema from story 5-1
- `getAttendeeAccount` already returns `isPublic` — available in `ProfileForm` via `account.isPublic`
- `PATCH /api/attendee/profile` route at `app/api/attendee/profile/route.ts` — **EXTEND, do not recreate**
- `updateProfile` in `data/attendees.ts` — **EXTEND, do not recreate**
- `ProfileForm.tsx` at `app/attendee/profile/ProfileForm.tsx` — **EXTEND, do not recreate**

### Extending `updateProfile` (Task 1)

Add to `ProfileUpdateFields` type in `data/attendees.ts`:
```typescript
type ProfileUpdateFields = {
  name?: string
  company?: string | null
  jobTitle?: string | null
  bio?: string | null
  socialLinks?: { linkedin?: string; twitter?: string; website?: string } | null
  isPublic?: boolean   // ← ADD THIS
}
```

Add in `updateProfile` function body (after socialLinks block):
```typescript
if (fields.isPublic !== undefined) update.isPublic = fields.isPublic
```

### Extending the PATCH Route (Task 2)

Extend body type in `app/api/attendee/profile/route.ts`:
```typescript
let body: {
  name?: unknown
  company?: unknown
  jobTitle?: unknown
  bio?: unknown
  socialLinks?: unknown
  isPublic?: unknown   // ← ADD THIS
}
```

Add after socialLinks field assignment:
```typescript
if (body.isPublic !== undefined) fields.isPublic = body.isPublic === true
```

### ProfileForm.tsx Changes (Task 3)

1. Add state: `const [isPublic, setIsPublic] = useState(account.isPublic ?? true)`
2. Add `isPublic` to the PATCH body in `handleSubmit`
3. Add below social links section, before the Save button:

```tsx
<p style={s.sectionHeading}>Visibility</p>
<div style={{ ...s.formRow, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <input
    id="profile-ispublic"
    type="checkbox"
    checked={isPublic}
    onChange={(e) => setIsPublic(e.target.checked)}
  />
  <label style={{ ...s.label, marginBottom: 0 }} htmlFor="profile-ispublic">
    Make my profile public (visible to other attendees)
  </label>
</div>
```

### Key Patterns (from 5-4 learnings)

- `withAttendeeAuth` already on PATCH route — do not add again
- `import 'server-only'` already in `data/attendees.ts` — do not add again
- Inline style objects (`s.xxx`) used throughout — match existing patterns
- `account.isPublic` is `boolean | null` in the returned type — initialize state with `?? true`
- UX changes require explicit user approval before implementation (project policy)

### Files to Modify

```
conventionals/
├── data/
│   └── attendees.ts                        ← MODIFY: add isPublic to ProfileUpdateFields + updateProfile
├── app/
│   ├── api/
│   │   └── attendee/
│   │       └── profile/
│   │           └── route.ts               ← MODIFY: add isPublic to body type + field assignment
│   └── attendee/
│       └── profile/
│           └── ProfileForm.tsx            ← MODIFY: add visibility toggle (after UX approval)
```

No new files to create.

### Architecture References

- [Source: architecture.md#Database Schema] — `attendeeAccounts.isPublic: boolean('is_public').notNull().default(true)`
- [Source: architecture.md#Authentication & Security] — `withAttendeeAuth` HOF already applied
- [Source: epics.md#Story 5.5] — "Private profile no longer appears in attendee browse lists" (browse list is Epic 6 — this story just sets the flag)
- [Source: epics.md#Story 5.5] — NFR13: new accounts default `is_public = true` (already enforced by schema default)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None_

### Completion Notes List

- Extended `ProfileUpdateFields` with `isPublic?: boolean` and updated `updateProfile` function
- Extended PATCH route body type + added `body.isPublic === true` coercion
- Added visibility checkbox to `ProfileForm.tsx` with `isPublic` state from `account.isPublic ?? true`
- `npx tsc --noEmit` — 0 errors; `npm run lint` — 0 errors

### File List

- `conventionals/data/attendees.ts` — MODIFIED: `isPublic` added to `ProfileUpdateFields` + `updateProfile`
- `conventionals/app/api/attendee/profile/route.ts` — MODIFIED: `isPublic` in body type + field assignment
- `conventionals/app/attendee/profile/ProfileForm.tsx` — MODIFIED: visibility toggle checkbox

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete, status → review.
