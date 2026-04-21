import 'server-only'
import { db } from '@/lib/db'
import { passwordResetTokens, organizers, attendeeAccounts } from '@/drizzle/schema'
import { eq, and, gt, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

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

  // Generate a cryptographically random token — store only its SHA-256 hash in the DB.
  // Even if the database is compromised, the raw token (sent to the user's email) cannot
  // be derived from the stored hash.
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  await db.insert(passwordResetTokens).values({ userType, email: normalizedEmail, token: tokenHash, expiresAt })

  return rawToken // return the raw token — only the user's email receives this
}

export async function consumePasswordResetToken(token: string, newPassword: string): Promise<boolean> {
  const tokenHash = hashToken(token)
  const now = new Date().toISOString()

  // Atomically claim the token in a single UPDATE. If two concurrent requests race,
  // only the first will receive a row back — the second gets null and returns false.
  const [claimed] = await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(
      eq(passwordResetTokens.token, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, now),
    ))
    .returning({ email: passwordResetTokens.email, userType: passwordResetTokens.userType })

  if (!claimed) return false

  const hash = await bcrypt.hash(newPassword, 10)

  if (claimed.userType === 'organizer') {
    await db.update(organizers).set({ passwordHash: hash }).where(eq(organizers.email, claimed.email))
  } else {
    await db.update(attendeeAccounts).set({ passwordHash: hash }).where(eq(attendeeAccounts.email, claimed.email))
  }

  return true
}
