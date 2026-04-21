'use client'

import { useState, useRef } from 'react'
import { initials } from '@/lib/utils'

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

type AIPick = {
  id: number
  name: string
  reason: string
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

function InstructionsBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div style={{
      background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
      border: '1px solid #c4b5fd',
      borderRadius: '14px',
      padding: '14px 16px',
      marginBottom: '16px',
      position: 'relative',
    }}>
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute', top: '10px', right: '12px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '14px', color: '#a78bfa', padding: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
      <div style={{ fontSize: '13px', fontWeight: 700, color: C.primary, marginBottom: '8px' }}>
        ✨ How Discover Works
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '5px' }}>
        {[
          ['💚', 'Connect — adds them to your connections and sends them a request'],
          ['✕', 'Pass — skip this person'],
          ['↩', 'Undo — go back one card'],
          ['⭐', 'Super connect — same as connect (highlight coming soon)'],
          ['👆', 'Swipe right to connect, swipe left to pass'],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: C.text2, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0 }}>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIPicksSection({ people }: { people: DiscoverPerson[] }) {
  const [picks, setPicks] = useState<AIPick[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectedIds, setConnectedIds] = useState<Set<number>>(new Set())
  const [connecting, setConnecting] = useState<number | null>(null)

  const eventId = people[0]?.sharedEventId ?? null

  async function getAIPicks() {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/attendee/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPicks(data.recommendations ?? [])
      setLoaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recommendations')
    } finally {
      setLoading(false)
    }
  }

  async function connectPick(pick: AIPick) {
    const person = people.find(p => p.id === pick.id)
    if (!person || connectedIds.has(pick.id)) return
    setConnecting(pick.id)
    try {
      const res = await fetch('/api/attendee/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connectedName: person.name,
          contactInfo: person.socialLinks ?? null,
          eventId: person.sharedEventId,
          toAccountId: person.id,
        }),
      })
      if (res.ok || res.status === 409) {
        setConnectedIds(prev => new Set(prev).add(pick.id))
      }
    } finally {
      setConnecting(null)
    }
  }

  if (!eventId) return null

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: C.primary }}>🤖 AI Picks for You</div>
        {!loaded && (
          <button
            onClick={getAIPicks}
            disabled={loading}
            style={{
              fontSize: '12px', fontWeight: 700, padding: '5px 12px',
              borderRadius: '8px', border: 'none',
              background: loading ? '#e0e7ff' : C.primary,
              color: loading ? C.primary : C.white,
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Thinking…' : 'Get Picks'}
          </button>
        )}
        {loaded && (
          <button
            onClick={() => { setLoaded(false); setPicks([]); getAIPicks() }}
            style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, color: C.text2, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Refresh
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '12px', color: '#b91c1c', margin: '0 0 8px' }}>{error}</p>
      )}

      {loaded && picks.length === 0 && (
        <p style={{ fontSize: '13px', color: C.text2, margin: 0 }}>No recommendations yet — try again later.</p>
      )}

      {picks.map((pick) => {
        const person = people.find(p => p.id === pick.id)
        const done = connectedIds.has(pick.id)
        return (
          <div key={pick.id} style={{
            background: 'linear-gradient(135deg, #fafafe, #f5f3ff)',
            border: '1px solid #c4b5fd',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: C.white, flexShrink: 0,
            }}>
              {person ? initials(person.name) : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{pick.name}</div>
              <div style={{ fontSize: '11px', color: C.text2, marginTop: '2px', lineHeight: 1.4 }}>{pick.reason}</div>
            </div>
            <button
              onClick={() => connectPick(pick)}
              disabled={done || connecting === pick.id}
              style={{
                fontSize: '18px', padding: '6px 8px', borderRadius: '50%',
                border: done ? '2px solid #6ee7b7' : '2px solid #6ee7b7',
                background: C.white, cursor: done ? 'default' : 'pointer',
                flexShrink: 0, opacity: connecting === pick.id ? 0.6 : 1,
              }}
            >
              {done ? '✅' : '💚'}
            </button>
          </div>
        )
      })}
    </div>
  )
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
          toAccountId: current.id,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <InstructionsBanner />
      <AIPicksSection people={people} />

      {!current ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px 24px', gap: '12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px' }}>🎉</div>
          <p style={{ fontSize: '17px', fontWeight: 700, color: C.text, margin: 0 }}>You&apos;re all caught up!</p>
          <p style={{ fontSize: '14px', color: C.text2, margin: 0 }}>No more people to discover right now.</p>
        </div>
      ) : (
        <>
          {/* Card stack */}
          <div
            style={{ position: 'relative', height: '360px' }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {next2 && (
              <div style={{
                position: 'absolute', width: '100%', backgroundColor: C.white,
                border: `1px solid ${C.border}`, borderRadius: '24px', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)', top: '16px', zIndex: 1,
                transform: 'rotate(-3deg) scale(0.93)', transformOrigin: 'center top',
                pointerEvents: 'none', height: '360px',
              }}>
                <div style={{ height: '80px', background: GRADIENT_HEADERS[(index + 2) % GRADIENT_HEADERS.length] }} />
              </div>
            )}
            {next1 && (
              <div style={{
                position: 'absolute', width: '100%', backgroundColor: C.white,
                border: `1px solid ${C.border}`, borderRadius: '24px', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)', top: '8px', zIndex: 2,
                transform: 'rotate(1.5deg) scale(0.96)', transformOrigin: 'center top',
                pointerEvents: 'none', height: '360px',
              }}>
                <div style={{ height: '80px', background: GRADIENT_HEADERS[(index + 1) % GRADIENT_HEADERS.length] }} />
              </div>
            )}
            {/* Top card */}
            <div style={{
              position: 'absolute', width: '100%', backgroundColor: C.white,
              border: `1px solid ${C.border}`, borderRadius: '24px', overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)', top: 0, zIndex: 3,
              userSelect: 'none', cursor: 'grab',
            }}>
              <div style={{ background: GRADIENT_HEADERS[index % GRADIENT_HEADERS.length], padding: '24px 20px 20px', color: C.white }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(current.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>{current.name}</div>
                    {current.jobTitle && <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>{current.jobTitle}</div>}
                    {current.company && <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '1px' }}>{current.company}</div>}
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 20px 20px' }}>
                {skillChips(current).length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {skillChips(current).map((chip, i) => (
                      <span key={i} style={{ background: '#ede9fe', color: C.primary, fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px' }}>
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
                {current.bio && (
                  <p style={{
                    fontSize: '13px', color: C.text2, lineHeight: 1.55, margin: '0 0 12px',
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                  }}>
                    {current.bio}
                  </p>
                )}
                <div>
                  <span style={{ fontSize: '12px', color: C.primary, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '20px', padding: '3px 10px', fontWeight: 600 }}>
                    📅 {current.sharedEventName}
                  </span>
                </div>
                {error && <p style={{ fontSize: '13px', color: '#b91c1c', marginTop: '10px', marginBottom: 0 }}>{error}</p>}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: C.text2, textAlign: 'center', margin: 0 }}>
            {people.length - index} {people.length - index === 1 ? 'person' : 'people'} to discover
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
            <button onClick={skip} aria-label="Skip" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #fca5a5', background: C.white, color: '#ef4444', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flexShrink: 0 }}>✕</button>
            <button onClick={() => { if (index > 0) { setIndex(i => i - 1); setError(null) } }} aria-label="Undo" disabled={index === 0} style={{ width: '52px', height: '52px', borderRadius: '50%', border: index === 0 ? `1.5px solid ${C.border}` : '2px solid #fde68a', background: C.white, color: index === 0 ? '#d1d5db' : '#f59e0b', fontSize: '18px', cursor: index === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexShrink: 0 }}>↩</button>
            <button onClick={connect} disabled={connecting} aria-label="Connect" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #6ee7b7', background: C.white, color: '#10b981', fontSize: '26px', cursor: connecting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(16,185,129,0.2)', flexShrink: 0, opacity: connecting ? 0.7 : 1 }}>💚</button>
            <button onClick={connect} disabled={connecting} aria-label="Super connect" style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid #a5b4fc', background: C.white, color: C.primary, fontSize: '18px', cursor: connecting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexShrink: 0, opacity: connecting ? 0.7 : 1 }}>⭐</button>
          </div>
        </>
      )}
    </div>
  )
}
