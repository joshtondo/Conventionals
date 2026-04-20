import { NextRequest, NextResponse } from 'next/server'
import { getBadgeByToken } from '@/data/badges'

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const badge = await getBadgeByToken(token)
  if (!badge) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ name: badge.attendeeName, eventName: badge.eventName, token: badge.token })
}
