import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { getEventById } from '@/data/events'
import { createEventInvite } from '@/data/eventOrganizers'
import { createNotification } from '@/data/notifications'
import { sendCoOrganizerInviteEmail } from '@/lib/email'
import { db } from '@/lib/db'
import { organizers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const POST = withAuth(async (req: NextRequest, { params, session }) => {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  let body: { email?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (typeof body.email !== 'string' || !body.email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  const invitedEmail = body.email.trim().toLowerCase()

  // Only event owner can invite
  const event = await getEventById(eventId, session.organizerId!)
  if (!event || !event.isOwner) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Don't invite yourself
  const [self] = await db.select({ email: organizers.email, name: organizers.name }).from(organizers).where(eq(organizers.id, session.organizerId!))
  if (self?.email === invitedEmail) return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })

  let invite, hasAccount
  try {
    ;({ invite, hasAccount } = await createEventInvite(eventId, invitedEmail, session.organizerId!))
  } catch (err) {
    const pgCode = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code
    if (pgCode === '23505') return NextResponse.json({ error: 'This person has already been invited' }, { status: 409 })
    throw err
  }

  const dashboardUrl = hasAccount
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shared`
    : `${process.env.NEXT_PUBLIC_APP_URL}/register`

  // Fire email (non-blocking)
  sendCoOrganizerInviteEmail({
    to: invitedEmail,
    invitedByName: self?.name ?? 'An organizer',
    eventName: event.name,
    dashboardUrl,
    isNewUser: !hasAccount,
  }).catch(() => {})

  // Notify the invited organizer if they have an account
  if (invite.organizerId) {
    createNotification(
      invite.organizerId,
      'registration',
      `You've been invited to co-organize "${event.name}"`,
      `Invited by ${self?.name ?? 'an organizer'}. Accept from Shared Events.`,
    ).catch(() => {})
  }

  return NextResponse.json({ success: true, hasAccount })
})
