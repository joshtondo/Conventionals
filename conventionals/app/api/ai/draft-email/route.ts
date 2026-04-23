import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { withAttendeeAuth } from '@/lib/session'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const QUICK_PROMPTS = {
  'follow-up': 'A warm, light follow-up — glad we met, great to connect, no specific agenda.',
  'collaborate': 'A professional reach-out exploring potential collaboration or a mutual opportunity.',
  'coffee': 'A casual, short message suggesting a coffee chat or quick call to connect further.',
} as const

type QuickType = keyof typeof QUICK_PROMPTS

export const POST = withAttendeeAuth(async (req: NextRequest) => {
  let body: {
    connectionName?: unknown
    eventName?: unknown
    notes?: unknown
    myName?: unknown
    mode?: unknown
    quickType?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { connectionName, eventName, notes, myName, mode, quickType } = body

  if (typeof connectionName !== 'string' || !connectionName.trim()) {
    return NextResponse.json({ error: 'connectionName is required' }, { status: 400 })
  }
  if (mode !== 'notes' && mode !== 'quick') {
    return NextResponse.json({ error: 'mode must be "notes" or "quick"' }, { status: 400 })
  }
  if (mode === 'notes' && (typeof notes !== 'string' || !notes.trim())) {
    return NextResponse.json({ error: 'notes are required for notes mode' }, { status: 400 })
  }

  const resolvedQuickType: QuickType =
    typeof quickType === 'string' && quickType in QUICK_PROMPTS
      ? (quickType as QuickType)
      : 'follow-up'

  const context =
    mode === 'notes'
      ? `Sender: ${myName || 'the sender'}
Recipient: ${connectionName.trim()}
Event they met at: ${eventName || 'a recent event'}
Notes from their meeting: ${(notes as string).trim()}`
      : `Sender: ${myName || 'the sender'}
Recipient: ${connectionName.trim()}
Event they met at: ${eventName || 'a recent event'}
Tone and intent: ${QUICK_PROMPTS[resolvedQuickType]}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are helping a professional write a networking follow-up email.

${context}

Write a concise, genuine email for this situation.
Respond with ONLY valid JSON in this exact format, no markdown, no explanation:
{"subject":"...","body":"..."}

Rules:
- subject: under 60 characters, specific not generic
- body: 3-5 sentences, conversational and warm but professional
- Reference the event or meeting context naturally
- No hollow openers like "Hope this finds you well" or "I wanted to reach out"
- No sign-off or greeting line — the sender will add those themselves
- Do not include placeholder text like [Your Name]`,
        },
      ],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    let cleaned = raw
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    }
    const parsed = JSON.parse(cleaned)
    if (!parsed.subject || !parsed.body) throw new Error('Missing fields')
    return NextResponse.json({ subject: parsed.subject, body: parsed.body })
  } catch {
    return NextResponse.json(
      { error: 'AI returned an unexpected response — try again' },
      { status: 500 }
    )
  }
})
