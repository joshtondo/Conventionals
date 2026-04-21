/**
 * E2E tests: Full Organizer Flow — Register, Login, Events, Upload (Stories 1.4–3.5)
 */
import { test, expect } from '@playwright/test'

function uniqueEmail(prefix = 'e2e') {
  return `test_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@playwright.invalid`
}

test.describe('Story 1.7 — Marketing Landing Page', () => {
  test('renders the landing page at root /', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

test.describe('Story 1.6 — Organizer Registration UI', () => {
  test('can register via the /register page', async ({ page }) => {
    const email = uniqueEmail('reg')
    await page.goto('/register')
    await page.fill('#name', 'E2E Organizer')
    await page.fill('#email', email)
    await page.fill('#password', 'E2EPass123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  })

  test('shows error for duplicate email', async ({ page }) => {
    const email = uniqueEmail('dup2')
    // Register first time
    await page.goto('/register')
    await page.fill('#name', 'First Org')
    await page.fill('#email', email)
    await page.fill('#password', 'E2EPass123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    // Try to register again via API — page redirects to dashboard when logged in
    const res = await page.request.post('/api/auth/register', {
      data: { name: 'Dupe', email, password: 'E2EPass123' },
    })
    expect(res.status()).toBe(409)
  })
})

test.describe('Stories 1.4/1.5 — Organizer Login & Logout UI', () => {
  const email = uniqueEmail('login')
  const password = 'LoginE2E1'

  test.beforeAll(async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/register', {
      data: { name: 'Login E2E', email, password },
    })
  })

  test('can log in and see the dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
    // Dashboard shows event form and "Your Events" label
    await expect(page.locator('#event-name')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', 'wrong-password')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL('/login')
  })

  test('dashboard redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login', { timeout: 5000 })
  })

  test('can log out and gets redirected to /login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    // Open hamburger drawer, then click "Sign Out"
    await page.click('button[aria-label="Open navigation menu"]')
    await page.click('button:has-text("Sign Out")')
    await expect(page).toHaveURL('/login', { timeout: 10000 })
  })
})

test.describe('Stories 2.1/2.2/2.3 — Event Management UI', () => {
  const email = uniqueEmail('events')
  const password = 'EventsE2E1'

  test.beforeAll(async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/register', {
      data: { name: 'Events E2E', email, password },
    })
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  })

  test('Story 2.2 — can create a new event from the dashboard', async ({ page }) => {
    const eventName = `E2E Event ${Date.now()}`
    // Dashboard form uses id="event-name"
    await page.fill('#event-name', eventName)
    await page.click('button:has-text("Create Event")')
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 8000 })
  })

  test('Story 2.3 — can delete an event', async ({ page }) => {
    // Create an event first via API for speed
    const res = await page.request.post('/api/events', {
      data: { name: `Delete Me ${Date.now()}` },
    })
    const event = await res.json()
    await page.reload()
    await expect(page.getByText(event.name)).toBeVisible({ timeout: 5000 })

    // Each event card has a "Delete" button next to it
    // Accept the confirm dialog that handleDelete triggers
    page.on('dialog', d => d.accept())
    const deleteBtn = page.locator(`p:text("${event.name}")`).locator('..').locator('..').getByRole('button', { name: 'Delete' })
    await deleteBtn.click()

    await expect(page.getByText(event.name)).not.toBeVisible({ timeout: 8000 })
  })
})

test.describe('Story 3.1/3.2 — Upload Page & Manual Attendee Add', () => {
  const email = uniqueEmail('upload')
  const password = 'UploadE2E1'
  let eventId: number

  test.beforeAll(async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/register', {
      data: { name: 'Upload E2E', email, password },
    })
    await request.post('http://localhost:3000/api/auth/login', { data: { email, password } })
    const res = await request.post('http://localhost:3000/api/events', {
      data: { name: 'Upload Test Event' },
    })
    const ev = await res.json()
    eventId = ev.id
  })

  test('upload page is accessible from event list', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    await page.goto(`/event/${eventId}/upload`)
    await expect(page).toHaveURL(`/event/${eventId}/upload`)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('can manually add an attendee', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    await page.goto(`/event/${eventId}/upload`)
    await expect(page).toHaveURL(`/event/${eventId}/upload`)

    const attEmail = uniqueEmail('manual')
    // UploadForm uses id="attendee-name" and id="attendee-email"
    await page.fill('#attendee-name', 'Manual Attendee')
    await page.fill('#attendee-email', attEmail)
    await page.click('button:has-text("Add Attendee")')
    // After router.refresh() the table should show the new attendee
    await expect(page.getByText('Manual Attendee')).toBeVisible({ timeout: 10000 })
  })
})
