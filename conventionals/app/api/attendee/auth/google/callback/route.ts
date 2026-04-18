import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { upsertAttendeeFromGoogle } from '@/data/attendees'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/attendee/login?error=google_denied`)
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!state || state !== session.oauthState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/attendee/login?error=invalid_state`)
  }
  session.oauthState = undefined

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/attendee/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/attendee/login?error=token_exchange`)
  }

  const { access_token } = await tokenRes.json() as { access_token: string }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!profileRes.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/attendee/login?error=profile_fetch`)
  }

  const profile = await profileRes.json() as { email: string; name: string }
  if (!profile.email) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/attendee/login?error=no_email`)
  }

  const accountId = await upsertAttendeeFromGoogle(profile.email, profile.name ?? profile.email.split('@')[0])

  session.attendeeAccountId = accountId
  session.organizerId = undefined
  await session.save()

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/attendee/dashboard`)
}
