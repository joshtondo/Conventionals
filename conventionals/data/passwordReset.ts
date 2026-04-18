import 'server-only'
import { db } from '@/lib/db'
import { passwordResetTokens, organizers, attendeeAccounts } from '@/drizzle/schema'
import { eq, and, gt, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function createPasswordResetToken(userType: 'organizer' | 'attendee', email: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase()

  // Verify the email exists for the given user type
  if (userType === 'organizer') {
    const [org] = await db.select({ id: organizers.id }).from(organizers).where(eq(organizers.email, normalizedEmail))
    if (!org) return null
  } else {
    const [acc] = await db.select({ id: attendeeAccounts.id }).from(attendeeAccounts).where(eq(attendeeAccounts.email, normalizedEmail))
    if (!acc) return null
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  await db.insert(passwordResetTokens).values({ userType, email: normalizedEmail, token, expiresAt })

  return token
}

export async function validatePasswordResetToken(token: string): Promise<{ email: string; userType: 'organizer' | 'attendee' } | null> {
  const now = new Date().toISOString()
  const [row] = await db
    .select({ email: passwordResetTokens.email, userType: passwordResetTokens.userType })
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.token, token),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, now),
    ))
  return row ?? null
}

export async function consumePasswordResetToken(token: string, newPassword: string): Promise<boolean> {
  const record = await validatePasswordResetToken(token)
  if (!record) return false

  const hash = await bcrypt.hash(newPassword, 10)

  if (record.userType === 'organizer') {
    await db.update(organizers).set({ passwordHash: hash }).where(eq(organizers.email, record.email))
  } else {
    await db.update(attendeeAccounts).set({ passwordHash: hash }).where(eq(attendeeAccounts.email, record.email))
  }

  await db.update(passwordResetTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(passwordResetTokens.token, token))

  return true
}
