import { NextRequest, NextResponse } from 'next/server'
import { createPasswordResetToken } from '@/data/passwordReset'
import { sendPasswordResetEmail } from '@/lib/email'
import { db } from '@/lib/db'
import { attendeeAccounts } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  let body: { email?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  if (typeof body.email !== 'string' || !body.email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  const email = body.email.trim().toLowerCase()

  // Always return 200 to prevent user enumeration
  const token = await createPasswordResetToken('attendee', email)
  if (token) {
    const [acc] = await db.select({ name: attendeeAccounts.name }).from(attendeeAccounts).where(eq(attendeeAccounts.email, email))
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/attendee/reset-password?token=${token}`
    await sendPasswordResetEmail({ to: email, name: acc?.name ?? 'there', resetUrl, userType: 'attendee' })
  }

  return NextResponse.json({ success: true })
}
