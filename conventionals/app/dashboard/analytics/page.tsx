import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'
import { getEvents } from '@/data/events'
import { getDashboardStats } from '@/data/badges'
import { getOrganizerById } from '@/data/auth'
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

export default async function AnalyticsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')

  const [events, statsList, organizer] = await Promise.all([
    getEvents(session.organizerId),
    getDashboardStats(session.organizerId),
    getOrganizerById(session.organizerId),
  ])

  const statsMap = Object.fromEntries(
    statsList.map(s => [s.eventId, s])
  ) as Record<number, { eventId: number; total: number; checkedIn: number; emailsSent: number }>

  const totalRegistered = events.reduce((sum, e) => sum + (statsMap[e.id]?.total ?? 0), 0)
  const totalCheckedIn = events.reduce((sum, e) => sum + (statsMap[e.id]?.checkedIn ?? 0), 0)
  const totalEmails = events.reduce((sum, e) => sum + (statsMap[e.id]?.emailsSent ?? 0), 0)
  const overallRate = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.surface }}>
      <HamburgerDrawer variant="organizer" pageTitle="Analytics" userName={organizer?.name ?? ''} />
      <main style={{ padding: '20px 16px 40px', paddingTop: '72px', maxWidth: '720px', margin: '0 auto' }}>

        {/* Summary tiles */}
        <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Overview
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '32px' }}>
          {[
            { label: 'Total Events', value: events.length, icon: '📅', bg: '#ede9fe', color: C.primary },
            { label: 'Registered', value: totalRegistered, icon: '🎟️', bg: '#e0e7ff', color: '#4338ca' },
            { label: 'Checked In', value: totalCheckedIn, icon: '✅', bg: '#d1fae5', color: '#059669' },
            { label: 'Emails Sent', value: totalEmails, icon: '📧', bg: '#f1f5f9', color: C.text2 },
            { label: 'Check-in Rate', value: `${overallRate}%`, icon: '📊', bg: '#fef3c7', color: '#d97706' },
          ].map((tile) => (
            <div key={tile.label} style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: tile.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', marginBottom: '8px' }}>
                {tile.icon}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: tile.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {tile.value}
              </div>
              <div style={{ fontSize: '12px', color: C.text3, marginTop: '3px', fontWeight: 500 }}>
                {tile.label}
              </div>
            </div>
          ))}
        </div>

        {/* Per-event breakdown */}
        <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px' }}>
          By Event
        </p>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.text2, fontSize: '14px', padding: '48px 0' }}>
            No events yet. <a href="/dashboard" style={{ color: C.primary, textDecoration: 'none', fontWeight: 600 }}>Create one →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map((event) => {
              const s = statsMap[event.id] ?? { total: 0, checkedIn: 0, emailsSent: 0 }
              const rate = s.total > 0 ? Math.round((s.checkedIn / s.total) * 100) : 0
              return (
                <div key={event.id} style={{
                  backgroundColor: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: '16px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>{event.name}</div>
                      <div style={{ fontSize: '12px', color: C.text3 }}>{event.eventDate ?? 'No date set'}</div>
                    </div>
                    <a href={`/event/${event.id}/upload`} style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: C.primary,
                      textDecoration: 'none',
                      background: '#ede9fe',
                      border: '1px solid #c4b5fd',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      whiteSpace: 'nowrap' as const,
                      flexShrink: 0,
                    }}>
                      Manage →
                    </a>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    {[
                      { label: 'Registered', value: s.total, color: C.text },
                      { label: 'Checked In', value: s.checkedIn, color: '#059669' },
                      { label: 'Emails', value: s.emailsSent, color: C.text2 },
                    ].map((stat) => (
                      <div key={stat.label} style={{ textAlign: 'center' as const }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: stat.color, letterSpacing: '-0.03em' }}>{stat.value}</div>
                        <div style={{ fontSize: '11px', color: C.text3, marginTop: '2px', fontWeight: 500 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.text3, marginBottom: '4px' }}>
                      <span>Check-in progress</span>
                      <span>{rate}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${rate}%`,
                        background: rate === 100
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : 'linear-gradient(90deg, #6366f1, #818cf8)',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
