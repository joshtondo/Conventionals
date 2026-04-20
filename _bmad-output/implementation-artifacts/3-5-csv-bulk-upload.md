# Story 3.5: CSV Bulk Upload

Status: review

## Story

As an **organizer**,
I want to upload a CSV file of attendees,
So that I can add many attendees at once without entering them one by one.

## Acceptance Criteria

**Given** an organizer is on the Upload page for an event
**When** they select a valid CSV file and click "Upload CSV"
**Then** the CSV is POSTed to `POST /api/events/[id]/attendees` as `multipart/form-data` with field name `csv`
**And** the route detects `multipart/form-data` (Content-Type header) and branches into CSV processing instead of JSON processing
**And** rows with a non-empty `name` column and non-empty `email` column are processed via `createAttendeeAndBadge` (QR + badge email)
**And** rows missing `name` or `email` are silently skipped (counted in `skipped`)
**And** rows that trigger a PG `23505` (duplicate email) are silently skipped (counted in `skipped`)
**And** the response is `{ added: number, skipped: number }`
**And** `export const maxDuration = 60` is set on the route (Vercel timeout for bulk sends)
**And** `UploadForm.tsx` shows a "Bulk Upload CSV" section with a file input and "Upload CSV" button
**And** after a successful upload, the result message "X added, Y skipped" is shown and `router.refresh()` is called
**And** the CSV file input is reset after upload (successful or failed)
**And** CSV columns are matched case-insensitively by trimming and lowercasing header names

## Tasks / Subtasks

- [x] Task 1: Update `app/api/events/[id]/attendees/route.ts` — add CSV branch and `maxDuration` (AC: CSV parsed and processed)
  - [x] Add `export const maxDuration = 60` before the `POST` export
  - [x] Import `parse` from `csv-parse/sync`
  - [x] In the `withAuth` handler, check `req.headers.get('content-type')` — if it includes `multipart/form-data`, branch to CSV handler; otherwise fall through to existing JSON handler (no changes to JSON path)
  - [x] CSV branch: call `req.formData()`, get field `csv` (type `File`); if missing return 400 `{ error: 'No CSV file provided' }`
  - [x] Read file as `ArrayBuffer`, convert to `Buffer`, call `parse(buffer.toString(), { columns: true, skip_empty_lines: true, trim: true })`
  - [x] Normalize each row: find the key whose `key.toLowerCase() === 'name'` and `key.toLowerCase() === 'email'`
  - [x] Loop rows: if name or email missing/empty → increment `skipped`; else call `createAttendeeAndBadge`; catch `{ code: '23505' }` → increment `skipped`; on success increment `added`
  - [x] Return `NextResponse.json({ added, skipped }, { status: 200 })`

- [x] Task 2: Update `app/event/[id]/upload/UploadForm.tsx` — add CSV upload section (AC: file input, upload, result message)
  - [x] Add state: `csvFile: File | null`, `csvUploading: boolean`, `csvResult: { added: number; skipped: number } | null`, `csvError: string | null`
  - [x] Add a ref `csvInputRef = useRef<HTMLInputElement>(null)` to reset the file input after upload
  - [x] Add `handleCsvUpload` async function: build `FormData` with `csv` field, POST to `/api/events/${eventId}/attendees`, handle errors, set `csvResult`, call `router.refresh()`, reset input via `csvInputRef.current.value = ''`
  - [x] Add CSV upload section below the manual add form (above the divider before the attendees table): card with title "Bulk Upload CSV", file input (`.csv` accept), "Upload CSV" button (disabled while uploading), error display, result display ("X added, Y skipped")
  - [x] Add styles for CSV section to the `s` object (reuse existing card/button style patterns: `csvForm`, `csvResult` — inline styles consistent with the file)

- [x] Task 3: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors (1 pre-existing warning in `drizzle/schema.ts` is OK)

## Dev Notes

### Route Branching Strategy

The existing JSON handler must not change. The new CSV branch is inserted **before** the JSON parse:

```typescript
export const maxDuration = 60

export const POST = withAuth(async (req, ctx) => {
  const { id } = await ctx.params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const event = await getEventById(eventId, ctx.session.organizerId!)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    // CSV branch
    const formData = await req.formData()
    const file = formData.get('csv')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 })
    }
    const buffer = Buffer.from(await (file as File).arrayBuffer())
    const records: Record<string, string>[] = parse(buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    let added = 0
    let skipped = 0

    for (const row of records) {
      const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name')
      const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email')
      const name = nameKey ? row[nameKey] : ''
      const email = emailKey ? row[emailKey] : ''
      if (!name || !email) { skipped++; continue }
      try {
        await createAttendeeAndBadge(ctx.session.organizerId!, eventId, name, email)
        added++
      } catch (err) {
        if ((err as { code?: string }).code === '23505') { skipped++; continue }
        console.error('CSV row error:', (err as Error).message)
        skipped++
      }
    }

    return NextResponse.json({ added, skipped }, { status: 200 })
  }

  // Existing JSON handler (unchanged below)
  let body: { name?: unknown; email?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
  // ... rest unchanged
})
```

