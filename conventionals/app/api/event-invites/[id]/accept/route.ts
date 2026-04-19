import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { acceptInvite, getInviteWithEventAndInviter } from '@/data/eventOrganizers'
import { createNotification } from '@/data/notifications'
import { db } from '@/lib/db'
import { organizers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const POST = withAuth(async (_req, { params, session }) => {
  const { id } = await params
  const inviteId = parseInt(id, 10)
  if (isNaN(inviteId)) return NextResponse.json({ error: 'Invalid invite ID' }, { status: 400 })

  // Get invite details before accepting so we can notify the original organizer
  const detail = await getInviteWithEventAndInviter(inviteId)
  if (!detail) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  const invite = await acceptInvite(inviteId, session.organizerId!)
  if (!invite) return NextResponse.json({ error: 'Invite not found or already actioned' }, { status: 404 })

  // Get accepting organizer's name
  const [acceptor] = await db.select({ name: organizers.name }).from(organizers).where(eq(organizers.id, session.organizerId!))

  // Notify the original organizer
  createNotification(
    detail.invitedById,
    'checkin',
    `${acceptor?.name ?? 'Someone'} accepted your co-organizer invitation`,
    `for "${detail.eventName}"`,
  ).catch(() => {})

  return NextResponse.json({ success: true })
})
