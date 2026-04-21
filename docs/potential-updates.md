# Potential Updates & Future Improvements

Items here are not urgent but worth doing at some point. Add to this file rather than letting things get lost.

---

## Security

### Rate Limiting on Outbound Email Endpoints
**Priority:** Medium  
**Effort:** ~1–2 hours (requires external setup)

Two endpoints can spam emails if a session is hijacked or misused:

- `POST /api/events/[id]/announce` — sends to every attendee, no call limit
- `POST /api/events/[id]/invite` — sends invite emails, no per-event or per-hour cap

**What's needed:**
1. Create a free [Upstash Redis](https://upstash.com) database
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel env vars + `.env.local`
3. Implement sliding-window rate limiting in code (e.g. max 1 announcement per event per 10 minutes, max 20 invites per event per hour)

Alternatively, handle this at the Vercel edge or CloudFlare WAF level with no code changes.

---

## Infrastructure / Ops

### Email Provider Upgrade
**Priority:** High (when volume grows)  
**Effort:** ~30 min

Currently on SendGrid free tier — limited monthly credits. When the account hits its limit, badge emails and announcements silently fail (the UI now shows an error, but emails still don't go out). Options:
- Upgrade SendGrid plan, or
- Switch to Resend.com (generous free tier, simpler API, better deliverability for transactional email)

### Automated DB Migrations on Deploy
**Priority:** Medium  
**Effort:** ~30 min

Migrations must currently be applied manually with `psql`. New tables added since the last deploy (`notifications`, `event_organizers`, `password_reset_tokens`) were missing in production until caught during QA. Add a `drizzle-kit migrate` step to the Vercel build command or a deploy hook so the DB and code are always in sync.

---

## Features

### Email Verification for Direct Attendee Registration
**Priority:** Medium  
**Effort:** ~2 hours

`POST /api/attendee/auth/register` creates an account immediately with no email verification. Anyone can register an account with an arbitrary email. Adding a "verify your email" step before the account activates would prevent squatting and confirm the user controls the address.

### Co-organizer: Restrict Announce to Event Owner Only (or make configurable)
**Priority:** Low  
**Effort:** ~30 min

Currently only the event owner can call `POST /api/events/[id]/announce` (co-organizers get a 404 because they don't pass the `isOwner` check in `getEventById`). This may be intentional, but it's worth deciding explicitly and surfacing clearly in the UI — co-organizers currently see no indication they can't send announcements.

### QR Scanner: Camera Permission Error Handling
**Priority:** Low  
**Effort:** ~1 hour

The QR scan page (`/event/[id]/scan`) uses the device camera. If the user denies camera permissions, there's no graceful error message — the scanner just silently fails or freezes. Should show a clear "Camera access denied — please allow camera in your browser settings" message.

---

## Code Quality

### Remove Google OAuth Routes (Dead Code)
**Priority:** Low  
**Effort:** 5 min

`/api/auth/google/` and `/api/attendee/auth/google/` routes were deleted from the working tree (shown as deleted in `git status`) but may still be referenced. Confirm they're fully removed and no UI buttons link to them.

### Consolidate Duplicate `withAuth` Pattern in Attendee Routes
**Priority:** Low  
**Effort:** ~1 hour

Several attendee API routes manually call `getIronSession` and check `attendeeAccountId` inline rather than using `withAttendeeAuth`. Unifying these would reduce copy-paste drift.
