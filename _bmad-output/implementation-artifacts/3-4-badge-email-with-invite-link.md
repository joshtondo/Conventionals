# Story 3.4: Badge Email with Invite Link

Status: review

## Story

As an **attendee**,
I want to receive an email with my badge, QR code, and an invite link to create my account,
So that I have everything I need to check in and optionally set up my Conventionals profile.

## Acceptance Criteria

**Given** a new attendee and badge have been created
**When** `sendBadgeEmail` is called
**Then** the attendee receives an HTML email via SendGrid containing their name, QR code image, badge URL, and a separate account setup link (`NEXT_PUBLIC_APP_URL/attendee/signup?token=[invite_token]`)
**And** all user-supplied strings (name) are escaped with `escapeHtml()` before interpolation into email HTML
**And** `badgeUrl`, `qrDataUrl`, and `inviteUrl` are internally generated — safe to interpolate directly
**And** if email send fails, badge record is persisted with `email_sent = false` — attendee and badge rows are never rolled back
**And** if email succeeds, `email_sent` is updated to `true`
**And** `lib/email.ts` exports `sendBadgeEmail()` and `escapeHtml()`

## Tasks / Subtasks

- [x] Task 1: Create `lib/email.ts` — `sendBadgeEmail` and `escapeHtml` (AC: email sent via SendGrid)
  - [x] Create `conventionals/lib/email.ts`
  - [x] Begin with `import 'server-only'`
  - [x] Import `sgMail` from `@sendgrid/mail`; configure with `sgMail.setApiKey(process.env.SENDGRID_API_KEY!)`
  - [x] Implement `escapeHtml(str: string): string` — replaces `&`, `<`, `>`, `"`, `'` with HTML entities
  - [x] Implement `sendBadgeEmail(...)`: escapes name, builds HTML, calls `sgMail.send`, returns boolean (non-fatal)
  - [x] Export both functions (named exports, no default)

- [x] Task 2: Update `data/badges.ts` — call `sendBadgeEmail` after badge creation (AC: non-fatal email, `email_sent` updated)
  - [x] Import `sendBadgeEmail` from `@/lib/email`
  - [x] Build `inviteUrl`, call `sendBadgeEmail`
  - [x] If `emailSent === true`: update `badges.emailSent = true`
  - [x] Return `{ attendee, badge, qrDataUrl, emailSent }`

- [x] Task 3: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### `lib/email.ts` — Full Implementation

```typescript
import 'server-only'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

type SendBadgeEmailParams = {
  to: string
  name: string
  badgeUrl: string
  qrDataUrl: string
  inviteUrl: string
}

export async function sendBadgeEmail({
  to,
  name,
  badgeUrl,
  qrDataUrl,
  inviteUrl,
}: SendBadgeEmailParams): Promise<boolean> {
  const safeName = escapeHtml(name)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Hi ${safeName}, your badge is ready!</h1>
      <p>Scan the QR code below to check in at the event:</p>
      <img src="${qrDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
      <p><a href="${badgeUrl}">View your badge online</a></p>
      <hr />
      <p>Want to create a Conventionals account to connect with other attendees?</p>
      <p><a href="${inviteUrl}">Set up your account</a></p>
    </div>
  `
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: 'Your Event Badge',
      html,
    })
    return true
  } catch (err) {
    console.error('SendGrid error:', (err as Error).message)
    return false
  }
}
```

### `data/badges.ts` — Updated `createAttendeeAndBadge`

The function currently returns `{ attendee, badge, qrDataUrl }`. After this story it returns `{ attendee, badge, qrDataUrl, emailSent }`.

The non-fatal email pattern: `sendBadgeEmail` catches its own errors and returns `boolean` — no try/catch needed in `createAttendeeAndBadge`. The `email_sent` DB update only happens on success.

```typescript
import { sendBadgeEmail } from '@/lib/email'

// Inside createAttendeeAndBadge, after qrDataUrl:
const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/attendee/signup?token=${attendee.inviteToken}`
const emailSent = await sendBadgeEmail({ to: attendee.email, name: attendee.name, badgeUrl, qrDataUrl, inviteUrl })

if (emailSent) {
  await db.update(badges).set({ emailSent: true }).where(eq(badges.id, badge.id))
}

return { attendee, badge, qrDataUrl, emailSent }
```

### Files to Create / Modify

```
conventionals/
├── lib/
│   └── email.ts        ← CREATE
└── data/
    └── badges.ts       ← MODIFY: import sendBadgeEmail, call after QR, update email_sent
```

### Key Implementation Rules

**DO:**
- `import 'server-only'` as first line of `lib/email.ts`
- Escape ONLY `name` with `escapeHtml()` — `badgeUrl`, `qrDataUrl`, `inviteUrl` are all server-generated and safe to interpolate directly
- `sendBadgeEmail` must catch its own errors and return `boolean` — never throw (non-fatal pattern)
- Update `email_sent = true` in DB only after successful send — use `db.update(badges).set({ emailSent: true }).where(eq(badges.id, badge.id))`
- `sgMail.setApiKey(...)` called at module level (top of file, after import)

**DO NOT:**
- Escape `badgeUrl`, `qrDataUrl`, or `inviteUrl` — these are server-generated and escaping would break the URLs
- Throw from `sendBadgeEmail` — catch all errors, log, return `false`
- Roll back attendee or badge records if email fails — persist rows regardless
- Forget `SENDGRID_FROM_EMAIL` env var in the `sgMail.send()` call

### Environment Variables Required

- `SENDGRID_API_KEY` — SendGrid API key
- `SENDGRID_FROM_EMAIL` — verified sender email address
- `NEXT_PUBLIC_APP_URL` — base URL (e.g. `https://conventionals.vercel.app`)

All three must be set in Vercel Dashboard and in `.env.local` for local testing. If not set locally, email sends will fail but the non-fatal pattern ensures attendees and badges are still created.

### Previous Story Learnings (1-5 through 3-3)

- All commands run from `conventionals/` directory
- `import 'server-only'` mandatory first line of all `lib/` and `data/` files
- `@sendgrid/mail` already installed (`^8.1.6` in package.json)
- No Tailwind, inline `s` styles for UI
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Architecture References

- [Source: architecture.md#Authentication & Security] — `escapeHtml()` preserved in `lib/email.ts`
- [Source: architecture.md#Enforcement Guidelines] — rule 2: `import 'server-only'` in lib files
- [Source: epics.md#Story 3.4] — `sendBadgeEmail`, `escapeHtml`, non-fatal email, `email_sent` flag

### Project Structure After This Story

```
conventionals/
├── lib/
│   └── email.ts        ← NEW
└── data/
    └── badges.ts       ← MODIFIED: + sendBadgeEmail call, emailSent in return
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations._

### Completion Notes List

- **Task 1 ✅**: `lib/email.ts` created — `escapeHtml` (5 entity replacements), `sendBadgeEmail` (escapes name only, builds HTML with QR img + badge link + invite link, catches SendGrid errors, returns boolean).
- **Task 2 ✅**: `data/badges.ts` updated — imports `sendBadgeEmail`, builds `inviteUrl`, calls email, conditionally updates `email_sent = true` in DB, returns `{ attendee, badge, qrDataUrl, emailSent }`.
- **Task 3 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/lib/email.ts` (created)
- `conventionals/data/badges.ts` (modified — sendBadgeEmail call + emailSent update)

### Change Log

- 2026-04-07: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
