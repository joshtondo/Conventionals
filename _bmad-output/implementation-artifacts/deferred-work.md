# Deferred Work Log

## Deferred from: QQ goal split — invite link bug fix (2026-04-20)

- **Goal A (Attendee Swipe / Discover Tab)** — deferred to tackle blocking auth bug first. Spec at `_bmad-output/implementation-artifacts/spec-attendee-swipe-discover-tab.md` (status: pending-approval). Resume with `/bmad-quick-dev` and select that spec.

## Deferred from: code review of 1-6-organizer-registration (2026-04-06)

- `createOrganizer` parameter named `passwordHash` is convention only — a future caller could pass plaintext; add a branded type or JSDoc warning before this DAL grows callers
- No minimum password length — add minimum (e.g. 8 chars) in a security hardening pass before launch
- No email format validation on registration — RFC-compliant check (or basic regex) should be added before launch
- `session.save()` failure after organizer insert leaves an orphan row — user gets 500 but account exists; on retry they hit 409 and must use login flow; acceptable for MVP, add transactional cleanup in hardening pass
- `organizers.name` nullable in schema but required at app level — intentional for backward compat; ensure all callers of `createOrganizer` pass a name; enforce NOT NULL in a future migration after all existing rows are backfilled

## Deferred from: code review of 1-1-project-initialization-and-vercel-deployment (2026-04-04)

- Default `layout.tsx` metadata ("Create Next App" title/description) left from scaffold — will be replaced in Story 1.7 when marketing landing page is built
- `next` and `eslint-config-next` pinned to exact version (16.2.2) while other deps use semver ranges — create-next-app scaffold default; reconsider pinning strategy before production hardening
- No security headers (CSP, HSTS, X-Frame-Options) in `next.config.ts` — add in a future infrastructure/hardening story before launch
- `DIRECT_URL` purpose undocumented in `.env.example` — consider adding inline comments to env example in a docs pass
- `lint` script is bare `eslint` (no path argument) — create-next-app 16 flat-config default; verify CI lint works correctly when CI is configured
- `DATABASE_URL`/`DIRECT_URL` absence would cause cold-start Neon driver throw with no graceful error — partial: `lib/db.ts` patch applied in Story 1.2 review; `DIRECT_URL` in drizzle.config.ts still has no guard (developer tooling only, acceptable)
- `SENDGRID_FROM_EMAIL` empty/invalid would fail silently at send time — add startup env validation when email sending is implemented (Story 3.4)
- `NEXT_PUBLIC_APP_URL` has no scheme or trailing-slash normalisation — add validation/normalisation when URL construction is first introduced
- No `error.tsx` or root error boundary in `app/layout.tsx` — add global error boundary before launch

## Deferred from: code review of 1-2-database-connection-and-schema (2026-04-04)

- `globalThis` singleton guard is no-op in production (Neon HTTP driver is stateless) — intentional per architecture spec; harmless on Vercel serverless
- `badges.token` has no DB-level min-length or format constraint — application validates at badge creation time (Story 3.x)
- `badgeType` is free-text with no enum enforcement — existing schema as-is; out of migration scope
- `eventDate` is nullable with no documented intent — intentional (draft events support); callers must null-check
- `session.sess` typed as generic `json` — auto-generated schema; session shape validated by iron-session (Story 1.3)
- `DIRECT_URL!` non-null assertion in `drizzle.config.ts` — developer tooling only (not runtime); acceptable risk

## Deferred from: code review of 1-4-organizer-login (2026-04-05)

- No rate limiting on `POST /api/auth/login` — unbounded brute-force possible; add middleware or edge-level rate limiting before launch
- `DUMMY_HASH` constant is publicly known — `!organizer` guard prevents auth; consider generating at startup from `SESSION_SECRET` for unknown preimage
- No CSRF protection on login route — login CSRF is low-risk; iron-session SameSite default mitigates; add `Origin` check in a security hardening pass
- `DUMMY_HASH` cost factor 10 may diverge from production hash cost — Story 1.6 registration must use same cost factor; revisit if cost factor changes
- Email case normalization not enforced at DB insert time — Story 1.6 registration must apply `email.trim().toLowerCase()` before insert
- `console.error` logs raw `(err as Error).message` — established project pattern; filter sensitive content before launch

