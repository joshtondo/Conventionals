import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAttendeeAccount, getPublicAttendeesForEvent } from '@/data/attendees'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = await req.json()
  if (!eventId || typeof eventId !== 'number') {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  const [me, people] = await Promise.all([
    getAttendeeAccount(session.attendeeAccountId),
    getPublicAttendeesForEvent(eventId, session.attendeeAccountId),
  ])

  if (!me || !people || people.length === 0) {
    return NextResponse.json({ recommendations: [] })
  }

  const myProfile = [
    me.name,
    me.jobTitle && me.company ? `${me.jobTitle} at ${me.company}` : me.jobTitle ?? me.company ?? '',
    me.bio ?? '',
  ].filter(Boolean).join(' | ')

  const attendeeList = people.map(p => ({
    id: p.id,
    name: p.name,
    summary: [
      p.jobTitle && p.company ? `${p.jobTitle} at ${p.company}` : p.jobTitle ?? p.company ?? '',
      p.bio ?? '',
    ].filter(Boolean).join(' — '),
  }))

  const prompt = `You are a smart event networking assistant. Given a user's profile and a list of other attendees at the same event, identify the top 3 people they should connect with and explain why in one short sentence each.

My profile: ${myProfile || 'No profile info provided'}

Other attendees:
${attendeeList.map((a, i) => `${i + 1}. [id:${a.id}] ${a.name}${a.summary ? ' — ' + a.summary : ''}`).join('\n')}

Respond ONLY with valid JSON, no markdown:
{"recommendations":[{"id":123,"name":"...","reason":"..."},{"id":456,"name":"...","reason":"..."},{"id":789,"name":"...","reason":"..."}]}

Rules:
- Pick exactly 3 (or fewer if there are fewer attendees)
- reason: one sentence, specific and genuine — reference actual shared interests, industries, or complementary roles
- If profiles are sparse, find any reasonable common ground`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.recommendations)) throw new Error('Bad format')
    return NextResponse.json({ recommendations: parsed.recommendations })
  } catch {
    return NextResponse.json({ error: 'AI returned an unexpected response — try again' }, { status: 500 })
  }
}
