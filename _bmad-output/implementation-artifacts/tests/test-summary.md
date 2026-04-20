# Test Automation Summary

**Date:** 2026-04-07
**Framework:** Playwright (API + E2E)
**Total:** 82 tests — **82 passed, 0 failed**

---

## Generated Tests

### API Tests (`tests/api/`) — 58 tests, all passing

| File | Stories | Tests |
|------|---------|-------|
| `auth.spec.ts` | 1.4, 1.5, 1.6 | 11 |
| `events.spec.ts` | 2.1, 2.2, 2.3 | 8 |
| `attendees.spec.ts` | 3.2, 3.5, 4.1, 4.2, 4.3 | 17 |
| `attendee-auth.spec.ts` | 5.2, 5.3 | 8 |
| `profile.spec.ts` | 5.4, 5.5 | 6 |
| `connections.spec.ts` | 6.3, 6.4 | 8 |

### E2E Tests (`tests/e2e/`) — 24 tests, all passing

| File | Stories | Tests |
|------|---------|-------|
| `organizer.spec.ts` | 1.6, 1.7, 1.4/1.5, 2.1–2.3, 3.1/3.2 | 11 |
| `attendee.spec.ts` | 5.2–5.5, 6.1–6.4 | 10 |
| `badge.spec.ts` | 4.1 | 3 |

---

## Coverage by Story

| Story | Description | API | E2E |
|-------|-------------|-----|-----|
| 1.4 | Organizer Login | ✅ | ✅ |
| 1.5 | Organizer Logout & Protected Routes | ✅ | ✅ |
| 1.6 | Organizer Registration | ✅ | ✅ |
| 1.7 | Marketing Landing Page | — | ✅ |
| 2.1 | Event List on Dashboard | ✅ | ✅ |
| 2.2 | Create Event | ✅ | ✅ |
| 2.3 | Delete Event | ✅ | ✅ |
| 3.2 | Manual Attendee Add | ✅ | ✅ |
| 3.5 | CSV Bulk Upload | ✅ | — |
| 4.1 | Public Badge Page | ✅ | ✅ |
| 4.2 | QR Scan Check-in (idempotent) | ✅ | — |
| 4.3 | Badge Email Resend | ✅ | — |
| 5.2 | Account Creation via Invite Link | ✅ | ✅ |
| 5.3 | Attendee Login & Logout | ✅ | ✅ |
| 5.4 | Profile Editing | ✅ | ✅ |
| 5.5 | Profile Visibility Toggle | ✅ | ✅ |
| 6.1 | Attendee Event History | — | ✅ |
| 6.2 | Browse Public Attendees | — | ✅ |
| 6.3 | Connect with an Attendee | ✅ | — |
| 6.4 | Connections List & Notes | ✅ | ✅ |

---

## Bugs Found During Testing

### Bug 1 — DrizzleQueryError wraps PostgreSQL error codes (FIXED)
**Severity:** High  
**Files:** `app/api/auth/register/route.ts`, `app/api/events/[id]/attendees/route.ts`  
**Root cause:** `drizzle-orm` wraps DB errors in `DrizzleQueryError`, which puts the `code: '23505'` on `err.cause`, not `err` directly. Both files were checking `err.code` directly and falling through to 500.  
**Fix:** Extract `pgCode` from `err.code ?? err.cause?.code` in all three locations.  
**Impact:** Duplicate email registration returned 500 instead of 409; duplicate CSV rows would silently swallow the error wrong.

### Bug 2 — Database migrations not applied to Neon (FIXED)
**Severity:** Critical  
**Root cause:** Drizzle migrations 0001–0004 (name column on organizers, invite_token on attendees, attendee_accounts table, connections table) had never been applied to the Neon DB. All write operations failed with a 500.  
**Fix:** Applied migrations manually via `psql` against the `DIRECT_URL` connection.

---

## How to Run

```bash
# Start the dev server first (required)
cd conventionals && npm run dev

# All tests (API + E2E)
npm test

# API only (fast, no browser)
npm run test:api

# E2E only (browser)
npm run test:e2e
```

---

## Files Created

```
conventionals/
  playwright.config.ts
  tests/
    helpers/setup.ts
    api/
      auth.spec.ts
      events.spec.ts
      attendees.spec.ts
      attendee-auth.spec.ts
      profile.spec.ts
      connections.spec.ts
    e2e/
      organizer.spec.ts
      attendee.spec.ts
      badge.spec.ts
```
