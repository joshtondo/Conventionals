# Story 3.1: Upload Page & Navigation

Status: review

## Story

As an **organizer**,
I want to navigate to an upload page for a specific event,
So that I have a dedicated place to manage attendees.

## Acceptance Criteria

**Given** I am on the dashboard and have at least one event
**When** I click the manage/upload link for an event
**Then** I am taken to `/event/[id]/upload`
**And** the upload page Server Component verifies my session and confirms I own the event (HTTP 404 if not)
**And** the page renders with the event name and an `UploadForm` Client Component shell
**And** `await params` is used before destructuring `id` from the route params

## Tasks / Subtasks

- [x] Task 1: Add `getEventById` to `data/events.ts` (AC: ownership-verified event fetch)
  - [x] Add `getEventById(eventId: number, organizerId: number)` to existing `conventionals/data/events.ts`
  - [x] Select `id`, `name`, `eventDate` from `events` where `id = eventId AND organizerId = organizerId`
  - [x] Return the event or `null` if not found / not owned

- [x] Task 2: Create `app/event/[id]/upload/page.tsx` — Server Component (AC: `/event/[id]/upload` with ownership check)
  - [x] Create directory `conventionals/app/event/[id]/upload/` and file `page.tsx`
  - [x] `await params` before destructuring `id` (Next.js 15 mandatory)
  - [x] Parse `eventId = parseInt(id, 10)` — if `isNaN`, call `notFound()` from `next/navigation`
  - [x] Check session via `getIronSession` — if no `organizerId`, `redirect('/login')`
  - [x] Call `getEventById(eventId, session.organizerId)` — if `null`, call `notFound()` (renders Next.js 404)
  - [x] Render `<UploadForm eventId={event.id} eventName={event.name} />`

- [x] Task 3: Create `app/event/[id]/upload/UploadForm.tsx` — Client Component shell (AC: page renders with UploadForm)
  - [x] **⚠️ UX Approval Required** — confirmed by user
  - [x] `'use client'` directive
  - [x] Accept props: `eventId: number`, `eventName: string` (eventId not destructured in shell to avoid lint warning — added back in 3.2)
  - [x] Render event name as page heading
  - [x] Shell only — no form functionality yet (that comes in stories 3.2 and 3.5)

- [x] Task 4: Add "Manage" link to each event card in `DashboardClient.tsx` (AC: navigate from dashboard to upload page)
  - [x] **⚠️ UX Approval Required** — confirmed by user
  - [x] Add `<a href={`/event/${event.id}/upload`}>` link to each event card
  - [x] Style as a small indigo text link, placed below the event date

- [x] Task 5: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### ⚠️ UX Approval Required — Upload Page Shell Design

Proposed `UploadForm` shell layout:

```
┌─────────────────────────────────────────────────┐
│  ← Back to Dashboard                            │
│                                                  │
│  Annual Tech Summit                              │  ← event name, h1
│  ─────────────────────────────────────────────  │
│  [Attendee management UI will go here]           │  ← placeholder text
└─────────────────────────────────────────────────┘
```

- "← Back to Dashboard" — small `<a href="/dashboard">` link at top
- Event name — `h1`, `#111827`, `fontWeight: 700`
- Divider line — `borderBottom: '1px solid #e5e7eb'` on a div, `marginBottom: 1.5rem`
- Placeholder `<p>` — `#6b7280`, `fontSize: 0.875rem` (will be replaced in 3.2/3.5)
- Page background: `#f9fafb` (matches dashboard)

### ⚠️ UX Approval Required — Dashboard "Manage" Link Design

Proposed: small indigo text link added to each event card, below the date line:

```
┌─────────────────────────────────────────────────┐
│  Annual Tech Summit          [  Delete  ]        │
│  2026-06-15                                      │
│  Manage attendees →                              │  ← new link
└─────────────────────────────────────────────────┘
```

- Link text: "Manage attendees →"
- Style: `color: '#4f46e5'`, `fontSize: '0.875rem'`, `textDecoration: 'none'`
- Plain `<a href={...}>` — no `<Link>` needed (ESLint only flags `/` root page)

**Do NOT implement Tasks 3 or 4 without user confirming the above designs.**

### Files to Create / Modify

```
conventionals/
├── data/
│   └── events.ts                        ← MODIFY: add getEventById()
├── app/
│   ├── event/
│   │   └── [id]/
│   │       └── upload/
│   │           ├── page.tsx             ← CREATE: Server Component
│   │           └── UploadForm.tsx       ← CREATE: 'use client' shell
│   └── dashboard/
│       └── DashboardClient.tsx          ← MODIFY: add Manage link
```

### `data/events.ts` — `getEventById` Addition

```typescript
export async function getEventById(eventId: number, organizerId: number) {
  const [event] = await db
    .select({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
    })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
  return event ?? null
}
```

`and` is already imported from `drizzle-orm` (added in story 2-3).

### `app/event/[id]/upload/page.tsx` — Full Implementation

```typescript
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEventById } from '@/data/events'
import UploadForm from './UploadForm'

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) notFound()

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const event = await getEventById(eventId, session.organizerId)
  if (!event) notFound()

  return <UploadForm eventId={event.id} eventName={event.name} />
}
```

**Note:** `notFound()` from `next/navigation` throws a special Next.js error that renders the nearest `not-found.tsx` (or the default 404 page). Do NOT manually return a 404 response — use `notFound()`.

