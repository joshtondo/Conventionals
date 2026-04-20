import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getOrganizerById } from '@/data/auth'
import { getEvents } from '@/data/events'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const [organizer, events] = await Promise.all([
    getOrganizerById(session.organizerId),
    getEvents(session.organizerId),
  ])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HamburgerDrawer variant="organizer" pageTitle="Settings" userName={organizer?.name ?? ''} />
      <main style={{ padding: '20px 16px 40px', paddingTop: '72px', maxWidth: '560px', margin: '0 auto' }}>
        <SettingsClient initialEvents={events} />
      </main>
    </div>
  )
}
