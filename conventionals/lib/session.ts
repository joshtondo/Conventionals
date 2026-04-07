import 'server-only'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET environment variable must be set and at least 32 characters long')
}

const secret: string = process.env.SESSION_SECRET

export interface SessionData {
  organizerId?: number       // set on organizer login
  attendeeAccountId?: number // set on attendee login
}

export const sessionOptions = {
  password: secret,
  cookieName: 'conventionals-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 hours in seconds
  },
}

export function withAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>>; session: SessionData }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.organizerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, { ...ctx, session })
  }
}

export function withAttendeeAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>>; session: SessionData }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.attendeeAccountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, { ...ctx, session })
  }
}
