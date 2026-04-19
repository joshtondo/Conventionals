import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { createAttendeeAccount } from '@/data/attendees'
import { db } from '@/lib/db'
import { attendeeAccounts } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  let body: { name?: unknown; email?: unknown; password?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { name, email, password } = body
  if (!name || typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!email || typeof email !== 'string' || !email.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 1024) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Check for existing account
  const [existing] = await db.select({ id: attendeeAccounts.id }).from(attendeeAccounts).where(eq(attendeeAccounts.email, normalizedEmail))
  if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const account = await createAttendeeAccount(normalizedEmail, name.trim(), passwordHash)
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.organizerId = undefined
    session.attendeeAccountId = account.id
    await session.save()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Attendee register error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
