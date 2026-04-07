import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import AttendeeLoginForm from './AttendeeLoginForm'

export default async function AttendeeLoginPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (session.attendeeAccountId) {
    redirect('/attendee/dashboard')
  }

  return <AttendeeLoginForm />
}
