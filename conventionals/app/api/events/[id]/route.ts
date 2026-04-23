import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { deleteEvent, updateEvent } from '@/data/events'

function toStringOrNull(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null
  return typeof val === 'string' ? val.trim() || null : null
}

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const updated = await updateEvent(eventId, ctx.session.organizerId!, {
    name: body.name.trim(),
    eventDate: toStringOrNull(body.eventDate),
    description: toStringOrNull(body.description),
    location: toStringOrNull(body.location),
    startTime: toStringOrNull(body.startTime),
    endTime: toStringOrNull(body.endTime),
    website: toStringOrNull(body.website),
  })
  if (!updated) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (_req, ctx) => {
  const { id } = await ctx.params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  const deleted = await deleteEvent(eventId, ctx.session.organizerId!)
  if (!deleted) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
})
