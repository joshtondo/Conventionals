import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAttendeeAccount, getEventHistory } from '@/data/attendees'

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
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    marginBottom: '0.75rem',
    maxWidth: '600px',
  } as React.CSSProperties,
  eventName: {
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 0.25rem',
    fontSize: '1rem',
  } as React.CSSProperties,
  eventMeta: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  } as React.CSSProperties,
  empty: {
    color: '#6b7280',
    fontSize: '0.875rem',
  } as React.CSSProperties,
}

export default async function AttendeeDashboardPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const account = await getAttendeeAccount(session.attendeeAccountId)
  if (!account) redirect('/attendee/login')

  const eventHistory = await getEventHistory(session.attendeeAccountId)

  return (
    <div style={s.container}>
      <a href="/attendee/profile" style={s.backLink}>← Profile</a>
      <h1 style={s.heading}>My Events</h1>
      {eventHistory.length === 0 ? (
        <p style={s.empty}>No events yet.</p>
      ) : (
        eventHistory.map((event) => (
          <div key={event.eventId} style={s.card}>
            <p style={s.eventName}>{event.eventName}</p>
            <p style={s.eventMeta}>
              {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'TBD'}
              {' · '}
              {event.organizerName ?? 'Unknown organizer'}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
