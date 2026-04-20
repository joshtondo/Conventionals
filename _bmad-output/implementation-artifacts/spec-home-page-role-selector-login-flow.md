---
title: 'Home Page + Role-Selector Login Flow'
type: 'feature'
created: '2026-04-15'
status: 'done'
baseline_commit: 'cbd74e6021f078cacc4f9bad098ee64d04ce90d6'
context:
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current home page uses inline CSS-in-JS with no design system consistency, has no clear Login/Register CTA hierarchy, and routes all users directly to the organizer login — there is no way for an attendee to log in from the landing page.

**Approach:** Redesign `app/page.tsx` to the Bento Social UX direction (Plus Jakarta Sans, indigo/emerald tokens, Login + Register CTAs, social proof stats). Add a new `/login/select` role-selector page that lets users choose Organizer or Attendee before being routed to the appropriate login form. Update the font in `app/layout.tsx` from Geist to Plus Jakarta Sans.

## Boundaries & Constraints

**Always:**
- Keep existing `/login` (organizer) and `/attendee/login` (attendee) pages and their APIs completely untouched — only add a "← Change role" back-link to each
- Use inline CSS-in-JS (same pattern as the rest of the app) — do NOT introduce Tailwind or shadcn/ui yet; that is Goal 2 scope
- Plus Jakarta Sans loaded via `next/font/google` replacing Geist in `layout.tsx`
- Design tokens: primary `#6366f1`, primary-dark `#4f46e5`, accent `#10b981`, text `#0f172a`, text-2 `#475569`, border `#e2e8f0`, surface `#f8fafc`
- All interactive elements minimum 44px touch target height
- Motion animations must check `prefers-reduced-motion` (use existing framer-motion pattern already in `page.tsx`)
- `/login/select` must be a server component (no session required — it is pre-auth)

**Ask First:**
- If the Register button should route to a role-selector for registration as well (currently `/login/select` only handles login routing)

**Never:**
- Delete or modify `/api/auth/login`, `/api/attendee/auth/login`, or any session logic
- Add dark mode
- Change the URL paths of existing login pages (`/login` and `/attendee/login`)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Unauthenticated visits home | No session | Home page renders with Login + Register buttons | N/A |
| Taps Login | On home page | Navigates to `/login/select` | N/A |
| Selects Organizer on selector | On `/login/select` | Navigates to `/login` | N/A |
| Selects Attendee on selector | On `/login/select` | Navigates to `/attendee/login` | N/A |
| Taps back on organizer login | On `/login` | Navigates to `/login/select` | N/A |
| Taps back on attendee login | On `/attendee/login` | Navigates to `/login/select` | N/A |
| Already logged in as organizer visits `/login/select` | `organizerId` in session | Redirect to `/dashboard` | N/A |
| Already logged in as attendee visits `/login/select` | `attendeeAccountId` in session | Redirect to `/attendee/dashboard` | N/A |
| Taps Register | On home page | Navigates to `/register` (organizer registration — existing page) | N/A |

</frozen-after-approval>

## Code Map

- `conventionals/app/layout.tsx` — root layout; swap Geist → Plus Jakarta Sans font
- `conventionals/app/page.tsx` — home/landing page; full redesign
- `conventionals/app/globals.css` — global styles; update CSS custom properties for new font variable
- `conventionals/app/login/select/page.tsx` — NEW: role-selector page (server component)
- `conventionals/app/login/page.tsx` — organizer login; add "← Change role" back-link only
- `conventionals/app/login/LoginForm.tsx` — organizer login form; add back-link UI
- `conventionals/app/attendee/login/page.tsx` — attendee login; add "← Change role" back-link only
- `conventionals/app/attendee/login/AttendeeLoginForm.tsx` — attendee login form; add back-link UI

## Tasks & Acceptance

**Execution:**
- [x] `conventionals/app/layout.tsx` — replace `Geist`/`Geist_Mono` imports with `Plus_Jakarta_Sans` from `next/font/google`; update `className` on `<html>` to use new variable; keep metadata unchanged
- [x] `conventionals/app/globals.css` — update `--font-sans` (or equivalent) CSS variable to reference the new Plus Jakarta Sans variable; ensure `font-family` on `body` picks it up
- [x] `conventionals/app/page.tsx` — full redesign per UX spec: sticky nav (logo + Login + Register links), hero section (tag pill, headline, body copy, Login button + Register button, 3 social proof stats), features section (6 feature cards in grid), how-it-works (3 steps), final CTA section, footer; use inline CSS-in-JS with design tokens; retain existing framer-motion animations
- [x] `conventionals/app/login/select/page.tsx` — create new server component; check session (`getIronSession`) — if `organizerId` redirect `/dashboard`, if `attendeeAccountId` redirect `/attendee/dashboard`; render two role cards (Organizer, Attendee) each linking to their respective login page; inline CSS-in-JS styling
- [x] `conventionals/app/login/LoginForm.tsx` — add a "← Change role" link at top pointing to `/login/select`
- [x] `conventionals/app/attendee/login/AttendeeLoginForm.tsx` — add a "← Change role" link at top pointing to `/login/select`

