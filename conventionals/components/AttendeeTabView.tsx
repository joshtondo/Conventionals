'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import DiscoverDeck, { DiscoverPerson } from './DiscoverDeck'
import { initials } from '@/lib/utils'

type EventHistoryItem = {
  eventId: number
  eventName: string
  eventDate: string | null
  organizerName: string | null
}

type Connection = {
  id: number
  connectedName: string
  contactInfo: { email?: string; linkedin?: string; twitter?: string; website?: string } | null
  connectedEmail: string | null
  notes: string | null
  eventId: number | null
  eventName: string | null
  createdAt: string | null
  updatedAt: string | null
}

type PendingRequest = {
  id: number
  fromAccountId: number
  fromName: string
  fromJobTitle: string | null
  fromCompany: string | null
  fromSocialLinks: { linkedin?: string; twitter?: string; website?: string } | null
  eventId: number | null
  eventName: string | null
  createdAt: string | null
}

type SearchResult = {
  id: number
  name: string
  jobTitle: string | null
  company: string | null
  socialLinks: { linkedin?: string; twitter?: string; website?: string } | null
}

const C = {
  primary: '#6366f1',
  primaryLight: '#ede9fe',
  accent: '#10b981',
  accentLight: '#d1fae5',
  warn: '#f59e0b',
  warnLight: '#fef3c7',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
}

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

type Tab = 'home' | 'discover' | 'connections'
const VALID_TABS: Tab[] = ['home', 'discover', 'connections']

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: '📊 Home' },
  { id: 'discover', label: '✨ Discover' },
  { id: 'connections', label: '🤝 Connect' },
]

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      flex: 1, background: C.white, border: `1px solid ${C.border}`,
      borderRadius: '14px', padding: '14px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '26px', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: C.text3, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )
}

