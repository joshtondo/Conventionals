import { APIRequestContext } from '@playwright/test'

const BASE = 'http://localhost:3000'

export function uniqueEmail(prefix = 'org') {
  return `test_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@playwright.invalid`
}

/** Register an organizer and return a request context that has the session cookie. */
export async function registerOrganizer(request: APIRequestContext, email?: string, password = 'TestPass123') {
  const orgEmail = email ?? uniqueEmail('org')
  const res = await request.post(`${BASE}/api/auth/register`, {
    data: { name: 'Test Organizer', email: orgEmail, password },
  })
  if (!res.ok()) throw new Error(`Register failed: ${res.status()} ${await res.text()}`)
  return { email: orgEmail, password }
}

/** Login an organizer and return the session cookie string. */
export async function loginOrganizer(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
  })
  if (!res.ok()) throw new Error(`Login failed: ${res.status()} ${await res.text()}`)
}

export async function createEvent(request: APIRequestContext, name = 'Test Event') {
  const res = await request.post(`${BASE}/api/events`, {
    data: { name, date: '2026-12-01' },
  })
  if (!res.ok()) throw new Error(`Create event failed: ${res.status()} ${await res.text()}`)
  return (await res.json()) as { id: number; name: string }
}

export async function addAttendee(request: APIRequestContext, eventId: number, name = 'Alice Test', email?: string) {
  const attendeeEmail = email ?? uniqueEmail('att')
  const res = await request.post(`${BASE}/api/events/${eventId}/attendees`, {
    data: { name, email: attendeeEmail },
  })
  if (!res.ok()) throw new Error(`Add attendee failed: ${res.status()} ${await res.text()}`)
  const body = await res.json()
  return { ...body, email: attendeeEmail } as { attendee: { id: number; inviteToken: string }; badge: { token: string }; email: string }
}
