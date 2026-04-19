'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  primary: '#6366f1',
  accent: '#10b981',
  danger: '#ef4444',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
  surface: '#f8fafc',
}

type Invite = {
  id: number
  eventId: number
  eventName: string
  eventDate: string | null
  status: string
  invitedByName: string | null
  createdAt: string | null
}

type SharedEvent = {
  id: number
  name: string
  eventDate: string | null
  invitedByName: string | null
  inviteId: number
}

type OwnEvent = {
  id: number
  name: string
}

type OutboundInvite = {
  id: number
  eventId: number
  eventName: string
  invitedEmail: string
  status: string
  inviteeName: string | null
}

function formatDate(d: string | null) {
  if (!d) return 'No date set'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusChip(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
    accepted: { bg: '#d1fae5', color: '#059669', label: 'Accepted' },
    declined: { bg: '#fee2e2', color: '#b91c1c', label: 'Declined' },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '999px', background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

export default function SharedClient({
  inboundInvites,
  sharedEvents,
  ownEvents,
  outboundInvites,
}: {
  inboundInvites: Invite[]
  sharedEvents: SharedEvent[]
  ownEvents: OwnEvent[]
  outboundInvites: OutboundInvite[]
}) {
  const router = useRouter()
  const [invites, setInvites] = useState(inboundInvites)
  const [shared, setShared] = useState(sharedEvents)
  const [outbound, setOutbound] = useState(outboundInvites)
  const [acting, setActing] = useState<number | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteEventId, setInviteEventId] = useState<number | ''>(ownEvents[0]?.id ?? '')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleAccept(inviteId: number) {
    setActing(inviteId)
    try {
      const res = await fetch(`/api/event-invites/${inviteId}/accept`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== inviteId))
        router.refresh()
      }
    } finally {
      setActing(null)
    }
  }

  async function handleDecline(inviteId: number) {
    setActing(inviteId)
    try {
      const res = await fetch(`/api/event-invites/${inviteId}/decline`, { method: 'POST', credentials: 'include' })
      if (res.ok) setInvites(prev => prev.filter(i => i.id !== inviteId))
    } finally {
      setActing(null)
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEventId) return
    setInviteSending(true)
    setInviteMsg(null)
    try {
      const res = await fetch(`/api/events/${inviteEventId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setInviteMsg({ ok: true, text: `Invite sent${data.hasAccount ? ' — they can accept from their dashboard' : ' — they need to register first'}` })
        setInviteEmail('')
        router.refresh()
      } else {
        setInviteMsg({ ok: false, text: data.error ?? 'Failed to send invite' })
      }
    } catch {
      setInviteMsg({ ok: false, text: 'Network error' })
    } finally {
      setInviteSending(false)
    }
  }

  const pendingInvites = invites.filter(i => i.status === 'pending')

  return (
    <div>
      {/* Pending inbound invites */}
      {pendingInvites.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>
            Pending Invitations ({pendingInvites.length})
          </p>
          {pendingInvites.map(invite => (
            <div key={invite.id} style={{
              background: C.white, border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${C.primary}`, borderRadius: '14px',
              padding: '14px 16px', marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' as const }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>{invite.eventName}</div>
                  <div style={{ fontSize: '12px', color: C.text3 }}>
                    Invited by <strong>{invite.invitedByName ?? 'an organizer'}</strong> · {formatDate(invite.eventDate)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleDecline(invite.id)}
                    disabled={acting === invite.id}
                    style={{ fontSize: '12px', fontWeight: 600, padding: '6px 14px', background: '#fee2e2', color: C.danger, border: 'none', borderRadius: '20px', cursor: 'pointer' }}
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(invite.id)}
                    disabled={acting === invite.id}
                    style={{ fontSize: '12px', fontWeight: 700, padding: '6px 14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: C.white, border: 'none', borderRadius: '20px', cursor: 'pointer' }}
                  >
                    {acting === invite.id ? '…' : 'Accept'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared events I've joined */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>
          Events I Co-Organize ({shared.length})
        </p>
        {shared.length === 0 ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '28px', textAlign: 'center' as const, color: C.text3, fontSize: '14px' }}>
            No shared events yet. Accept an invitation to get started.
          </div>
        ) : shared.map(ev => (
          <div key={ev.id} style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${C.accent}`, borderRadius: '14px',
            padding: '14px 16px', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>{ev.name}</div>
              <div style={{ fontSize: '12px', color: C.text3 }}>
                Owned by <strong>{ev.invitedByName ?? 'organizer'}</strong> · {formatDate(ev.eventDate)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <a href={`/event/${ev.id}/upload`} style={{ fontSize: '12px', fontWeight: 600, padding: '5px 12px', background: '#ede9fe', color: C.primary, borderRadius: '20px', textDecoration: 'none', border: '1px solid #c4b5fd' }}>
                Manage →
              </a>
              <a href={`/event/${ev.id}/scan`} style={{ fontSize: '12px', fontWeight: 600, padding: '5px 12px', background: '#d1fae5', color: '#059669', borderRadius: '20px', textDecoration: 'none', border: '1px solid #6ee7b7' }}>
                📷 Scan
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Invite a co-organizer */}
      {ownEvents.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>
            Invite a Co-Organizer
          </p>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
            <form onSubmit={handleSendInvite}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Event</label>
                <select
                  value={inviteEventId}
                  onChange={e => setInviteEventId(Number(e.target.value))}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', color: C.text, background: C.surface, boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
                >
                  {ownEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Organizer&apos;s Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', color: C.text, background: C.surface, boxSizing: 'border-box' as const, fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              {inviteMsg && (
                <p style={{ fontSize: '13px', color: inviteMsg.ok ? '#059669' : C.danger, marginBottom: '12px' }}>{inviteMsg.text}</p>
              )}
              <button
                type="submit"
                disabled={inviteSending}
                style={{
                  height: '44px', padding: '0 20px',
                  background: inviteSending ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: C.white, border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 700, cursor: inviteSending ? 'not-allowed' : 'pointer',
                }}
              >
                {inviteSending ? 'Sending…' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Outbound invites I sent */}
      {outbound.length > 0 && (
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>
            Invitations Sent
          </p>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            {outbound.map((inv, i) => (
              <div key={inv.id} style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                borderBottom: i < outbound.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{inv.inviteeName ?? inv.invitedEmail}</div>
                  <div style={{ fontSize: '11px', color: C.text3 }}>{inv.eventName}</div>
                </div>
                {statusChip(inv.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
