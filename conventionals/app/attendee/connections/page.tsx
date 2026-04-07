import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getConnections } from '@/data/connections'
import ConnectionCard from './ConnectionCard'

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '2rem',
  } as React.CSSProperties,
  backLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '0.875rem',
    display: 'inline-block',
    marginBottom: '1.5rem',
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
      <a href="/attendee/dashboard" style={s.backLink}>← My Events</a>
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
