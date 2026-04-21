import { NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { respondToRequest } from '@/data/connections'

// POST /api/attendee/connections/requests/[id] — accept or decline a request
export const POST = withAttendeeAuth(async (req, ctx) => {
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  let body: { accept?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (typeof body.accept !== 'boolean') {
    return NextResponse.json({ error: 'accept (boolean) is required' }, { status: 400 })
  }

  const result = await respondToRequest(id, ctx.session.attendeeAccountId!, body.accept)
  if (!result) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  return NextResponse.json(result)
})
