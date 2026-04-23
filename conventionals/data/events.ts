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
      location: events.location,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(events.createdAt))
}

const eventDetailFields = {
  id: events.id,
  name: events.name,
  eventDate: events.eventDate,
  description: events.description,
  location: events.location,
  startTime: events.startTime,
  endTime: events.endTime,
  website: events.website,
}

export async function getEventById(eventId: number, organizerId: number) {
  // Allow access if organizer is the owner OR an accepted co-organizer
  const [owned] = await db
    .select(eventDetailFields)
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
  if (owned) return { ...owned, isOwner: true }

  const [coOrg] = await db
    .select(eventDetailFields)
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

type EventUpdateFields = {
  name: string
  eventDate: string | null
  description?: string | null
  location?: string | null
  startTime?: string | null
  endTime?: string | null
  website?: string | null
}

export async function updateEvent(eventId: number, organizerId: number, fields: EventUpdateFields) {
  const [updated] = await db
    .update(events)
    .set(fields)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
    .returning(eventDetailFields)
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
