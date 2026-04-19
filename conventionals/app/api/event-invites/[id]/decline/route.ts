import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { declineInvite } from '@/data/eventOrganizers'

export const POST = withAuth(async (_req, { params, session }) => {
  const { id } = await params
  const inviteId = parseInt(id, 10)
  if (isNaN(inviteId)) return NextResponse.json({ error: 'Invalid invite ID' }, { status: 400 })

  const invite = await declineInvite(inviteId, session.organizerId!)
  if (!invite) return NextResponse.json({ error: 'Invite not found or already actioned' }, { status: 404 })

  return NextResponse.json({ success: true })
})
