import 'server-only'
import { db } from '@/lib/db'
import { notifications } from '@/drizzle/schema'
import { eq, desc, and } from 'drizzle-orm'

export async function createNotification(
  organizerId: number,
  type: 'checkin' | 'registration' | 'announcement' | 'profile_setup' | 'invite',
  title: string,
  message: string,
) {
  await db.insert(notifications).values({ organizerId, type, title, message })
}

export async function getUnreadNotifications(organizerId: number) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(eq(notifications.organizerId, organizerId), eq(notifications.read, false)))
    .orderBy(desc(notifications.createdAt))
    .limit(20)
}

export async function markAllNotificationsRead(organizerId: number) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.organizerId, organizerId), eq(notifications.read, false)))
}

export async function dismissNotification(id: number, organizerId: number) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.organizerId, organizerId)))
}

export async function markNotificationsByType(organizerId: number, type: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.organizerId, organizerId), eq(notifications.type, type), eq(notifications.read, false)))
}
