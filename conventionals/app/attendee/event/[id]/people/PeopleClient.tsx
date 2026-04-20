'use client'

import { useState } from 'react'
import ConnectButton from './ConnectButton'

type Person = {
  id: number
  name: string
  company: string | null
  jobTitle: string | null
  bio: string | null
  socialLinks: { linkedin?: string; twitter?: string; website?: string } | null
}

type Recommendation = { id: number; name: string; reason: string }

const s = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '0.75rem',
    maxWidth: '600px',
  } as React.CSSProperties,
  personName: { fontWeight: '700', color: '#111827', margin: '0 0 0.2rem', fontSize: '0.95rem' } as React.CSSProperties,
  personMeta: { fontSize: '0.8rem', color: '#6b7280', margin: '0 0 0.4rem' } as React.CSSProperties,
  personBio: { fontSize: '0.85rem', color: '#374151', margin: '0 0 0.5rem', lineHeight: 1.5 } as React.CSSProperties,
  socialLink: { fontSize: '0.75rem', color: '#4f46e5', marginRight: '0.75rem', textDecoration: 'none' } as React.CSSProperties,
}

export default function PeopleClient({ people, eventId }: { people: Person[]; eventId: number }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  async function getRecommendations() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/attendee/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not load recommendations'); return }
      setRecommendations(data.recommendations ?? [])
      setLoaded(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const recIds = new Set(recommendations.map(r => r.id))

  return (
    <div>
      {/* AI Recommendations banner */}
      {people.length > 0 && (
        <div style={{
          maxWidth: '600px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #fafafe 0%, #f5f3ff 100%)',
          border: '1.5px solid #c7d2fe',
          borderRadius: '16px',
          padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>🤝</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1' }}>AI Networking Match</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#ede9fe', color: '#7c3aed' }}>Beta</span>
          </div>
          <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px', lineHeight: 1.5 }}>
            Get personalized suggestions on who to connect with based on your profile.
          </p>

          {!loaded && (
            <button
              onClick={getRecommendations}
              disabled={loading}
              style={{
                height: '38px', padding: '0 18px',
                background: loading ? '#e0e7ff' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: loading ? '#a5b4fc' : '#fff',
                border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 2px 8px rgba(99,102,241,0.25)',
              }}
            >
              {loading ? '✨ Analyzing…' : '✨ Find My Best Matches'}
            </button>
          )}

          {error && <p style={{ fontSize: '13px', color: '#b91c1c', margin: '8px 0 0' }}>{error}</p>}

          {loaded && recommendations.length === 0 && (
            <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 0' }}>
              Add more to your profile (bio, job title, company) for better matches.
            </p>
          )}

          {recommendations.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
              {recommendations.map((rec, i) => (
                <div key={rec.id} style={{
                  background: '#fff', border: '1px solid #ddd6fe', borderRadius: '10px',
                  padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px',
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: ['#6366f1', '#10b981', '#f59e0b'][i % 3],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 800, color: '#fff',
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{rec.name}</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>{rec.reason}</div>
                  </div>
                </div>
              ))}
              <button
                onClick={getRecommendations}
                disabled={loading}
                style={{
                  alignSelf: 'flex-start' as const, height: '32px', padding: '0 14px',
                  background: 'transparent', color: '#6366f1', border: '1.5px solid #c7d2fe',
                  borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  marginTop: '2px',
                }}
              >
                {loading ? 'Refreshing…' : '↺ Refresh'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recommended people highlighted at top */}
      {recommendations.length > 0 && (
        <div style={{ maxWidth: '600px', marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 8px' }}>
            Your Top Matches
          </p>
          {recommendations.map(rec => {
            const person = people.find(p => p.id === rec.id)
            if (!person) return null
            return <PersonCard key={`rec-${person.id}`} person={person} eventId={eventId} highlight />
          })}
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '16px 0 8px' }}>
            All Attendees
          </p>
        </div>
      )}

      {/* Full attendee list */}
      {people.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No public attendees at this event.</p>
      ) : (
        people
          .filter(p => !recIds.has(p.id))
          .map(person => <PersonCard key={person.id} person={person} eventId={eventId} />)
      )}
    </div>
  )
}

function PersonCard({ person, eventId, highlight }: { person: Person; eventId: number; highlight?: boolean }) {
  const sl = person.socialLinks ?? {}
  const metaParts = [person.company, person.jobTitle].filter(Boolean)
  return (
    <div style={{
      ...s.card,
      ...(highlight ? { border: '1.5px solid #c7d2fe', background: 'linear-gradient(135deg, #fafafe, #f5f3ff)' } : {}),
    }}>
      <p style={s.personName}>{person.name}</p>
      {metaParts.length > 0 && <p style={s.personMeta}>{metaParts.join(' · ')}</p>}
      {person.bio && <p style={s.personBio}>{person.bio}</p>}
      <div style={{ marginBottom: '8px' }}>
        {sl.linkedin && <a href={sl.linkedin} style={s.socialLink} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
        {sl.twitter && <a href={sl.twitter} style={s.socialLink} target="_blank" rel="noopener noreferrer">Twitter</a>}
        {sl.website && <a href={sl.website} style={s.socialLink} target="_blank" rel="noopener noreferrer">Website</a>}
      </div>
      <ConnectButton connectedName={person.name} contactInfo={person.socialLinks ?? null} eventId={eventId} />
    </div>
  )
}
