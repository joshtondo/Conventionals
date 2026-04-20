import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAttendeeAccount, getEventHistory, getPublicAttendeesForEvent } from '@/data/attendees'
import { getConnections } from '@/data/connections'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import AttendeeTabView from '@/components/AttendeeTabView'
import { DiscoverPerson } from '@/components/DiscoverDeck'

export default async function AttendeeDashboardPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const account = await getAttendeeAccount(session.attendeeAccountId)
  if (!account) redirect('/attendee/login')

  const [eventHistory, connectionsList] = await Promise.all([
    getEventHistory(session.attendeeAccountId),
    getConnections(session.attendeeAccountId),
  ])

  // Build deduped discover list from all events the attendee has attended
  const seenIds = new Set<number>()
  const discoverPeople: DiscoverPerson[] = []

  for (const event of eventHistory) {
    const people = await getPublicAttendeesForEvent(event.eventId, session.attendeeAccountId)
    if (!people) continue
    for (const person of people) {
      if (!seenIds.has(person.id)) {
        seenIds.add(person.id)
        discoverPeople.push({
          ...person,
          sharedEventId: event.eventId,
          sharedEventName: event.eventName,
        })
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HamburgerDrawer variant="attendee" pageTitle="My Events" userName={account.name ?? ''} />
      <main style={{
        padding: '20px 16px 40px',
        paddingTop: '72px',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <AttendeeTabView
          eventHistory={eventHistory}
          discoverPeople={discoverPeople}
          connections={connectionsList}
        />
      </main>
    </div>
  )
}