### CSV Format Expected

```
name,email
Alice Johnson,alice@example.com
Bob Smith,bob@example.com
```

Headers are matched case-insensitively. Extra columns are ignored. Rows with blank name or email are skipped.

### `csv-parse/sync` Import

`csv-parse@^6.2.1` is already in `package.json`. Use the sync sub-path:

```typescript
import { parse } from 'csv-parse/sync'
```

The `columns: true` option uses the first row as header names. `trim: true` strips whitespace from values and headers.

### UploadForm.tsx — CSV Section Structure

The CSV section is a card below the manual add form. Reuse card style (`s.form`) and button styles. Add `useRef` for the file input reset:

```tsx
const csvInputRef = useRef<HTMLInputElement>(null)

async function handleCsvUpload(e: React.FormEvent) {
  e.preventDefault()
  if (!csvFile) return
  setCsvError(null)
  setCsvResult(null)
  setCsvUploading(true)
  try {
    const fd = new FormData()
    fd.append('csv', csvFile)
    const res = await fetch(`/api/events/${eventId}/attendees`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
      // Note: do NOT set Content-Type header — browser sets it with boundary automatically
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setCsvError(data.error ?? 'Upload failed')
      return
    }
    const data = await res.json()
    setCsvResult(data)
    setCsvFile(null)
    if (csvInputRef.current) csvInputRef.current.value = ''
    router.refresh()
  } catch {
    setCsvError('Network error — please try again')
  } finally {
    setCsvUploading(false)
  }
}
```

**CRITICAL**: Do NOT set `Content-Type: 'multipart/form-data'` manually. When using `fetch` with a `FormData` body, the browser sets the `Content-Type` header automatically including the `boundary` parameter. If you set it manually without the boundary, the server cannot parse the form data.

### Files to Create / Modify

```
conventionals/
├── app/
│   ├── api/
│   │   └── events/
│   │       └── [id]/
│   │           └── attendees/
│   │               └── route.ts    ← MODIFY: add maxDuration + CSV branch
│   └── event/
│       └── [id]/
│           └── upload/
│               └── UploadForm.tsx  ← MODIFY: add CSV section
```

### Key Implementation Rules

**DO:**
- `export const maxDuration = 60` — must be a named export at module level (not inside the handler)
- Use `import { parse } from 'csv-parse/sync'` — sync parse for simplicity in Route Handler
- Let `fetch` set `Content-Type` automatically when using `FormData` body — never set it manually
- Catch `23505` per-row and count as skipped — do not abort the whole upload
- Call `router.refresh()` after CSV upload succeeds so the attendee table updates

**DO NOT:**
- Change the existing JSON handler path in any way
- Throw or return 500 for individual row failures — all row errors count as `skipped`
- Set `Content-Type` header manually in the `fetch` call from `UploadForm.tsx`
- Import `parse` from `csv-parse` (the root) — use `csv-parse/sync` for the sync API

### Previous Story Learnings (1-5 through 3-4)

- All commands run from `conventionals/` directory
- `import 'server-only'` mandatory first line of all `lib/` and `data/` files (route handlers don't need it)
- `await ctx.params` mandatory in Next.js 15 route handlers
- ESLint does NOT ignore `_` prefix vars — unused params must not be destructured
- No test framework — verify via `npx tsc --noEmit` and `npm run lint`

### Architecture References

- [Source: architecture.md#Enforcement Guidelines] — rule 1: no edge runtime (csv-parse requires Node.js)
- [Source: epics.md#Story 3.5] — CSV upload, same endpoint, silent skip on invalid/duplicate rows

### Project Structure After This Story

```
conventionals/
├── app/
│   ├── api/events/[id]/attendees/route.ts  ← MODIFIED: maxDuration + CSV branch
│   └── event/[id]/upload/UploadForm.tsx    ← MODIFIED: CSV upload section
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No deviations._

### Completion Notes List

- **Task 1 ✅**: `app/api/events/[id]/attendees/route.ts` updated — `export const maxDuration = 60`, `import { parse } from 'csv-parse/sync'`, Content-Type branch detects `multipart/form-data`, parses CSV buffer with `columns: true, skip_empty_lines: true, trim: true`, case-insensitive header lookup, per-row 23505 catch → skipped, returns `{ added, skipped }`. JSON path unchanged.
- **Task 2 ✅**: `UploadForm.tsx` updated — `useRef` for file input reset, `csvFile/csvUploading/csvResult/csvError` state, `handleCsvUpload` posts FormData without manual Content-Type header, shows "X added, Y skipped" result, calls `router.refresh()`. CSV section card added below manual add form.
- **Task 3 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning in `drizzle/schema.ts`.

### File List

- `conventionals/app/api/events/[id]/attendees/route.ts` (modified — maxDuration, csv-parse import, CSV branch)
- `conventionals/app/event/[id]/upload/UploadForm.tsx` (modified — CSV upload section, useRef, csvResult state)

### Change Log

- 2026-04-06: Story created.
- 2026-04-07: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
