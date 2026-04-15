import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getConnections } from '@/data/connections'
import ConnectionCard from './ConnectionCard'
import HamburgerDrawer from '@/components/HamburgerDrawer'

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '2rem',
    paddingTop: '72px',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 1.25rem',
  } as React.CSSProperties,
  empty: {
    color: '#6b7280',
    fontSize: '0.875rem',
  } as React.CSSProperties,
}

export default async function ConnectionsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const connectionsList = await getConnections(session.attendeeAccountId)

  return (
    <div style={s.container}>
      <HamburgerDrawer variant="attendee" />
      <h1 style={s.heading}>My Connections</h1>
      {connectionsList.length === 0 ? (
        <p style={s.empty}>No connections yet.</p>
      ) : (
        connectionsList.map((conn) => (
          <ConnectionCard
            key={conn.id}
            id={conn.id}
            connectedName={conn.connectedName}
            contactInfo={conn.contactInfo ?? null}
            eventName={conn.eventName ?? null}
            notes={conn.notes ?? null}
          />
        ))
      )}
    </div>
  )
}
