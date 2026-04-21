/**
 * API tests for new features:
 * - Organizer forgot-password / reset-password
 * - Attendee forgot-password / reset-password
 * - Attendee direct registration (no invite)
 * - GET /api/notifications, POST /api/notifications/read
 * - PATCH /api/organizer/profile
 * - PATCH /api/events/[id] (update event)
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, registerOrganizer, createEvent } from '../helpers/setup'

const BASE = 'http://localhost:3000'

// ─── Organizer Forgot Password ──────────────────────────────────────────────

test.describe('Organizer Forgot Password', () => {
  test('POST /api/auth/forgot-password returns 200 for unknown email (no enumeration)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/forgot-password`, {
      data: { email: 'nobody@playwright.invalid' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 200 for known organizer email', async ({ request }) => {
    const creds = await registerOrganizer(request)
    const res = await request.post(`${BASE}/api/auth/forgot-password`, {
      data: { email: creds.email },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 400 when email is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/forgot-password`, { data: {} })
    expect(res.status()).toBe(400)
  })
})

// ─── Organizer Reset Password ────────────────────────────────────────────────

test.describe('Organizer Reset Password', () => {
  test('returns 400 for missing token', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/reset-password`, {
      data: { password: 'NewPass1234' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 for invalid/expired token', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/reset-password`, {
      data: { token: 'definitely-not-a-real-token', password: 'NewPass1234' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid|expired/i)
  })

  test('returns 400 when password is too short', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/reset-password`, {
      data: { token: 'anything', password: 'short' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/8 characters/i)
  })
})

// ─── Attendee Forgot Password ────────────────────────────────────────────────

test.describe('Attendee Forgot Password', () => {
  test('POST /api/attendee/auth/forgot-password returns 200 for unknown email', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/forgot-password`, {
      data: { email: 'nobody@playwright.invalid' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 400 when email is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/forgot-password`, { data: {} })
    expect(res.status()).toBe(400)
  })
})

// ─── Attendee Reset Password ─────────────────────────────────────────────────

test.describe('Attendee Reset Password', () => {
  test('returns 400 for invalid token', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/reset-password`, {
      data: { token: 'bad-token', password: 'NewPass1234' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid|expired/i)
  })

  test('returns 400 when password is too short', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/reset-password`, {
      data: { token: 'anything', password: 'abc' },
    })
    expect(res.status()).toBe(400)
  })
})

// ─── Attendee Direct Registration (no invite) ────────────────────────────────

test.describe('Attendee Direct Registration', () => {
  test('POST /api/attendee/auth/register creates account and sets session', async ({ request }) => {
    const email = uniqueEmail('dreg')
    const res = await request.post(`${BASE}/api/attendee/auth/register`, {
      data: { name: 'Direct User', email, password: 'SecurePass1' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 409 for duplicate email', async ({ request }) => {
    const email = uniqueEmail('dreg2')
    await request.post(`${BASE}/api/attendee/auth/register`, {
      data: { name: 'First', email, password: 'SecurePass1' },
    })
    const res = await request.post(`${BASE}/api/attendee/auth/register`, {
      data: { name: 'Second', email, password: 'SecurePass1' },
    })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already exists/i)
  })

  test('returns 400 when name is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/register`, {
      data: { email: uniqueEmail(), password: 'SecurePass1' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 when password is too short', async ({ request }) => {
    const res = await request.post(`${BASE}/api/attendee/auth/register`, {
      data: { name: 'Test', email: uniqueEmail(), password: 'short' },
    })
    expect(res.status()).toBe(400)
  })
})

// ─── Notifications ────────────────────────────────────────────────────────────

test.describe('Notifications', () => {
  const creds = { email: '', password: '' }

  test.beforeAll(async ({ request }) => {
    const result = await registerOrganizer(request)
    creds.email = result.email
    creds.password = result.password
  })

  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: creds })
  })

  test('GET /api/notifications returns 200 with array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/notifications`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('POST /api/notifications/read marks notifications read', async ({ request }) => {
    const res = await request.post(`${BASE}/api/notifications/read`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('GET /api/notifications returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.get(`${BASE}/api/notifications`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/notifications/read returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.post(`${BASE}/api/notifications/read`)
    expect(res.status()).toBe(401)
  })
})

// ─── Organizer Profile ────────────────────────────────────────────────────────

test.describe('Organizer Profile', () => {
  const creds = { email: '', password: '' }

  test.beforeAll(async ({ request }) => {
    const result = await registerOrganizer(request)
    creds.email = result.email
    creds.password = result.password
  })

  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: creds })
  })

  test('PATCH /api/organizer/profile updates name', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/organizer/profile`, {
      data: { name: 'Updated Name' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 400 when name is empty string', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/organizer/profile`, {
      data: { name: '' },
    })
    expect(res.status()).toBe(400)
  })

  test('changes password with correct current password', async ({ request }) => {
    const newPassword = 'NewTestPass456'
    const res = await request.patch(`${BASE}/api/organizer/profile`, {
      data: { currentPassword: creds.password, newPassword },
    })
    expect(res.status()).toBe(200)
    // Restore original password
    await request.patch(`${BASE}/api/organizer/profile`, {
      data: { currentPassword: newPassword, newPassword: creds.password },
    })
  })

  test('returns 400 when current password is wrong', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/organizer/profile`, {
      data: { currentPassword: 'WrongPassword!', newPassword: 'SomethingNew1' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/incorrect/i)
  })

  test('returns 400 when new password is too short', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/organizer/profile`, {
      data: { currentPassword: creds.password, newPassword: 'short' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.patch(`${BASE}/api/organizer/profile`, {
      data: { name: 'Hacker' },
    })
    expect(res.status()).toBe(401)
  })
})

// ─── Event Update (PATCH) ─────────────────────────────────────────────────────

test.describe('Event Update (PATCH)', () => {
  const creds = { email: '', password: '' }
  let eventId: number

  test.beforeAll(async ({ request }) => {
    const result = await registerOrganizer(request)
    creds.email = result.email
    creds.password = result.password
    await request.post(`${BASE}/api/auth/login`, { data: creds })
    const event = await createEvent(request, 'Original Name')
    eventId = event.id
  })

  test.beforeEach(async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: creds })
  })

  test('PATCH /api/events/[id] updates event name', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/events/${eventId}`, {
      data: { name: 'Renamed Event' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Renamed Event')
  })

  test('returns 400 when name is empty', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/events/${eventId}`, {
      data: { name: '' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 404 for non-existent event', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/events/999999999`, {
      data: { name: 'Ghost' },
    })
    expect(res.status()).toBe(404)
  })

  test('returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.patch(`${BASE}/api/events/${eventId}`, {
      data: { name: 'Unauthorized' },
    })
    expect(res.status()).toBe(401)
  })
})
