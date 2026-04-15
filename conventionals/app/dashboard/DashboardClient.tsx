'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HamburgerDrawer from '@/components/HamburgerDrawer'

type EventItem = {
  id: number
  name: string
  eventDate: string | null
  createdAt: string | null
}

type StatsItem = { total: number; checkedIn: number; emailsSent: number }

const C = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  accent: '#10b981',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  white: '#ffffff',
  danger: '#b91c1c',
  dangerBorder: '#fca5a5',
}

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: C.surface,
  } as React.CSSProperties,
  main: {
    padding: '20px 16px 40px',
    paddingTop: '72px',
    maxWidth: '680px',
    margin: '0 auto',
  } as React.CSSProperties,

  // Bento grid
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '28px',
  } as React.CSSProperties,
  statTile: {
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  } as React.CSSProperties,
  statIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    marginBottom: '4px',
  } as React.CSSProperties,
  statNumber: {
    fontSize: '26px',
    fontWeight: '800',
    color: C.text,
    lineHeight: 1,
    letterSpacing: '-0.03em',
  } as React.CSSProperties,
  statLabel: {
    fontSize: '12px',
    color: C.text2,
    fontWeight: 500,
  } as React.CSSProperties,

  // Section heading
  sectionHeading: {
    fontSize: '13px',
    fontWeight: 700,
    color: C.text2,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    marginBottom: '12px',
  } as React.CSSProperties,

  // Create form
  form: {
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
  } as React.CSSProperties,
  formRow: {
    marginBottom: '12px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: C.text2,
    marginBottom: '6px',
    letterSpacing: '0.02em',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#f5f3ff',
    border: '1.5px solid #ddd6fe',
    borderRadius: '10px',
    fontSize: '0.875rem',
    color: '#1e1b4b',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  submitButton: {
    padding: '0 20px',
    height: '44px',
    backgroundColor: C.primary,
    color: C.white,
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  } as React.CSSProperties,
  submitButtonDisabled: {
    padding: '0 20px',
    height: '44px',
    backgroundColor: '#a5b4fc',
    color: C.white,
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  formError: {
    color: C.danger,
    fontSize: '0.8rem',
    marginTop: '8px',
  } as React.CSSProperties,

  // Event list
  eventList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  eventItem: {
    backgroundColor: C.white,
    borderRadius: '14px',
    border: `1px solid ${C.border}`,
    borderLeft: `4px solid ${C.primary}`,
    padding: '16px',
    marginBottom: '10px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  } as React.CSSProperties,
  eventItemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  } as React.CSSProperties,
  eventName: {
    fontWeight: '700',
    color: C.text,
    fontSize: '0.9375rem',
    margin: 0,
    lineHeight: 1.3,
  } as React.CSSProperties,
  eventDate: {
    fontSize: '0.8rem',
    color: C.text2,
    margin: 0,
  } as React.CSSProperties,
  statPills: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
    marginTop: '2px',
  } as React.CSSProperties,
  pill: {
    fontSize: '0.75rem',
    color: C.text2,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '20px',
    padding: '2px 10px',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  pillGreen: {
    fontSize: '0.75rem',
    color: '#065f46',
    background: '#d1fae5',
    border: '1px solid #6ee7b7',
    borderRadius: '20px',
    padding: '2px 10px',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  manageLink: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '44px',
    color: C.primary,
    textDecoration: 'none',
    fontSize: '0.8125rem',
    fontWeight: '600',
    marginRight: '12px',
  } as React.CSSProperties,
  scanLink: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '32px',
    padding: '0 12px',
    backgroundColor: '#ede9fe',
    color: C.primary,
    textDecoration: 'none',
    fontSize: '0.8125rem',
    fontWeight: '600',
    borderRadius: '20px',
    border: `1px solid #c4b5fd`,
  } as React.CSSProperties,
  deleteButton: {
    height: '32px',
    padding: '0 10px',
    backgroundColor: 'transparent',
    color: C.danger,
    border: `1px solid ${C.dangerBorder}`,
    borderRadius: '8px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    flexShrink: 0,
  } as React.CSSProperties,
  deleteButtonDisabled: {
    height: '32px',
    padding: '0 10px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.75rem',
    cursor: 'not-allowed',
    flexShrink: 0,
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    color: C.text2,
    fontSize: '0.875rem',
    padding: '32px 0',
  } as React.CSSProperties,
}

