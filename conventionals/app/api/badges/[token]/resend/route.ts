import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { resendBadge } from '@/data/badges'

export const POST = withAuth(async (req, ctx) => {
  const { token } = await ctx.params
  const result = await resendBadge(token, ctx.session.organizerId!)
  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
})
