'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type EventItem = {
  id: number
  name: string
  eventDate: string | null
  createdAt: string | null
}

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  } as React.CSSProperties,
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  } as React.CSSProperties,
  logoutButton: {
    padding: '0.375rem 0.875rem',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  main: {
    padding: '2rem',
  } as React.CSSProperties,
  emptyState: {
    color: '#6b7280',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  eventList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  eventItem: {
    padding: '1rem',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  eventItemHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
  } as React.CSSProperties,
  eventName: {
    fontWeight: '600',
    color: '#111827',
    fontSize: '1rem',
    margin: '0 0 0.25rem',
  } as React.CSSProperties,
  eventDate: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  } as React.CSSProperties,
  manageLink: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: '0.875rem',
    display: 'inline-block',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  deleteButton: {
    padding: '0.25rem 0.625rem',
    backgroundColor: 'transparent',
    color: '#b91c1c',
    border: '1px solid #b91c1c',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    flexShrink: 0,
  } as React.CSSProperties,
  statsText: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    margin: '0.25rem 0 0',
  } as React.CSSProperties,
  deleteButtonDisabled: {
    padding: '0.25rem 0.625rem',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'not-allowed',
    flexShrink: 0,
  } as React.CSSProperties,
  form: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  formRow: {
    marginBottom: '1rem',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.375rem',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#111827',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  submitButton: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  } as React.CSSProperties,
  submitButtonDisabled: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#a5b4fc',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  formError: {
    color: '#b91c1c',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
}

type StatsItem = { total: number; checkedIn: number; emailsSent: number }

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

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // network error — session may still be active server-side; redirect anyway
    }
    router.push('/login')
  }

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
      <header style={s.header}>
        <h1 style={s.heading}>My Events</h1>
        <button style={s.logoutButton} onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main style={s.main}>
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

        {events.length === 0 ? (
          <p style={s.emptyState}>No events yet.</p>
        ) : (
          <ul style={s.eventList}>
            {events.map((event) => {
              const eventStats = stats[event.id] ?? { total: 0, checkedIn: 0, emailsSent: 0 }
              return (
                <li key={event.id} style={s.eventItem}>
                  <div style={s.eventItemHeader}>
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
                  <p style={s.statsText}>
                    {eventStats.total} attendees · {eventStats.checkedIn} checked in · {eventStats.emailsSent} emails sent
                  </p>
                  <a href={`/event/${event.id}/upload`} style={s.manageLink}>
                    Manage attendees →
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
