import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAttendeeAccount } from '@/data/attendees'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.attendeeAccountId) {
    redirect('/attendee/login')
  }

  const account = await getAttendeeAccount(session.attendeeAccountId)
  if (!account) {
    redirect('/attendee/login')
  }

  return <ProfileForm account={account} />
}
