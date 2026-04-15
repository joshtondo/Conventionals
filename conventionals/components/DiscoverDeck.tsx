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

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function DiscoverDeck({ people }: { people: DiscoverPerson[] }) {
  const [index, setIndex] = useState(0)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)

  const current = people[index] ?? null

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

  const sl = current.socialLinks ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Card */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          backgroundColor: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '20px',
          padding: '24px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          userSelect: 'none',
        }}
      >
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 800,
            color: C.white,
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}>
            {initials(current.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '17px', fontWeight: 700, color: C.text, margin: '0 0 2px' }}>
              {current.name}
            </p>
            {(current.jobTitle || current.company) && (
              <p style={{ fontSize: '13px', color: C.text2, margin: 0 }}>
                {[current.jobTitle, current.company].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {current.bio && (
          <p style={{
            fontSize: '14px',
            color: C.text2,
            lineHeight: 1.55,
            margin: '0 0 14px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {current.bio}
          </p>
        )}

        {/* Shared event chip */}
        <div style={{ marginBottom: '14px' }}>
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

        {/* Social links */}
        {(sl.linkedin || sl.twitter || sl.website) && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sl.linkedin && (
              <a href={sl.linkedin} target="_blank" rel="noopener noreferrer" style={{
                fontSize: '12px', color: C.text2, background: C.surface,
                border: `1px solid ${C.border}`, borderRadius: '20px', padding: '3px 10px',
                textDecoration: 'none', fontWeight: 500,
              }}>LinkedIn</a>
            )}
            {sl.twitter && (
              <a href={sl.twitter} target="_blank" rel="noopener noreferrer" style={{
                fontSize: '12px', color: C.text2, background: C.surface,
                border: `1px solid ${C.border}`, borderRadius: '20px', padding: '3px 10px',
                textDecoration: 'none', fontWeight: 500,
              }}>Twitter</a>
            )}
            {sl.website && (
              <a href={sl.website} target="_blank" rel="noopener noreferrer" style={{
                fontSize: '12px', color: C.text2, background: C.surface,
                border: `1px solid ${C.border}`, borderRadius: '20px', padding: '3px 10px',
                textDecoration: 'none', fontWeight: 500,
              }}>Website</a>
            )}
          </div>
        )}

        {error && (
          <p style={{ fontSize: '13px', color: '#b91c1c', marginTop: '12px', marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      {/* Progress */}
      <p style={{ fontSize: '12px', color: C.text2, textAlign: 'center', margin: 0 }}>
        {index + 1} of {people.length}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={skip}
          style={{
            flex: 1,
            height: '52px',
            border: `1.5px solid ${C.border}`,
            borderRadius: '14px',
            background: C.white,
            color: C.text2,
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          ✕ Skip
        </button>
        <button
          onClick={connect}
          disabled={connecting}
          style={{
            flex: 1,
            height: '52px',
            border: 'none',
            borderRadius: '14px',
            background: connecting
              ? '#a5b4fc'
              : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: C.white,
            fontSize: '15px',
            fontWeight: 600,
            cursor: connecting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {connecting ? 'Connecting…' : '♥ Connect'}
        </button>
      </div>
    </div>
  )
}
