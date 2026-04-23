import 'server-only'
import { db } from '@/lib/db'
import { attendeeAccounts, attendees, events, organizers } from '@/drizzle/schema'
import { eq, isNull, and, desc, ne } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

// Timing-safe dummy hash — prevents user enumeration via response time
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export async function getAttendeeByInviteToken(token: string) {
  const [row] = await db
    .select({ id: attendees.id, name: attendees.name, email: attendees.email })
    .from(attendees)
    .where(and(eq(attendees.inviteToken, token), isNull(attendees.inviteUsedAt)))
  return row ?? null
}

export async function createAttendeeAccount(email: string, name: string, passwordHash: string) {
  const [account] = await db
    .insert(attendeeAccounts)
    .values({ email, name, passwordHash })
    .returning({ id: attendeeAccounts.id })
  return account
}

export async function loginAttendee(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [account] = await db
    .select({ id: attendeeAccounts.id, email: attendeeAccounts.email, passwordHash: attendeeAccounts.passwordHash })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.email, normalizedEmail))
  const hashToCompare = account?.passwordHash ?? DUMMY_HASH
  const isValid = await bcrypt.compare(password, hashToCompare)
  if (!account || !isValid) return null
  return { id: account.id, email: account.email }
}

export async function getAttendeeAccount(attendeeAccountId: number) {
  const [account] = await db
    .select({
      id: attendeeAccounts.id,
      email: attendeeAccounts.email,
      name: attendeeAccounts.name,
      company: attendeeAccounts.company,
      jobTitle: attendeeAccounts.jobTitle,
      bio: attendeeAccounts.bio,
      socialLinks: attendeeAccounts.socialLinks,
      isPublic: attendeeAccounts.isPublic,
    })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.id, attendeeAccountId))
  return account ?? null
}

type ProfileUpdateFields = {
  name?: string
  company?: string | null
  jobTitle?: string | null
  bio?: string | null
  socialLinks?: { linkedin?: string; twitter?: string; website?: string } | null
  isPublic?: boolean
}

export async function updateProfile(attendeeAccountId: number, fields: ProfileUpdateFields) {
  const update: Partial<typeof attendeeAccounts.$inferInsert> = {}
  if (fields.name !== undefined) update.name = fields.name.trim()
  if (fields.company !== undefined) update.company = fields.company ? fields.company.trim() || null : null
  if (fields.jobTitle !== undefined) update.jobTitle = fields.jobTitle ? fields.jobTitle.trim() || null : null
  if (fields.bio !== undefined) update.bio = fields.bio ? fields.bio.trim() || null : null
  if (fields.socialLinks !== undefined) update.socialLinks = fields.socialLinks
  if (fields.isPublic !== undefined) update.isPublic = fields.isPublic
  await db.update(attendeeAccounts).set(update).where(eq(attendeeAccounts.id, attendeeAccountId))
}

export async function getEventHistory(attendeeAccountId: number) {
  const [account] = await db
    .select({ email: attendeeAccounts.email })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.id, attendeeAccountId))
  if (!account) return []

  return db
    .select({
      eventId: events.id,
      eventName: events.name,
      eventDate: events.eventDate,
      organizerName: organizers.name,
    })
    .from(attendees)
    .innerJoin(events, eq(attendees.eventId, events.id))
    .innerJoin(organizers, eq(events.organizerId, organizers.id))
    .where(eq(attendees.email, account.email))
    .orderBy(desc(events.eventDate))
}

export async function getPublicAttendeesForEvent(eventId: number, myAttendeeAccountId: number) {
  const [myAccount] = await db
    .select({ email: attendeeAccounts.email })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.id, myAttendeeAccountId))
  if (!myAccount) return null

  const [myRow] = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(and(eq(attendees.eventId, eventId), eq(attendees.email, myAccount.email)))
  if (!myRow) return null

  return db
    .select({
      id: attendeeAccounts.id,
      name: attendeeAccounts.name,
      company: attendeeAccounts.company,
      jobTitle: attendeeAccounts.jobTitle,
      bio: attendeeAccounts.bio,
      socialLinks: attendeeAccounts.socialLinks,
    })
    .from(attendees)
    .innerJoin(attendeeAccounts, eq(attendees.email, attendeeAccounts.email))
    .where(and(
      eq(attendees.eventId, eventId),
      eq(attendeeAccounts.isPublic, true),
      ne(attendeeAccounts.id, myAttendeeAccountId)
    ))
}

export async function getEventDetailsForAttendee(eventId: number, attendeeAccountId: number) {
  const [account] = await db
    .select({ email: attendeeAccounts.email })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.id, attendeeAccountId))
  if (!account) return null

  const [myRow] = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(and(eq(attendees.eventId, eventId), eq(attendees.email, account.email)))
  if (!myRow) return null

  const [event] = await db
    .select({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
      description: events.description,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      website: events.website,
      organizerName: organizers.name,
    })
    .from(events)
    .innerJoin(organizers, eq(events.organizerId, organizers.id))
    .where(eq(events.id, eventId))
  return event ?? null
}

export async function markInviteUsed(attendeeId: number) {
  await db
    .update(attendees)
    .set({ inviteUsedAt: new Date().toISOString() })
    .where(eq(attendees.id, attendeeId))
}
