---
title: 'QR Scanner Screen'
type: 'feature'
created: '2026-04-15'
status: 'pending-approval'
baseline_commit: ''
goal: 6
---

## Intent

**Problem:** Organizers have no in-app way to scan and check in attendees. The only check-in path is the `/api/badges/[token]/checkin` endpoint — unused from the UI.

**Approach:** Add `/event/[id]/scan` route (server component auth check + client `QRScanner`). The scanner uses the browser-native `BarcodeDetector` API (no new dependencies) to read QR codes from the live camera feed. On decode, it extracts the badge token from the badge URL and POSTs to `/api/badges/[token]/checkin`. Manual badge-token input field is always visible as a fallback. Result overlays show success or "already checked in" state. Add a "📷 Scan In" link to each event card in `DashboardClient`.

## Boundaries & Constraints

**Always:**
- Inline CSS-in-JS — no Tailwind, no shadcn
- Design tokens: primary `#6366f1`, accent `#10b981`
- `QRScanner` must be `'use client'`; `BarcodeDetector` accessed only inside `useEffect`/event handlers
- `BarcodeDetector` availability checked at runtime — if absent, show manual-only UI immediately
- Token extraction: parse scanned URL with `new URL(value)`, take the last path segment; reject if it doesn't look like a UUID (36 chars with dashes)
- `POST /api/badges/[token]/checkin` — no auth required by that route (existing behaviour)
- Animated scan line via `<style>` tag with `@keyframes` in the client component

**Never:**
- Add new API routes or modify `/api/badges/[token]/checkin`
- Install new npm packages
- Modify `DashboardClient`'s create/delete logic

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output |
|----------|--------------|-----------------|
| Camera access granted, QR scanned | Valid badge URL | POST checkin → green "Checked in!" overlay, then resume scanning after 2.5s |
| QR scanned — already checked in | `alreadyCheckedIn: true` from API | Amber "Already checked in" overlay, resume after 2.5s |
| QR scanned — bad token (404) | Non-badge QR or wrong event | Red "Badge not found" overlay, resume after 2s |
| Camera permission denied | `getUserMedia` rejects | Hide camera viewport, show manual-only UI |
| `BarcodeDetector` not available | Safari, Firefox | Hide camera viewport, show manual-only UI |
| Manual token submitted | Text input value | Same checkin flow as QR path |
| Invalid manual input | Non-UUID string | "Invalid token format" error, no API call |

## Code Map

- `conventionals/app/event/[id]/scan/page.tsx` — NEW: server component; auth + event fetch; renders `<QRScanner>`
- `conventionals/app/event/[id]/scan/QRScanner.tsx` — NEW: `'use client'`; camera viewport, scan line, BarcodeDetector loop, result overlay, manual input
- `conventionals/app/dashboard/DashboardClient.tsx` — add "📷 Scan In" link to each event card linking to `/event/[id]/scan`

## Tasks & Acceptance

**Execution:**
- [ ] `conventionals/app/event/[id]/scan/page.tsx` — server component: auth check (`getIronSession` → redirect `/login` if no `organizerId`); fetch event (`getEventById(eventId, organizerId)` → `notFound()` if null); render `<HamburgerDrawer variant="organizer" />` + `<QRScanner eventId={eventId} eventName={event.name} />`
- [ ] `conventionals/app/event/[id]/scan/QRScanner.tsx` — `'use client'`; inject `<style>` with `@keyframes scanline { 0%,100% { top: 15% } 50% { top: 75% } }`; state: `status: 'idle'|'scanning'|'result'`, `result: {type:'success'|'duplicate'|'error', name?:string}|null`, `manualToken`, `cameraAvailable`; on mount: check `'BarcodeDetector' in window` AND call `getUserMedia({ video: { facingMode:'environment' } })` — if either fails set `cameraAvailable=false`; if camera available: show `<video>` (full-width, max 480px, rounded corners) + scan line overlay (absolute, animated, 2px indigo line); start `requestAnimationFrame` loop calling `detector.detect(videoRef.current)` — on first barcode parse URL, extract token (last path segment, validate UUID), call `doCheckin(token)`; `doCheckin(token)`: POST to `/api/badges/[token]/checkin`, set result overlay, pause scan loop for 2.5s then resume; result overlay: absolute over camera, semi-transparent bg, icon + message + name; below camera (or as main UI when no camera): manual input section with label "Enter badge token manually", text input (44px height), "Check In" button (indigo, 44px); invalid UUID shows inline error without API call
- [ ] `conventionals/app/dashboard/DashboardClient.tsx` — in each event card's action row, add `<a href={"/event/"+event.id+"/scan"}>` styled as a small indigo pill link "📷 Scan In" alongside the existing "Manage attendees →" link

**Acceptance Criteria:**
- Given an organizer visits `/event/[id]/scan`, then the page renders with camera viewport (if permission granted) and manual input below
- Given camera access and a valid badge QR is scanned, then a green "Checked in!" overlay appears and scanning resumes after 2.5s
- Given the API returns `alreadyCheckedIn: true`, then an amber "Already checked in" overlay appears
- Given a non-badge QR code is scanned, then a red "Badge not found" overlay appears
- Given `BarcodeDetector` is unavailable or camera permission is denied, then only the manual input UI is shown
- Given valid token in manual input and "Check In" is tapped, then the same check-in flow runs
- Given invalid token format in manual input, then "Invalid token format" error shown without an API call
- Given each event card in `/dashboard`, then a "📷 Scan In" link is visible linking to `/event/[id]/scan`

## Verification

**Commands:**
- `cd conventionals && npm run build` — exit 0
- `cd conventionals && npm run lint` — exit 0

**Manual checks:**
- Visit `/dashboard` — confirm "📷 Scan In" link on each event card
- Visit `/event/[id]/scan` on Android Chrome — confirm camera viewport + scan line animation
- Scan a badge QR — confirm "Checked in!" overlay
- Submit a valid token manually — confirm check-in works
- Visit in Safari — confirm manual-only UI shown
