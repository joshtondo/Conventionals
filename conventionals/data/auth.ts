import 'server-only'
import { db } from '@/lib/db'
import { organizers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

// Timing-safe dummy hash — when email is not found, compare against this so
// response time is identical to a real bcrypt check (prevents user enumeration)
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [organizer] = await db
    .select()
    .from(organizers)
    .where(eq(organizers.email, normalizedEmail))

  // Always run bcrypt.compare — even when organizer not found — to prevent timing attacks
  const hashToCompare = organizer?.passwordHash ?? DUMMY_HASH
  const isValid = await bcrypt.compare(password, hashToCompare)

  if (!organizer || !isValid) return null
  return { id: organizer.id, email: organizer.email, createdAt: organizer.createdAt }
}

export async function getOrganizerById(id: number) {
  const [organizer] = await db
    .select()
    .from(organizers)
    .where(eq(organizers.id, id))
  if (!organizer) return null
  return { id: organizer.id, name: organizer.name ?? '', email: organizer.email, createdAt: organizer.createdAt }
}

export async function createOrganizer(name: string, email: string, passwordHash: string) {
  const [organizer] = await db
    .insert(organizers)
    .values({ name, email, passwordHash })
    .returning({ id: organizers.id, email: organizers.email, createdAt: organizers.createdAt })
  return organizer
}
