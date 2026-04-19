import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getOrganizerById } from '@/data/auth'
import { getEvents } from '@/data/events'
import { getInvitesForOrganizer, getSharedEvents, getOutboundInvites } from '@/data/eventOrganizers'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import SharedClient from './SharedClient'

export default async function SharedPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const [organizer, ownEvents, invites, shared, outbound] = await Promise.all([
    getOrganizerById(session.organizerId),
    getEvents(session.organizerId),
    getInvitesForOrganizer(session.organizerId),
    getSharedEvents(session.organizerId),
    getOutboundInvites(session.organizerId),
  ])

  const pendingInboundInvites = invites.filter(i => i.status === 'pending')
  const pendingOutbound = outbound

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HamburgerDrawer variant="organizer" pageTitle="Shared Events" userName={organizer?.name ?? ''} />
      <main style={{ padding: '20px 16px 40px', paddingTop: '72px', maxWidth: '640px', margin: '0 auto' }}>
        <SharedClient
          inboundInvites={invites}
          sharedEvents={shared}
          ownEvents={ownEvents}
          outboundInvites={pendingOutbound}
        />
      </main>
    </div>
  )
}
