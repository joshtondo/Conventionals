import 'server-only'
import { db } from '@/lib/db'
import { attendees, attendeeAccounts, badges, events } from '@/drizzle/schema'
import { eq, and, asc, desc, sql } from 'drizzle-orm'
import { getAppUrl } from '@/lib/app-url'
function qrImageUrl(badgeUrl: string) {
  const appUrl = getAppUrl()
  return `${appUrl}/api/qr?url=${encodeURIComponent(badgeUrl)}`
}
import { sendBadgeEmail } from '@/lib/email'

export async function createAttendeeAndBadge(
  organizerId: number,
  eventId: number,
  name: string,
  email: string,
  eventName: string
) {
  const appUrl = getAppUrl()
  const trimmedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()

  const [attendee] = await db
    .insert(attendees)
    .values({ eventId, name: trimmedName, email: normalizedEmail })
    .returning({ id: attendees.id, name: attendees.name, email: attendees.email, inviteToken: attendees.inviteToken, badgeType: attendees.badgeType })

  const [badge] = await db
    .insert(badges)
    .values({ attendeeId: attendee.id, token: crypto.randomUUID() })
    .returning({ id: badges.id, token: badges.token, emailSent: badges.emailSent })

  const badgeUrl = `${appUrl}/badge/${badge.token}`
  const qrDataUrl = qrImageUrl(badgeUrl)

  const inviteUrl = `${appUrl}/attendee/signup?token=${attendee.inviteToken}`
  const emailSent = await sendBadgeEmail({ to: attendee.email, name: attendee.name, badgeUrl, qrDataUrl, inviteUrl, eventName, badgeType: attendee.badgeType })

  if (emailSent) {
    await db.update(badges).set({ emailSent: true }).where(eq(badges.id, badge.id))
  }

  return { attendee, badge, qrDataUrl, emailSent }
}

export async function checkinBadge(token: string) {
  const [row] = await db
    .select({
      id: badges.id,
      checkedIn: badges.checkedIn,
      name: attendees.name,
      eventName: events.name,
      organizerId: events.organizerId,
    })
    .from(badges)
    .innerJoin(attendees, eq(attendees.id, badges.attendeeId))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(badges.token, token))
  if (!row) return null
  if (row.checkedIn) return { alreadyCheckedIn: true, name: row.name, organizerId: row.organizerId, eventName: row.eventName }
  await db
    .update(badges)
    .set({ checkedIn: true, checkedInAt: new Date().toISOString() })
    .where(eq(badges.id, row.id))
  return { checkedIn: true, name: row.name, organizerId: row.organizerId, eventName: row.eventName }
}

export async function getBadgeWithProfile(token: string) {
  const [row] = await db
    .select({
      attendeeName: attendees.name,
      eventName: events.name,
      token: badges.token,
      isPublic: attendeeAccounts.isPublic,
      socialLinks: attendeeAccounts.socialLinks,
      bio: attendeeAccounts.bio,
      jobTitle: attendeeAccounts.jobTitle,
      company: attendeeAccounts.company,
    })
    .from(badges)
    .innerJoin(attendees, eq(attendees.id, badges.attendeeId))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .leftJoin(attendeeAccounts, eq(attendeeAccounts.email, attendees.email))
    .where(eq(badges.token, token))
  if (!row) return null
  return {
    attendeeName: row.attendeeName,
    eventName: row.eventName,
    token: row.token,
    socialLinks: row.isPublic ? row.socialLinks : null,
    bio: row.isPublic ? row.bio : null,
    jobTitle: row.isPublic ? row.jobTitle : null,
    company: row.isPublic ? row.company : null,
  }
}

export async function getBadgeByToken(token: string) {
  const [row] = await db
    .select({
      attendeeName: attendees.name,
      eventName: events.name,
      token: badges.token,
    })
    .from(badges)
    .innerJoin(attendees, eq(attendees.id, badges.attendeeId))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(badges.token, token))
  return row ?? null
}

export async function resendBadge(token: string, organizerId: number) {
  const appUrl = getAppUrl()
  const [row] = await db
    .select({
      id: badges.id,
      token: badges.token,
      name: attendees.name,
      email: attendees.email,
      inviteToken: attendees.inviteToken,
      badgeType: attendees.badgeType,
      organizerId: events.organizerId,
      eventName: events.name,
    })
    .from(badges)
    .innerJoin(attendees, eq(attendees.id, badges.attendeeId))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(badges.token, token))
  if (!row || row.organizerId !== organizerId) return null

  const badgeUrl = `${appUrl}/badge/${token}`
  const inviteUrl = `${appUrl}/attendee/signup?token=${row.inviteToken}`
  const qrDataUrl = qrImageUrl(badgeUrl)
  const emailSent = await sendBadgeEmail({ to: row.email, name: row.name, badgeUrl, qrDataUrl, inviteUrl, eventName: row.eventName, badgeType: row.badgeType })

  if (emailSent) {
    await db.update(badges).set({ emailSent: true }).where(eq(badges.id, row.id))
  }

  return { success: true, emailSent }
}

export async function getDashboardStats(organizerId: number) {
  const rows = await db
    .select({
      eventId: events.id,
      total: sql<string>`count(${badges.id})`,
      checkedIn: sql<string>`count(case when ${badges.checkedIn} = true then 1 end)`,
      emailsSent: sql<string>`count(case when ${badges.emailSent} = true then 1 end)`,
    })
    .from(events)
    .leftJoin(attendees, eq(attendees.eventId, events.id))
    .leftJoin(badges, eq(badges.attendeeId, attendees.id))
    .where(eq(events.organizerId, organizerId))
    .groupBy(events.id)

  return rows.map(r => ({
    eventId: r.eventId,
    total: parseInt(r.total, 10),
    checkedIn: parseInt(r.checkedIn, 10),
    emailsSent: parseInt(r.emailsSent, 10),
  }))
}

export async function getAllAttendees(organizerId: number) {
  return db
    .select({
      id: attendees.id,
      name: attendees.name,
      email: attendees.email,
      eventId: events.id,
      eventName: events.name,
      checkedIn: badges.checkedIn,
      emailSent: badges.emailSent,
      createdAt: attendees.createdAt,
    })
    .from(attendees)
    .innerJoin(badges, eq(badges.attendeeId, attendees.id))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(attendees.createdAt))
}

export async function getRecentAttendees(organizerId: number, limit = 4) {
  return db
    .select({
      id: attendees.id,
      name: attendees.name,
      email: attendees.email,
      eventName: events.name,
      checkedIn: badges.checkedIn,
    })
    .from(attendees)
    .innerJoin(badges, eq(badges.attendeeId, attendees.id))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(attendees.createdAt))
    .limit(limit)
}

export async function getAttendees(eventId: number, organizerId: number) {
  return db
    .select({
      id: attendees.id,
      name: attendees.name,
      email: attendees.email,
      createdAt: attendees.createdAt,
      badgeToken: badges.token,
      emailSent: badges.emailSent,
      checkedIn: badges.checkedIn,
    })
    .from(attendees)
    .innerJoin(badges, eq(badges.attendeeId, attendees.id))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(and(eq(attendees.eventId, eventId), eq(events.organizerId, organizerId)))
    .orderBy(asc(attendees.createdAt))
}
