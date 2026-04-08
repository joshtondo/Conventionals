/**
 * API tests: Attendee Registration & Badge Delivery, Check-in, Resend (Stories 3.2, 3.5, 4.1, 4.2, 4.3)
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, registerOrganizer, createEvent, addAttendee } from '../helpers/setup'

const BASE = 'http://localhost:3000'

// ─── Story 3.2 — Manual Attendee Add ───────────────────────────────────────

test.describe('Story 3.2 — Manual Attendee Add', () => {
  const creds = { email: '', password: '' }
  let eventId: number

  test.beforeAll(async ({ request }) => {
    const result = await registerOrganizer(request)
    creds.email = result.email
    creds.password = result.password
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request)
    eventId = event.id
  })

  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: creds })
  })

  test('adds an attendee and returns 201 with attendee + badge', async ({ request }) => {
    const email = uniqueEmail('att')
    const res = await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      data: { name: 'Alice', email },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.attendee.name).toBe('Alice')
    expect(typeof body.badge.token).toBe('string')
    expect(body.badge.token.length).toBeGreaterThan(10)
    expect(typeof body.attendee.inviteToken).toBe('string')
  })

  test('returns 409 for duplicate attendee email in same event', async ({ request }) => {
    const email = uniqueEmail('dup')
    await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      data: { name: 'Bob First', email },
    })
    const res = await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      data: { name: 'Bob Second', email },
    })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('already registered')
  })

  test('returns 400 when name is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      data: { email: uniqueEmail() },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 404 for non-existent event', async ({ request }) => {
    const res = await request.post(`${BASE}/api/events/999999999/attendees`, {
      data: { name: 'Ghost', email: uniqueEmail() },
    })
    expect(res.status()).toBe(404)
  })

  test('returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      data: { name: 'Ghost', email: uniqueEmail() },
    })
    expect(res.status()).toBe(401)
  })
})

// ─── Story 3.5 — CSV Bulk Upload ───────────────────────────────────────────

test.describe('Story 3.5 — CSV Bulk Upload', () => {
  const creds = { email: '', password: '' }
  let eventId: number

  test.beforeAll(async ({ request }) => {
    const result = await registerOrganizer(request)
    creds.email = result.email
    creds.password = result.password
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request, 'CSV Event')
    eventId = event.id
  })

  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: creds })
  })

  test('uploads a CSV and returns added/skipped counts', async ({ request }) => {
    const ts = Date.now()
    const csvContent = `name,email\nCSV Alice,csv_alice_${ts}@playwright.invalid\nCSV Bob,csv_bob_${ts}@playwright.invalid`

    const res = await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      multipart: {
        csv: {
          name: 'attendees.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent),
        },
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.added).toBe(2)
    expect(body.skipped).toBe(0)
  })

  test('silently skips rows with missing name or email', async ({ request }) => {
    const ts = Date.now()
    const csvContent = `name,email\nValid Person,valid_${ts}@playwright.invalid\n,missing_name_${ts}@playwright.invalid\nMissing Email,`

    const res = await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      multipart: {
        csv: {
          name: 'attendees.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent),
        },
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.added).toBe(1)
    expect(body.skipped).toBe(2)
  })

  test('silently skips duplicate emails in CSV (no error)', async ({ request }) => {
    const ts = Date.now()
    const email = `csv_dup_${ts}@playwright.invalid`
    // Add once first
    await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      data: { name: 'Pre-existing', email },
    })

    const csvContent = `name,email\nDup Person,${email}`
    const res = await request.post(`${BASE}/api/events/${eventId}/attendees`, {
      multipart: {
        csv: {
          name: 'attendees.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent),
        },
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.added).toBe(0)
    expect(body.skipped).toBe(1)
  })
})

// ─── Story 4.1 — Public Badge Page ─────────────────────────────────────────

test.describe('Story 4.1 — Public Badge Page (token-based)', () => {
  let badgeToken: string

  test.beforeAll(async ({ request }) => {
    const creds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request, 'Badge Event')
    const result = await addAttendee(request, event.id, 'Badge Person')
    badgeToken = result.badge.token
  })

  test('GET /api/badges/:token returns badge info (no auth required)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/badges/${badgeToken}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Badge Person')
    expect(typeof body.eventName).toBe('string')
    expect(body.token).toBe(badgeToken)
  })

  test('GET /api/badges/:token returns 404 for unknown token', async ({ request }) => {
    const res = await request.get(`${BASE}/api/badges/totally-fake-token-xyz`)
    expect(res.status()).toBe(404)
  })
})

// ─── Story 4.2 — QR Scan Check-in ──────────────────────────────────────────

test.describe('Story 4.2 — QR Scan Check-in (idempotent)', () => {
  let badgeToken: string

  test.beforeAll(async ({ request }) => {
    const creds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request, 'Checkin Event')
    const result = await addAttendee(request, event.id, 'Checkin Person')
    badgeToken = result.badge.token
  })

  test('first check-in marks attendee as checked in', async ({ request }) => {
    const res = await request.post(`${BASE}/api/badges/${badgeToken}/checkin`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.checkedIn).toBe(true)
    expect(body.alreadyCheckedIn).toBeFalsy()
  })

  test('second check-in returns alreadyCheckedIn: true (not an error)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/badges/${badgeToken}/checkin`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.alreadyCheckedIn).toBe(true)
  })

  test('check-in requires no auth — works without session', async ({ request }) => {
    const creds2 = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: creds2 })
    const event = await createEvent(request, 'NoAuth Checkin Event')
    const result = await addAttendee(request, event.id, 'NoAuth Person')
    const token = result.badge.token

    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.post(`${BASE}/api/badges/${token}/checkin`)
    expect(res.status()).toBe(200)
  })

  test('returns 404 for unknown badge token', async ({ request }) => {
    const res = await request.post(`${BASE}/api/badges/not-a-real-token/checkin`)
    expect(res.status()).toBe(404)
  })
})

// ─── Story 4.3 — Badge Email Resend ────────────────────────────────────────

test.describe('Story 4.3 — Badge Email Resend', () => {
  let badgeToken: string
  let ownerCreds: { email: string; password: string }

  test.beforeAll(async ({ request }) => {
    ownerCreds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: ownerCreds })
    const event = await createEvent(request, 'Resend Event')
    const result = await addAttendee(request, event.id, 'Resend Person')
    badgeToken = result.badge.token
  })

  test('resends badge email when organizer owns it', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: ownerCreds })
    const res = await request.post(`${BASE}/api/badges/${badgeToken}/resend`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 404 (not 403) when different organizer tries to resend — avoids existence leak', async ({ request }) => {
    const otherCreds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: otherCreds })
    const res = await request.post(`${BASE}/api/badges/${badgeToken}/resend`)
    expect(res.status()).toBe(404)
  })

  test('returns 401 without session', async ({ request }) => {
    const res = await request.post(`${BASE}/api/badges/${badgeToken}/resend`)
    expect(res.status()).toBe(401)
  })
})
