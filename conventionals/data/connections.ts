import 'server-only'
import { db } from '@/lib/db'
import { connections, events } from '@/drizzle/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

type CreateConnectionFields = {
  connectedName: string
  contactInfo?: { email?: string; linkedin?: string; twitter?: string; website?: string } | null
  eventId?: number | null
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

  const [row] = await db
    .insert(connections)
    .values({
      ownerId: ownerAccountId,
      connectedName: fields.connectedName,
      contactInfo: fields.contactInfo ?? null,
      eventId: fields.eventId ?? null,
    })
    .returning({ id: connections.id })
  return { id: row.id }
}

export async function getConnections(ownerAccountId: number) {
  return db
    .select({
      id: connections.id,
      connectedName: connections.connectedName,
      contactInfo: connections.contactInfo,
      notes: connections.notes,
      eventId: connections.eventId,
      eventName: events.name,
      createdAt: connections.createdAt,
      updatedAt: connections.updatedAt,
    })
    .from(connections)
    .leftJoin(events, eq(connections.eventId, events.id))
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
