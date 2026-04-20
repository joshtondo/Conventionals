import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getOrganizerById } from '@/data/auth'
import { getEvents } from '@/data/events'
import { getDashboardStats } from '@/data/badges'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import AnnouncementsClient from './AnnouncementsClient'

export default async function AnnouncementsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const [organizer, events, statsList] = await Promise.all([
    getOrganizerById(session.organizerId),
    getEvents(session.organizerId),
    getDashboardStats(session.organizerId),
  ])

  const statsMap = Object.fromEntries(statsList.map(s => [s.eventId, s]))

  const eventOptions = events.map(e => ({
    id: e.id,
    name: e.name,
    attendeeCount: statsMap[e.id]?.total ?? 0,
  }))

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HamburgerDrawer variant="organizer" pageTitle="Announcements" userName={organizer?.name ?? ''} />
      <main style={{ padding: '20px 16px 40px', paddingTop: '72px', maxWidth: '560px', margin: '0 auto' }}>
        <AnnouncementsClient events={eventOptions} />
      </main>
    </div>
  )
}
