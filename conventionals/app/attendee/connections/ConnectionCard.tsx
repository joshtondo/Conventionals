'use client'

import { useState } from 'react'

type ContactInfo = { email?: string; linkedin?: string; twitter?: string; website?: string } | null

type Props = {
  id: number
  connectedName: string
  contactInfo: ContactInfo
  eventName: string | null
  notes: string | null
}

const s = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    marginBottom: '0.75rem',
    maxWidth: '600px',
  } as React.CSSProperties,
  name: {
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 0.25rem',
    fontSize: '1rem',
  } as React.CSSProperties,
  meta: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0 0 0.5rem',
  } as React.CSSProperties,
  link: {
    fontSize: '0.75rem',
    color: '#4f46e5',
    marginRight: '0.75rem',
    textDecoration: 'none',
  } as React.CSSProperties,
  notesLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#374151',
    margin: '0.75rem 0 0.25rem',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#111827',
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
  } as React.CSSProperties,
  saveButton: {
    marginTop: '0.5rem',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  saveButtonDisabled: {
    marginTop: '0.5rem',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#a5b4fc',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  savedText: {
    fontSize: '0.75rem',
    color: '#059669',
    marginLeft: '0.5rem',
  } as React.CSSProperties,
}

export default function ConnectionCard({ id, connectedName, contactInfo, eventName, notes: initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const ci = contactInfo ?? {}

  async function handleSave() {
    setStatus('saving')
    try {
      await fetch(`/api/attendee/connections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: notes || null }),
      })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div style={s.card}>
      <p style={s.name}>{connectedName}</p>
      {eventName && <p style={s.meta}>{eventName}</p>}
      <div>
        {ci.linkedin && <a href={ci.linkedin} style={s.link} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
        {ci.twitter && <a href={ci.twitter} style={s.link} target="_blank" rel="noopener noreferrer">Twitter</a>}
        {ci.website && <a href={ci.website} style={s.link} target="_blank" rel="noopener noreferrer">Website</a>}
      </div>
      <label style={s.notesLabel} htmlFor={`notes-${id}`}>Notes</label>
      <textarea
        id={`notes-${id}`}
        style={s.textarea}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this person…"
      />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          style={status === 'saving' ? s.saveButtonDisabled : s.saveButton}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span style={s.savedText}>Saved!</span>}
      </div>
    </div>
  )
}
