'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  eventId: number
  initial: {
    name: string
    eventDate: string | null
    description: string | null
    location: string | null
    startTime: string | null
    endTime: string | null
    website: string | null
  }
}

const C = {
  primary: '#6366f1',
  border: '#ddd6fe',
  bg: '#f5f3ff',
  text: '#1e1b4b',
  text2: '#475569',
  danger: '#b91c1c',
  white: '#ffffff',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: C.bg,
  border: `1.5px solid ${C.border}`,
  borderRadius: '10px',
  fontSize: '14px',
  color: C.text,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#9ca3af',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '6px',
}

export default function EventDetailsForm({ eventId, initial }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [eventDate, setEventDate] = useState(initial.eventDate ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [location, setLocation] = useState(initial.location ?? '')
  const [startTime, setStartTime] = useState(initial.startTime ?? '')
  const [endTime, setEndTime] = useState(initial.endTime ?? '')
  const [website, setWebsite] = useState(initial.website ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          eventDate: eventDate || null,
          description: description || null,
          location: location || null,
          startTime: startTime || null,
          endTime: endTime || null,
          website: website || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Name */}
      <div>
        <label style={labelStyle} htmlFor="det-name">Event Name *</label>
        <input
          id="det-name"
          type="text"
          required
          style={inputStyle}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Annual Tech Summit"
        />
      </div>

      {/* Date */}
      <div>
        <label style={labelStyle} htmlFor="det-date">Date</label>
        <input
          id="det-date"
          type="date"
          style={inputStyle}
          value={eventDate}
          onChange={e => setEventDate(e.target.value)}
        />
      </div>

      {/* Time row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle} htmlFor="det-start">Start Time</label>
          <input
            id="det-start"
            type="time"
            style={inputStyle}
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="det-end">End Time</label>
          <input
            id="det-end"
            type="time"
            style={inputStyle}
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label style={labelStyle} htmlFor="det-loc">Location</label>
        <input
          id="det-loc"
          type="text"
          style={inputStyle}
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Marriott Convention Center, Chicago IL"
        />
      </div>

      {/* Website */}
      <div>
        <label style={labelStyle} htmlFor="det-web">Website</label>
        <input
          id="det-web"
          type="url"
          style={inputStyle}
          value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="https://myevent.com"
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle} htmlFor="det-desc">Description</label>
        <textarea
          id="det-desc"
          style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', lineHeight: 1.5 }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What's this event about?"
        />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: C.danger, margin: 0, fontWeight: 500 }}>{error}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            height: '44px',
            padding: '0 24px',
            background: saving ? '#a5b4fc' : C.primary,
            color: C.white,
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>Saved ✓</span>
        )}
      </div>
    </form>
  )
}
