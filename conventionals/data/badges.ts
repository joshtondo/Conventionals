import 'server-only'
import { db } from '@/lib/db'
import { attendees, badges, events } from '@/drizzle/schema'
import { eq, and, asc, sql } from 'drizzle-orm'
import { generateQR } from '@/lib/qr'
import { sendBadgeEmail } from '@/lib/email'

export async function createAttendeeAndBadge(
  organizerId: number,
  eventId: number,
  name: string,
  email: string
) {
  const trimmedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()

  const [attendee] = await db
    .insert(attendees)
    .values({ eventId, name: trimmedName, email: normalizedEmail })
    .returning({ id: attendees.id, name: attendees.name, email: attendees.email, inviteToken: attendees.inviteToken })

  const [badge] = await db
    .insert(badges)
    .values({ attendeeId: attendee.id, token: crypto.randomUUID() })
    .returning({ id: badges.id, token: badges.token, emailSent: badges.emailSent })

  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/badge/${badge.token}`
  const qrDataUrl = await generateQR(badgeUrl)

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/attendee/signup?token=${attendee.inviteToken}`
  const emailSent = await sendBadgeEmail({ to: attendee.email, name: attendee.name, badgeUrl, qrDataUrl, inviteUrl })

  if (emailSent) {
    await db.update(badges).set({ emailSent: true }).where(eq(badges.id, badge.id))
  }

  return { attendee, badge, qrDataUrl, emailSent }
}

export async function checkinBadge(token: string) {
  const [badge] = await db
    .select({ id: badges.id, checkedIn: badges.checkedIn })
    .from(badges)
    .where(eq(badges.token, token))
  if (!badge) return null
  if (badge.checkedIn) return { alreadyCheckedIn: true }
  await db
    .update(badges)
    .set({ checkedIn: true, checkedInAt: new Date().toISOString() })
    .where(eq(badges.id, badge.id))
  return { checkedIn: true }
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
  const [row] = await db
    .select({
      id: badges.id,
      token: badges.token,
      name: attendees.name,
      email: attendees.email,
      inviteToken: attendees.inviteToken,
      organizerId: events.organizerId,
    })
    .from(badges)
    .innerJoin(attendees, eq(attendees.id, badges.attendeeId))
    .innerJoin(events, eq(events.id, attendees.eventId))
    .where(eq(badges.token, token))
  if (!row || row.organizerId !== organizerId) return null

  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/badge/${token}`
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/attendee/signup?token=${row.inviteToken}`
  const qrDataUrl = await generateQR(badgeUrl)
  const emailSent = await sendBadgeEmail({ to: row.email, name: row.name, badgeUrl, qrDataUrl, inviteUrl })

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
