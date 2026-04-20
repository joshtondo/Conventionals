---
title: 'Organizer Dashboard — Bento Grid'
type: 'feature'
created: '2026-04-15'
status: 'done'
baseline_commit: ''
goal: 3
---

## Intent

**Problem:** The organizer dashboard (`DashboardClient.tsx`) shows a plain form and a flat event list with no visual hierarchy. Stats (total, checked-in, emails sent) are buried in tiny grey text under each event card with no aggregate view.

**Approach:** Redesign `DashboardClient.tsx` to lead with a 4-tile Bento stat grid (aggregate totals across all events), then a "Your Events" section with improved event cards. Keep all existing create / delete / manage functionality unchanged. Inline CSS-in-JS only.

## Boundaries & Constraints

**Always:**
- Inline CSS-in-JS — no Tailwind, no shadcn
- Design tokens: primary `#6366f1`, accent `#10b981`, surface `#f8fafc`, border `#e2e8f0`, text `#0f172a`, text2 `#475569`
- All interactive elements ≥ 44px touch height
- Keep all API calls, router.refresh(), handleCreate, handleDelete unchanged

**Never:**
- Modify `/app/dashboard/page.tsx` (server component) or any API route
- Remove or relocate the "Create Event" form — keep it visible above the event list

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output |
|----------|--------------|-----------------|
| No events yet | `events = []`, `stats = {}` | Stat tiles all show 0; "No events yet" placeholder below |
| One event, no attendees | `events = [e]`, `stats[e.id] = {total:0,...}` | Tiles: Events=1, rest 0; event card renders |
| Multiple events with stats | Full data | Tiles show aggregate sums; each event card shows per-event stats row |

## Code Map

- `conventionals/app/dashboard/DashboardClient.tsx` — full redesign: add Bento stat grid, update event card styling; all logic unchanged

## Tasks & Acceptance

**Execution:**
- [ ] `conventionals/app/dashboard/DashboardClient.tsx` — compute 4 aggregates at top of render (totalEvents = events.length, totalRegistered = sum of stats[id].total, totalCheckedIn = sum of stats[id].checkedIn, totalEmails = sum of stats[id].emailsSent); render 4-tile stat grid using `gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))'`; each tile: white card, 16px border-radius, 20px padding, icon emoji (📅 🎟️ ✅ 📧), large bold number, small label below; accent colour: Events tile uses indigo tint (`#ede9fe` bg, `#6366f1` icon), Registered uses indigo, CheckedIn uses emerald tint (`#d1fae5` bg, `#10b981`), Emails uses slate tint; update event cards: left accent border (`4px solid #6366f1`), show per-event stat pill row (Registered · Checked In · Emails); "Your Events" section heading above event list; Create Event form kept above events list with existing inputs

**Acceptance Criteria:**
- Given an organizer with 3 events on `/dashboard`, when the page loads, then 4 stat tiles appear showing aggregate totals
- Given no events, when the page loads, then all 4 tiles show 0 and "No events yet" placeholder is visible
- Given any screen width ≥ 375px, when the grid renders, then tiles wrap naturally via auto-fit and never overflow
- Given the organizer creates a new event, when the form submits, then the stat tiles update to reflect the new count
- Given all interactive elements (Create button, Delete button, Manage link), then each has ≥ 44px touch height

## Verification

**Commands:**
- `cd conventionals && npm run build` — exit 0
- `cd conventionals && npm run lint` — exit 0

**Manual checks:**
- Visit `/dashboard` — confirm 4 stat tiles at top, event cards with left accent border
- Confirm tiles show 0 when no events
- Confirm tile grid wraps on narrow screen (375px)
