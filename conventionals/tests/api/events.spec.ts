/**
 * API tests: Event Management (Stories 2.1, 2.2, 2.3)
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, registerOrganizer, createEvent } from '../helpers/setup'

const BASE = 'http://localhost:3000'

test.describe('Stories 2.1/2.2/2.3 — Event CRUD', () => {
  test.beforeEach(async ({ request }) => {
    const creds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: creds })
  })

  test('Story 2.2 — creates an event and returns 201 with event data', async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { name: 'My Conference', date: '2026-10-15' },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('My Conference')
    expect(typeof body.id).toBe('number')
  })

  test('Story 2.2 — returns 400 when name is missing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { date: '2026-10-15' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('name')
  })

  test('Story 2.1 — lists only the organizer\'s own events', async ({ request }) => {
    await request.post(`${BASE}/api/events`, { data: { name: 'Event A' } })
    await request.post(`${BASE}/api/events`, { data: { name: 'Event B' } })

    const res = await request.get(`${BASE}/api/events`)
    expect(res.status()).toBe(200)
    const events = await res.json()
    expect(Array.isArray(events)).toBe(true)
    const names = events.map((e: { name: string }) => e.name)
    expect(names).toContain('Event A')
    expect(names).toContain('Event B')
  })

  test('Story 2.1 — returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.get(`${BASE}/api/events`)
    expect(res.status()).toBe(401)
  })

  test('Story 2.3 — deletes an event successfully', async ({ request }) => {
    const event = await createEvent(request, 'To Delete')
    const res = await request.delete(`${BASE}/api/events/${event.id}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('Story 2.3 — returns 404 deleting non-existent event', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/events/999999999`)
    expect(res.status()).toBe(404)
  })

  test('Story 2.3 — returns 404 deleting another organizer\'s event (ownership check)', async ({ request }) => {
    // Create event as current organizer
    const event = await createEvent(request, 'Owned Event')

    // Log in as a different organizer
    const otherCreds = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: otherCreds })

    const res = await request.delete(`${BASE}/api/events/${event.id}`)
    expect(res.status()).toBe(404)
  })

  test('Story 2.3 — returns 400 for invalid event ID', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/events/not-a-number`)
    expect(res.status()).toBe(400)
  })
})