**Note:** `params` in Next.js 15 App Router pages is typed as `Promise<{ id: string }>` — always destructure after `await params`.

### `app/event/[id]/upload/UploadForm.tsx` — Shell

```typescript
'use client'

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '2rem',
  } as React.CSSProperties,
  backLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '0.875rem',
    display: 'inline-block',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 1rem',
  } as React.CSSProperties,
  divider: {
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  placeholder: {
    color: '#6b7280',
    fontSize: '0.875rem',
  } as React.CSSProperties,
}

export default function UploadForm({ eventId: _eventId, eventName }: { eventId: number; eventName: string }) {
  return (
    <div style={s.container}>
      <a href="/dashboard" style={s.backLink}>← Back to Dashboard</a>
      <h1 style={s.heading}>{eventName}</h1>
      <div style={s.divider} />
      <p style={s.placeholder}>Attendee management coming soon.</p>
    </div>
  )
}
```

**Note:** `eventId` prop is prefixed `_eventId` to avoid the ESLint `no-unused-vars` rule — it will be used in stories 3.2 and 3.5. Alternatively, omit it from the shell and add it in 3.2; however prefixing keeps the prop interface stable.

### Dashboard "Manage" Link — `DashboardClient.tsx` Change

Add to `s` object:
```typescript
manageLink: {
  color: '#4f46e5',
  textDecoration: 'none',
  fontSize: '0.875rem',
  display: 'inline-block',
  marginTop: '0.5rem',
} as React.CSSProperties,
```

Add to each event `<li>` after the date `<p>`:
```tsx
<a href={`/event/${event.id}/upload`} style={s.manageLink}>
  Manage attendees →
</a>
```

### Key Implementation Rules

**DO:**
- Use `notFound()` from `next/navigation` for missing/unowned events — do NOT return manual 404 JSON
- `await params` (typed as `Promise<{ id: string }>`) in the page component — same pattern as route handlers
- `_eventId` prefix on unused prop in shell (ESLint enforces no unused vars — this project does NOT ignore `_` prefix, so check lint after)
- Keep `UploadForm` as a shell — do NOT add form functionality (stories 3.2 and 3.5 handle that)

**DO NOT:**
- Inline session check in the page without the redirect guard
- Add `import 'server-only'` to page files — only `data/` and `lib/` files
- Use `<Link>` for the "Back to Dashboard" link — plain `<a>` is fine for non-root pages
- Forget `and` is already imported in `data/events.ts` — no need to re-add it

### Previous Story Learnings (Stories 1-5 through 2-3)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- No Tailwind — inline styles via `s` object with `as React.CSSProperties`
- Brand color `#4f46e5` (indigo); `#111827` dark; `#6b7280` muted; `#b91c1c` error red
- ESLint does NOT ignore `_` prefix vars — BUT `_eventId` with underscore prefix MAY still trigger; verify lint after Task 3
- Pre-existing lint warning in `drizzle/schema.ts` (`sql` unused) — do not address
- `await params` is mandatory in Next.js 15 for both page components and route handlers
- `notFound()` is the correct pattern for 404s in Server Components (not manual Response)

### Architecture References

- [Source: architecture.md#Frontend Architecture] — Server Components for reads, Client Components for mutations
- [Source: architecture.md#Enforcement Guidelines] — `await params`, no `runtime = 'edge'`, DAL ownership
- [Source: architecture.md#Implementation Patterns] — page naming (`page.tsx`), client component naming (`PascalCase.tsx`)
- [Source: epics.md#Story 3.1] — ownership check, `notFound()`, `UploadForm` shell, `await params`

### Project Structure After This Story

```
conventionals/
├── data/
│   └── events.ts                        ← MODIFIED: + getEventById()
├── app/
│   ├── event/
│   │   └── [id]/
│   │       └── upload/
│   │           ├── page.tsx             ← NEW
│   │           └── UploadForm.tsx       ← NEW (shell)
│   └── dashboard/
│       └── DashboardClient.tsx          ← MODIFIED: + Manage link
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_One lint deviation: `_eventId` prefix in UploadForm.tsx still triggered ESLint `no-unused-vars` warning (ESLint does not ignore `_` prefix in this project). Fixed by not destructuring `eventId` in the shell function signature while keeping it in the prop type — `{ eventName }: { eventId: number; eventName: string }`. Call site in `page.tsx` unchanged._

### Completion Notes List

- **Task 1 ✅**: `getEventById(eventId, organizerId)` added to `data/events.ts` — selects `id`, `name`, `eventDate`, returns `null` if not found/not owned.
- **Task 2 ✅**: `app/event/[id]/upload/page.tsx` created — `await params`, parseInt + notFound, session guard + redirect, ownership check via `getEventById`, renders `<UploadForm>`.
- **Task 3 ✅**: `app/event/[id]/upload/UploadForm.tsx` created — `'use client'` shell, back link, event name heading, divider, placeholder text. UX confirmed by user.
- **Task 4 ✅**: `DashboardClient.tsx` updated — "Manage attendees →" indigo link added below event date. UX confirmed by user.
- **Task 5 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/data/events.ts` (modified — added `getEventById`)
- `conventionals/app/event/[id]/upload/page.tsx` (created)
- `conventionals/app/event/[id]/upload/UploadForm.tsx` (created)
- `conventionals/app/dashboard/DashboardClient.tsx` (modified — added "Manage attendees →" link)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
