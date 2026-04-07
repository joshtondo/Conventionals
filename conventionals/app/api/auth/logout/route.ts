import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.destroy() // synchronous — clears cookie in response; no await
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Logout error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
