---
project_name: 'Conventionals'
user_name: 'XdJos'
date: '2026-04-01'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'security_rules', 'code_quality', 'critical_rules']
status: 'complete'
rule_count: 48
optimized_for_llm: true
---

# Project Context for AI Agents

_Critical rules and patterns AI agents must follow when implementing code in this project. Focuses on unobvious details agents might otherwise miss._

---

## Technology Stack & Versions

### Server
- Runtime: Node.js (no version pinned — consider adding .nvmrc)
- Framework: Express ^4.19.2 (CommonJS — uses `require`, NOT `import`)
- Database: PostgreSQL via `pg` ^8.11.5, pool singleton at `server/db/index.js`
- Session: `express-session` ^1.18.0 + `connect-pg-simple` ^9.0.1 (PostgreSQL-backed)
- Auth: `bcryptjs` ^2.4.3
- File upload: `multer` ^1.4.5-lts.1 (memory storage, 5 MB limit)
- CSV parsing: `csv-parse` ^5.5.6
- QR codes: `qrcode` ^1.5.4
- Email: `@sendgrid/mail` ^8.1.3
- Config: `dotenv` ^16.4.5

### Client
- Framework: React ^18.3.1
- Router: React Router DOM ^6.23.1
- Build: Vite ^5.2.11
- Module system: ESM (`"type": "module"` — uses `import`, NOT `require`)

### Database Schema
Tables: `session`, `organizers`, `events`, `attendees`, `badges`
Migration: `psql $DATABASE_URL -f server/db/schema.sql`

### Dev Ports
- Server: 3001
- Client (Vite): proxies `/api` → `http://localhost:3001`

---

## Language-Specific Rules

### Module System (Critical)
- Server is **CommonJS only** — always use `require()`/`module.exports`, never `import`/`export`
- Client is **ESM only** — always use `import`/`export`, never `require()`
- Do NOT add `"type": "module"` to `server/package.json` — it would break all server code

### JavaScript Patterns in Use
- Async/await throughout (no raw Promise chains)
- Optional chaining (`?.`) used freely — e.g., `badge_type?.trim()`
- Destructuring from query results: `const { rows } = await pool.query(...)`
- Destructuring first row directly: `const { rows: [event] } = await pool.query(...)`

### Error Handling
- All async route handlers wrapped in `try/catch`
- Errors logged with `console.error('Context label:', err.message)` — log `.message`, not the full object
- Email failures are non-fatal: caught separately, badge is still persisted with `email_sent = false`
- Always return `res.status(500).json({ error: 'Internal server error' })` — never expose internal error details to clients

### Input Validation
- Validate and parse integer route params explicitly: `parseInt(req.params.id, 10)` + `Number.isFinite()` check
- Normalize emails to lowercase before storage: `email.trim().toLowerCase()`
- Trim all user string inputs before use/storage
- CSV column headers normalized to lowercase before validation (handles Excel-style `Name`, `Email` exports)

---

## Framework-Specific Rules

### Express (Server)
- All routes follow the pattern: `router.METHOD('/path', requireAuth, async (req, res) => { ... })`
- Public routes (no auth): `GET /api/badges/:token` only — everything else requires `requireAuth`
- Auth guard: check `req.session.organizerId` — set on login, cleared on logout
- All routes are namespaced under `/api/` — no exceptions
- Route files export a single `router` via `module.exports = router`
- Ownership checks are always done before any mutation — verify `organizer_id` matches session before touching data

### React (Client)
- No UI component library — all styling is **inline styles via a local `s` or `styles` object** at the top of each file
- Primary brand color: `#4f46e5` (indigo); success green: `#15803d`; error red: `#b91c1c`
- All API calls use `fetch` with `credentials: 'include'` — required for session cookies to be sent
- Auth check pattern: `GET /api/auth/me` → `ProtectedRoute` component handles redirect to `/login`
- No global state manager (no Redux, no Zustand) — local `useState` only
- `useCallback` used for data-fetching functions that are deps of `useEffect`

### React Router
- Four routes: `/login`, `/dashboard`, `/event/:id/upload`, `/badge/:token`
- Protected routes wrapped in `<ProtectedRoute>` which checks session via `/api/auth/me`
- Catch-all `path="*"` redirects to `/login`
- Navigation via `useNavigate()` hook — no `<a>` tags for internal routing

