import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { db } from '@/lib/db'
import { organizers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const PATCH = withAuth(async (req: NextRequest, { session }) => {
  let body: { name?: unknown; currentPassword?: unknown; newPassword?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const updates: Record<string, string> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }
    updates.name = body.name.trim()
  }

  if (body.newPassword !== undefined) {
    if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
      return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    }
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }
    const [organizer] = await db.select({ passwordHash: organizers.passwordHash }).from(organizers).where(eq(organizers.id, session.organizerId!))
    if (!organizer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const valid = await bcrypt.compare(body.currentPassword, organizer.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    updates.passwordHash = await bcrypt.hash(body.newPassword, 10)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true })
  }

  await db.update(organizers).set(updates).where(eq(organizers.id, session.organizerId!))
  return NextResponse.json({ success: true })
})
