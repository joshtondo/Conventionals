'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  primary: '#6366f1',
  accent: '#10b981',
  danger: '#ef4444',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
  surface: '#f8fafc',
}

type Event = { id: number; name: string; eventDate: string | null }

function EditEventModal({
  event,
  onClose,
  onSaved,
}: {
  event: Event
  onClose: () => void
  onSaved: (updated: Event) => void
}) {
  const [name, setName] = useState(event.name)
  const [eventDate, setEventDate] = useState(event.eventDate ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), eventDate: eventDate || null }),
      })
      if (res.ok) {
        const data = await res.json()
        onSaved(data)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: C.white, borderRadius: '20px', padding: '24px',
        width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }} onClick={e => e.stopPropagation()}>
        <p style={{ margin: '0 0 18px', fontSize: '17px', fontWeight: 700, color: C.text }}>Edit Event</p>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>
              Event Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', border: `1.5px solid ${C.border}`,
                borderRadius: '10px', fontSize: '14px', color: C.text, background: C.surface,
                boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>
              Event Date <span style={{ color: C.text3, fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: `1.5px solid ${C.border}`,
                borderRadius: '10px', fontSize: '14px', color: C.text, background: C.surface,
                boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          {error && <p style={{ fontSize: '13px', color: C.danger, marginBottom: '12px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, height: '42px', background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: C.text2, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, height: '42px',
                background: saving ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                color: C.white, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SettingsClient({ initialEvents }: { initialEvents: Event[] }) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  async function handleDelete(eventId: number) {
    setDeletingId(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== eventId))
        setConfirmDeleteId(null)
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  function handleSaved(updated: Event) {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
    setEditingEvent(null)
    router.refresh()
  }

  return (
    <>
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Event Management */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Events ({events.length})
        </p>

        {events.length === 0 ? (
          <div style={{
            background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px',
            padding: '32px', textAlign: 'center', color: C.text3, fontSize: '14px',
          }}>
            No events yet.{' '}
            <a href="/dashboard" style={{ color: C.primary, fontWeight: 600, textDecoration: 'none' }}>
              Create one →
            </a>
          </div>
        ) : (
          <div>
            {events.map(event => (
              <div key={event.id} style={{
                background: C.white, border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${C.primary}`,
                borderRadius: '14px', padding: '14px 16px', marginBottom: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.name}
                    </div>
                    <div style={{ fontSize: '12px', color: C.text3 }}>
                      {formatDate(event.eventDate) ?? 'No date set'}
                    </div>
                  </div>

                  {confirmDeleteId === event.id ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: C.danger, fontWeight: 600 }}>Delete?</span>
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={deletingId === event.id}
                        style={{
                          fontSize: '12px', fontWeight: 700, padding: '4px 10px',
                          background: C.danger, color: C.white, border: 'none',
                          borderRadius: '8px', cursor: 'pointer',
                        }}
                      >
                        {deletingId === event.id ? '…' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          fontSize: '12px', fontWeight: 600, padding: '4px 10px',
                          background: C.surface, color: C.text2, border: `1px solid ${C.border}`,
                          borderRadius: '8px', cursor: 'pointer',
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => setEditingEvent(event)}
                        style={{
                          fontSize: '12px', fontWeight: 600, padding: '4px 12px',
                          background: '#ede9fe', color: C.primary,
                          border: '1px solid #c4b5fd', borderRadius: '20px', cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(event.id)}
                        style={{
                          fontSize: '12px', fontWeight: 600, padding: '4px 12px',
                          background: '#fee2e2', color: C.danger,
                          border: '1px solid #fca5a5', borderRadius: '20px', cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Account
        </p>
        <div style={{
          background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden',
        }}>
          {[
            { label: 'Update name or password', href: '/dashboard/profile', icon: '👤' },
            { label: 'View analytics', href: '/dashboard/analytics', icon: '📊' },
            { label: 'Manage attendees', href: '/dashboard/attendees', icon: '👥' },
          ].map((item, i, arr) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', textDecoration: 'none',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: C.text }}>{item.label}</span>
              <span style={{ fontSize: '16px', color: C.text3 }}>›</span>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
