'use client'

import { useState } from 'react'
import DiscoverDeck, { DiscoverPerson } from './DiscoverDeck'

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

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

type Tab = 'events' | 'discover' | 'connections' | 'schedule'

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
  const [tab, setTab] = useState<Tab>('events')

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
            onClick={() => setTab(t.id)}
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
            }}
          >
            {t.label}
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
              <div key={event.eventId} style={{
                backgroundColor: C.white,
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${C.primary}`,
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '10px',
              }}>
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
          {connections.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 24px',
              gap: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px' }}>🤝</div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: C.text, margin: 0 }}>
                No connections yet
              </p>
              <p style={{ fontSize: '14px', color: C.text2, margin: 0 }}>
                Swipe to connect with people you met at events.
              </p>
            </div>
          ) : (
            connections.map((conn, i) => {
              const contactInfo = conn.contactInfo ?? {}
              const contactLink = contactInfo.email
                ? `mailto:${contactInfo.email}`
                : contactInfo.linkedin ?? contactInfo.twitter ?? contactInfo.website ?? null
              return (
                <div key={conn.id} style={{
                  backgroundColor: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '10px',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: C.white,
                    flexShrink: 0,
                  }}>
                    {initials(conn.connectedName)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {conn.connectedName}
                    </div>
                    {conn.eventName && (
                      <div style={{ fontSize: '12px', color: C.text3, marginTop: '1px' }}>
                        📅 {conn.eventName}
                      </div>
                    )}
                    {(contactInfo.linkedin || contactInfo.twitter || contactInfo.website) && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' as const }}>
                        {contactInfo.linkedin && (
                          <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: C.primary, textDecoration: 'none', fontWeight: 500 }}>LinkedIn</a>
                        )}
                        {contactInfo.twitter && (
                          <a href={contactInfo.twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: C.primary, textDecoration: 'none', fontWeight: 500 }}>Twitter</a>
                        )}
                        {contactInfo.website && (
                          <a href={contactInfo.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: C.primary, textDecoration: 'none', fontWeight: 500 }}>Website</a>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Message button */}
                  {contactLink ? (
                    <a
                      href={contactLink}
                      target={contactLink.startsWith('mailto') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      style={{
                        height: '36px',
                        padding: '0 14px',
                        background: '#ede9fe',
                        color: C.primary,
                        border: '1px solid #c4b5fd',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      Message
                    </a>
                  ) : (
                    <span style={{
                      height: '36px',
                      padding: '0 14px',
                      background: C.surface,
                      color: C.text3,
                      border: `1px solid ${C.border}`,
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}>
                      Connected
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Schedule (event history as timeline) */}
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
                  {/* Date header */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: C.text3,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    marginTop: '4px',
                  }}>
                    {dateStr}
                  </div>
                  {/* Session row */}
                  <div style={{
                    backgroundColor: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}>
                    {/* Time/dot indicator */}
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: isUpcoming ? C.primary : C.accent,
                      marginTop: '4px',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>
                        {event.eventName}
                      </div>
                      {event.organizerName && (
                        <div style={{ fontSize: '12px', color: C.text3 }}>
                          Hosted by {event.organizerName}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: isUpcoming ? '#ede9fe' : '#d1fae5',
                      color: isUpcoming ? C.primary : '#059669',
                      flexShrink: 0,
                    }}>
                      {isUpcoming ? 'Upcoming' : 'Attended'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
