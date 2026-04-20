import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { dismissNotification } from '@/data/notifications'

export const POST = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params
  const notifId = parseInt(id)
  if (isNaN(notifId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  await dismissNotification(notifId, session.organizerId!)
  return NextResponse.json({ success: true })
})
