import { NextRequest, NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { searchPublicAttendees } from '@/data/connections'

// GET /api/attendee/people/search?q=... — search public attendees from shared events
export const GET = withAttendeeAuth(async (req: NextRequest, ctx) => {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.trim().length < 2) return NextResponse.json([])
  const results = await searchPublicAttendees(q, ctx.session.attendeeAccountId!)
  return NextResponse.json(results)
})
