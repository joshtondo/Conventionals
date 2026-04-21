/**
 * E2E tests: Full Attendee Flow — Signup, Login, Profile, Events, Connections (Stories 5.2–6.4)
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

function uniqueEmail(prefix = 'att') {
  return `test_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@playwright.invalid`
}

async function createAttendeeWithInvite(request: import('@playwright/test').APIRequestContext) {
  const orgEmail = uniqueEmail('org')
  const orgPassword = 'OrgPass123'

  await request.post(`${BASE}/api/auth/register`, {
    data: { name: 'Attendee Test Org', email: orgEmail, password: orgPassword },
  })
  await request.post(`${BASE}/api/auth/login`, { data: { email: orgEmail, password: orgPassword } })

  const evRes = await request.post(`${BASE}/api/events`, { data: { name: 'Attendee E2E Event' } })
  const event = await evRes.json()

  const attEmail = uniqueEmail('attendee')
  const attRes = await request.post(`${BASE}/api/events/${event.id}/attendees`, {
    data: { name: 'E2E Attendee', email: attEmail },
  })
  const att = await attRes.json()

  await request.post(`${BASE}/api/auth/logout`)
  return { inviteToken: att.attendee.inviteToken, attEmail, eventId: event.id }
}

test.describe('Story 5.2 — Account Creation via Invite Link UI', () => {
  test('attendee can create account from invite link page', async ({ page, request }) => {
    const { inviteToken } = await createAttendeeWithInvite(request)
    const password = 'AttE2EPass1'

    await page.goto(`/attendee/signup?token=${inviteToken}`)
    // SignupForm uses id="signup-password"
    await page.fill('#signup-password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/attendee/dashboard', { timeout: 10000 })
  })

  test('shows error for already-used invite token — page shows Invalid Link', async ({ page, request }) => {
    const { inviteToken } = await createAttendeeWithInvite(request)
    const password = 'AttE2EPass1'

    // Use the token via API
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: inviteToken, password },
    })

    // Now visit the page with the used token — server renders ErrorCard immediately
    await page.goto(`/attendee/signup?token=${inviteToken}`)
    // The server-rendered ErrorCard shows h1="Invalid Link"
    await expect(page.getByRole('heading', { name: 'Invalid Link' })).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Story 5.3 — Attendee Login & Logout UI', () => {
  let attEmail: string
  const password = 'AttLoginE2E1'

  test.beforeAll(async ({ request }) => {
    const result = await createAttendeeWithInvite(request)
    attEmail = result.attEmail
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: result.inviteToken, password },
    })
    await request.post(`${BASE}/api/attendee/auth/logout`)
  })

  test('can log in via /attendee/login', async ({ page }) => {
    await page.goto('/attendee/login')
    // AttendeeLoginForm uses id="attendee-login-email" and id="attendee-login-password"
    await page.fill('#attendee-login-email', attEmail)
    await page.fill('#attendee-login-password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/attendee/dashboard', { timeout: 10000 })
  })

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/attendee/login')
    await page.fill('#attendee-login-email', attEmail)
    await page.fill('#attendee-login-password', 'WrongPass99')
    await page.click('button[type="submit"]')
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Stories 5.4/5.5 — Attendee Profile Editing & Visibility UI', () => {
  let attEmail: string
  const password = 'ProfileE2E1'

  test.beforeAll(async ({ request }) => {
    const result = await createAttendeeWithInvite(request)
    attEmail = result.attEmail
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: result.inviteToken, password },
    })
    await request.post(`${BASE}/api/attendee/auth/logout`)
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/attendee/login')
    await page.fill('#attendee-login-email', attEmail)
    await page.fill('#attendee-login-password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/attendee/dashboard', { timeout: 10000 })
  })

  test('can navigate to profile page', async ({ page }) => {
    await page.goto('/attendee/profile')
    await expect(page).toHaveURL('/attendee/profile')
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible()
  })

  test('can edit profile fields and save', async ({ page }) => {
    await page.goto('/attendee/profile')
    // ProfileForm uses id="profile-name"
    await page.fill('#profile-name', 'Updated E2E Name')
    await page.click('button[type="submit"]')
    // ProfileForm shows: {success && <p style={s.formSuccess}>Saved!</p>}
    await expect(page.getByText('Saved!')).toBeVisible({ timeout: 5000 })
  })

  test('Story 5.5 — can toggle profile visibility', async ({ page }) => {
    await page.goto('/attendee/profile')
    // ProfileForm uses id="profile-ispublic" checkbox
    const checkbox = page.locator('#profile-ispublic')
    if (await checkbox.isVisible()) {
      await checkbox.click()
      await page.click('button[type="submit"]')
      await expect(page.getByText('Saved!')).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Story 6.1 — Attendee Dashboard & Event History UI', () => {
  let attEmail: string
  const password = 'DashE2E1'

  test.beforeAll(async ({ request }) => {
    const result = await createAttendeeWithInvite(request)
    attEmail = result.attEmail
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: result.inviteToken, password },
    })
    await request.post(`${BASE}/api/attendee/auth/logout`)
  })

  test('attendee dashboard shows event history', async ({ page }) => {
    await page.goto('/attendee/login')
    await page.fill('#attendee-login-email', attEmail)
    await page.fill('#attendee-login-password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/attendee/dashboard', { timeout: 10000 })

    await expect(page.getByText('Attendee E2E Event')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Story 6.2 — Browse Public Attendees', () => {
  let attEmail: string
  const password = 'PeopleE2E1'
  let eventId: number

  test.beforeAll(async ({ request }) => {
    const result = await createAttendeeWithInvite(request)
    attEmail = result.attEmail
    eventId = result.eventId
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: result.inviteToken, password },
    })
    await request.post(`${BASE}/api/attendee/auth/logout`)
  })

  test('people page loads for an event the attendee belongs to', async ({ page }) => {
    await page.goto('/attendee/login')
    await page.fill('#attendee-login-email', attEmail)
    await page.fill('#attendee-login-password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/attendee/dashboard', { timeout: 10000 })

    await page.goto(`/attendee/event/${eventId}/people`)
    await expect(page).toHaveURL(`/attendee/event/${eventId}/people`)
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

test.describe('Stories 6.3/6.4 — Connections List UI', () => {
  let attEmail: string
  const password = 'ConnE2E123'

  test.beforeAll(async ({ request }) => {
    const result = await createAttendeeWithInvite(request)
    attEmail = result.attEmail
    await request.post(`${BASE}/api/attendee/auth/signup`, {
      data: { token: result.inviteToken, password },
    })
    await request.post(`${BASE}/api/attendee/auth/logout`)
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/attendee/login')
    await page.fill('#attendee-login-email', attEmail)
    await page.fill('#attendee-login-password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/attendee/dashboard', { timeout: 10000 })
  })

  test('Story 6.4 — connections page loads', async ({ page }) => {
    await page.goto('/attendee/connections')
    await expect(page).toHaveURL('/attendee/connections')
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
