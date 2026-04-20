'use client'

import { useState, useRef } from 'react'

export type DiscoverPerson = {
  id: number
  name: string
  company: string | null
  jobTitle: string | null
  bio: string | null
  socialLinks: { linkedin?: string; twitter?: string; website?: string } | null
  sharedEventId: number
  sharedEventName: string
}

const C = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  accent: '#10b981',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  white: '#ffffff',
}

const GRADIENT_HEADERS = [
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #8b5cf6, #6366f1)',
  'linear-gradient(135deg, #0ea5e9, #6366f1)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function skillChips(person: DiscoverPerson): string[] {
  const chips: string[] = []
  if (person.jobTitle) {
    person.jobTitle.split(/[\s,/]+/).slice(0, 3).forEach(w => {
      if (w.length > 2) chips.push(w)
    })
  }
  if (chips.length < 3 && person.company) {
    chips.push(person.company.split(/\s+/)[0])
  }
  return chips.slice(0, 4)
}

export default function DiscoverDeck({ people }: { people: DiscoverPerson[] }) {
  const [index, setIndex] = useState(0)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)

  const current = people[index] ?? null
  const next1 = people[index + 1] ?? null
  const next2 = people[index + 2] ?? null

  function skip() {
    setError(null)
    setIndex((i) => i + 1)
  }

  async function connect() {
    if (!current || connecting) return
    setError(null)
    setConnecting(true)
    try {
      const res = await fetch('/api/attendee/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connectedName: current.name,
          contactInfo: current.socialLinks ?? null,
          eventId: current.sharedEventId,
        }),
      })
      if (res.ok || res.status === 409) {
        setIndex((i) => i + 1)
      } else {
        setError('Could not connect — please try again.')
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setConnecting(false)
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (delta < -80) skip()
    else if (delta > 80) connect()
  }

  if (!current) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '12px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px' }}>🎉</div>
        <p style={{ fontSize: '17px', fontWeight: 700, color: C.text, margin: 0 }}>
          You&apos;re all caught up!
        </p>
        <p style={{ fontSize: '14px', color: C.text2, margin: 0 }}>
          No more people to discover right now.
        </p>
      </div>
    )
  }

  const chips = skillChips(current)
  const gradientIndex = index % GRADIENT_HEADERS.length
  const remaining = people.length - index

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Card stack */}
      <div
        style={{ position: 'relative', height: '360px' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Back card 2 */}
        {next2 && (
          <div style={{
            position: 'absolute',
            width: '100%',
            backgroundColor: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            top: '16px',
            zIndex: 1,
            transform: 'rotate(-3deg) scale(0.93)',
            transformOrigin: 'center top',
            pointerEvents: 'none',
            height: '360px',
          }}>
            <div style={{ height: '80px', background: GRADIENT_HEADERS[(gradientIndex + 2) % GRADIENT_HEADERS.length] }} />
          </div>
        )}
        {/* Back card 1 */}
        {next1 && (
          <div style={{
            position: 'absolute',
            width: '100%',
            backgroundColor: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            top: '8px',
            zIndex: 2,
            transform: 'rotate(1.5deg) scale(0.96)',
            transformOrigin: 'center top',
            pointerEvents: 'none',
            height: '360px',
          }}>
            <div style={{ height: '80px', background: GRADIENT_HEADERS[(gradientIndex + 1) % GRADIENT_HEADERS.length] }} />
          </div>
        )}
        {/* Top card */}
        <div style={{
          position: 'absolute',
          width: '100%',
          backgroundColor: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          top: 0,
          zIndex: 3,
          userSelect: 'none',
          cursor: 'grab',
        }}>
          {/* Gradient header */}
          <div style={{
            background: GRADIENT_HEADERS[gradientIndex],
            padding: '24px 20px 20px',
            color: C.white,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                border: '2px solid rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {initials(current.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>{current.name}</div>
                {current.jobTitle && (
                  <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>{current.jobTitle}</div>
                )}
                {current.company && (
                  <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '1px' }}>{current.company}</div>
                )}
              </div>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: '14px 20px 20px' }}>
            {/* Skill chips */}
            {chips.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {chips.map((chip, i) => (
                  <span key={i} style={{
                    background: '#ede9fe',
                    color: C.primary,
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '999px',
                  }}>
                    {chip}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {current.bio && (
              <p style={{
                fontSize: '13px',
                color: C.text2,
                lineHeight: 1.55,
                margin: '0 0 12px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}>
                {current.bio}
              </p>
            )}

            {/* Shared event chip */}
            <div>
              <span style={{
                fontSize: '12px',
                color: C.primary,
                background: '#ede9fe',
                border: '1px solid #c4b5fd',
                borderRadius: '20px',
                padding: '3px 10px',
                fontWeight: 600,
              }}>
                📅 {current.sharedEventName}
              </span>
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#b91c1c', marginTop: '10px', marginBottom: 0 }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Count */}
      <p style={{ fontSize: '12px', color: C.text2, textAlign: 'center', margin: 0 }}>
        {remaining} {remaining === 1 ? 'person' : 'people'} to discover
      </p>

      {/* 4-button action row */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
        {/* Pass */}
        <button
          onClick={skip}
          aria-label="Skip"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: '2px solid #fca5a5',
            background: C.white,
            color: '#ef4444',
            fontSize: '22px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            flexShrink: 0,
          }}
        >
          ✕
        </button>

        {/* Back / undo (visual only — just re-decrements if > 0) */}
        <button
          onClick={() => { if (index > 0) { setIndex(i => i - 1); setError(null) } }}
          aria-label="Undo"
          disabled={index === 0}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: index === 0 ? `1.5px solid ${C.border}` : '2px solid #fde68a',
            background: C.white,
            color: index === 0 ? '#d1d5db' : '#f59e0b',
            fontSize: '18px',
            cursor: index === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            flexShrink: 0,
          }}
        >
          ↩
        </button>

        {/* Connect — larger */}
        <button
          onClick={connect}
          disabled={connecting}
          aria-label="Connect"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '2px solid #6ee7b7',
            background: C.white,
            color: '#10b981',
            fontSize: '26px',
            cursor: connecting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(16,185,129,0.2)',
            flexShrink: 0,
            opacity: connecting ? 0.7 : 1,
          }}
        >
          💚
        </button>

        {/* Super connect */}
        <button
          onClick={connect}
          disabled={connecting}
          aria-label="Super connect"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '2px solid #a5b4fc',
            background: C.white,
            color: C.primary,
            fontSize: '18px',
            cursor: connecting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            flexShrink: 0,
            opacity: connecting ? 0.7 : 1,
          }}
        >
          ⭐
        </button>
      </div>
    </div>
  )
}