## Deferred from: code review of 1-5-organizer-logout-and-protected-dashboard-shell (2026-04-05)

- `session.destroy()` behavior in Route Handler context unverified — spec says synchronous/no save() needed, but two review layers raised doubt about cookie being reliably cleared; verify iron-session v8 source or add `await session.destroy()` defensively
- `handleLogout` in `DashboardClient` has no error handling — after patch is applied, redirect always happens; but error state should be surfaced to user in a future UX pass
- Dashboard does not verify organizer still exists in DB via `getOrganizerById` — stale session after organizer row deletion grants access until 8h expiry; call `getOrganizerById` in `page.tsx` in a future auth-hardening story
- `/api/auth/me` exposes raw integer primary key — IDOR stepping stone; return opaque identity fields instead of PK in a future security hardening pass
- No `middleware.ts` — all route protection is per-route; add middleware-level guard before launch to provide defence-in-depth
- `redirect('/login')` in dashboard page.tsx is fragile — currently correct but would silently break if wrapped in try/catch; document explicitly in architecture notes

## Deferred from: code review of 1-3-session-configuration-and-auth-hof (2026-04-05)

- No `sameSite` cookie attribute set — `sameSite: 'lax'` recommended for CSRF protection; low-risk given modern browser defaults, but should be set explicitly before launch
- Dual-role session not mutually exclusive — a session with both `organizerId` and `attendeeAccountId` set passes both `withAuth` and `withAttendeeAuth`; mutual exclusion enforced by login handlers in Stories 1.4/1.5
- `ttl` not aligned with `maxAge` — iron-session seal defaults to 14-day TTL while cookie expires after 8 hours; a stolen cookie remains valid server-side for 14 days; `ttl: 60 * 60 * 8` should be added in a security hardening pass
- `path` cookie attribute not set — iron-session defaults to `path: '/'` which is correct; confirm this holds in the version in use before launch

## Deferred from: QQ goal split — UX redesign sequence (2026-04-15)

Goals queued after Goal 1 (home page + role-selector login flow):

- **Goal 2**: Hamburger nav + app shell redesign — replace existing nav with slide-out drawer for both `(organizer)` and `(attendee)` route groups
- **Goal 3**: Organizer dashboard — Bento grid — replace current dashboard with modular stat tiles (registered, checked-in, connections, next session)
- **Goal 4**: Attendee swipe/discover tab — Tinder-style card deck for attendee people-browse at `/attendee/dashboard`
- **Goal 5**: Badge page redesign — gradient card header, QR code display, social links, connect/share actions
- **Goal 6**: QR scanner screen — camera viewport + animated scan line + manual badge-ID fallback for organizer check-in

## Deferred from: QQ spec-home-page-role-selector-login-flow review (2026-04-15)

- Role cards in `/login/select` have `transition` in inline styles that does nothing — hover states require a client component; add interactive hover effect when that page is converted to a client component in Goal 2 (hamburger nav / app shell)
- `--font-sans` CSS variable name may collide with shadcn/ui's own `--font-sans` variable when shadcn is introduced in Goal 2; rename to `--font-jakarta` or use `--font-primary` before installing shadcn
- Authenticated users visiting `/` (home page) see the full marketing page instead of being redirected to their dashboard — pre-existing behavior; add session check to `/` in a future UX polish pass
- `/attendee/login/page.tsx` does not check for `organizerId` in session; `/register/page.tsx` does not check `attendeeAccountId` — organizers and attendees can reach each other's auth pages when already logged in; address in an auth-hardening pass
- Dual-role session (both `organizerId` and `attendeeAccountId` set) deferred to arch-level fix (pre-existing, documented in Step 1.3 code review)