**Acceptance Criteria:**
- Given an unauthenticated user on `/`, when the page loads, then they see a Login button and a Register button in the hero section
- Given an unauthenticated user, when they tap Login, then they are taken to `/login/select`
- Given a user on `/login/select`, when they select "I'm an Organizer", then they navigate to `/login`
- Given a user on `/login/select`, when they select "I'm an Attendee", then they navigate to `/attendee/login`
- Given a user on `/login` or `/attendee/login`, when they tap "← Change role", then they navigate back to `/login/select`
- Given a logged-in organizer visiting `/login/select`, when the page loads, then they are redirected to `/dashboard`
- Given a logged-in attendee visiting `/login/select`, when the page loads, then they are redirected to `/attendee/dashboard`
- Given any screen width ≥ 375px, when the home page renders, then all buttons and interactive elements have at least 44px touch height
- Given the site loads, when inspecting the font, then Plus Jakarta Sans is applied to the body (not Geist)

## Design Notes

Role selector card pattern (two cards, stacked on mobile):
```
┌─────────────────────────────────┐
│ 🏢  I'm an Organizer            │
│     Manage events, check in     │
│     attendees, view analytics   │
│                                 │
│     Go to Organizer Login →     │
└─────────────────────────────────┘
           — or —
┌─────────────────────────────────┐
│ 🎟️  I'm an Attendee             │
│     Access your badge, connect  │
│     with people at the event    │
│                                 │
│     Go to Attendee Login →      │
└─────────────────────────────────┘
```

Home page hero button layout (mobile-first, stacked):
- Primary: "Log In" → `/login/select` (indigo gradient)
- Secondary: "Create Account" → `/register` (white, indigo border)

## Verification

**Commands:**
- `cd conventionals && npm run build` -- expected: exit 0, no type errors
- `cd conventionals && npm run lint` -- expected: exit 0, no lint errors

**Manual checks:**
- Visit `/` — confirm Plus Jakarta Sans font, Login + Register buttons visible in hero
- Visit `/login/select` — confirm two role cards render, each links correctly
- Visit `/login` — confirm "← Change role" link appears at top, links to `/login/select`
- Visit `/attendee/login` — confirm "← Change role" link appears at top, links to `/login/select`
- Log in as organizer, visit `/login/select` — confirm redirect to `/dashboard`

## Suggested Review Order

**Role-selector flow (new file — entry point)**

- New server component: session check, role card routing
  [`select/page.tsx:1`](../../conventionals/app/login/select/page.tsx#L1)

**Font & design token foundation**

- Swap Geist → Plus Jakarta Sans; defines `--font-sans` variable
  [`layout.tsx:1`](../../conventionals/app/layout.tsx#L1)

- CSS body font-family now references `--font-sans`
  [`globals.css:18`](../../conventionals/app/globals.css#L18)

**Home page redesign**

- Design tokens object `C` — single source of truth for all colors
  [`page.tsx:22`](../../conventionals/app/page.tsx#L22)

- Nav: Login → `/login/select`, Register → `/register`, 44px targets
  [`page.tsx:318`](../../conventionals/app/page.tsx#L318)

- Hero CTAs + inline stat cards (12k+, 500k, 98%)
  [`page.tsx:340`](../../conventionals/app/page.tsx#L340)

- BadgeMockup component — gradient header, verified tag, share button
  [`page.tsx:256`](../../conventionals/app/page.tsx#L256)

**Back-link patches on existing login forms**

- "← Change role" link added; bottom escape link updated to `/login/select`
  [`AttendeeLoginForm.tsx:124`](../../conventionals/app/attendee/login/AttendeeLoginForm.tsx#L124)

- "← Change role" link added to organizer login form
  [`LoginForm.tsx:107`](../../conventionals/app/login/LoginForm.tsx#L107)
