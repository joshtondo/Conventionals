import { NextRequest, NextResponse } from 'next/server'
import { checkinBadge } from '@/data/badges'
import { createNotification } from '@/data/notifications'

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const result = await checkinBadge(token)
  if (result === null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // Fire notification for new check-ins (not duplicates)
  if (result.checkedIn && result.organizerId) {
    createNotification(
      result.organizerId,
      'checkin',
      `${result.name} checked in`,
      `at ${result.eventName}`,
    ).catch(() => {}) // non-blocking
  }
  return NextResponse.json(result)
}
