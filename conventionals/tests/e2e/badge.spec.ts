/**
 * E2E tests: Public Badge Page (Story 4.1)
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

function uniqueEmail(prefix = 'badge') {
  return `test_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@playwright.invalid`
}

test.describe('Story 4.1 — Public Badge Page', () => {
  let badgeToken: string
  const orgEmail = uniqueEmail('orgbadge')
  const orgPassword = 'BadgeE2E123'

  test.beforeAll(async ({ request }) => {
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'Badge Org', email: orgEmail, password: orgPassword },
    })
    await request.post(`${BASE}/api/auth/login`, { data: { email: orgEmail, password: orgPassword } })

    const eventRes = await request.post(`${BASE}/api/events`, { data: { name: 'Badge Test Event' } })
    const event = await eventRes.json()

    const attRes = await request.post(`${BASE}/api/events/${event.id}/attendees`, {
      data: { name: 'Public Badge Person', email: uniqueEmail('pbp') },
    })
    const att = await attRes.json()
    badgeToken = att.badge.token
  })

  test('badge page loads without authentication', async ({ page }) => {
    // Navigate to badge page without any login
    await page.goto(`/badge/${badgeToken}`)
    await expect(page).toHaveURL(`/badge/${badgeToken}`)
    await expect(page.getByText('Public Badge Person')).toBeVisible({ timeout: 8000 })
  })

  test('badge page shows attendee name and event name', async ({ page }) => {
    await page.goto(`/badge/${badgeToken}`)
    await expect(page.getByText('Public Badge Person')).toBeVisible()
    await expect(page.getByText('Badge Test Event')).toBeVisible()
  })

  test('invalid badge token shows not-found state', async ({ page }) => {
    await page.goto('/badge/totally-fake-token-does-not-exist')
    // Should show some kind of not found state (not crash)
    await expect(page.locator('body')).not.toBeEmpty()
    // Page shouldn't show a valid attendee name
    await expect(page.getByText('Public Badge Person')).not.toBeVisible()
  })
})
