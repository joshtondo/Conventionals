import { NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { getPendingRequests, createConnectionRequest } from '@/data/connections'

// GET /api/attendee/connections/requests — list pending incoming requests
export const GET = withAttendeeAuth(async (_req, ctx) => {
  const requests = await getPendingRequests(ctx.session.attendeeAccountId!)
  return NextResponse.json(requests)
})

// POST /api/attendee/connections/requests — send a connection request
export const POST = withAttendeeAuth(async (req, ctx) => {
  let body: { toAccountId?: unknown; eventId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (typeof body.toAccountId !== 'number') {
    return NextResponse.json({ error: 'toAccountId is required' }, { status: 400 })
  }

  const fromAccountId = ctx.session.attendeeAccountId!
  if (body.toAccountId === fromAccountId) {
    return NextResponse.json({ error: 'Cannot request yourself' }, { status: 400 })
  }

  const result = await createConnectionRequest(
    fromAccountId,
    body.toAccountId,
    typeof body.eventId === 'number' ? body.eventId : null
  )

  if ('duplicate' in result) return NextResponse.json({ error: 'Request already sent' }, { status: 409 })
  return NextResponse.json({ id: result.id }, { status: 201 })
})