export default function AttendeeTabView({
  eventHistory,
  discoverPeople,
  connections = [],
  myName = '',
}: {
  eventHistory: EventHistoryItem[]
  discoverPeople: DiscoverPerson[]
  connections?: Connection[]
  myName?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'home'

  const [liveConnections, setLiveConnections] = useState<Connection[]>(connections)
  useEffect(() => { setLiveConnections(connections) }, [connections])

  const [discoverIndex, setDiscoverIndex] = useState(0)

  // Connection requests
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [requestsLoaded, setRequestsLoaded] = useState(false)
  const [respondingId, setRespondingId] = useState<number | null>(null)
  const [respondError, setRespondError] = useState<string | null>(null)

  // Remove flow
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [requestedIds, setRequestedIds] = useState<Set<number>>(new Set())
  const [requestErrors, setRequestErrors] = useState<Record<number, string>>({})
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function switchTab(t: Tab) {
    const url = t === 'home' ? '/attendee/dashboard' : `/attendee/dashboard?tab=${t}`
    router.replace(url, { scroll: false })
  }

  const loadPendingRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/attendee/connections/requests', { credentials: 'include' })
      if (res.ok) setPendingRequests(await res.json())
    } finally {
      setRequestsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (tab === 'connections' && !requestsLoaded) loadPendingRequests()
  }, [tab, requestsLoaded, loadPendingRequests])

  useEffect(() => {
    if (tab !== 'connections') return
    const interval = setInterval(loadPendingRequests, 30_000)
    return () => clearInterval(interval)
  }, [tab, loadPendingRequests])

  async function respond(requestId: number, accept: boolean) {
    setRespondingId(requestId)
    setRespondError(null)
    const req = pendingRequests.find(r => r.id === requestId)
    try {
      const res = await fetch(`/api/attendee/connections/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accept }),
      })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
        if (accept && req) {
          setLiveConnections(prev => [{
            id: -requestId,
            connectedName: req.fromName,
            contactInfo: req.fromSocialLinks ?? null,
            connectedEmail: null,
            notes: null,
            eventId: req.eventId,
            eventName: req.eventName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, ...prev])
          router.refresh()
        }
      } else {
        setRespondError('Something went wrong — please try again.')
      }
    } catch {
      setRespondError('Network error — please try again.')
    } finally {
      setRespondingId(null)
    }
  }

  async function removeConnection(connectionId: number) {
    setRemovingId(connectionId)
    try {
      const res = await fetch(`/api/attendee/connections/${connectionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setLiveConnections(prev => prev.filter(c => c.id !== connectionId))
        setConfirmRemoveId(null)
      }
    } finally {
      setRemovingId(null)
    }
  }

  function handleSearchInput(q: string) {
    setSearchQuery(q)
    setSearchError(null)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.trim().length < 2) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/attendee/people/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        if (res.ok) setSearchResults(await res.json())
        else setSearchError('Search failed — please try again.')
      } catch {
        setSearchError('Network error — please try again.')
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  async function sendRequest(toAccountId: number) {
    setRequestErrors(prev => { const n = { ...prev }; delete n[toAccountId]; return n })
    try {
      const res = await fetch('/api/attendee/connections/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toAccountId }),
      })
      if (res.ok || res.status === 409) setRequestedIds(prev => new Set(prev).add(toAccountId))
      else setRequestErrors(prev => ({ ...prev, [toAccountId]: 'Failed — try again.' }))
    } catch {
      setRequestErrors(prev => ({ ...prev, [toAccountId]: 'Network error.' }))
    }
  }

  const handleConnect = useCallback((_id: number, name: string, contactInfo: Connection['contactInfo'], eventId: number) => {
    setLiveConnections(prev => {
      if (prev.some(c => c.connectedName === name)) return prev
      return [{
        id: -(Date.now()),
        connectedName: name,
        contactInfo,
        connectedEmail: null,
        notes: null,
        eventId,
        eventName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ...prev]
    })
    router.refresh()
  }, [router])

  // Computed stats
  const followUpConnections = liveConnections.filter(c => !c.notes?.trim())
  const reachedOutConnections = liveConnections.filter(c => !!c.notes?.trim())
  const pendingCount = pendingRequests.length

  // Connections per event (for home tab event cards)
  const connsByEvent = liveConnections.reduce<Record<number, number>>((acc, c) => {
    if (c.eventId) acc[c.eventId] = (acc[c.eventId] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '4px', background: '#f1f5f9',
        padding: '4px', borderRadius: '12px', marginBottom: '20px',
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            style={{
              flex: 1, padding: '8px 6px', borderRadius: '9px',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              border: 'none',
              background: tab === t.id ? C.white : 'transparent',
              color: tab === t.id ? C.text : C.text2,
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s', fontFamily: 'inherit',
              textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
              position: 'relative' as const,
            }}
          >
            {t.label}
            {t.id === 'connections' && pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: '4px', right: '4px',
                minWidth: '14px', height: '14px', background: '#ef4444',
                borderRadius: '50%', fontSize: '9px', fontWeight: 700,
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── HOME TAB ────────────────────────────────────────────── */}
      {tab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <StatCard value={eventHistory.length} label="Events" color={C.primary} />
            <StatCard value={liveConnections.length} label="Connections" color={C.accent} />
            <StatCard value={followUpConnections.length} label="Follow Up" color={C.warn} />
          </div>

          {/* Follow-up action surface */}
          {followUpConnections.length > 0 && (
            <div style={{
              background: C.warnLight, border: '1px solid #fde68a',
              borderRadius: '16px', padding: '16px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '12px' }}>
                💬 {followUpConnections.length} {followUpConnections.length === 1 ? 'connection' : 'connections'} to follow up with
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {followUpConnections.slice(0, 3).map((conn, i) => (
                  <div key={conn.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: C.white, borderRadius: '10px', padding: '10px 12px',
                    border: '1px solid #fde68a',
                  }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, color: C.white, flexShrink: 0,
                    }}>
                      {initials(conn.connectedName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conn.connectedName}
                      </div>
                      {conn.eventName && (
                        <div style={{ fontSize: '11px', color: C.text3 }}>📅 {conn.eventName}</div>
                      )}
                    </div>
                    <Link
                      href="/attendee/connections"
                      style={{
                        fontSize: '12px', fontWeight: 700, color: C.primary,
                        background: C.primaryLight, borderRadius: '8px',
                        padding: '5px 10px', textDecoration: 'none', flexShrink: 0,
                      }}
                    >
                      Draft ›
                    </Link>
                  </div>
                ))}
              </div>
              {followUpConnections.length > 3 && (
                <button
                  onClick={() => switchTab('connections')}
                  style={{
                    marginTop: '10px', background: 'none', border: 'none',
                    fontSize: '12px', fontWeight: 700, color: '#92400e',
                    cursor: 'pointer', padding: '0', fontFamily: 'inherit',
                  }}
                >
                  +{followUpConnections.length - 3} more → View all
                </button>
              )}
            </div>
          )}

          {/* Events */}
          <div>
            <div style={{
              fontSize: '11px', fontWeight: 700, color: C.text3,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px',
            }}>
              Your Events · {eventHistory.length}
            </div>
            {eventHistory.length === 0 ? (
              <div style={{
                background: C.white, border: `1px solid ${C.border}`,
                borderRadius: '16px', padding: '32px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎟️</div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: '0 0 4px' }}>No events yet</p>
                <p style={{ fontSize: '13px', color: C.text2, margin: 0 }}>You&apos;ll see events here once an organizer registers you.</p>
              </div>
            ) : (
              eventHistory.map((event) => {
                const isUpcoming = event.eventDate ? new Date(event.eventDate) >= new Date() : false
                const dateStr = event.eventDate
                  ? new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Date TBD'
                const connCount = connsByEvent[event.eventId] ?? 0
                return (
                  <Link
                    key={event.eventId}
                    href={`/attendee/event/${event.eventId}`}
                    style={{
                      display: 'block', backgroundColor: C.white,
                      border: `1px solid ${C.border}`,
                      borderLeft: `4px solid ${isUpcoming ? C.primary : C.accent}`,
                      borderRadius: '14px', padding: '14px 16px',
                      marginBottom: '10px', textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <p style={{ fontWeight: 700, color: C.text, margin: 0, fontSize: '15px', lineHeight: 1.3 }}>
                        {event.eventName}
                      </p>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 8px',
                        borderRadius: '999px', flexShrink: 0,
                        background: isUpcoming ? C.primaryLight : C.accentLight,
                        color: isUpcoming ? C.primary : C.accent,
                      }}>
                        {isUpcoming ? 'Upcoming' : 'Attended'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: C.text2 }}>📅 {dateStr}</span>
                      {event.organizerName && (
                        <span style={{ fontSize: '12px', color: C.text2 }}>👤 {event.organizerName}</span>
                      )}
                      {connCount > 0 && (
                        <span style={{ fontSize: '12px', color: C.primary, fontWeight: 600 }}>
                          🤝 {connCount} connection{connCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {/* Recent connections preview */}
          {reachedOutConnections.length > 0 && (
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recent Connections
                </div>
                <button
                  onClick={() => switchTab('connections')}
                  style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: C.primary, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                  View all ›
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reachedOutConnections.slice(0, 3).map((conn, i) => (
                  <div key={conn.id} style={{
                    background: C.white, border: `1px solid ${C.border}`,
                    borderRadius: '12px', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, color: C.white, flexShrink: 0,
                    }}>
                      {initials(conn.connectedName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conn.connectedName}
                      </div>
                      {conn.eventName && <div style={{ fontSize: '11px', color: C.text3 }}>📅 {conn.eventName}</div>}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 8px',
                      borderRadius: '999px', background: C.accentLight, color: C.accent,
                    }}>
                      ✓ Reached out
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DISCOVER TAB ────────────────────────────────────────── */}
      {tab === 'discover' && (
        <div>
          {discoverPeople.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '48px 24px', gap: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px' }}>👋</div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: C.text, margin: 0 }}>No one to discover yet</p>
              <p style={{ fontSize: '14px', color: C.text2, margin: 0 }}>
                Attend an event and set your profile to public to start connecting.
              </p>
            </div>
          ) : (
            <DiscoverDeck people={discoverPeople} onConnect={handleConnect} index={discoverIndex} setIndex={setDiscoverIndex} />
          )}
        </div>
      )}

      {/* ── CONNECTIONS TAB ─────────────────────────────────────── */}
      {tab === 'connections' && (
        <div>
          {/* Search */}
          <div style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: '14px', padding: '12px 14px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🔍</span>
            <input
              type="text"
              placeholder="Search people from your events…"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: '14px', color: C.text, background: 'transparent', fontFamily: 'inherit',
              }}
            />
            {searching && <span style={{ fontSize: '12px', color: C.text3 }}>…</span>}
            {searchQuery && !searching && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: C.text3, padding: '0 2px' }}
              >✕</button>
            )}
          </div>

          {/* Search results */}
          {searchQuery.trim().length >= 2 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.text3, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px' }}>
                Results
              </div>
              {searchError && <p style={{ fontSize: '13px', color: '#b91c1c', margin: '0 0 8px' }}>{searchError}</p>}
              {!searchError && searchResults.length === 0 && !searching ? (
                <p style={{ fontSize: '13px', color: C.text2, textAlign: 'center', padding: '16px 0', margin: 0 }}>No public attendees found.</p>
              ) : (
                searchResults.map((person, i) => (
                  <div key={person.id} style={{ marginBottom: '8px' }}>
                    <div style={{
                      background: C.white, border: `1px solid ${C.border}`,
                      borderRadius: '14px', padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700, color: C.white, flexShrink: 0,
                      }}>
                        {initials(person.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{person.name}</div>
                        {person.jobTitle && <div style={{ fontSize: '12px', color: C.text2 }}>{person.jobTitle}{person.company ? ` · ${person.company}` : ''}</div>}
                      </div>
                      <button
                        onClick={() => sendRequest(person.id)}
                        disabled={requestedIds.has(person.id)}
                        style={{
                          fontSize: '12px', fontWeight: 700, padding: '6px 12px',
                          borderRadius: '8px', border: 'none',
                          background: requestedIds.has(person.id) ? C.accentLight : C.primary,
                          color: requestedIds.has(person.id) ? C.accent : C.white,
                          cursor: requestedIds.has(person.id) ? 'default' : 'pointer',
                          flexShrink: 0, fontFamily: 'inherit',
                        }}
                      >
                        {requestedIds.has(person.id) ? '✓ Sent' : 'Request'}
                      </button>
                    </div>
                    {requestErrors[person.id] && (
                      <p style={{ fontSize: '11px', color: '#b91c1c', margin: '4px 0 0 14px' }}>{requestErrors[person.id]}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pending incoming requests */}
          {requestsLoaded && pendingRequests.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.text3, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px' }}>
                Pending Requests · {pendingRequests.length}
              </div>
              {respondError && <p style={{ fontSize: '12px', color: '#b91c1c', margin: '0 0 8px' }}>{respondError}</p>}
              {pendingRequests.map((req, i) => (
                <div key={req.id} style={{
                  background: 'linear-gradient(135deg, #fafafe, #f5f3ff)',
                  border: '1px solid #c4b5fd', borderRadius: '14px',
                  padding: '14px', display: 'flex', alignItems: 'center',
                  gap: '12px', marginBottom: '8px',
                }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, color: C.white, flexShrink: 0,
                  }}>
                    {initials(req.fromName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{req.fromName}</div>
                    {req.fromJobTitle && (
                      <div style={{ fontSize: '12px', color: C.text2 }}>{req.fromJobTitle}{req.fromCompany ? ` · ${req.fromCompany}` : ''}</div>
                    )}
                    {req.eventName && <div style={{ fontSize: '11px', color: C.text3, marginTop: '2px' }}>📅 {req.eventName}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => respond(req.id, true)}
                      disabled={respondingId === req.id}
                      style={{
                        fontSize: '13px', fontWeight: 700, width: '36px', height: '36px',
                        borderRadius: '50%', border: 'none',
                        background: respondingId === req.id ? C.accentLight : C.accent,
                        color: C.white, cursor: respondingId === req.id ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'inherit',
                      }}
                    >✓</button>
                    <button
                      onClick={() => respond(req.id, false)}
                      disabled={respondingId === req.id}
                      style={{
                        fontSize: '13px', fontWeight: 700, width: '36px', height: '36px',
                        borderRadius: '50%', border: `1.5px solid ${C.border}`,
                        background: C.white, color: C.text2,
                        cursor: respondingId === req.id ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'inherit',
                      }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {liveConnections.length === 0 && pendingRequests.length === 0 && !searchQuery && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '48px 24px', gap: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px' }}>🤝</div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: C.text, margin: 0 }}>No connections yet</p>
              <p style={{ fontSize: '14px', color: C.text2, margin: 0 }}>Swipe to connect in Discover, or search above.</p>
            </div>
          )}

          {/* Follow up section */}
          {followUpConnections.length > 0 && !searchQuery && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: C.warn }} />
                Follow Up · {followUpConnections.length}
              </div>
              {followUpConnections.map((conn, i) => (
                <ConnectionRow
                  key={conn.id}
                  conn={conn}
                  index={i}
                  confirmRemoveId={confirmRemoveId}
                  removingId={removingId}
                  setConfirmRemoveId={setConfirmRemoveId}
                  onRemove={removeConnection}
                  myName={myName}
                  showFollowUpBadge={false}
                />
              ))}
            </div>
          )}

          {/* Reached out section */}
          {reachedOutConnections.length > 0 && !searchQuery && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.text3, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: C.accent }} />
                Reached Out · {reachedOutConnections.length}
              </div>
              {reachedOutConnections.map((conn, i) => (
                <ConnectionRow
                  key={conn.id}
                  conn={conn}
                  index={i}
                  confirmRemoveId={confirmRemoveId}
                  removingId={removingId}
                  setConfirmRemoveId={setConfirmRemoveId}
                  onRemove={removeConnection}
                  myName={myName}
                  showFollowUpBadge={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ConnectionRow ─────────────────────────────────────────────────────────────

function ConnectionRow({
  conn,
  index,
  confirmRemoveId,
  removingId,
  setConfirmRemoveId,
  onRemove,
  myName,
  showFollowUpBadge,
}: {
  conn: Connection
  index: number
  confirmRemoveId: number | null
  removingId: number | null
  setConfirmRemoveId: (id: number | null) => void
  onRemove: (id: number) => void
  myName: string
  showFollowUpBadge: boolean
}) {
  const isConfirming = confirmRemoveId === conn.id
  const isRemoving = removingId === conn.id
  const ci = conn.contactInfo ?? {}
  const email = conn.connectedEmail ?? ci.email ?? null

  if (isConfirming) {
    return (
      <div style={{
        background: '#fef2f2', border: '1.5px solid #fca5a5',
        borderRadius: '14px', padding: '14px 16px',
        marginBottom: '10px', display: 'flex', alignItems: 'center',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b' }}>
            Remove {conn.connectedName}?
          </div>
          <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
            This can&apos;t be undone.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => onRemove(conn.id)}
            disabled={isRemoving}
            style={{
              height: '36px', padding: '0 14px', fontSize: '13px', fontWeight: 700,
              background: isRemoving ? '#fca5a5' : '#ef4444', color: '#fff',
              border: 'none', borderRadius: '8px',
              cursor: isRemoving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {isRemoving ? 'Removing…' : 'Remove'}
          </button>
          <button
            onClick={() => setConfirmRemoveId(null)}
            style={{
              height: '36px', padding: '0 14px', fontSize: '13px', fontWeight: 700,
              background: '#fff', color: '#374151',
              border: '1.5px solid #e5e7eb', borderRadius: '8px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: '14px', padding: '12px 14px',
      marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: AVATAR_COLORS[index % AVATAR_COLORS.length],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initials(conn.connectedName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conn.connectedName}
          </div>
          {conn.eventName && <div style={{ fontSize: '12px', color: '#94a3b8' }}>📅 {conn.eventName}</div>}
        </div>
        {/* Social links */}
        {(ci.linkedin || ci.twitter || ci.website) && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {ci.linkedin && (
              <a href={ci.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: '#ede9fe', color: '#6366f1', borderRadius: '8px', textDecoration: 'none' }}>in</a>
            )}
            {ci.twitter && (
              <a href={ci.twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: '#e0f2fe', color: '#0284c7', borderRadius: '8px', textDecoration: 'none' }}>𝕏</a>
            )}
            {ci.website && (
              <a href={ci.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: '#f8fafc', color: '#475569', borderRadius: '8px', textDecoration: 'none', border: '1px solid #e2e8f0' }}>🌐</a>
            )}
          </div>
        )}
        {/* Remove button */}
        <button
          onClick={() => setConfirmRemoveId(conn.id)}
          aria-label={`Remove ${conn.connectedName}`}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#cbd5e1', fontSize: '16px', padding: '4px',
            lineHeight: 1, flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Notes preview */}
      {conn.notes && (
        <div style={{
          marginTop: '8px', fontSize: '12px', color: '#64748b',
          background: '#f8fafc', borderRadius: '8px', padding: '7px 10px',
          lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>
          {conn.notes}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <Link
          href="/attendee/connections"
          style={{
            flex: 1, height: '36px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '4px',
            background: '#f5f3ff', color: '#6366f1',
            border: '1px solid #ddd6fe', borderRadius: '8px',
            fontSize: '12px', fontWeight: 700, textDecoration: 'none',
          }}
        >
          {conn.notes ? '✨ Draft Email' : '📝 Add Notes & Draft'}
        </Link>
        {email && (
          <a
            href={`mailto:${email}`}
            style={{
              height: '36px', padding: '0 12px', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              background: '#f0fdf4', color: '#059669',
              border: '1px solid #bbf7d0', borderRadius: '8px',
              fontSize: '12px', fontWeight: 700, textDecoration: 'none', flexShrink: 0,
            }}
          >
            ✉️
          </a>
        )}
      </div>
    </div>
  )
}
