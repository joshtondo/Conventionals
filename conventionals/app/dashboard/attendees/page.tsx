import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getAllAttendees } from '@/data/badges'
import { getOrganizerById } from '@/data/auth'
import { getEvents } from '@/data/events'
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

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export default async function AttendeesPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const [allAttendees, events, organizer] = await Promise.all([
    getAllAttendees(session.organizerId),
    getEvents(session.organizerId),
    getOrganizerById(session.organizerId),
  ])

  // Group by event
  const byEvent = new Map<number, { eventName: string; rows: typeof allAttendees }>()
  for (const row of allAttendees) {
    if (!byEvent.has(row.eventId)) {
      byEvent.set(row.eventId, { eventName: row.eventName, rows: [] })
    }
    byEvent.get(row.eventId)!.rows.push(row)
  }

  const totalCount = allAttendees.length
  const checkedInCount = allAttendees.filter(a => a.checkedIn).length

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.surface }}>
      <HamburgerDrawer variant="organizer" pageTitle="Attendees" userName={organizer?.name ?? ''} />
      <main style={{ padding: '20px 16px 40px', paddingTop: '72px', maxWidth: '720px', margin: '0 auto' }}>

        {/* Summary */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{totalCount}</div>
            <div style={{ fontSize: '12px', color: C.text3, marginTop: '2px' }}>Total Attendees</div>
          </div>
          <div style={{ flex: 1, backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', letterSpacing: '-0.03em' }}>{checkedInCount}</div>
            <div style={{ fontSize: '12px', color: C.text3, marginTop: '2px' }}>Checked In</div>
          </div>
          <div style={{ flex: 1, backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em' }}>{events.length}</div>
            <div style={{ fontSize: '12px', color: C.text3, marginTop: '2px' }}>Events</div>
          </div>
        </div>

        {allAttendees.length === 0 ? (
          <div style={{ textAlign: 'center' as const, color: C.text2, fontSize: '14px', padding: '48px 0' }}>
            No attendees yet. <a href="/dashboard" style={{ color: C.primary, textDecoration: 'none', fontWeight: 600 }}>Add attendees →</a>
          </div>
        ) : (
          Array.from(byEvent.entries()).map(([eventId, group], colorOffset) => (
            <div key={eventId} style={{ marginBottom: '28px' }}>
              {/* Event header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: 0 }}>
                  {group.eventName}
                  <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 600, color: C.text3, background: C.surface, border: `1px solid ${C.border}`, borderRadius: '999px', padding: '1px 8px', textTransform: 'none' as const, letterSpacing: 0 }}>
                    {group.rows.length}
                  </span>
                </p>
                <a href={`/event/${eventId}/upload`} style={{ fontSize: '12px', fontWeight: 600, color: C.primary, textDecoration: 'none' }}>
                  Manage →
                </a>
              </div>

              <div style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                {group.rows.map((att, i) => (
                  <div key={att.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: i < group.rows.length - 1 ? `1px solid ${C.surface}` : 'none',
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: AVATAR_COLORS[(i + colorOffset * 2) % AVATAR_COLORS.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: C.white,
                      flexShrink: 0,
                    }}>
                      {initials(att.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {att.name}
                      </div>
                      <div style={{ fontSize: '12px', color: C.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {att.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: att.emailSent ? '#d1fae5' : '#f1f5f9',
                        color: att.emailSent ? '#059669' : C.text3,
                      }}>
                        {att.emailSent ? '📧 Sent' : '📧 Pending'}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: att.checkedIn ? '#d1fae5' : '#ede9fe',
                        color: att.checkedIn ? '#059669' : C.primary,
                      }}>
                        {att.checkedIn ? '✓ In' : 'Reg'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
