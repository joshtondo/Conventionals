import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { loginAttendee } from '@/data/attendees'

export async function POST(req: NextRequest) {
  let body: { email?: unknown; password?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { email, password } = body
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  }
  if (password.length > 1024) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  }

  try {
    const account = await loginAttendee(email, password)
    if (!account) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.organizerId = undefined
    session.attendeeAccountId = account.id
    await session.save()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Attendee login error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
