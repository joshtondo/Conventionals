import 'server-only'
import { db } from '@/lib/db'
import { connections, connectionRequests, events, attendeeAccounts, attendees } from '@/drizzle/schema'
import { eq, and, isNull, desc, ne, inArray, ilike } from 'drizzle-orm'

type CreateConnectionFields = {
  connectedName: string
  contactInfo?: { email?: string; linkedin?: string; twitter?: string; website?: string } | null
  eventId?: number | null
  connectedAccountId?: number | null
}

export async function createConnection(ownerAccountId: number, fields: CreateConnectionFields) {
  const eventCondition = fields.eventId != null
    ? eq(connections.eventId, fields.eventId)
    : isNull(connections.eventId)

  const [existing] = await db
    .select({ id: connections.id })
    .from(connections)
    .where(and(
      eq(connections.ownerId, ownerAccountId),
      eventCondition,
      eq(connections.connectedName, fields.connectedName)
    ))
  if (existing) return { duplicate: true as const }

  try {
    const [row] = await db
      .insert(connections)
      .values({
        ownerId: ownerAccountId,
        connectedName: fields.connectedName,
        contactInfo: fields.contactInfo ?? null,
        eventId: fields.eventId ?? null,
        connectedAccountId: fields.connectedAccountId ?? null,
      })
      .returning({ id: connections.id })
    return { id: row.id }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('unique') || msg.includes('duplicate')) return { duplicate: true as const }
    throw e
  }
}

// Use an alias so Drizzle doesn't collide with the ownerId join
const connectedAccount = attendeeAccounts

export async function getConnections(ownerAccountId: number) {
  return db
    .select({
      id: connections.id,
      connectedName: connections.connectedName,
      contactInfo: connections.contactInfo,
      // Always show the account email when the connection is linked to an account,
      // falling back to whatever email was stored in contactInfo manually.
      connectedEmail: connectedAccount.email,
      notes: connections.notes,
      eventId: connections.eventId,
      eventName: events.name,
      createdAt: connections.createdAt,
      updatedAt: connections.updatedAt,
    })
    .from(connections)
    .leftJoin(events, eq(connections.eventId, events.id))
    .leftJoin(connectedAccount, eq(connections.connectedAccountId, connectedAccount.id))
    .where(eq(connections.ownerId, ownerAccountId))
    .orderBy(desc(connections.updatedAt))
}

export async function updateConnectionNotes(
  connectionId: number,
  ownerAccountId: number,
  notes: string | null
) {
  const result = await db
    .update(connections)
    .set({ notes, updatedAt: new Date().toISOString() })
    .where(and(eq(connections.id, connectionId), eq(connections.ownerId, ownerAccountId)))
    .returning({ id: connections.id })
  return result[0] ?? null
}

// ─── Connection Requests ────────────────────────────────────────────────────

export async function createConnectionRequest(
  fromAccountId: number,
  toAccountId: number,
  eventId: number | null
) {
  const [existing] = await db
    .select({ id: connectionRequests.id })
    .from(connectionRequests)
    .where(and(
      eq(connectionRequests.fromAccountId, fromAccountId),
      eq(connectionRequests.toAccountId, toAccountId)
    ))
  if (existing) return { duplicate: true as const }

  try {
    const [row] = await db
      .insert(connectionRequests)
      .values({ fromAccountId, toAccountId, eventId: eventId ?? null, status: 'pending' })
      .returning({ id: connectionRequests.id })
    return { id: row.id }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('unique') || msg.includes('duplicate')) return { duplicate: true as const }
    throw e
  }
}

export async function getPendingRequests(toAccountId: number) {
  return db
    .select({
      id: connectionRequests.id,
      fromAccountId: connectionRequests.fromAccountId,
      fromName: attendeeAccounts.name,
      fromJobTitle: attendeeAccounts.jobTitle,
      fromCompany: attendeeAccounts.company,
      fromSocialLinks: attendeeAccounts.socialLinks,
      eventId: connectionRequests.eventId,
      eventName: events.name,
      createdAt: connectionRequests.createdAt,
    })
    .from(connectionRequests)
    .innerJoin(attendeeAccounts, eq(connectionRequests.fromAccountId, attendeeAccounts.id))
    .leftJoin(events, eq(connectionRequests.eventId, events.id))
    .where(and(
      eq(connectionRequests.toAccountId, toAccountId),
      eq(connectionRequests.status, 'pending')
    ))
    .orderBy(desc(connectionRequests.createdAt))
}

export async function respondToRequest(
  requestId: number,
  toAccountId: number,
  accept: boolean
) {
  const [req] = await db
    .select()
    .from(connectionRequests)
    .where(and(
      eq(connectionRequests.id, requestId),
      eq(connectionRequests.toAccountId, toAccountId),
      eq(connectionRequests.status, 'pending')
    ))
  if (!req) return null

  await db
    .update(connectionRequests)
    .set({ status: accept ? 'accepted' : 'declined' })
    .where(eq(connectionRequests.id, requestId))

  if (accept) {
    const [sender] = await db
      .select({ name: attendeeAccounts.name, socialLinks: attendeeAccounts.socialLinks })
      .from(attendeeAccounts)
      .where(eq(attendeeAccounts.id, req.fromAccountId))
    if (sender) {
      await createConnection(toAccountId, {
        connectedName: sender.name,
        contactInfo: sender.socialLinks ?? null,
        eventId: req.eventId,
        connectedAccountId: req.fromAccountId,
      })
    }
  }

  return { status: accept ? 'accepted' : 'declined' }
}

// ─── People Search ───────────────────────────────────────────────────────────

export async function searchPublicAttendees(query: string, myAccountId: number) {
  if (!query.trim()) return []

  const [myAccount] = await db
    .select({ email: attendeeAccounts.email })
    .from(attendeeAccounts)
    .where(eq(attendeeAccounts.id, myAccountId))
  if (!myAccount) return []

  const myEvents = await db
    .select({ eventId: attendees.eventId })
    .from(attendees)
    .where(eq(attendees.email, myAccount.email))
  if (myEvents.length === 0) return []

  const eventIds = myEvents.map(e => e.eventId)

  const rows = await db
    .select({
      id: attendeeAccounts.id,
      name: attendeeAccounts.name,
      jobTitle: attendeeAccounts.jobTitle,
      company: attendeeAccounts.company,
      socialLinks: attendeeAccounts.socialLinks,
    })
    .from(attendeeAccounts)
    .innerJoin(attendees, eq(attendees.email, attendeeAccounts.email))
    .where(and(
      eq(attendeeAccounts.isPublic, true),
      ne(attendeeAccounts.id, myAccountId),
      inArray(attendees.eventId, eventIds),
      ilike(attendeeAccounts.name, `%${query.trim()}%`)
    ))
    .limit(30)

  // Deduplicate by account id (person may attend multiple shared events)
  const seen = new Set<number>()
  return rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
}
