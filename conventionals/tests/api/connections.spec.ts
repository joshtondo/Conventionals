/**
 * API tests: Attendee Connections (Stories 6.3, 6.4)
 */
import { test, expect } from '@playwright/test'
import { registerOrganizer, createEvent, addAttendee } from '../helpers/setup'

const BASE = 'http://localhost:3000'

async function setupAttendeeSession(request: import('@playwright/test').APIRequestContext, label = 'Conn') {
  const password = 'ConnPass123'
  const creds = await registerOrganizer(request)
  await request.post(`${BASE}/api/auth/login`, { data: creds })
  const event = await createEvent(request, `${label} Event`)
  const result = await addAttendee(request, event.id, `${label} Person`)

  await request.post(`${BASE}/api/auth/logout`)
  await request.post(`${BASE}/api/attendee/auth/signup`, {
    data: { token: result.attendee.inviteToken, password },
  })
  return { eventId: event.id, password, email: result.email }
}

test.describe('Story 6.3 — Connect with an Attendee', () => {
  test.beforeEach(async ({ request }) => {
    await setupAttendeeSession(request)
  })

  test('POST /api/attendee/connections creates a connection', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/connections`, {
      data: { connectedName: 'Bob Builder', contactInfo: { linkedin: 'https://linkedin.com/in/bob' } },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(typeof body.id).toBe('number')
  })

  test('returns 400 when connectedName is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/connections`, {
      data: { contactInfo: {} },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('connectedName')
  })

  test('returns 401 without attendee session', async ({ request }) => {
    await request.post(`${BASE}/api/attendee/auth/logout`)
    const res = await request.post(`${BASE}/api/attendee/connections`, {
      data: { connectedName: 'Ghost' },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('Story 6.4 — Edit Connection Notes', () => {
  const attCreds = { email: '', password: 'ConnNotePass1' }
  let connectionId: number

  test.beforeAll(async ({ request }) => {
    // Set up attendee account and create a connection
    const orgCreds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: orgCreds })
    const event = await createEvent(request, 'Notes Event')
    const result = await addAttendee(request, event.id, 'Notes Person')
    attCreds.email = result.email

    await request.post(`${BASE}/api/auth/logout`)
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: result.attendee.inviteToken, password: attCreds.password },
    })

    const createRes = await request.post(`${BASE}/api/attendee/connections`, {
      data: { connectedName: 'Notes Connection' },
    })
    const body = await createRes.json()
    connectionId = body.id
  })

  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE}/api/attendee/auth/login`, { data: attCreds })
  })

  test('PATCH /api/attendee/connections/:id updates notes', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/attendee/connections/${connectionId}`, {
      data: { notes: 'Met at the coffee break, works in DevRel' },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  test('can clear notes by setting to null', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/attendee/connections/${connectionId}`, {
      data: { notes: null },
    })
    expect(res.status()).toBe(200)
  })

  test('returns 400 when notes is not a string or null', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/attendee/connections/${connectionId}`, {
      data: { notes: 12345 },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 404 when connection belongs to a different attendee', async ({ request }) => {
    // Set up a second attendee session
    const orgCreds2 = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: orgCreds2 })
    const event2 = await createEvent(request, 'Other Notes Event')
    const result2 = await addAttendee(request, event2.id, 'Other Notes Person')
    await request.post(`${BASE}/api/auth/logout`)
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: result2.attendee.inviteToken, password: 'OtherNotePass1' },
    })

    const res = await request.patch(`${BASE}/api/attendee/connections/${connectionId}`, {
      data: { notes: 'Hacked notes' },
    })
    expect(res.status()).toBe(404)
  })

  test('returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/attendee/auth/logout`)
    const res = await request.patch(`${BASE}/api/attendee/connections/${connectionId}`, {
      data: { notes: 'No session' },
    })
    expect(res.status()).toBe(401)
  })
})
