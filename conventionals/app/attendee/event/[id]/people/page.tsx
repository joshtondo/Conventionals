import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getPublicAttendeesForEvent, getAttendeeAccount } from '@/data/attendees'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import PeopleClient from './PeopleClient'

export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) notFound()

  const [people, account] = await Promise.all([
    getPublicAttendeesForEvent(eventId, session.attendeeAccountId),
    getAttendeeAccount(session.attendeeAccountId),
  ])
  if (people === null) notFound()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem', paddingTop: '72px' }}>
      <HamburgerDrawer variant="attendee" pageTitle="Attendees" userName={account?.name ?? ''} />
      <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: '0 0 1.25rem' }}>
        Attendees
      </h1>
      <PeopleClient people={people} eventId={eventId} />
    </div>
  )
}
