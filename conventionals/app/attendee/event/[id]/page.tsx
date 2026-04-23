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
  // ev is narrowed to non-null for use in nested expressions
  const ev = event

  const dateStr = ev.eventDate
    ? new Date(ev.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const isUpcoming = ev.eventDate ? new Date(ev.eventDate) >= new Date() : false

  // "Add to Calendar" Google Calendar URL
  const calendarUrl = (() => {
    if (!ev.eventDate) return null
    const dateCompact = ev.eventDate.replace(/-/g, '')
    const startDt = ev.startTime ? `${dateCompact}T${ev.startTime.replace(':', '')}00` : dateCompact
    const endDt = ev.endTime ? `${dateCompact}T${ev.endTime.replace(':', '')}00` : dateCompact
    const calParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.name,
      dates: `${startDt}/${endDt}`,
      ...(ev.description ? { details: ev.description } : {}),
      ...(ev.location ? { location: ev.location } : {}),
    })
    return `https://calendar.google.com/calendar/render?${calParams.toString()}`
  })()

  const mapsEmbedUrl = ev.location
    ? `https://maps.google.com/maps?q=${encodeURIComponent(ev.location)}&output=embed`
    : null
  const mapsDirectionsUrl = ev.location
    ? `https://maps.google.com/maps?q=${encodeURIComponent(ev.location)}`
    : null

  // Format times for display (HH:MM → 12-hour)
  function fmt12(t: string | null) {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const timeDisplay = ev.startTime
    ? ev.endTime
      ? `${fmt12(ev.startTime)} – ${fmt12(ev.endTime)}`
      : fmt12(ev.startTime)
    : null

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
            {ev.name}
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
            {dateStr && (
              <div style={{ fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📅</span> {dateStr}
              </div>
            )}
            {ev.organizerName && (
              <div style={{ fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👤</span> Hosted by {ev.organizerName}
              </div>
            )}
          </div>
        </div>

        {/* Time + location + website chips */}
        {(timeDisplay || ev.location || ev.website || calendarUrl) && (
          <div style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '12px',
          }}>
            {timeDisplay && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>🕐</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{timeDisplay}</span>
              </div>
            )}
            {ev.location && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>{ev.location}</div>
                  {mapsDirectionsUrl && (
                    <a href={mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: '12px', fontWeight: 600, color: C.primary, textDecoration: 'none',
                      background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '20px', padding: '3px 10px',
                      display: 'inline-block',
                    }}>
                      Get Directions →
                    </a>
                  )}
                </div>
              </div>
            )}
            {ev.website && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>🌐</span>
                <a href={ev.website} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '14px', fontWeight: 600, color: C.primary, textDecoration: 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>
                  {ev.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {calendarUrl && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  height: '40px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                📅 Add to Google Calendar
              </a>
            )}
          </div>
        )}

        {/* Description */}
        {ev.description && (
          <div style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, color: C.text3,
              textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px',
            }}>
              About this Event
            </div>
            <p style={{ fontSize: '14px', color: C.text2, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
              {ev.description}
            </p>
          </div>
        )}

        {/* Map embed */}
        {mapsEmbedUrl && (
          <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: `1px solid ${C.border}`,
            marginBottom: '16px',
            height: '200px',
          }}>
            <iframe
              src={mapsEmbedUrl}
              width="100%"
              height="200"
              style={{ border: 'none', display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Event location map"
            />
          </div>
        )}

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
