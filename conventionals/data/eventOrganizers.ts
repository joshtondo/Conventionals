import 'server-only'
import { db } from '@/lib/db'
import { eventOrganizers, events, organizers } from '@/drizzle/schema'
import { eq, and, or } from 'drizzle-orm'
import crypto from 'crypto'

export async function hasEventAccess(eventId: number, organizerId: number): Promise<boolean> {
  // Check owner
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
  if (event) return true

  // Check accepted co-organizer
  const [coOrg] = await db
    .select({ id: eventOrganizers.id })
    .from(eventOrganizers)
    .where(and(
      eq(eventOrganizers.eventId, eventId),
      eq(eventOrganizers.organizerId, organizerId),
      eq(eventOrganizers.status, 'accepted'),
    ))
  return !!coOrg
}

export async function createEventInvite(eventId: number, invitedEmail: string, invitedById: number) {
  const normalizedEmail = invitedEmail.trim().toLowerCase()
  const token = crypto.randomBytes(24).toString('hex')

  // Check if invitee already has an account
  const [existing] = await db
    .select({ id: organizers.id })
    .from(organizers)
    .where(eq(organizers.email, normalizedEmail))

  const [invite] = await db
    .insert(eventOrganizers)
    .values({
      eventId,
      invitedEmail: normalizedEmail,
      organizerId: existing?.id ?? null,
      invitedById,
      token,
    })
    .returning()

  return { invite, hasAccount: !!existing }
}

export async function getInvitesForOrganizer(organizerId: number) {
  // Get by organizer_id (linked) or by email match
  const [org] = await db
    .select({ email: organizers.email, name: organizers.name })
    .from(organizers)
    .where(eq(organizers.id, organizerId))
  if (!org) return []

  return db
    .select({
      id: eventOrganizers.id,
      eventId: eventOrganizers.eventId,
      eventName: events.name,
      eventDate: events.eventDate,
      status: eventOrganizers.status,
      invitedByName: organizers.name,
      createdAt: eventOrganizers.createdAt,
      token: eventOrganizers.token,
    })
    .from(eventOrganizers)
    .innerJoin(events, eq(events.id, eventOrganizers.eventId))
    .innerJoin(organizers, eq(organizers.id, eventOrganizers.invitedById))
    .where(
      or(
        eq(eventOrganizers.organizerId, organizerId),
        eq(eventOrganizers.invitedEmail, org.email),
      )
    )
    .orderBy(eventOrganizers.createdAt)
}

export async function getSharedEvents(organizerId: number) {
  return db
    .select({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
      invitedByName: organizers.name,
      inviteId: eventOrganizers.id,
    })
    .from(eventOrganizers)
    .innerJoin(events, eq(events.id, eventOrganizers.eventId))
    .innerJoin(organizers, eq(organizers.id, eventOrganizers.invitedById))
    .where(and(
      eq(eventOrganizers.organizerId, organizerId),
      eq(eventOrganizers.status, 'accepted'),
    ))
    .orderBy(events.eventDate)
}

export async function getOutboundInvites(organizerId: number) {
  return db
    .select({
      id: eventOrganizers.id,
      eventId: eventOrganizers.eventId,
      eventName: events.name,
      invitedEmail: eventOrganizers.invitedEmail,
      status: eventOrganizers.status,
      createdAt: eventOrganizers.createdAt,
      inviteeName: organizers.name,
    })
    .from(eventOrganizers)
    .innerJoin(events, eq(events.id, eventOrganizers.eventId))
    .leftJoin(organizers, eq(organizers.id, eventOrganizers.organizerId))
    .where(eq(eventOrganizers.invitedById, organizerId))
    .orderBy(eventOrganizers.createdAt)
}

export async function acceptInvite(inviteId: number, organizerId: number) {
  const [org] = await db
    .select({ email: organizers.email })
    .from(organizers)
    .where(eq(organizers.id, organizerId))
  if (!org) return null

  const [invite] = await db
    .update(eventOrganizers)
    .set({ status: 'accepted', organizerId })
    .where(and(
      eq(eventOrganizers.id, inviteId),
      eq(eventOrganizers.invitedEmail, org.email),
      eq(eventOrganizers.status, 'pending'),
    ))
    .returning()

  return invite ?? null
}

export async function declineInvite(inviteId: number, organizerId: number) {
  const [org] = await db
    .select({ email: organizers.email })
    .from(organizers)
    .where(eq(organizers.id, organizerId))
  if (!org) return null

  const [invite] = await db
    .update(eventOrganizers)
    .set({ status: 'declined' })
    .where(and(
      eq(eventOrganizers.id, inviteId),
      eq(eventOrganizers.invitedEmail, org.email),
      eq(eventOrganizers.status, 'pending'),
    ))
    .returning()

  return invite ?? null
}

/** Called after a new organizer registers — links any pending email invites to their account */
export async function linkPendingInvitesByEmail(email: string, organizerId: number) {
  await db
    .update(eventOrganizers)
    .set({ organizerId })
    .where(and(
      eq(eventOrganizers.invitedEmail, email.trim().toLowerCase()),
      eq(eventOrganizers.status, 'pending'),
    ))
}

export async function getInviteWithEventAndInviter(inviteId: number) {
  const [row] = await db
    .select({
      id: eventOrganizers.id,
      eventName: events.name,
      invitedEmail: eventOrganizers.invitedEmail,
      invitedByName: organizers.name,
      invitedById: eventOrganizers.invitedById,
      organizerId: eventOrganizers.organizerId,
      status: eventOrganizers.status,
    })
    .from(eventOrganizers)
    .innerJoin(events, eq(events.id, eventOrganizers.eventId))
    .innerJoin(organizers, eq(organizers.id, eventOrganizers.invitedById))
    .where(eq(eventOrganizers.id, inviteId))
  return row ?? null
}
