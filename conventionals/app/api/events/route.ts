import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { getEvents, createEvent } from '@/data/events'

export const GET = withAuth(async (_req, { session }) => {
  const eventList = await getEvents(session.organizerId!)
  return NextResponse.json(eventList)
})

export const POST = withAuth(async (req, { session }) => {
  let body: { name?: unknown; date?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { name, date } = body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
  }

  const normalizedDate = typeof date === 'string' && date.trim() ? date.trim() : null

  const newEvent = await createEvent(session.organizerId!, name.trim(), normalizedDate)
  return NextResponse.json(newEvent, { status: 201 })
})
