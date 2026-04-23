---
title: 'QR Scanner – Reliable Decode with @zxing/browser'
type: 'bugfix'
created: '2026-04-22'
status: 'done'
baseline_commit: '648abdff4545b5a176fcf64cdd0e858c9285a159'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The in-app QR scanner at `/event/[id]/scan` uses `jsQR` + a manual `requestAnimationFrame` loop, which silently fails to decode QR codes on most mobile devices — leaving staff unable to check in attendees via camera, even though manual token entry and the check-in API both work.

**Approach:** Install `@zxing/browser` and replace the manual RAF/canvas/jsQR loop in `QRScanner.tsx` with `BrowserMultiFormatReader.decodeFromVideoDevice`, which handles autofocus, orientation, and continuous decode natively. All existing UI stays unchanged.

## Boundaries & Constraints

**Always:**
- Keep all existing UI — camera viewport, scan-line overlay, result banners, recent-checkins list, manual entry
- `QRScanner.tsx` stays `'use client'`; zxing reader instantiated only inside `useEffect`
- Token extraction stays: parse with `new URL(value)`, take last path segment, validate UUID regex
- Inline CSS only — no Tailwind, no shadcn
- `doCheckin` POST flow, result overlays, manual entry, recent check-ins list — untouched

**Ask First:**
- If `@zxing/browser` install fails (network or peer-dep conflict) — stop and report before trying an alternative

**Never:**
- Modify `data/badges.ts`, the checkin route, or any file outside `QRScanner.tsx` and `package.json`
- Remove the manual entry fallback
- Add authentication to the check-in API call

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Camera granted, valid badge QR scanned | `https://[host]/badge/[uuid]` | POST checkin → green "Checked in! [Name]" overlay; resumes after 2.5s | — |
| Already checked-in badge scanned | API returns `alreadyCheckedIn: true` | Amber "Already checked in · [Name]" overlay; resumes after 2.5s | — |
| Non-badge QR / token not in DB | 404 from API | Red "Badge not found" overlay; resumes after 2.5s | — |
| Scanned URL has non-UUID last segment | Malformed URL | `extractToken` returns null; scan continues silently | — |
| Camera permission denied | `getUserMedia` rejects | Hide camera viewport; manual-entry-only UI | — |
| Valid UUID submitted manually | UUID string | Same doCheckin flow as QR path | — |
| Invalid string submitted manually | Non-UUID text | "Invalid token format" inline error; no API call | — |

</frozen-after-approval>

## Code Map

- `conventionals/package.json` — add `@zxing/browser` dependency
- `conventionals/app/event/[id]/scan/QRScanner.tsx` — replace jsQR + RAF loop with `BrowserMultiFormatReader`; all UI unchanged

## Tasks & Acceptance

**Execution:**

- [x] `conventionals/` — run `npm install @zxing/browser` to add the package

- [x] `conventionals/app/event/[id]/scan/QRScanner.tsx` — replace scan loop:
  - Remove: `import jsQR from 'jsqr'`, `canvasRef`, canvas drawing, `requestAnimationFrame` tick, `rafRef`, `startScanLoop` callback
  - Add: `import { BrowserMultiFormatReader } from '@zxing/browser'` at top of file
  - In `useEffect` after `video.srcObject = stream` and `video.play()`: instantiate `const reader = new BrowserMultiFormatReader()` then call `reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => { if (result && !pausedRef.current) { const token = extractToken(result.getText()); if (token) doCheckin(token); } })`
  - `pausedRef.current = true` at start of `doCheckin` still gates re-triggering; reset to `false` after the 2.5s delay as before
  - Cleanup in `useEffect` return: `reader.reset()` + stop stream tracks
  - Remove `<canvas ref={canvasRef}>` from JSX — no longer needed
  - Keep `activateCamera`, `needsTap`, all overlays, `recentCheckins`, manual form, all styling

**Acceptance Criteria:**

- Given the organizer visits `/event/[id]/scan` on Android Chrome with camera permission, when they point the camera at a valid badge QR, then a green "Checked in! [Attendee Name]" overlay appears
- Given the badge was already checked in, when the same QR is scanned, then an amber "Already checked in · [Name]" overlay appears
- Given camera is unavailable/denied, then only the manual entry UI is shown with no JS errors
- Given a valid UUID is submitted manually, then the same check-in flow runs
- Given `npm run build` from `conventionals/`, then exit 0 with no TypeScript errors

## Design Notes

`BrowserMultiFormatReader.decodeFromVideoDevice` runs its own internal decode loop and fires a callback on each successful read — no manual RAF or canvas needed. Pass `undefined` as `deviceId` to let it use the stream already attached to the `<video>` element via `srcObject`. Use `result.getText()` to get the raw decoded string.

## Verification

**Commands:**
- `cd conventionals && npm install @zxing/browser` — expected: package added, no peer-dep errors
- `cd conventionals && npm run build` — expected: exit 0
- `cd conventionals && npm run lint` — expected: 0 errors

## Spec Change Log

## Suggested Review Order

**Decode mechanism replacement (entry point)**

- Core swap: zxing `BrowserMultiFormatReader` replaces jsQR + RAF loop
  [`QRScanner.tsx:111`](../../conventionals/app/event/%5Bid%5D/scan/QRScanner.tsx#L111)

- Unmount-race guard: `unmounted` flag stops controls leaking after cleanup
  [`QRScanner.tsx:114`](../../conventionals/app/event/%5Bid%5D/scan/QRScanner.tsx#L114)

- Error surfacing: `console.error` replaces silent `.catch()` for dev visibility
  [`QRScanner.tsx:128`](../../conventionals/app/event/%5Bid%5D/scan/QRScanner.tsx#L128)

**Camera lifecycle & cleanup**

- Controls stored post-promise; cleanup calls `controls.stop()` before track halt
  [`QRScanner.tsx:166`](../../conventionals/app/event/%5Bid%5D/scan/QRScanner.tsx#L166)

- iOS tap-to-start: `activateCamera` calls `startDecoding` only after play succeeds
  [`QRScanner.tsx:143`](../../conventionals/app/event/%5Bid%5D/scan/QRScanner.tsx#L143)

**Dependency**

- New package `@zxing/browser` v0.1.5 added — 4 transitive packages
  [`package.json:1`](../../conventionals/package.json#L1)
