/**
 * API tests: Organizer Auth (Stories 1.4, 1.5, 1.6)
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail } from '../helpers/setup'

const BASE = 'http://localhost:3000'

test.describe('Story 1.6 — Organizer Registration', () => {
  test('registers a new organizer and returns success', async ({ request }) => {
    const email = uniqueEmail('reg')
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'New Organizer', email, password: 'SecurePass1' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 409 for duplicate email', async ({ request }) => {
    const email = uniqueEmail('dup')
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'First', email, password: 'SecurePass1' },
    })
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'Second', email, password: 'SecurePass1' },
    })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('already exists')
  })

  test('returns 400 when name is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { email: uniqueEmail(), password: 'SecurePass1' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 when password is too short', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'Test', email: uniqueEmail(), password: 'short' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('8')
  })
})

test.describe('Story 1.4 — Organizer Login', () => {
  const email = uniqueEmail('login')
  const password = 'LoginPass1'

  test.beforeAll(async ({ request }) => {
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'Login Tester', email, password },
    })
  })

  test('logs in with valid credentials and sets session', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email, password },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('returns 401 for invalid password', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email, password: 'WrongPass99' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid email or password')
  })

  test('returns 401 for unknown email (no user enumeration)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: uniqueEmail('ghost'), password: 'SomePass1' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    // Must not hint whether email or password was wrong — same generic message
    expect(body.error).toBe('Invalid email or password')
  })

  test('returns 400 when fields are missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('Story 1.5 — Organizer Logout & Protected Routes', () => {
  const email = uniqueEmail('auth')
  const password = 'AuthPass12'

  test.beforeAll(async ({ request }) => {
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'Auth Tester', email, password },
    })
  })

  test('GET /api/auth/me returns 401 without session', async ({ request }) => {
    // Use a fresh context with no cookies
    const res = await request.get(`${BASE}/api/auth/me`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/auth/me returns organizerId with valid session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: { email, password } })
    const res = await request.get(`${BASE}/api/auth/me`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body.organizerId).toBe('number')
  })

  test('POST /api/auth/logout destroys session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: { email, password } })
    const logoutRes = await request.post(`${BASE}/api/auth/logout`)
    expect(logoutRes.status()).toBe(200)
    // After logout, /me should be 401
    const meRes = await request.get(`${BASE}/api/auth/me`)
    expect(meRes.status()).toBe(401)
  })
})
