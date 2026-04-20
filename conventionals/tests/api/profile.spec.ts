/**
 * API tests: Attendee Profile Editing & Visibility Toggle (Stories 5.4, 5.5)
 */
import { test, expect } from '@playwright/test'
import { registerOrganizer, createEvent, addAttendee } from '../helpers/setup'

const BASE = 'http://localhost:3000'

async function setupAttendeeSession(request: import('@playwright/test').APIRequestContext) {
  const password = 'ProfilePass1'
  const creds = await registerOrganizer(request)
  await request.post(`${BASE}/api/auth/login`, { data: creds })
  const event = await createEvent(request, 'Profile Event')
  const result = await addAttendee(request, event.id, 'Profile Person')
  const email = result.email

  await request.post(`${BASE}/api/auth/logout`)
  await request.post(`${BASE}/api/attendee/auth/signup`, {
    data: { token: result.attendee.inviteToken, password },
  })
  return { email, password }
}

test.describe('Story 5.4 — Profile Editing', () => {
  test.beforeEach(async ({ request }) => {
    await setupAttendeeSession(request)
  })

  test('PATCH /api/attendee/profile updates name and bio', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/attendee/profile`, {
      data: { name: 'Updated Name', bio: 'I write tests' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('updates company, jobTitle, and socialLinks', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/attendee/profile`, {
      data: {
        company: 'ACME Corp',
        jobTitle: 'QA Engineer',
        socialLinks: { linkedin: 'https://linkedin.com/in/test', twitter: '@test' },
      },
    })
    expect(res.status()).toBe(200)
  })

  test('returns 400 when name is set to empty string', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/attendee/profile`, {
      data: { name: '   ' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Name')
  })

  test('returns 401 without attendee session', async ({ request }) => {
    await request.post(`${BASE}/api/attendee/auth/logout`)
    const res = await request.patch(`${BASE}/api/attendee/profile`, {
      data: { name: 'No Auth' },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('Story 5.5 — Profile Visibility Toggle', () => {
  test.beforeEach(async ({ request }) => {
    await setupAttendeeSession(request)
  })

  test('can set profile to private (isPublic: false)', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/attendee/profile`, {
      data: { isPublic: false },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  test('can toggle back to public (isPublic: true)', async ({ request }) => {
    await request.patch(`${BASE}/api/attendee/profile`, { data: { isPublic: false } })
    const res = await request.patch(`${BASE}/api/attendee/profile`, {
      data: { isPublic: true },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})
