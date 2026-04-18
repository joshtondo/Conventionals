import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { getUnreadNotifications } from '@/data/notifications'

export const GET = withAuth(async (_req, { session }) => {
  const items = await getUnreadNotifications(session.organizerId!)
  return NextResponse.json(items)
})
