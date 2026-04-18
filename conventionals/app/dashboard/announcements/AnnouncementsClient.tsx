'use client'

import { useState } from 'react'

const C = {
  primary: '#6366f1',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
  surface: '#f8fafc',
  danger: '#b91c1c',
  accent: '#10b981',
}

type EventOption = { id: number; name: string; attendeeCount: number }

export default function AnnouncementsClient({ events }: { events: EventOption[] }) {
  const [selectedEventId, setSelectedEventId] = useState<number | ''>(events[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedEvent = events.find(e => e.id === selectedEventId)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEventId) { setError('Please select an event'); return }
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/events/${selectedEventId}/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, message }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        setSubject('')
        setMessage('')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to send announcement')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: `1.5px solid ${C.border}`,
    borderRadius: '10px',
    fontSize: '14px',
    color: C.text,
    background: C.surface,
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const label: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: C.text2,
    marginBottom: '6px',
  }

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center' as const, color: C.text2, fontSize: '14px', padding: '48px 0' }}>
        No events yet. <a href="/dashboard" style={{ color: C.primary, textDecoration: 'none', fontWeight: 600 }}>Create one →</a>
      </div>
    )
  }

  return (
    <div>
      {/* Success banner */}
      {result && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '20px',
          color: C.white,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>✅</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>Announcement sent!</div>
            <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>
              Delivered to {result.sent} of {result.total} attendees
            </div>
          </div>
        </div>
      )}

      <div style={{
        backgroundColor: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '20px',
      }}>
        <form onSubmit={handleSend}>
          {/* Event selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={label} htmlFor="event-select">Send to Event</label>
            <select
              id="event-select"
              value={selectedEventId}
              onChange={e => setSelectedEventId(Number(e.target.value))}
              style={{ ...inputStyle, cursor: 'pointer' }}
              required
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.attendeeCount} attendee{ev.attendeeCount !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Recipient count info */}
          {selectedEvent && (
            <div style={{
              background: '#ede9fe',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>📢</span>
              <span style={{ fontSize: '13px', color: C.primary, fontWeight: 600 }}>
                Will send to {selectedEvent.attendeeCount} attendee{selectedEvent.attendeeCount !== 1 ? 's' : ''} of &ldquo;{selectedEvent.name}&rdquo;
              </span>
            </div>
          )}

          {/* Subject */}
          <div style={{ marginBottom: '14px' }}>
            <label style={label} htmlFor="ann-subject">Subject</label>
            <input
              id="ann-subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={inputStyle}
              required
              placeholder="e.g. Important update about tomorrow's schedule"
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: '16px' }}>
            <label style={label} htmlFor="ann-message">Message</label>
            <textarea
              id="ann-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{
                ...inputStyle,
                minHeight: '140px',
                resize: 'vertical' as const,
              }}
              required
              placeholder="Write your announcement here…"
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: C.danger, marginBottom: '12px' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={sending || !selectedEventId}
            style={{
              height: '48px',
              padding: '0 24px',
              background: sending ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: C.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer',
              boxShadow: sending ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            {sending ? 'Sending…' : `📢 Send Announcement`}
          </button>
        </form>
      </div>

      {/* Tips */}
      <div style={{
        backgroundColor: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '16px 20px',
        marginTop: '16px',
      }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: C.text3, textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 8px' }}>
          Tips
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: C.text2, lineHeight: 1.7 }}>
          <li>Emails are sent to all registered attendees of the selected event.</li>
          <li>Use line breaks in your message — they&apos;ll appear as paragraph breaks in the email.</li>
          <li>Subject lines under 50 characters display best on mobile.</li>
        </ul>
      </div>
    </div>
  )
}
