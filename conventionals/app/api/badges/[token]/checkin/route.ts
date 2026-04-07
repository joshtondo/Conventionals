import { NextRequest, NextResponse } from 'next/server'
import { checkinBadge } from '@/data/badges'

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const result = await checkinBadge(token)
  if (result === null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(result)
}