### Database Access
- Always import pool from `../db` (or `./db`) — never create a new `Pool` instance
- All queries use parameterized placeholders (`$1`, `$2`) — never string interpolation
- `ON CONFLICT (event_id, email) DO NOTHING` pattern for idempotent attendee inserts
- Integer counts from PostgreSQL come back as strings — always `parseInt(value, 10)` before returning to client

---

## Security Rules

### Authentication
- Timing-safe login: always run `bcrypt.compare()` against a dummy hash when user not found — prevents user enumeration via timing attacks
- Dummy hash used: `'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'`
- Session cookie: `httpOnly: true`, `secure: true` in production, 8-hour expiry
- Ownership always verified before data access — query always includes `AND organizer_id = $n`

### HTML Email Security
- All user-supplied strings escaped via `escapeHtml()` before interpolation into HTML email body
- `badgeUrl` and `qrDataUrl` are internally generated (not user input) — safe to interpolate directly
- Never add new user-supplied fields to email HTML without running through `escapeHtml()` first

### API Security
- Never expose raw error details to clients — log internally, return generic `'Internal server error'`
- Badge ownership check on resend: compare `badge.organizer_id !== req.session.organizerId` — return 404 (not 403) to avoid leaking existence
- File upload capped at 5 MB via multer `limits.fileSize` — do not remove this limit

### Environment Variables
- Required at startup: `DATABASE_URL`, `SESSION_SECRET`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `APP_URL`
- Server exits immediately if any are missing — do not add optional fallbacks for these
- `APP_URL` is used to construct badge URLs — must be the public-facing domain, no trailing slash

---

## Code Quality & Style Rules

### File & Folder Structure
- Server: `server/routes/` for route files, `server/services/` for external integrations (email, QR), `server/middleware/` for Express middleware, `server/db/` for DB pool and schema
- Client: `client/src/pages/` for page components, `client/src/` for `App.jsx` and `main.jsx`
- No shared `components/` folder exists yet — create `client/src/components/` if adding reusable UI

### Naming Conventions
- Route files: lowercase noun (e.g., `auth.js`, `events.js`, `badges.js`)
- Page components: PascalCase (e.g., `Dashboard.jsx`, `Upload.jsx`)
- Service files: lowercase noun (e.g., `email.js`, `qr.js`)
- Inline style objects: `s` (short, Dashboard pattern) or `styles` (verbose, Upload pattern) — match the file's existing convention

### Comments & Documentation
- JSDoc on exported service functions (`sendBadgeEmail`, `generateQR`)
- Inline comments on non-obvious decisions (security choices, business rules, workarounds)
- Route-level JSDoc comment block describing method, path, auth requirement, and behavior
- No comments on self-evident code

### No Linting Config
- No ESLint or Prettier config present — do not introduce one without being asked
- Follow the existing style: 2-space indent, single quotes; server files use semicolons — match the file you're editing

---

## Critical Don't-Miss Rules

### Anti-Patterns to Avoid
- Never use string interpolation in SQL — parameterized queries only, always
- Never create a second `pg.Pool` instance — import the singleton from `server/db/index.js`
- Never add `import`/`export` to server files — CommonJS only
- Never add `require()` to client files — ESM only
- Never return raw `err` or `err.stack` in API responses — only `err.message` in server logs
- Never skip the organizer ownership check when reading or mutating event/attendee/badge data
- Never remove the multer 5 MB file size limit

### Edge Cases Agents Must Handle
- CSV upload: rows missing `name` or `email` are silently skipped (added to `skipped` array), not errored
- Duplicate attendee email per event: `ON CONFLICT DO NOTHING` — return 409 for manual add, silently skip for CSV
- Email send failure: badge is still persisted with `email_sent = false` — never roll back the attendee/badge on email failure
- Check-in is idempotent: double scan returns `{ alreadyCheckedIn: true }`, not an error
- Badge resend: returns 404 (not 403) when organizer doesn't own the badge — avoids leaking existence

### DB Schema Constraints to Respect
- `attendees`: unique constraint on `(event_id, email)` — one badge per email per event
- `badges.token`: UUID generated via `crypto.randomUUID()` — never reuse or expose predictably
- Cascading deletes: deleting an event cascades to attendees → badges

### Development Workflow
- Run server: `npm run dev:server` from root (uses `node --watch`)
- Run client: `npm run dev:client` from root (Vite)
- Apply DB schema: `npm run db:migrate` from root
- Seed admin: automatic on first server start if `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars are set
- No test suite exists — do not reference or scaffold tests without being asked

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review periodically for outdated rules

_Last Updated: 2026-04-01_
