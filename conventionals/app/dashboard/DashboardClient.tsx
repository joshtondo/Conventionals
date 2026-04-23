'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HamburgerDrawer from '@/components/HamburgerDrawer'
import { initials } from '@/lib/utils'

type EventItem = {
  id: number
  name: string
  eventDate: string | null
  location: string | null
  createdAt: string | null
}

type StatsItem = { total: number; checkedIn: number; emailsSent: number }

type RecentAttendee = {
  id: number
  name: string
  email: string
  eventName: string
  checkedIn: boolean | null
}

const C = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  accent: '#10b981',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
  danger: '#b91c1c',
  dangerBorder: '#fca5a5',
}

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

export default function DashboardClient({
  events,
  stats,
  userName = '',
  recentAttendees = [],
}: {
  events: EventItem[]
  stats: Record<number, StatsItem>
  userName?: string
  recentAttendees?: RecentAttendee[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Aggregate stats across all events
  const totalRegistered = events.reduce((sum, e) => sum + (stats[e.id]?.total ?? 0), 0)
  const totalCheckedIn = events.reduce((sum, e) => sum + (stats[e.id]?.checkedIn ?? 0), 0)
  const totalEmails = events.reduce((sum, e) => sum + (stats[e.id]?.emailsSent ?? 0), 0)

  // For progress bar: checked-in ratio
  const checkinRatio = totalRegistered > 0 ? (totalCheckedIn / totalRegistered) : 0

  // Live event: first event with any checkins
  const liveEvent = events.find(e => (stats[e.id]?.checkedIn ?? 0) > 0)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, date: date || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to create event')
        return
      }
      setName('')
      setDate('')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(eventId: number) {
    setDeleteError(null)
    setDeleting((prev) => ({ ...prev, [eventId]: true }))
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        setDeleteError('Failed to delete event — please try again.')
        setConfirmDelete(null)
        return
      }
      setConfirmDelete(null)
      router.refresh()
    } catch {
      setDeleteError('Network error — please try again.')
      setConfirmDelete(null)
    } finally {
      setDeleting((prev) => ({ ...prev, [eventId]: false }))
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: C.surface }}>
        <HamburgerDrawer variant="organizer" pageTitle="Dashboard" userName={userName} />
        <main style={{
          padding: '20px 16px 40px',
          paddingTop: '72px',
          maxWidth: '680px',
          margin: '0 auto',
        }}>

          {/* Live event pill */}
          {liveEvent && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#d1fae5',
              color: '#059669',
              fontSize: '12px',
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: '999px',
              marginBottom: '14px',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse 1.5s infinite',
              }} />
              {liveEvent.name} · LIVE
            </div>
          )}

          {/* Bento grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {/* Registered — indigo gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              borderRadius: '20px',
              padding: '16px',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)' }}>
                  Registered
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '999px' }}>
                  🎟️
                </span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {totalRegistered}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>
                across {events.length} event{events.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Checked In — green gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '20px',
              padding: '16px',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)' }}>
                  Checked In
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '999px' }}>
                  ✅
                </span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {totalCheckedIn}
              </div>
              {/* Progress bar */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.25)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.round(checkinRatio * 100)}%`,
                    background: 'rgba(255,255,255,0.75)',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>
                  <span>{Math.round(checkinRatio * 100)}% check-in rate</span>
                  <span>{totalRegistered} total</span>
                </div>
              </div>
            </div>

            {/* Events count — white */}
            <div style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: C.text3, marginBottom: '4px' }}>
                Events
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {events.length}
              </div>
              <div style={{ fontSize: '12px', color: C.text3, marginTop: '4px' }}>📅 active</div>
            </div>

            {/* Emails sent — white */}
            <div style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: C.text3, marginBottom: '4px' }}>
                Emails Sent
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {totalEmails}
              </div>
              <div style={{ fontSize: '12px', color: C.text3, marginTop: '4px' }}>📧 delivered</div>
            </div>

            {/* Recent Attendees — span 2 */}
            <div style={{
              gridColumn: 'span 2',
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: C.text3, marginBottom: '12px' }}>
                Recent Attendees
              </div>
              {recentAttendees.length === 0 ? (
                <div style={{ color: C.text3, fontSize: '13px', textAlign: 'center' as const, padding: '8px 0' }}>
                  No attendees yet
                </div>
              ) : (
                recentAttendees.map((att, i) => (
                  <div key={att.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '7px 0',
                    borderBottom: i < recentAttendees.length - 1 ? `1px solid ${C.surface}` : 'none',
                  }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {initials(att.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {att.name}
                      </div>
                      <div style={{ fontSize: '11px', color: C.text3 }}>{att.eventName}</div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: att.checkedIn ? '#d1fae5' : '#ede9fe',
                      color: att.checkedIn ? '#059669' : '#6366f1',
                      flexShrink: 0,
                    }}>
                      {att.checkedIn ? 'Checked In' : 'Registered'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions — span 2 */}
            <div style={{
              gridColumn: 'span 2',
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: C.text3, marginBottom: '12px' }}>
                Quick Actions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: '+ New Event', primary: true, href: null, onClick: () => document.getElementById('event-name')?.focus() },
                  { label: '📷 Scan Check-In', primary: false, href: events.length > 0 ? `/event/${events[0].id}/scan` : null },
                  { label: '👥 Manage Attendees', primary: false, href: events.length > 0 ? `/event/${events[0].id}/upload` : null },
                  { label: '📊 View Analytics', primary: false, href: '/dashboard/analytics' },
                ].map((action, i) => (
                  action.href ? (
                    <a
                      key={i}
                      href={action.href}
                      style={{
                        padding: '10px',
                        borderRadius: '12px',
                        border: action.primary ? '1.5px solid #c4b5fd' : `1.5px solid ${C.border}`,
                        textAlign: 'center' as const,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: action.primary ? C.primary : C.text2,
                        background: action.primary ? '#ede9fe' : C.surface,
                        textDecoration: 'none',
                        display: 'block',
                      }}
                    >
                      {action.label}
                    </a>
                  ) : (
                    <button
                      key={i}
                      onClick={action.onClick}
                      style={{
                        padding: '10px',
                        borderRadius: '12px',
                        border: action.primary ? '1.5px solid #c4b5fd' : `1.5px solid ${C.border}`,
                        textAlign: 'center' as const,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: action.primary ? C.primary : C.text2,
                        background: action.primary ? '#ede9fe' : C.surface,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        width: '100%',
                      }}
                    >
                      {action.label}
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Create event form */}
          <p style={{
            fontSize: '13px',
            fontWeight: 700,
            color: C.text2,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            marginBottom: '12px',
          }}>
            New Event
          </p>
          <form style={{
            backgroundColor: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
          }} onSubmit={handleCreate}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: C.text2,
                marginBottom: '6px',
                letterSpacing: '0.02em',
              }} htmlFor="event-name">
                Event Name *
              </label>
              <input
                id="event-name"
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#f5f3ff',
                  border: '1.5px solid #ddd6fe',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  color: '#1e1b4b',
                  boxSizing: 'border-box' as const,
                }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Annual Tech Summit"
                required
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: C.text2,
                marginBottom: '6px',
                letterSpacing: '0.02em',
              }} htmlFor="event-date">
                Date (optional)
              </label>
              <input
                id="event-date"
                type="date"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#f5f3ff',
                  border: '1.5px solid #ddd6fe',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  color: '#1e1b4b',
                  boxSizing: 'border-box' as const,
                }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '0 20px',
                height: '44px',
                backgroundColor: submitting ? '#a5b4fc' : C.primary,
                color: C.white,
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Event'}
            </button>
            {error && <p style={{ color: C.danger, fontSize: '0.8rem', marginTop: '8px' }}>{error}</p>}
          </form>

          {/* Event list */}
          <p style={{
            fontSize: '13px',
            fontWeight: 700,
            color: C.text2,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            marginBottom: '12px',
          }}>
            Your Events
          </p>
          {deleteError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: C.danger }}>
              {deleteError}
            </div>
          )}
          {events.length === 0 ? (
            <p style={{ textAlign: 'center' as const, color: C.text2, fontSize: '0.875rem', padding: '32px 0' }}>
              No events yet — create one above.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {events.map((event) => {
                const es = stats[event.id] ?? { total: 0, checkedIn: 0, emailsSent: 0 }
                const isConfirming = confirmDelete === event.id
                return (
                  <li key={event.id} style={{
                    backgroundColor: C.white,
                    borderRadius: '14px',
                    border: `1px solid ${isConfirming ? '#fca5a5' : C.border}`,
                    borderLeft: `4px solid ${isConfirming ? C.danger : C.primary}`,
                    padding: '16px',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: '6px',
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <p style={{ fontWeight: 700, color: C.text, fontSize: '0.9375rem', margin: 0, lineHeight: 1.3 }}>
                        {event.name}
                      </p>
                      {isConfirming ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '12px', color: C.danger, fontWeight: 600, whiteSpace: 'nowrap' as const }}>Sure?</span>
                          <button
                            style={{
                              height: '32px', padding: '0 10px',
                              backgroundColor: C.danger, color: C.white,
                              border: 'none', borderRadius: '8px',
                              fontSize: '0.75rem', fontWeight: 700,
                              cursor: deleting[event.id] ? 'not-allowed' : 'pointer',
                            }}
                            onClick={() => handleDelete(event.id)}
                            disabled={!!deleting[event.id]}
                          >
                            {deleting[event.id] ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button
                            style={{
                              height: '32px', padding: '0 10px',
                              backgroundColor: 'transparent', color: C.text2,
                              border: `1px solid ${C.border}`, borderRadius: '8px',
                              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            }}
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          style={{
                            height: '32px', padding: '0 10px',
                            backgroundColor: 'transparent',
                            color: C.danger,
                            border: `1px solid ${C.dangerBorder}`,
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          onClick={() => setConfirmDelete(event.id)}
                          disabled={!!deleting[event.id]}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: C.text2, margin: 0 }}>
                      {event.eventDate ?? 'No date set'}
                    </p>
                    {event.location && (
                      <p style={{ fontSize: '0.8rem', color: C.text3, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📍 {event.location}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, marginTop: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: C.text2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '2px 10px', whiteSpace: 'nowrap' as const }}>
                        🎟️ {es.total} registered
                      </span>
                      <span style={{ fontSize: '0.75rem', color: es.checkedIn > 0 ? '#065f46' : C.text2, background: es.checkedIn > 0 ? '#d1fae5' : C.surface, border: `1px solid ${es.checkedIn > 0 ? '#6ee7b7' : C.border}`, borderRadius: '20px', padding: '2px 10px', whiteSpace: 'nowrap' as const }}>
                        ✅ {es.checkedIn} checked in
                      </span>
                      <span style={{ fontSize: '0.75rem', color: C.text2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '2px 10px', whiteSpace: 'nowrap' as const }}>
                        📧 {es.emailsSent} emails
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      <a href={`/event/${event.id}/upload`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '32px',
                        padding: '0 12px',
                        color: C.primary,
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        background: '#ede9fe',
                        borderRadius: '20px',
                        border: '1px solid #c4b5fd',
                      }}>
                        Attendees →
                      </a>
                      <a href={`/event/${event.id}/scan`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '32px',
                        padding: '0 12px',
                        backgroundColor: '#d1fae5',
                        color: '#059669',
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: '1px solid #6ee7b7',
                      }}>
                        📷 Scan
                      </a>
                      <a href={`/event/${event.id}/details`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '32px',
                        padding: '0 12px',
                        backgroundColor: C.surface,
                        color: C.text2,
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: `1px solid ${C.border}`,
                      }}>
                        ✏️ Edit Details
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </main>
      </div>
    </>
  )
}
