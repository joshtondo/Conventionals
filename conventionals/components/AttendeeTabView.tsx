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
  accent: '#10b981',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
}

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

type Tab = 'events' | 'discover' | 'connections' | 'schedule'
const VALID_TABS: Tab[] = ['events', 'discover', 'connections', 'schedule']

const TABS: { id: Tab; label: string }[] = [
  { id: 'events', label: '📋 Events' },
  { id: 'discover', label: '✨ Discover' },
  { id: 'connections', label: '🤝 Connect' },
  { id: 'schedule', label: '📅 Schedule' },
]

export default function AttendeeTabView({
  eventHistory,
  discoverPeople,
  connections = [],
}: {
  eventHistory: EventHistoryItem[]
  discoverPeople: DiscoverPerson[]
  connections?: Connection[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const tab: Tab = VALID_TABS.includes(urlTab as Tab) ? (urlTab as Tab) : 'events'

  // Connections tab state
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [requestsLoaded, setRequestsLoaded] = useState(false)
  const [respondingId, setRespondingId] = useState<number | null>(null)
  const [respondError, setRespondError] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [requestedIds, setRequestedIds] = useState<Set<number>>(new Set())
  const [requestErrors, setRequestErrors] = useState<Record<number, string>>({})
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function switchTab(t: Tab) {
    const url = t === 'events' ? '/attendee/dashboard' : `/attendee/dashboard?tab=${t}`
    router.replace(url, { scroll: false })
  }

  const loadPendingRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/attendee/connections/requests', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setPendingRequests(data)
      }
    } finally {
      setRequestsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (tab === 'connections' && !requestsLoaded) {
      loadPendingRequests()
    }
  }, [tab, requestsLoaded, loadPendingRequests])

  async function respond(requestId: number, accept: boolean) {
    setRespondingId(requestId)
    setRespondError(null)
    try {
      const res = await fetch(`/api/attendee/connections/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accept }),
      })
      if (res.ok) {
        // Only remove from list once server confirms — prevents ghost state on failure
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
      } else {
        setRespondError('Something went wrong — please try again.')
      }
    } catch {
      setRespondError('Network error — please try again.')
    } finally {
      setRespondingId(null)
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
        if (res.ok) {
          setSearchResults(await res.json())
        } else {
          setSearchError('Search failed — please try again.')
        }
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
      if (res.ok || res.status === 409) {
        setRequestedIds(prev => new Set(prev).add(toAccountId))
      } else {
        setRequestErrors(prev => ({ ...prev, [toAccountId]: 'Failed to send — try again.' }))
      }
    } catch {
      setRequestErrors(prev => ({ ...prev, [toAccountId]: 'Network error.' }))
    }
  }

  const pendingCount = pendingRequests.length

  return (
    <div>
      {/* Pill-style tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '12px',
        marginBottom: '20px',
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '9px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: tab === t.id ? C.white : 'transparent',
              color: tab === t.id ? C.text : C.text2,
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              textAlign: 'center' as const,
              whiteSpace: 'nowrap' as const,
              position: 'relative' as const,
            }}
          >
            {t.label}
            {t.id === 'connections' && pendingCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                minWidth: '14px',
                height: '14px',
                background: '#ef4444',
                borderRadius: '50%',
                fontSize: '9px',
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* My Events */}
      {tab === 'events' && (
        <div>
          {eventHistory.length === 0 ? (
            <p style={{ color: C.text2, fontSize: '0.875rem', textAlign: 'center', padding: '32px 0' }}>
              No events yet.
            </p>
          ) : (
            eventHistory.map((event) => (
              <Link
                key={event.eventId}
                href={`/attendee/event/${event.eventId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: C.white,
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${C.primary}`,
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '10px',
                  textDecoration: 'none',
                  gap: '8px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: C.text, margin: '0 0 4px', fontSize: '0.9375rem' }}>
                    {event.eventName}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: C.text2, margin: 0 }}>
                    {event.eventDate
                      ? new Date(event.eventDate).toLocaleDateString()
                      : 'TBD'}
                    {event.organizerName ? ` · ${event.organizerName}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: '16px', color: C.text3, flexShrink: 0 }}>›</span>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Discover */}
      {tab === 'discover' && (
        <div>
          {discoverPeople.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 24px',
              gap: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px' }}>👋</div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: C.text, margin: 0 }}>
                No one to discover yet
              </p>
              <p style={{ fontSize: '14px', color: C.text2, margin: 0 }}>
                Attend an event and set your profile to public to start connecting.
              </p>
            </div>
          ) : (
            <DiscoverDeck people={discoverPeople} />
          )}
        </div>
      )}

      {/* Connections */}
      {tab === 'connections' && (
        <div>
          {/* Search bar */}
          <div style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🔍</span>
            <input
              type="text"
              placeholder="Search people from your events…"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: C.text,
                background: 'transparent',
                fontFamily: 'inherit',
              }}
            />
            {searching && <span style={{ fontSize: '12px', color: C.text3 }}>…</span>}
            {searchQuery && !searching && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: C.text3, padding: '0 2px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Search results */}
          {searchQuery.trim().length >= 2 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.text3, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px' }}>
                Results
              </div>
              {searchError && (
                <p style={{ fontSize: '13px', color: '#b91c1c', margin: '0 0 8px' }}>{searchError}</p>
              )}
              {!searchError && searchResults.length === 0 && !searching ? (
                <p style={{ fontSize: '13px', color: C.text2, textAlign: 'center', padding: '16px 0', margin: 0 }}>No public attendees found.</p>
              ) : (
                searchResults.map((person, i) => (
                  <div key={person.id} style={{ marginBottom: '8px' }}>
                    <div style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: '14px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
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
                          fontSize: '12px', fontWeight: 700,
                          padding: '6px 12px', borderRadius: '8px', border: 'none',
                          background: requestedIds.has(person.id) ? '#d1fae5' : C.primary,
                          color: requestedIds.has(person.id) ? '#059669' : C.white,
                          cursor: requestedIds.has(person.id) ? 'default' : 'pointer',
                          flexShrink: 0,
                          fontFamily: 'inherit',
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
              {respondError && (
                <p style={{ fontSize: '12px', color: '#b91c1c', margin: '0 0 8px' }}>{respondError}</p>
              )}
              {pendingRequests.map((req, i) => (
                <div key={req.id} style={{
                  background: 'linear-gradient(135deg, #fafafe, #f5f3ff)',
                  border: `1px solid #c4b5fd`,
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px',
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
                      <div style={{ fontSize: '12px', color: C.text2 }}>
                        {req.fromJobTitle}{req.fromCompany ? ` · ${req.fromCompany}` : ''}
                      </div>
                    )}
                    {req.eventName && <div style={{ fontSize: '11px', color: C.text3, marginTop: '2px' }}>📅 {req.eventName}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => respond(req.id, true)}
                      disabled={respondingId === req.id}
                      style={{
                        fontSize: '12px', fontWeight: 700, padding: '6px 10px',
                        borderRadius: '8px', border: 'none',
                        background: respondingId === req.id ? '#d1fae5' : '#10b981',
                        color: C.white, cursor: respondingId === req.id ? 'default' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => respond(req.id, false)}
                      disabled={respondingId === req.id}
                      style={{
                        fontSize: '12px', fontWeight: 700, padding: '6px 10px',
                        borderRadius: '8px', border: `1px solid ${C.border}`,
                        background: C.white, color: C.text2,
                        cursor: respondingId === req.id ? 'default' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connections list */}
          {connections.length === 0 && pendingRequests.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '48px 24px', gap: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px' }}>🤝</div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: C.text, margin: 0 }}>No connections yet</p>
              <p style={{ fontSize: '14px', color: C.text2, margin: 0 }}>Swipe to connect in Discover, or search above.</p>
            </div>
          ) : connections.length > 0 ? (
            <>
              {pendingRequests.length > 0 || searchQuery ? (
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.text3, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Your Connections · {connections.length}
                </div>
              ) : null}
              {connections.map((conn, i) => {
                const contactInfo = conn.contactInfo ?? {}
                return (
                  <div key={conn.id} style={{
                    backgroundColor: C.white, border: `1px solid ${C.border}`,
                    borderRadius: '16px', padding: '14px',
                    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px',
                  }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 700, color: C.white, flexShrink: 0,
                    }}>
                      {initials(conn.connectedName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {conn.connectedName}
                      </div>
                      {conn.eventName && (
                        <div style={{ fontSize: '12px', color: C.text3, marginTop: '1px' }}>📅 {conn.eventName}</div>
                      )}
                    </div>
                    {(contactInfo.linkedin || contactInfo.twitter || contactInfo.website) && (
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {contactInfo.linkedin && (
                          <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: '#ede9fe', color: C.primary, borderRadius: '8px', textDecoration: 'none' }}>in</a>
                        )}
                        {contactInfo.twitter && (
                          <a href={contactInfo.twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: '#e0f2fe', color: '#0284c7', borderRadius: '8px', textDecoration: 'none' }}>𝕏</a>
                        )}
                        {contactInfo.website && (
                          <a href={contactInfo.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: C.surface, color: C.text2, borderRadius: '8px', textDecoration: 'none', border: `1px solid ${C.border}` }}>🌐</a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          ) : null}
        </div>
      )}

      {/* Schedule */}
      {tab === 'schedule' && (
        <div>
          {eventHistory.length === 0 ? (
            <p style={{ color: C.text2, fontSize: '0.875rem', textAlign: 'center', padding: '32px 0' }}>
              No scheduled events.
            </p>
          ) : (
            eventHistory.map((event) => {
              const dateStr = event.eventDate
                ? new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : 'TBD'
              const isUpcoming = event.eventDate ? new Date(event.eventDate) >= new Date() : false
              return (
                <div key={event.eventId}>
                  <div style={{
                    fontSize: '12px', fontWeight: 700, color: C.text3,
                    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                    marginBottom: '8px', marginTop: '4px',
                  }}>
                    {dateStr}
                  </div>
                  <Link
                    href={`/attendee/event/${event.eventId}`}
                    style={{
                      display: 'flex', backgroundColor: C.white, border: `1px solid ${C.border}`,
                      borderRadius: '14px', padding: '14px 16px', marginBottom: '12px',
                      alignItems: 'flex-start', gap: '12px', textDecoration: 'none',
                    }}
                  >
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: isUpcoming ? C.primary : C.accent,
                      marginTop: '4px', flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>
                        {event.eventName}
                      </div>
                      {event.organizerName && (
                        <div style={{ fontSize: '12px', color: C.text3 }}>Hosted by {event.organizerName}</div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px',
                      background: isUpcoming ? '#ede9fe' : '#d1fae5',
                      color: isUpcoming ? C.primary : '#059669', flexShrink: 0,
                    }}>
                      {isUpcoming ? 'Upcoming' : 'Attended'}
                    </span>
                  </Link>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
