import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { db } from '@/lib/db'
import { attendees } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { sendAnnouncementEmail } from '@/lib/email'
import { createNotification } from '@/data/notifications'
import { getEventById } from '@/data/events'

export const POST = withAuth(async (req: NextRequest, { params, session }) => {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  let body: { subject?: unknown; message?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  if (typeof body.subject !== 'string' || !body.subject.trim()) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  }
  if (typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Verify organizer owns or co-organizes this event
  const eventRow = await getEventById(eventId, session.organizerId!)
  if (!eventRow) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  const event = { name: eventRow.name }

  // Fetch all attendees
  const rows = await db
    .select({ name: attendees.name, email: attendees.email })
    .from(attendees)
    .where(eq(attendees.eventId, eventId))

  if (rows.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Send emails concurrently (batch in groups of 10)
  let sent = 0
  const batchSize = 10
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(row => sendAnnouncementEmail({
        to: row.email,
        attendeeName: row.name,
        eventName: event.name,
        subject: body.subject as string,
        message: body.message as string,
      }))
    )
    sent += results.filter(r => r.status === 'fulfilled' && r.value).length
  }

  createNotification(
    session.organizerId!,
    'announcement',
    `Announcement sent to ${sent} attendee${sent !== 1 ? 's' : ''}`,
    `"${body.subject as string}" · ${event.name}`,
  ).catch(() => {})

  return NextResponse.json({ sent, total: rows.length })
})
