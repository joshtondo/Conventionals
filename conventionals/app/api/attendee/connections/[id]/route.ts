import { NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { updateConnectionNotes } from '@/data/connections'

export const PATCH = withAttendeeAuth(async (req, ctx) => {
  const { id } = await ctx.params
  const connectionId = parseInt(id)
  if (isNaN(connectionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  let body: { notes?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (body.notes !== null && body.notes !== undefined && typeof body.notes !== 'string') {
    return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 })
  }

  const notes = typeof body.notes === 'string' ? body.notes : null
  const result = await updateConnectionNotes(connectionId, ctx.session.attendeeAccountId!, notes)
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
})
