# Conventionals — Component Inventory

All UI is inline-styled (no CSS framework). Components follow a Server Component + Client Island pattern.

## Naming Convention

- `page.tsx` — Server Component shell. Handles: session guard, data loading, redirect on unauthorized.
- `*.tsx` (non-page) — Client island. Marked `'use client'`. Handles: form state, API calls, interactive UI.

---

## Shared / Layout

| File | Type | Description |
|---|---|---|
| `app/layout.tsx` | Server | Root HTML wrapper. Applies Geist Sans + Geist Mono fonts. Sets `<title>` and description metadata. |

---

## Marketing

| File | Type | Description |
|---|---|---|
| `app/page.tsx` | Server | Landing page. Nav, Hero, Features grid (6 cards), How It Works (3 steps), CTA banner, Footer. All inline-styled. |

---

## Organizer Auth

| File | Type | Description |
|---|---|---|
| `app/login/page.tsx` | Server | Shell for login page. |
| `app/login/LoginForm.tsx` | Client | Email + password form. `POST /api/auth/login` → redirect to `/dashboard`. Error display. |
| `app/register/page.tsx` | Server | Shell for registration page. |
| `app/register/RegisterForm.tsx` | Client | Name + email + password form. `POST /api/auth/register` → redirect to `/dashboard`. Error display. |

---

## Organizer Dashboard

| File | Type | Description |
|---|---|---|
| `app/dashboard/page.tsx` | Server | Session guard (redirect to `/login` if no `organizerId`). Loads event list + stats. Passes to client. |
| `app/dashboard/DashboardClient.tsx` | Client | Main organizer UI. Shows event list with per-event stats (total, checked-in, emails sent). Inline create-event form (name + optional date). Delete button per event. Logout button. Link to `/event/[id]/upload` per event. |

---

## Event Upload / Attendee Management

| File | Type | Description |
|---|---|---|
| `app/event/[id]/upload/page.tsx` | Server | Session guard. |
| `app/event/[id]/upload/UploadForm.tsx` | Client | Two modes: (1) Manual add — name + email fields, `POST /api/events/[id]/attendees` JSON. (2) CSV upload — file input, `POST /api/events/[id]/attendees` multipart. Shows added/skipped counts on bulk upload. |

---

## Badge (Public)

| File | Type | Description |
|---|---|---|
| `app/badge/[token]/page.tsx` | Server | Public badge display. `GET /api/badges/[token]` → shows attendee name, event name, QR code image. `POST /api/badges/[token]/checkin` button. |

---

## Attendee Auth

| File | Type | Description |
|---|---|---|
| `app/attendee/login/page.tsx` | Server | Shell. |
| `app/attendee/login/AttendeeLoginForm.tsx` | Client | Email + password. `POST /api/attendee/auth/login` → redirect to `/attendee/dashboard`. |
| `app/attendee/signup/page.tsx` | Server | Reads `?token=` from URL `searchParams`. Passes token to form. |
| `app/attendee/signup/SignupForm.tsx` | Client | Password-only form (name/email come from invite token). `POST /api/attendee/auth/signup` → redirect to `/attendee/dashboard`. Shows error if token invalid/used. |

---

## Attendee Dashboard

| File | Type | Description |
|---|---|---|
| `app/attendee/dashboard/page.tsx` | Server | Session guard (redirect to `/attendee/login`). Calls `getEventHistory()`. Renders event cards showing event name, date, organizer. Link to `/attendee/event/[id]/people` per event. Logout button. |

---

## Attendee Profile

| File | Type | Description |
|---|---|---|
| `app/attendee/profile/page.tsx` | Server | Session guard. Loads account via `getAttendeeAccount()`. |
| `app/attendee/profile/ProfileForm.tsx` | Client | Full profile edit form: name, company, job title, bio, LinkedIn/Twitter/website URLs, visibility toggle (public/private). `PATCH /api/attendee/profile`. |

---

## People Browse

| File | Type | Description |
|---|---|---|
| `app/attendee/event/[id]/people/page.tsx` | Server | Session guard. `await params` (Next.js 16 requirement). `getPublicAttendeesForEvent()` — returns null if caller not registered for event (404). Renders profile cards with Connect button. |
| `app/attendee/event/[id]/people/ConnectButton.tsx` | Client | "Connect" button. States: `idle → loading → done` or `duplicate`. `POST /api/attendee/connections` with name, contactInfo, eventId. Handles 409 (already connected) gracefully. |

---

## Connections List

| File | Type | Description |
|---|---|---|
| `app/attendee/connections/page.tsx` | Server | Session guard. `getConnections()`. Renders a `ConnectionCard` per connection. |
| `app/attendee/connections/ConnectionCard.tsx` | Client | Shows: name, event name, LinkedIn/Twitter/Website links. Notes textarea with save button. `PATCH /api/attendee/connections/[id]`. Save state: `idle → saving → saved` (auto-resets after 2s via `useEffect` + cleanup). |

---

## Design System Notes

- **No CSS framework** — all styles are inline React `CSSProperties` objects defined in a `const s = { ... }` block at the top of each file.
- **Color palette**: Primary indigo `#4f46e5`, text `#111827`/`#374151`/`#6b7280`, backgrounds `#f9fafb`/`#ffffff`.
- **No shared component library** — each component is self-contained. Styles are not shared between files.
- **No `<Link>` component used for external navigation** — standard `<a>` tags for cross-role navigation (e.g., landing page links).
