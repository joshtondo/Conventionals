/**
 * API tests: Attendee Accounts — Signup, Login, Logout (Stories 5.2, 5.3)
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, registerOrganizer, createEvent, addAttendee } from '../helpers/setup'

const BASE = 'http://localhost:3000'

test.describe('Story 5.2 — Account Creation via Invite Link', () => {
  let inviteToken: string
  let attendeeEmail: string

  test.beforeAll(async ({ request }) => {
    const creds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request, 'Signup Event')
    const result = await addAttendee(request, event.id, 'Signup Person')
    inviteToken = result.attendee.inviteToken
    attendeeEmail = result.email
  })

  test('creates attendee account with valid invite token', async ({ request }) => {
    // Use fresh context (no organizer session for signup)
    const res = await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: inviteToken, password: 'AttendeePass1' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('rejects reuse of already-used invite token', async ({ request }) => {
    // The token was used in the previous test — re-use should fail
    const res = await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: inviteToken, password: 'AnotherPass1' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('already been used')
  })

  test('returns 400 for a valid-UUID-format token that does not exist', async ({ request }) => {
    // Must use a proper UUID format — the invite_token column is type uuid in PostgreSQL
    const res = await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: '00000000-0000-0000-0000-000000000000', password: 'AttendeePass1' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 when password is too short', async ({ request }) => {
    // Create a fresh invite token
    const creds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request, 'ShortPass Event')
    const result = await addAttendee(request, event.id, 'Short Pass Person')
    const freshToken = result.attendee.inviteToken

    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: freshToken, password: 'short' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('8')
  })
})

test.describe('Story 5.3 — Attendee Login & Logout', () => {
  const password = 'AttPass123'
  let attendeeEmail: string

  test.beforeAll(async ({ request }) => {
    // Create organizer → event → attendee → account
    const creds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request, 'Login Event')
    const result = await addAttendee(request, event.id, 'Login Person')
    attendeeEmail = result.email

    // Sign up the attendee account
    await request.post(`${BASE}/api/auth/logout`) // clear org session
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: result.attendee.inviteToken, password },
    })
    await request.post(`${BASE}/api/attendee/auth/logout`)
  })

  test('logs in with valid credentials', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/login`, {
      data: { email: attendeeEmail, password },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 401 for wrong password', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/login`, {
      data: { email: attendeeEmail, password: 'WrongPass99' },
    })
    expect(res.status()).toBe(401)
  })

  test('returns 401 for unknown email (no user enumeration)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/login`, {
      data: { email: uniqueEmail('ghost'), password: 'SomePass1' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid email or password')
  })

  test('logs out successfully', async ({ request }) => {
    await request.post(`${BASE}/api/attendee/auth/login`, {
      data: { email: attendeeEmail, password },
    })
    const res = await request.post(`${BASE}/api/attendee/auth/logout`)
    expect(res.status()).toBe(200)
  })
})
