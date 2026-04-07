import { NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { createConnection } from '@/data/connections'

export const POST = withAttendeeAuth(async (req, ctx) => {
  let body: { connectedName?: unknown; contactInfo?: unknown; eventId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (typeof body.connectedName !== 'string' || !body.connectedName.trim()) {
    return NextResponse.json({ error: 'connectedName is required' }, { status: 400 })
  }

  const fields = {
    connectedName: body.connectedName.trim(),
    contactInfo: typeof body.contactInfo === 'object' && body.contactInfo !== null
      ? body.contactInfo as { linkedin?: string; twitter?: string; website?: string }
      : null,
    eventId: typeof body.eventId === 'number' ? body.eventId : null,
  }

  const result = await createConnection(ctx.session.attendeeAccountId!, fields)
  if ('duplicate' in result) return NextResponse.json({ error: 'Already connected' }, { status: 409 })
  return NextResponse.json({ id: result.id }, { status: 201 })
})
