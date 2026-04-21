/**
 * API tests: Announcements
 * - POST /api/events/[id]/announce
 */
import { test, expect } from '@playwright/test'
import { registerOrganizer, createEvent, addAttendee } from '../helpers/setup'

const BASE = 'http://localhost:3000'

test.describe('Announcements', () => {
  const creds = { email: '', password: '' }
  let eventId: number

  test.beforeAll(async ({ request }) => {
    const result = await registerOrganizer(request)
    creds.email = result.email
    creds.password = result.password
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request, 'Announce Event')
    eventId = event.id
    // Add one attendee so announcement has someone to send to
    await addAttendee(request, eventId, 'Announce Recipient')
  })

  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: creds })
  })

  test('POST /api/events/[id]/announce returns 200 with sent count', async ({ request }) => {
    const res = await request.post(`${BASE}/api/events/${eventId}/announce`, {
      data: { subject: 'Test Subject', message: 'Hello attendees!' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body.sent).toBe('number')
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThanOrEqual(1)
  })

  test('returns 200 with sent:0 for event with no attendees', async ({ request }) => {
    const emptyEvent = await createEvent(request, 'Empty Announce Event')
    const res = await request.post(`${BASE}/api/events/${emptyEvent.id}/announce`, {
      data: { subject: 'Hello', message: 'World' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
  })

  test('returns 400 when subject is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/events/${eventId}/announce`, {
      data: { message: 'Missing subject' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/subject/i)
  })

  test('returns 400 when message is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/events/${eventId}/announce`, {
      data: { subject: 'Missing message' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/message/i)
  })

  test('returns 404 for non-existent event', async ({ request }) => {
    const res = await request.post(`${BASE}/api/events/999999999/announce`, {
      data: { subject: 'Hello', message: 'World' },
    })
    expect(res.status()).toBe(404)
  })

  test('returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.post(`${BASE}/api/events/${eventId}/announce`, {
      data: { subject: 'Hello', message: 'World' },
    })
    expect(res.status()).toBe(401)
  })

  test('co-organizer cannot announce (only owner can) — or verify behavior', async ({ request }) => {
    // Create a separate organizer who is NOT the event owner
    const otherOrg = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: otherOrg })
    const res = await request.post(`${BASE}/api/events/${eventId}/announce`, {
      data: { subject: 'Unauthorized', message: 'Test' },
    })
    // Should be 404 (event not found for this organizer) or 403
    expect([403, 404]).toContain(res.status())
  })
})