export default function DashboardClient({
  events,
  stats,
}: {
  events: EventItem[]
  stats: Record<number, StatsItem>
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})

  // Aggregate stats across all events
  const totalRegistered = events.reduce((sum, e) => sum + (stats[e.id]?.total ?? 0), 0)
  const totalCheckedIn = events.reduce((sum, e) => sum + (stats[e.id]?.checkedIn ?? 0), 0)
  const totalEmails = events.reduce((sum, e) => sum + (stats[e.id]?.emailsSent ?? 0), 0)

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
    if (!window.confirm('Delete this event? This cannot be undone.')) return
    setDeleting((prev) => ({ ...prev, [eventId]: true }))
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        window.alert('Failed to delete event. Please try again.')
        return
      }
      router.refresh()
    } catch {
      window.alert('Network error — please try again.')
    } finally {
      setDeleting((prev) => ({ ...prev, [eventId]: false }))
    }
  }

  return (
    <div style={s.container}>
      <HamburgerDrawer variant="organizer" />
      <main style={s.main}>

        {/* Bento stat grid */}
        <div style={s.bentoGrid}>
          <div style={s.statTile}>
            <div style={{ ...s.statIcon, background: '#ede9fe' }}>📅</div>
            <div style={s.statNumber}>{events.length}</div>
            <div style={s.statLabel}>Events</div>
          </div>
          <div style={s.statTile}>
            <div style={{ ...s.statIcon, background: '#e0e7ff' }}>🎟️</div>
            <div style={s.statNumber}>{totalRegistered}</div>
            <div style={s.statLabel}>Registered</div>
          </div>
          <div style={s.statTile}>
            <div style={{ ...s.statIcon, background: '#d1fae5' }}>✅</div>
            <div style={{ ...s.statNumber, color: '#065f46' }}>{totalCheckedIn}</div>
            <div style={s.statLabel}>Checked In</div>
          </div>
          <div style={s.statTile}>
            <div style={{ ...s.statIcon, background: '#f1f5f9' }}>📧</div>
            <div style={s.statNumber}>{totalEmails}</div>
            <div style={s.statLabel}>Emails Sent</div>
          </div>
        </div>

        {/* Create event form */}
        <p style={s.sectionHeading}>New Event</p>
        <form style={s.form} onSubmit={handleCreate}>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="event-name">Event Name *</label>
            <input
              id="event-name"
              type="text"
              style={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual Tech Summit"
              required
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="event-date">Date (optional)</label>
            <input
              id="event-date"
              type="date"
              style={s.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button
            type="submit"
            style={submitting ? s.submitButtonDisabled : s.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create Event'}
          </button>
          {error && <p style={s.formError}>{error}</p>}
        </form>

        {/* Event list */}
        <p style={s.sectionHeading}>Your Events</p>
        {events.length === 0 ? (
          <p style={s.emptyState}>No events yet — create one above.</p>
        ) : (
          <ul style={s.eventList}>
            {events.map((event) => {
              const es = stats[event.id] ?? { total: 0, checkedIn: 0, emailsSent: 0 }
              return (
                <li key={event.id} style={s.eventItem}>
                  <div style={s.eventItemRow}>
                    <p style={s.eventName}>{event.name}</p>
                    <button
                      style={deleting[event.id] ? s.deleteButtonDisabled : s.deleteButton}
                      onClick={() => handleDelete(event.id)}
                      disabled={!!deleting[event.id]}
                    >
                      {deleting[event.id] ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                  <p style={s.eventDate}>{event.eventDate ?? 'No date set'}</p>
                  <div style={s.statPills}>
                    <span style={s.pill}>🎟️ {es.total} registered</span>
                    <span style={es.checkedIn > 0 ? s.pillGreen : s.pill}>✅ {es.checkedIn} checked in</span>
                    <span style={s.pill}>📧 {es.emailsSent} emails</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <a href={`/event/${event.id}/upload`} style={s.manageLink}>
                      Manage attendees →
                    </a>
                    <a href={`/event/${event.id}/scan`} style={s.scanLink}>
                      📷 Scan In
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
