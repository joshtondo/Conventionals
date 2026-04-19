import 'server-only'
import { db } from '@/lib/db'
import { events, eventOrganizers } from '@/drizzle/schema'
import { eq, desc, and, or } from 'drizzle-orm'

export async function getEvents(organizerId: number) {
  return db
    .select({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(events.createdAt))
}

export async function getEventById(eventId: number, organizerId: number) {
  // Allow access if organizer is the owner OR an accepted co-organizer
  const [owned] = await db
    .select({ id: events.id, name: events.name, eventDate: events.eventDate })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
  if (owned) return { ...owned, isOwner: true }

  const [coOrg] = await db
    .select({ id: events.id, name: events.name, eventDate: events.eventDate })
    .from(events)
    .innerJoin(eventOrganizers, and(
      eq(eventOrganizers.eventId, events.id),
      eq(eventOrganizers.organizerId, organizerId),
      eq(eventOrganizers.status, 'accepted'),
    ))
    .where(eq(events.id, eventId))
  if (coOrg) return { ...coOrg, isOwner: false }

  return null
}

export async function updateEvent(eventId: number, organizerId: number, name: string, eventDate: string | null) {
  const [updated] = await db
    .update(events)
    .set({ name, eventDate })
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
    .returning({ id: events.id, name: events.name, eventDate: events.eventDate })
  return updated ?? null
}

export async function deleteEvent(eventId: number, organizerId: number) {
  const result = await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
    .returning({ id: events.id })
  return result[0] ?? null
}

export async function createEvent(organizerId: number, name: string, date: string | null) {
  const [event] = await db
    .insert(events)
    .values({ organizerId, name, eventDate: date })
    .returning({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
      createdAt: events.createdAt,
    })
  return event
}
