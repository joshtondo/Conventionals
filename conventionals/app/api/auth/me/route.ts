import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'

export const GET = withAuth(async (_req: NextRequest, { session }) => {
  return NextResponse.json({ organizerId: session.organizerId })
})
