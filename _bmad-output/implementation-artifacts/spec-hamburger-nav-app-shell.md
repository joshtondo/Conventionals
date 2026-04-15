---
title: 'Hamburger Nav + App Shell Redesign'
type: 'feature'
created: '2026-04-15'
status: 'done'
baseline_commit: 'db3b3784768afa0208d812e190900e05de4f2675'
goal: 2
---

## Intent

**Problem:** All protected pages (organizer + attendee) use ad-hoc inline headers and back-links with no shared navigation pattern. The organizer dashboard has a plain white header with "My Events" + "Log out". Attendee pages have text back-links to previous pages. There's no consistent app shell.

**Approach:** Create a shared `HamburgerDrawer` client component (slide-out left drawer, fixed top bar) used across all protected pages. Add it to organizer protected pages (`DashboardClient`, `UploadForm`) and attendee protected pages (`attendee/dashboard`, `attendee/profile/ProfileForm`, `attendee/connections`, `attendee/event/[id]/people`). Remove all existing inline headers and back-links those pages replace.

## Boundaries & Constraints

**Always:**
- Inline CSS-in-JS only — no Tailwind, no shadcn/ui
- Design tokens: primary `#6366f1`, surface `#f8fafc`, text `#0f172a`, text-2 `#475569`, border `#e2e8f0`
- All interactive elements minimum 44px touch target
- Organizer logout: `POST /api/auth/logout` → `router.push('/login')`
- Attendee logout: `POST /api/attendee/auth/logout` → `router.push('/attendee/login')`
- Drawer opens from left, closes via X button or backdrop tap
- `HamburgerDrawer` must be `'use client'`

**Never:**
- Modify any API route files
- Remove session-check logic from page server components
- Add a layout.tsx (add drawer directly to each page/form component instead)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output |
|----------|--------------|-----------------|
| Organizer on any protected page | Authenticated | Top bar + hamburger visible |
| Taps hamburger | Drawer closed | Drawer slides in from left, backdrop appears |
| Taps backdrop | Drawer open | Drawer closes |
| Taps "My Events" in drawer | Organizer | Navigates to `/dashboard` |
| Taps "Log out" in organizer drawer | Authenticated | POST logout → redirect `/login` |
| Attendee on any protected page | Authenticated | Top bar + hamburger visible |
| Taps "My Events" in attendee drawer | Attendee | Navigates to `/attendee/dashboard` |
| Taps "Profile" in attendee drawer | Attendee | Navigates to `/attendee/profile` |
| Taps "Connections" in attendee drawer | Attendee | Navigates to `/attendee/connections` |
| Taps "Log out" in attendee drawer | Authenticated | POST attendee logout → redirect `/attendee/login` |

## Code Map

- `conventionals/components/HamburgerDrawer.tsx` — NEW: shared client component, variant prop
- `conventionals/app/dashboard/DashboardClient.tsx` — remove inline `<header>` + `handleLogout` + header styles; add `<HamburgerDrawer variant="organizer" />`
- `conventionals/app/event/[id]/upload/UploadForm.tsx` — add `<HamburgerDrawer variant="organizer" />`; remove back link
- `conventionals/app/attendee/dashboard/page.tsx` — add `<HamburgerDrawer variant="attendee" />`; remove `← Profile` back link
- `conventionals/app/attendee/profile/ProfileForm.tsx` — add `<HamburgerDrawer variant="attendee" />`; remove `← Dashboard` back link
- `conventionals/app/attendee/connections/page.tsx` — add `<HamburgerDrawer variant="attendee" />`; remove `← My Events` back link
- `conventionals/app/attendee/event/[id]/people/page.tsx` — add `<HamburgerDrawer variant="attendee" />`; remove `← My Events` back link

## Tasks & Acceptance

