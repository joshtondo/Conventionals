import { NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import { updateProfile } from '@/data/attendees'

export const PATCH = withAttendeeAuth(async (req, ctx) => {
  let body: {
    name?: unknown
    company?: unknown
    jobTitle?: unknown
    bio?: unknown
    socialLinks?: unknown
    isPublic?: unknown
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }
  }

  const fields: Parameters<typeof updateProfile>[1] = {}
  if (body.name !== undefined) fields.name = body.name as string
  if (body.company !== undefined) fields.company = typeof body.company === 'string' ? body.company : null
  if (body.jobTitle !== undefined) fields.jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle : null
  if (body.bio !== undefined) fields.bio = typeof body.bio === 'string' ? body.bio : null
  if (body.socialLinks !== undefined && typeof body.socialLinks === 'object' && body.socialLinks !== null) {
    const sl = body.socialLinks as Record<string, unknown>
    fields.socialLinks = {
      linkedin: typeof sl.linkedin === 'string' ? sl.linkedin : undefined,
      twitter: typeof sl.twitter === 'string' ? sl.twitter : undefined,
      website: typeof sl.website === 'string' ? sl.website : undefined,
    }
  }

  if (body.isPublic !== undefined) fields.isPublic = body.isPublic === true
  await updateProfile(ctx.session.attendeeAccountId!, fields)
  return NextResponse.json({ success: true })
})
