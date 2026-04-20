import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { createOrganizer } from '@/data/auth'
import { linkPendingInvitesByEmail } from '@/data/eventOrganizers'
import { createNotification } from '@/data/notifications'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  let body: { name?: unknown; email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, email, password } = body

  if (!name || typeof name !== 'string' || !name.trim() ||
      !email || typeof email !== 'string' || !email.trim() ||
      !password || typeof password !== 'string' || !password.trim()) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
  }

  if (password.length < 8 || password.length > 1024) {
    return NextResponse.json({ error: 'Password must be between 8 and 1024 characters' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const trimmedName = name.trim()

  // Always hash before DB insert — equalizes timing for existing vs new email (prevents enumeration)
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const organizer = await createOrganizer(trimmedName, normalizedEmail, passwordHash)
    // Link any pending co-organizer invites sent to this email
    linkPendingInvitesByEmail(normalizedEmail, organizer.id).catch(() => {})
    createNotification(organizer.id, 'profile_setup', 'Finish setting up your profile', 'Add your name and details so attendees know who you are.').catch(() => {})
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.attendeeAccountId = undefined // clear any active attendee session
    session.organizerId = organizer.id
    await session.save()
    return NextResponse.json({ success: true })
  } catch (err) {
    const pgCode = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code
    if (pgCode === '23505') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }
    console.error('Register error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
