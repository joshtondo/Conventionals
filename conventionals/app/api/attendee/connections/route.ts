import { NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { createConnection, createConnectionRequest } from '@/data/connections'

export const POST = withAttendeeAuth(async (req, ctx) => {
  let body: { connectedName?: unknown; contactInfo?: unknown; eventId?: unknown; toAccountId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (typeof body.connectedName !== 'string' || !body.connectedName.trim()) {
    return NextResponse.json({ error: 'connectedName is required' }, { status: 400 })
  }

  const myId = ctx.session.attendeeAccountId!
  const eventId = typeof body.eventId === 'number' ? body.eventId : null
  const toAccountId = typeof body.toAccountId === 'number' && body.toAccountId !== myId
    ? body.toAccountId
    : null

  const fields = {
    connectedName: body.connectedName.trim(),
    contactInfo: typeof body.contactInfo === 'object' && body.contactInfo !== null
      ? body.contactInfo as { linkedin?: string; twitter?: string; website?: string }
      : null,
    eventId,
    // Store the linked account so we can always resolve their current email
    connectedAccountId: toAccountId,
  }

  const result = await createConnection(myId, fields)
  if ('duplicate' in result) return NextResponse.json({ error: 'Already connected' }, { status: 409 })

  // Send a connection request to the other person
  if (toAccountId !== null) {
    await createConnectionRequest(myId, toAccountId, eventId)
  }

  return NextResponse.json({ id: result.id }, { status: 201 })
})
