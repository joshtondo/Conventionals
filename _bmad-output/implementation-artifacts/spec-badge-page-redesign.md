---
title: 'Badge Page Redesign'
type: 'feature'
created: '2026-04-15'
status: 'done'
baseline_commit: ''
goal: 5
---

## Intent

**Problem:** The badge page (`/badge/[token]`) is a plain white card with name, event, and a small QR code. It has no visual identity, no social links, and no way to share.

**Approach:** Redesign the badge page into a full-screen card with an indigo gradient header (avatar initials + name + event), a large centered QR code section, social links row, and a Share button (copies URL to clipboard). Add `getBadgeWithProfile` data function to fetch profile data via the `attendees → attendeeAccounts` email join. Add a small `BadgeShareButton` client component for the clipboard action. The page itself stays a server component.

## Boundaries & Constraints

**Always:**
- Inline CSS-in-JS only
- Design tokens: primary `#6366f1`, primaryDark `#4f46e5`, accent `#10b981`
- Badge page is public (no session required) — do not add auth checks
- `BadgeShareButton` must be `'use client'` (uses `navigator.clipboard`)
- Add `getBadgeWithProfile` to `data/badges.ts` — do NOT modify existing functions

**Never:**
- Modify `getBadgeByToken`, `checkinBadge`, or any existing data function
- Add new API routes

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output |
|----------|--------------|-----------------|
| Valid token, no account profile | Badge exists, attendee never signed up | Card renders without social links section |
| Valid token, account with social links | `isPublic = true`, profile filled | Social links row visible |
| Valid token, account `isPublic = false` | Profile exists but private | Social links hidden (treat same as no account) |
| Invalid token | `badge = null` | Next.js `notFound()` (unchanged) |

## Code Map

- `conventionals/data/badges.ts` — add `getBadgeWithProfile(token)`: same joins as `getBadgeByToken` plus left join `attendeeAccounts` on email; return social links and bio if account is public
- `conventionals/app/badge/[token]/page.tsx` — call `getBadgeWithProfile` instead of `getBadgeByToken`; full visual redesign with gradient header, large QR, social links, `<BadgeShareButton>`
- `conventionals/components/BadgeShareButton.tsx` — NEW: `'use client'`; single button that copies `badgeUrl` to clipboard; shows "Copied!" feedback for 2s

## Tasks & Acceptance

**Execution:**
- [ ] `conventionals/data/badges.ts` — add `getBadgeWithProfile(token: string)`: query `badges → attendees → events` (same as `getBadgeByToken`) plus `leftJoin(attendeeAccounts, eq(attendees.email, attendeeAccounts.email))`; return `{ attendeeName, eventName, token, socialLinks: null if !isPublic, bio: null if !isPublic }`
- [ ] `conventionals/components/BadgeShareButton.tsx` — `'use client'`; prop `badgeUrl: string`; button with 44px height; on click: `navigator.clipboard.writeText(badgeUrl)`, set `copied = true`, reset after 2000ms; text: "Share Badge" → "✓ Copied!"
- [ ] `conventionals/app/badge/[token]/page.tsx` — call `getBadgeWithProfile`; render: full viewport container (`#f8fafc` bg); centered card (max 420px, white, 20px border-radius, overflow hidden, no padding on card itself); gradient header (`#4f46e5 → #6366f1`, 160px tall, flex column center): avatar circle (64px, white/20% bg, white initials 24px bold), attendee name (white, 22px bold, mt 8px), event name (white/80%, 13px); body section (24px padding): large QR code image (220px centered, 12px border-radius, border `#e2e8f0`); badge URL in small grey text below QR; social links row if any (LinkedIn / Twitter / Website as pill links, same style as DiscoverDeck); `<BadgeShareButton badgeUrl={badgeUrl} />` (full width, indigo, 44px)

**Acceptance Criteria:**
- Given a valid badge token, when the page loads, then a gradient indigo header with avatar initials and attendee name is visible
- Given a valid badge token, when the page loads, then a 220px QR code is centered in the card body
- Given an attendee account with public social links, when the page loads, then LinkedIn / Twitter / Website pill links are shown
- Given no public account, when the page loads, then no social links section is rendered
- Given the user taps "Share Badge", when clicked, then the badge URL is copied and button shows "✓ Copied!" for 2 seconds
- Given any screen width ≥ 375px, then the card fits within the viewport without horizontal scroll

## Verification

**Commands:**
- `cd conventionals && npm run build` — exit 0
- `cd conventionals && npm run lint` — exit 0

**Manual checks:**
- Visit `/badge/[token]` — confirm gradient header, avatar initials, event name
- Confirm QR code renders at 220px
- Tap "Share Badge" — confirm "✓ Copied!" feedback
- If attendee has public profile with LinkedIn: confirm pill link renders
