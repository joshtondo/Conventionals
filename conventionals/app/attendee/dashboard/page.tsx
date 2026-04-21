import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAttendeeAccount, getEventHistory, getPublicAttendeesForEvent } from '@/data/attendees'
import { getConnections } from '@/data/connections'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import AttendeeTabView from '@/components/AttendeeTabView'
import { DiscoverPerson } from '@/components/DiscoverDeck'
import AttendeeProfileBanner from '@/components/AttendeeProfileBanner'

const VALID_TABS = ['events', 'discover', 'connections', 'schedule'] as const
type Tab = typeof VALID_TABS[number]

export default async function AttendeeDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const account = await getAttendeeAccount(session.attendeeAccountId)
  if (!account) redirect('/attendee/login')

  const params = await searchParams
  const initialTab: Tab = VALID_TABS.includes(params.tab as Tab)
    ? (params.tab as Tab)
    : 'events'

  const [eventHistory, connectionsList] = await Promise.all([
    getEventHistory(session.attendeeAccountId),
    getConnections(session.attendeeAccountId),
  ])

  // Fetch all event attendees in parallel instead of sequentially
  const peopleResults = await Promise.allSettled(
    eventHistory.map(event =>
      getPublicAttendeesForEvent(event.eventId, session.attendeeAccountId!)
    )
  )

  const seenIds = new Set<number>()
  const discoverPeople: DiscoverPerson[] = []

  for (let i = 0; i < eventHistory.length; i++) {
    const result = peopleResults[i]
    if (result.status !== 'fulfilled' || !result.value) continue
    for (const person of result.value) {
      if (!seenIds.has(person.id)) {
        seenIds.add(person.id)
        discoverPeople.push({
          ...person,
          sharedEventId: eventHistory[i].eventId,
          sharedEventName: eventHistory[i].eventName,
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
        {!account.bio && !account.jobTitle && !account.company && <AttendeeProfileBanner />}
        <AttendeeTabView
          eventHistory={eventHistory}
          discoverPeople={discoverPeople}
          connections={connectionsList}
          initialTab={initialTab}
        />
      </main>
    </div>
  )
}
