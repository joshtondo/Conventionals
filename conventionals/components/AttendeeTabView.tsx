'use client'

import { useState } from 'react'
import DiscoverDeck, { DiscoverPerson } from './DiscoverDeck'

type EventHistoryItem = {
  eventId: number
  eventName: string
  eventDate: string | null
  organizerName: string | null
}

const C = {
  primary: '#6366f1',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  white: '#ffffff',
}

export default function AttendeeTabView({
  eventHistory,
  discoverPeople,
}: {
  eventHistory: EventHistoryItem[]
  discoverPeople: DiscoverPerson[]
}) {
  const [tab, setTab] = useState<'events' | 'discover'>('events')

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${C.border}`,
        marginBottom: '20px',
      }}>
        {(['events', 'discover'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              height: '48px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? C.primary : C.text2,
              borderBottom: tab === t ? `2px solid ${C.primary}` : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'color 0.15s',
            }}
          >
            {t === 'events' ? '📋 My Events' : '✨ Discover'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'events' ? (
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
      ) : (
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
    </div>
  )
}
