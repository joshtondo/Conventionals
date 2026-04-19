import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { getInvitesForOrganizer } from '@/data/eventOrganizers'

export const GET = withAuth(async (_req, { session }) => {
  const invites = await getInvitesForOrganizer(session.organizerId!)
  return NextResponse.json(invites)
})
