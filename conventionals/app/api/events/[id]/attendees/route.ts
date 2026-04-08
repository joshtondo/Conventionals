import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { getEventById } from '@/data/events'
import { createAttendeeAndBadge } from '@/data/badges'
import { parse } from 'csv-parse/sync'

export const maxDuration = 60

export const POST = withAuth(async (req, ctx) => {
  const { id } = await ctx.params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  const event = await getEventById(eventId, ctx.session.organizerId!)
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('csv')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 })
    }
    const buffer = Buffer.from(await (file as File).arrayBuffer())
    const records: Record<string, string>[] = parse(buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    let added = 0
    let skipped = 0

    for (const row of records) {
      const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name')
      const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email')
      const name = nameKey ? row[nameKey] : ''
      const email = emailKey ? row[emailKey] : ''
      if (!name || !email) { skipped++; continue }
      try {
        await createAttendeeAndBadge(ctx.session.organizerId!, eventId, name, email)
        added++
      } catch (err) {
        const pgCode = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code
        if (pgCode === '23505') { skipped++; continue }
        console.error('CSV row error:', (err as Error).message)
        skipped++
      }
    }

    return NextResponse.json({ added, skipped }, { status: 200 })
  }

  let body: { name?: unknown; email?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { name, email } = body
  if (!name || typeof name !== 'string' || !name.trim() ||
      !email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  try {
    const result = await createAttendeeAndBadge(ctx.session.organizerId!, eventId, name, email)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const pgCode = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code
    if (pgCode === '23505') {
      return NextResponse.json({ error: 'Attendee already registered' }, { status: 409 })
    }
    console.error('Add attendee error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
