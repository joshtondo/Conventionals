import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { markAllNotificationsRead } from '@/data/notifications'

export const POST = withAuth(async (_req, { session }) => {
  await markAllNotificationsRead(session.organizerId!)
  return NextResponse.json({ success: true })
})
