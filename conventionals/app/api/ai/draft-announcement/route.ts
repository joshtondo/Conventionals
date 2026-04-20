import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventName, brief } = await req.json()
  if (!brief || typeof brief !== 'string' || brief.trim().length < 5) {
    return NextResponse.json({ error: 'Brief is required' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are an event communications assistant. Write a concise, professional event announcement for an organizer.

Event: ${eventName || 'the event'}
Brief: ${brief.trim()}

Respond with ONLY valid JSON in this exact format, no markdown, no explanation:
{"subject":"...","message":"..."}

Rules:
- subject: under 60 characters, direct and clear
- message: 2-4 short paragraphs, warm but professional tone, no filler phrases like "We are pleased to announce"
- Do not include greetings or sign-offs — the email system adds those`,
      },
    ],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.subject || !parsed.message) throw new Error('Missing fields')
    return NextResponse.json({ subject: parsed.subject, message: parsed.message })
  } catch {
    return NextResponse.json({ error: 'AI returned an unexpected response — try again' }, { status: 500 })
  }
}
