import { NextRequest, NextResponse } from 'next/server'
import { createPasswordResetToken } from '@/data/passwordReset'
import { sendPasswordResetEmail } from '@/lib/email'
import { getOrganizerById } from '@/data/auth'
import { db } from '@/lib/db'
import { organizers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  let body: { email?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  if (typeof body.email !== 'string' || !body.email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  const email = body.email.trim().toLowerCase()

  // Always return 200 to prevent user enumeration
  const token = await createPasswordResetToken('organizer', email)
  if (token) {
    const [org] = await db.select({ name: organizers.name }).from(organizers).where(eq(organizers.email, email))
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
    await sendPasswordResetEmail({ to: email, name: org?.name ?? 'there', resetUrl, userType: 'organizer' })
  }

  return NextResponse.json({ success: true })
}
