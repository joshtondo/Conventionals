/**
 * API tests: Co-organizer invite flow
 * - POST /api/events/[id]/invite
 * - GET /api/event-invites
 * - POST /api/event-invites/[id]/accept
 * - POST /api/event-invites/[id]/decline
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, registerOrganizer, createEvent } from '../helpers/setup'

const BASE = 'http://localhost:3000'

test.describe('Co-organizer Invite Flow', () => {
  // Owner organizer
  const ownerCreds = { email: '', password: '' }
  let eventId: number

  // Invitee organizer (has an account)
  const inviteeCreds = { email: '', password: '' }

  test.beforeAll(async ({ request }) => {
    // Register owner
    const owner = await registerOrganizer(request)
    ownerCreds.email = owner.email
    ownerCreds.password = owner.password
    await request.post(`${BASE}/api/auth/login`, { data: ownerCreds })
    const event = await createEvent(request, 'Shared Event')
    eventId = event.id

    // Register invitee
    const invitee = await registerOrganizer(request)
    inviteeCreds.email = invitee.email
    inviteeCreds.password = invitee.password
  })

  // ── Invite sending ──────────────────────────────────────────────────────────

  test('owner can invite organizer by email — returns 200 with hasAccount', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: ownerCreds })
    const res = await request.post(`${BASE}/api/events/${eventId}/invite`, {
      data: { email: inviteeCreds.email },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(typeof body.hasAccount).toBe('boolean')
  })

  test('duplicate invite returns 409', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: ownerCreds })
    // First invite (may have already been sent in test above — send to a fresh email first)
    const freshEmail = uniqueEmail('dup-invite')
    await request.post(`${BASE}/api/events/${eventId}/invite`, { data: { email: freshEmail } })
    const res = await request.post(`${BASE}/api/events/${eventId}/invite`, { data: { email: freshEmail } })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already been invited/i)
  })

  test('returns 400 when inviting yourself', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: ownerCreds })
    const res = await request.post(`${BASE}/api/events/${eventId}/invite`, {
      data: { email: ownerCreds.email },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/yourself/i)
  })

  test('returns 400 when email is missing', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: ownerCreds })
    const res = await request.post(`${BASE}/api/events/${eventId}/invite`, { data: {} })
    expect(res.status()).toBe(400)
  })

  test('returns 404 for non-existent event', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: ownerCreds })
    const res = await request.post(`${BASE}/api/events/999999999/invite`, {
      data: { email: uniqueEmail() },
    })
    expect(res.status()).toBe(404)
  })

  test('returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.post(`${BASE}/api/events/${eventId}/invite`, {
      data: { email: uniqueEmail() },
    })
    expect(res.status()).toBe(401)
  })

  // ── Invite listing ──────────────────────────────────────────────────────────

  test('invitee can list pending invites', async ({ request }) => {
    // Make sure there's an invite for the invitee (sent in first test above)
    await request.post(`${BASE}/api/auth/login`, { data: inviteeCreds })
    const res = await request.get(`${BASE}/api/event-invites`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    // Should have at least the invite sent above
    expect(body.length).toBeGreaterThanOrEqual(1)
    expect(body[0]).toHaveProperty('id')
    expect(body[0]).toHaveProperty('status')
  })

  test('GET /api/event-invites returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.get(`${BASE}/api/event-invites`)
    expect(res.status()).toBe(401)
  })

  // ── Accept / Decline ────────────────────────────────────────────────────────

  test('invitee can accept invite', async ({ request }) => {
    // Send a fresh invite from a new event so we have a clean pending one
    const ownerB = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: ownerB })
    const eventB = await createEvent(request, 'Accept Test Event')

    await request.post(`${BASE}/api/events/${eventB.id}/invite`, {
      data: { email: inviteeCreds.email },
    })

    // List invites as invitee to get id
    await request.post(`${BASE}/api/auth/login`, { data: inviteeCreds })
    const listRes = await request.get(`${BASE}/api/event-invites`)
    const invites = await listRes.json()
    const pending = invites.filter((i: { status: string; eventId: number }) => i.status === 'pending' && i.eventId === eventB.id)
    expect(pending.length).toBeGreaterThanOrEqual(1)
    const inviteId = pending[0].id

    const res = await request.post(`${BASE}/api/event-invites/${inviteId}/accept`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('invitee can decline invite', async ({ request }) => {
    // Send a fresh invite
    const ownerC = await registerOrganizer(request)
    await request.post(`${BASE}/api/auth/login`, { data: ownerC })
    const eventC = await createEvent(request, 'Decline Test Event')

    await request.post(`${BASE}/api/events/${eventC.id}/invite`, {
      data: { email: inviteeCreds.email },
    })

    // List and decline
    await request.post(`${BASE}/api/auth/login`, { data: inviteeCreds })
    const listRes = await request.get(`${BASE}/api/event-invites`)
    const invites = await listRes.json()
    const pending = invites.filter((i: { status: string; eventId: number }) => i.status === 'pending' && i.eventId === eventC.id)
    expect(pending.length).toBeGreaterThanOrEqual(1)
    const inviteId = pending[0].id

    const res = await request.post(`${BASE}/api/event-invites/${inviteId}/decline`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('accept non-existent invite returns 404', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: inviteeCreds })
    const res = await request.post(`${BASE}/api/event-invites/999999999/accept`)
    expect(res.status()).toBe(404)
  })

  test('decline non-existent invite returns 404', async ({ request }) => {
    await request.post(`${BASE}/api/auth/login`, { data: inviteeCreds })
    const res = await request.post(`${BASE}/api/event-invites/999999999/decline`)
    expect(res.status()).toBe(404)
  })

  test('accept returns 401 without session', async ({ request }) => {
    await request.post(`${BASE}/api/auth/logout`)
    const res = await request.post(`${BASE}/api/event-invites/1/accept`)
    expect(res.status()).toBe(401)
  })
})
