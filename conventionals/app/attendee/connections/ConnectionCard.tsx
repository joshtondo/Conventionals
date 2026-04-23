'use client'

import { useState, useEffect } from 'react'

type ContactInfo = { email?: string; linkedin?: string; twitter?: string; website?: string } | null
type Draft = { subject: string; body: string }

type Props = {
  id: number
  connectedName: string
  contactInfo: ContactInfo
  eventName: string | null
  notes: string | null
  myName: string
}

const QUICK_OPTIONS = [
  { key: 'follow-up', emoji: '👋', label: 'Nice to meet you' },
  { key: 'collaborate', emoji: '🤝', label: "Let's collaborate" },
  { key: 'coffee', emoji: '☕', label: 'Grab a coffee?' },
] as const

type QuickType = typeof QUICK_OPTIONS[number]['key']

function buildMailto(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const chip: React.CSSProperties = {
  fontSize: '12px',
  color: '#4f46e5',
  background: '#f5f3ff',
  border: '1px solid #ddd6fe',
  borderRadius: '999px',
  padding: '4px 10px',
  textDecoration: 'none',
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
}

export default function ConnectionCard({
  id,
  connectedName,
  contactInfo,
  eventName,
  notes: initialNotes,
  myName,
}: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const [showQuick, setShowQuick] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const ci = contactInfo ?? {}
  const hasNotes = notes.trim().length > 0
  const hasContactLinks = ci.email || ci.linkedin || ci.twitter || ci.website

  useEffect(() => {
    if (saveStatus === 'saved') {
      const t = setTimeout(() => setSaveStatus('idle'), 2000)
      return () => clearTimeout(t)
    }
  }, [saveStatus])

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(t)
    }
  }, [copied])

  async function handleSave() {
    setSaveStatus('saving')
    try {
      await fetch(`/api/attendee/connections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: notes || null }),
      })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('idle')
    }
  }

  async function draftFromNotes() {
    setDraft(null)
    setDraftError(null)
    setDrafting(true)
    setShowQuick(false)
    try {
      const res = await fetch('/api/ai/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ connectionName: connectedName, eventName, notes, myName, mode: 'notes' }),
      })
      const data = await res.json()
      if (!res.ok) { setDraftError(data.error ?? 'Could not draft — try again'); return }
      setDraft(data)
    } catch {
      setDraftError('Network error — try again')
    } finally {
      setDrafting(false)
    }
  }

  async function draftQuick(quickType: QuickType) {
    setDraft(null)
    setDraftError(null)
    setDrafting(true)
    setShowQuick(false)
    try {
      const res = await fetch('/api/ai/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ connectionName: connectedName, eventName, myName, mode: 'quick', quickType }),
      })
      const data = await res.json()
      if (!res.ok) { setDraftError(data.error ?? 'Could not draft — try again'); return }
      setDraft(data)
    } catch {
      setDraftError('Network error — try again')
    } finally {
      setDrafting(false)
    }
  }

  async function copyDraft() {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)
      setCopied(true)
    } catch {
      // clipboard unavailable — silently fail
    }
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '14px',
      padding: '16px',
      marginBottom: '12px',
    }}>

      {/* Name + event */}
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 6px', fontSize: '16px', lineHeight: 1.2 }}>
          {connectedName}
        </p>
        {eventName && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '12px', fontWeight: 600, color: '#6366f1',
            background: '#ede9fe', borderRadius: '999px', padding: '3px 10px',
          }}>
            📅 {eventName}
          </span>
        )}
      </div>

      {/* Contact links */}
      {hasContactLinks && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {ci.email && (
            <a href={`mailto:${ci.email}`} style={chip}>✉️ {ci.email}</a>
          )}
          {ci.linkedin && (
            <a href={ci.linkedin} style={chip} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          )}
          {ci.twitter && (
            <a href={ci.twitter} style={chip} target="_blank" rel="noopener noreferrer">Twitter</a>
          )}
          {ci.website && (
            <a href={ci.website} style={chip} target="_blank" rel="noopener noreferrer">Website</a>
          )}
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: '14px' }}>
        <label
          htmlFor={`notes-${id}`}
          style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}
        >
          Notes
        </label>
        <textarea
          id={`notes-${id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this person…"
          style={{
            width: '100%', minHeight: '76px', padding: '10px 12px',
            background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '10px',
            fontSize: '14px', color: '#1e1b4b', boxSizing: 'border-box', resize: 'vertical',
            lineHeight: 1.5,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            style={{
              height: '32px', padding: '0 14px',
              background: saveStatus === 'saving' ? '#a5b4fc' : '#4f46e5',
              color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '13px', fontWeight: 600,
              cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
            }}
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Save'}
          </button>
          {saveStatus === 'saved' && (
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 500 }}>Saved ✓</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#f3f4f6', marginBottom: '14px' }} />

      {/* AI action buttons — hidden while drafting or draft is shown */}
      {!drafting && !draft && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {hasNotes && (
            <button
              onClick={draftFromNotes}
              style={{
                flex: 1, height: '44px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✨ Draft Email
            </button>
          )}
          <button
            onClick={() => setShowQuick(v => !v)}
            style={{
              flex: hasNotes ? '0 0 auto' : 1,
              height: '44px',
              padding: hasNotes ? '0 16px' : '0',
              background: showQuick ? '#ede9fe' : '#f9fafb',
              color: showQuick ? '#6366f1' : '#374151',
              border: `1.5px solid ${showQuick ? '#c4b5fd' : '#e5e7eb'}`,
              borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            ⚡ Quick Draft {showQuick ? '▴' : '▾'}
          </button>
        </div>
      )}

      {/* Quick draft options */}
      {showQuick && !drafting && !draft && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {QUICK_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => draftQuick(opt.key)}
              style={{
                width: '100%', height: '48px',
                background: '#f9fafb', border: '1.5px solid #e5e7eb',
                borderRadius: '10px', fontSize: '14px', fontWeight: 500,
                color: '#374151', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '0 16px', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Generating indicator */}
      {drafting && (
        <div style={{
          textAlign: 'center', padding: '18px 0',
          color: '#6366f1', fontSize: '14px', fontWeight: 500,
        }}>
          ✨ Drafting your email…
        </div>
      )}

      {/* Draft error */}
      {draftError && !drafting && (
        <p style={{ fontSize: '13px', color: '#b91c1c', margin: '8px 0 0', fontWeight: 500 }}>
          {draftError}
        </p>
      )}

      {/* Draft panel */}
      {draft && !drafting && (
        <div style={{
          background: '#f5f3ff', border: '1.5px solid #ddd6fe',
          borderRadius: '12px', padding: '14px',
        }}>
          {/* Draft header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, color: '#6366f1',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              AI Draft
            </span>
            <button
              onClick={() => { setDraft(null); setDraftError(null) }}
              style={{
                background: 'none', border: 'none', color: '#a78bfa',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: '2px 4px',
              }}
            >
              ↺ New draft
            </button>
          </div>

          {/* Subject */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>
            Subject
          </p>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e1b4b', margin: '0 0 12px', lineHeight: 1.4 }}>
            {draft.subject}
          </p>

          {/* Body */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
            Message
          </p>
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.65, margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
            {draft.body}
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ci.email && (
              <a
                href={buildMailto(ci.email, draft.subject, draft.body)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '48px', width: '100%',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff', borderRadius: '10px',
                  fontSize: '15px', fontWeight: 700, textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
              >
                📧 Email {connectedName.split(' ')[0]}
              </a>
            )}
            <button
              onClick={copyDraft}
              style={{
                height: '44px', width: '100%',
                background: copied ? '#d1fae5' : '#ffffff',
                color: copied ? '#059669' : '#374151',
                border: `1.5px solid ${copied ? '#6ee7b7' : '#e5e7eb'}`,
                borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied to clipboard' : 'Copy to clipboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
