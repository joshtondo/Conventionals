---
title: 'Attendee Swipe / Discover Tab'
type: 'feature'
created: '2026-04-15'
status: 'done'
baseline_commit: ''
goal: 4
---

## Intent

**Problem:** Attendees have no way to discover and connect with other attendees from the dashboard. The people-browse experience lives on a separate per-event page they must navigate to manually.

**Approach:** Add a "My Events | Discover" tab bar to `attendee/dashboard/page.tsx`. The server component fetches public attendees across all the user's events, deduplicates by account ID, and passes them to a new `AttendeeTabView` client component. The Discover tab renders a `DiscoverDeck` — one card at a time, ✕ skip / ♥ connect, touch-swipe support. Connect calls `POST /api/attendee/connections`.

## Boundaries & Constraints

**Always:**
- Inline CSS-in-JS only — no Tailwind, no shadcn
- Design tokens: primary `#6366f1`, accent `#10b981`, surface `#f8fafc`, border `#e2e8f0`
- Server component fetches all data; client components receive it as props
- `getPublicAttendeesForEvent` is marked `server-only` — call only in the server component
- Touch swipe: capture `touchstart` X, on `touchend` if delta > 80px left → skip, right → connect
- All interactive elements ≥ 44px touch height
- Connect POST body: `{ connectedName, contactInfo: socialLinks | null, eventId }`

**Never:**
- Add new API routes or DB queries
- Modify `getPublicAttendeesForEvent` or any data function
- Break the existing My Events list behaviour

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output |
|----------|--------------|-----------------|
| No events attended | `eventHistory = []` | Discover tab shows "No events yet" empty state |
| Events attended but no public profiles | All people have `isPublic = false` | Discover tab shows "No one to discover yet" |
| Cards available | N people | Cards displayed one at a time; skip/connect advances to next |
| Last card skipped/connected | Deck exhausted | "You're all caught up!" empty state |
| Connect API returns 409 | Already connected | Silently advance to next card (duplicate is not an error UX-wise) |
| Connect API fails (non-409) | Network error | Show brief error message on card; stay on same card |

## Code Map

- `conventionals/app/attendee/dashboard/page.tsx` — fetch event history + discover list (deduped); pass both to `AttendeeTabView`
- `conventionals/components/AttendeeTabView.tsx` — NEW: `'use client'`; tab bar (My Events | Discover); renders event list or `DiscoverDeck` based on active tab
- `conventionals/components/DiscoverDeck.tsx` — NEW: `'use client'`; card stack; swipe/button interactions; connect POST

## Tasks & Acceptance

**Execution:**
- [ ] `conventionals/app/attendee/dashboard/page.tsx` — after fetching `eventHistory`, loop over events calling `getPublicAttendeesForEvent(event.eventId, attendeeAccountId)`, skip null results, deduplicate by `person.id` using a `Set`, collect as `DiscoverPerson[]` with `sharedEventId` and `sharedEventName` attached; replace current JSX with `<AttendeeTabView eventHistory={eventHistory} discoverPeople={discoverPeople} />`; keep `HamburgerDrawer` outside `AttendeeTabView` at page level
- [ ] `conventionals/components/AttendeeTabView.tsx` — `'use client'`; props: `eventHistory`, `discoverPeople`; tab bar: two buttons "My Events" and "Discover" (full-width, 48px height, indigo underline on active); My Events tab: render event cards (same card style as current dashboard list); Discover tab: render `<DiscoverDeck people={discoverPeople} />`
- [ ] `conventionals/components/DiscoverDeck.tsx` — `'use client'`; props: `people: DiscoverPerson[]`; state: `index` (current card), `connecting`, `error`; render single card: avatar circle (initials from name, indigo gradient), name (large, bold), jobTitle + company (secondary), bio (up to 3 lines, clamped), shared event chip ("Met at [eventName]"), social links row (LinkedIn / Twitter / Website as small pills); below card: two action buttons side by side — ✕ Skip (44px, border, grey) and ♥ Connect (44px, indigo gradient); touch handler: `onTouchStart` capture clientX, `onTouchEnd` if delta > 80px left call skip, right call connect; connect handler: POST `/api/attendee/connections`, on 201 or 409 advance index, on other error show error message; when `index >= people.length` render "You're all caught up! 🎉" empty state

**Acceptance Criteria:**
- Given an attendee on `/attendee/dashboard`, when the page loads, then a "My Events" and "Discover" tab bar is visible at the top of the content area
- Given the attendee taps "My Events", then the event history list is shown
- Given the attendee taps "Discover", then a card for the first discoverable person is shown (or empty state if none)
- Given a card is shown, when the attendee taps ✕ Skip, then the next card appears
- Given a card is shown, when the attendee taps ♥ Connect, then a POST to `/api/attendee/connections` is made and the next card appears
- Given the last card is skipped or connected, then the "You're all caught up!" state is shown
- Given the attendee swipes left on a card (> 80px), then skip is triggered
- Given the attendee swipes right on a card (> 80px), then connect is triggered

## Verification

**Commands:**
- `cd conventionals && npm run build` — exit 0
- `cd conventionals && npm run lint` — exit 0

**Manual checks:**
- Visit `/attendee/dashboard` — confirm tab bar visible
- Switch tabs — confirm My Events and Discover content switch
- If discover people exist: tap ♥ Connect — confirm connection created, next card shown
- Tap ✕ Skip — confirm next card shown
- Swipe left/right — confirm skip/connect triggered
