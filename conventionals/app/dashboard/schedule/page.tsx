import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getOrganizerById } from '@/data/auth'
import { getEvents } from '@/data/events'
import { getDashboardStats } from '@/data/badges'
import HamburgerDrawer from '@/components/HamburgerDrawer'

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

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return {
    full: d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    short: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    year: d.getFullYear().toString(),
    isUpcoming: d >= new Date(),
  }
}

export default async function SchedulePage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const [organizer, events, statsList] = await Promise.all([
    getOrganizerById(session.organizerId),
    getEvents(session.organizerId),
    getDashboardStats(session.organizerId),
  ])

  const statsMap = Object.fromEntries(statsList.map(s => [s.eventId, s]))

  // Sort: upcoming first, then past, then no-date
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.eventDate && !b.eventDate) return 0
    if (!a.eventDate) return 1
    if (!b.eventDate) return -1
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  })

  const upcoming = sortedEvents.filter(e => !e.eventDate || new Date(e.eventDate + 'T00:00:00') >= new Date())
  const past = sortedEvents.filter(e => e.eventDate && new Date(e.eventDate + 'T00:00:00') < new Date())

  function EventCard({ event, isPast }: { event: typeof events[number]; isPast: boolean }) {
    const s = statsMap[event.id] ?? { total: 0, checkedIn: 0, emailsSent: 0 }
    const date = formatDate(event.eventDate)
    const rate = s.total > 0 ? Math.round((s.checkedIn / s.total) * 100) : 0

    return (
      <div style={{
        backgroundColor: C.white,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${isPast ? C.accent : C.primary}`,
        borderRadius: '14px',
        padding: '16px 18px',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '3px' }}>{event.name}</div>
            {date ? (
              <div style={{ fontSize: '13px', color: C.text2 }}>{date.full}</div>
            ) : (
              <div style={{ fontSize: '13px', color: C.text3 }}>No date set</div>
            )}
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '999px',
            background: isPast ? '#d1fae5' : '#ede9fe',
            color: isPast ? '#059669' : C.primary,
            flexShrink: 0,
          }}>
            {isPast ? 'Completed' : 'Upcoming'}
          </span>
        </div>

        {/* Stats mini-row */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          {[
            { label: 'Registered', value: s.total },
            { label: 'Checked In', value: s.checkedIn },
            { label: 'Emails', value: s.emailsSent },
          ].map(stat => (
            <div key={stat.label}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>{stat.value}</span>
              <span style={{ fontSize: '11px', color: C.text3, marginLeft: '4px' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {s.total > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${rate}%`,
                background: isPast
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #6366f1, #818cf8)',
                borderRadius: '999px',
              }} />
            </div>
            <div style={{ fontSize: '11px', color: C.text3, marginTop: '3px' }}>{rate}% checked in</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a href={`/event/${event.id}/upload`} style={{
            fontSize: '12px', fontWeight: 600, color: C.primary, textDecoration: 'none',
            background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '20px', padding: '4px 12px',
          }}>
            Manage →
          </a>
          <a href={`/event/${event.id}/scan`} style={{
            fontSize: '12px', fontWeight: 600, color: '#059669', textDecoration: 'none',
            background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '20px', padding: '4px 12px',
          }}>
            📷 Scan
          </a>
          <a href={`/event/${event.id}/details`} style={{
            fontSize: '12px', fontWeight: 600, color: C.text2, textDecoration: 'none',
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '4px 12px',
          }}>
            ✏️ Edit Details
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.surface }}>
      <HamburgerDrawer variant="organizer" pageTitle="Schedule" userName={organizer?.name ?? ''} />
      <main style={{ padding: '20px 16px 40px', paddingTop: '72px', maxWidth: '680px', margin: '0 auto' }}>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center' as const, color: C.text2, fontSize: '14px', padding: '48px 0' }}>
            No events yet. <a href="/dashboard" style={{ color: C.primary, textDecoration: 'none', fontWeight: 600 }}>Create one →</a>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '14px' }}>
                  Upcoming ({upcoming.length})
                </p>
                {upcoming.map(e => <EventCard key={e.id} event={e} isPast={false} />)}
              </div>
            )}

            {past.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '14px' }}>
                  Past ({past.length})
                </p>
                {past.map(e => <EventCard key={e.id} event={e} isPast={true} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
