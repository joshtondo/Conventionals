import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getPublicAttendeesForEvent } from '@/data/attendees'
import ConnectButton from './ConnectButton'

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
  personName: {
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 0.25rem',
    fontSize: '1rem',
  } as React.CSSProperties,
  personMeta: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0 0 0.5rem',
  } as React.CSSProperties,
  personBio: {
    fontSize: '0.875rem',
    color: '#374151',
    margin: '0 0 0.5rem',
  } as React.CSSProperties,
  socialLink: {
    fontSize: '0.75rem',
    color: '#4f46e5',
    marginRight: '0.75rem',
    textDecoration: 'none',
  } as React.CSSProperties,
  empty: {
    color: '#6b7280',
    fontSize: '0.875rem',
  } as React.CSSProperties,
}

export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const eventId = parseInt(id)
  if (isNaN(eventId)) notFound()

  const people = await getPublicAttendeesForEvent(eventId, session.attendeeAccountId)
  if (people === null) notFound()

  return (
    <div style={s.container}>
      <a href="/attendee/dashboard" style={s.backLink}>← My Events</a>
      <h1 style={s.heading}>Attendees</h1>
      {people.length === 0 ? (
        <p style={s.empty}>No public attendees at this event.</p>
      ) : (
        people.map((person) => {
          const sl = person.socialLinks ?? {}
          const metaParts = [person.company, person.jobTitle].filter(Boolean)
          return (
            <div key={person.id} style={s.card}>
              <p style={s.personName}>{person.name}</p>
              {metaParts.length > 0 && (
                <p style={s.personMeta}>{metaParts.join(' · ')}</p>
              )}
              {person.bio && <p style={s.personBio}>{person.bio}</p>}
              <div>
                {sl.linkedin && <a href={sl.linkedin} style={s.socialLink} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
                {sl.twitter && <a href={sl.twitter} style={s.socialLink} target="_blank" rel="noopener noreferrer">Twitter</a>}
                {sl.website && <a href={sl.website} style={s.socialLink} target="_blank" rel="noopener noreferrer">Website</a>}
              </div>
              <ConnectButton
                connectedName={person.name}
                contactInfo={person.socialLinks ?? null}
                eventId={eventId}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