**Execution:**
- [ ] `conventionals/components/HamburgerDrawer.tsx` — create client component with `variant: 'organizer' | 'attendee'` prop; fixed top bar (56px, white, border-bottom); hamburger button (left, 44px target, `≡` icon); logo text "Conventionals" (indigo, centered); slide-out left drawer (280px wide, full-height, white, box-shadow); backdrop overlay (semi-transparent black); organizer nav items: "My Events" → `/dashboard`, logout button; attendee nav items: "My Events" → `/attendee/dashboard`, "Profile" → `/attendee/profile`, "Connections" → `/attendee/connections`, logout button; nav links close drawer on click; all nav items 44px min height
- [ ] `conventionals/app/dashboard/DashboardClient.tsx` — add `import HamburgerDrawer`; remove `s.header`, `s.logoutButton` style objects; remove `handleLogout` function; remove `<header>` JSX block; add `<HamburgerDrawer variant="organizer" />` as first child of outer div; remove top padding from `s.container` (add top margin to `s.main` instead: `paddingTop: '72px'` to clear fixed bar)
- [ ] `conventionals/app/event/[id]/upload/UploadForm.tsx` — add `import HamburgerDrawer`; add `<HamburgerDrawer variant="organizer" />` as first child; remove `<a>` back link; add `paddingTop: '72px'` to `s.container` to clear fixed top bar
- [ ] `conventionals/app/attendee/dashboard/page.tsx` — add `import HamburgerDrawer`; add `<HamburgerDrawer variant="attendee" />` before the container div (wrap both in a fragment); remove `<a href="/attendee/profile">← Profile</a>` and `s.backLink` style; add `paddingTop: '72px'` to `s.container`
- [ ] `conventionals/app/attendee/profile/ProfileForm.tsx` — add `import HamburgerDrawer`; add `<HamburgerDrawer variant="attendee" />` before container; remove `<a href="/attendee/dashboard">← Dashboard</a>` and `s.backLink` style; add `paddingTop: '72px'` to `s.container`
- [ ] `conventionals/app/attendee/connections/page.tsx` — add `import HamburgerDrawer`; add `<HamburgerDrawer variant="attendee" />` before container; remove `<a href="/attendee/dashboard">← My Events</a>` and `s.backLink` style; add `paddingTop: '72px'` to `s.container`
- [ ] `conventionals/app/attendee/event/[id]/people/page.tsx` — add `import HamburgerDrawer`; add `<HamburgerDrawer variant="attendee" />` before container; remove `<a href="/attendee/dashboard">← My Events</a>` and `s.backLink` style; add `paddingTop: '72px'` to `s.container`

**Acceptance Criteria:**
- Given an authenticated organizer on `/dashboard`, when the page loads, then a fixed top bar with hamburger icon and "Conventionals" logo is visible
- Given an organizer taps the hamburger, when the drawer opens, then "My Events" and "Log out" nav items are visible
- Given an organizer taps "Log out" in the drawer, when complete, then they are redirected to `/login`
- Given an organizer on `/event/[id]/upload`, when the page loads, then the same hamburger top bar is visible (no back link)
- Given an authenticated attendee on `/attendee/dashboard`, when the page loads, then a fixed top bar with hamburger is visible
- Given an attendee taps the hamburger, when the drawer opens, then "My Events", "Profile", "Connections", and "Log out" are visible
- Given an attendee taps "Log out" in the drawer, when complete, then they are redirected to `/attendee/login`
- Given any screen width ≥ 375px, when the top bar renders, then all buttons have at least 44px touch height
- Given the drawer is open and the user taps the backdrop, when tapped, then the drawer closes

## Verification

**Commands:**
- `cd conventionals && npm run build` — expected: exit 0, no type errors
- `cd conventionals && npm run lint` — expected: exit 0

**Manual checks:**
- Visit `/dashboard` as organizer — confirm hamburger top bar; open drawer; tap "Log out" → `/login`
- Visit `/event/[id]/upload` as organizer — confirm hamburger top bar visible, no back link
- Visit `/attendee/dashboard` as attendee — confirm hamburger top bar; open drawer; tap "Log out" → `/attendee/login`
- Tap backdrop — confirm drawer closes
- Confirm all pages have 72px top padding so content clears fixed bar
