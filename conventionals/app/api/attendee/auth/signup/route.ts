import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAttendeeByInviteToken, createAttendeeAccount, markInviteUsed } from '@/data/attendees'

export async function POST(req: NextRequest) {
  let body: { token?: unknown; password?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { token, password } = body
  if (!token || typeof token !== 'string' || !password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
  }
  if (password.length > 1024) {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
  }

  const attendee = await getAttendeeByInviteToken(token)
  if (!attendee) {
    return NextResponse.json({ error: 'This invite link has already been used or is invalid' }, { status: 400 })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const account = await createAttendeeAccount(attendee.email, attendee.name, passwordHash)
    await markInviteUsed(attendee.id)

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.organizerId = undefined
    session.attendeeAccountId = account.id
    await session.save()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Signup error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
