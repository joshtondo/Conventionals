import { NextRequest, NextResponse } from 'next/server'
import { consumePasswordResetToken } from '@/data/passwordReset'

export async function POST(req: NextRequest) {
  let body: { token?: unknown; password?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  if (typeof body.token !== 'string' || !body.token) {
    return NextResponse.json({ error: 'Reset token is required' }, { status: 400 })
  }
  if (typeof body.password !== 'string' || body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const ok = await consumePasswordResetToken(body.token, body.password)
  if (!ok) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
