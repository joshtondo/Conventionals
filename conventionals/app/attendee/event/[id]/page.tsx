import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEventDetailsForAttendee, getAttendeeAccount, getPublicAttendeesForEvent } from '@/data/attendees'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import { initials } from '@/lib/utils'

const C = {
  primary: '#6366f1',
  accent: '#10b981',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
}

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

export default async function AttendeeEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (isNaN(eventId)) notFound()

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.attendeeAccountId) redirect('/attendee/login')

  const [event, account, people] = await Promise.all([
    getEventDetailsForAttendee(eventId, session.attendeeAccountId),
    getAttendeeAccount(session.attendeeAccountId),
    getPublicAttendeesForEvent(eventId, session.attendeeAccountId),
  ])

  if (!event) notFound()

  const dateStr = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const isUpcoming = event.eventDate ? new Date(event.eventDate) >= new Date() : false

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.surface }}>
      <HamburgerDrawer variant="attendee" pageTitle="Event Details" userName={account?.name ?? ''} />
      <main style={{ padding: '20px 16px 48px', paddingTop: '72px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Back link */}
        <Link
          href="/attendee/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: C.text2,
            textDecoration: 'none',
            marginBottom: '16px',
          }}
        >
          ← Back to Dashboard
        </Link>

        {/* Event hero card */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          borderRadius: '20px',
          padding: '24px',
          color: C.white,
          marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            opacity: 0.75,
            marginBottom: '8px',
          }}>
            {isUpcoming ? 'Upcoming Event' : 'Past Event'}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.25 }}>
            {event.name}
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
            {dateStr && (
              <div style={{ fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📅</span> {dateStr}
              </div>
            )}
            {event.organizerName && (
              <div style={{ fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👤</span> Hosted by {event.organizerName}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <Link
            href={`/attendee/event/${eventId}/people`}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px',
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              color: C.primary,
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            ✨ Meet People
          </Link>
          <Link
            href="/attendee/dashboard?tab=connections"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px',
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              color: C.accent,
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            🤝 Connections
          </Link>
        </div>

        {/* Attendees at this event */}
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          color: C.text3,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
          marginBottom: '10px',
        }}>
          People at this Event
        </div>

        {!people || people.length === 0 ? (
          <div style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '32px 24px',
            textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
              No public profiles yet
            </p>
            <p style={{ fontSize: '13px', color: C.text2, margin: 0 }}>
              Attendees with public profiles will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
            {people.map((person, i) => (
              <div key={person.id} style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: C.white,
                  flexShrink: 0,
                }}>
                  {initials(person.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{person.name}</div>
                  {person.jobTitle && (
                    <div style={{ fontSize: '12px', color: C.text2, marginTop: '1px' }}>{person.jobTitle}</div>
                  )}
                  {person.company && (
                    <div style={{ fontSize: '12px', color: C.text3, marginTop: '1px' }}>{person.company}</div>
                  )}
                </div>
                {person.socialLinks && (Object.values(person.socialLinks).some(Boolean)) && (
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {person.socialLinks.linkedin && (
                      <a href={person.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: '#ede9fe', color: C.primary, borderRadius: '8px', textDecoration: 'none' }}>in</a>
                    )}
                    {person.socialLinks.twitter && (
                      <a href={person.socialLinks.twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: '#e0f2fe', color: '#0284c7', borderRadius: '8px', textDecoration: 'none' }}>𝕏</a>
                    )}
                    {person.socialLinks.website && (
                      <a href={person.socialLinks.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: C.surface, color: C.text2, borderRadius: '8px', textDecoration: 'none', border: `1px solid ${C.border}` }}>🌐</a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
