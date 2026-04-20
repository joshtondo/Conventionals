'use client'

import { useState } from 'react'

type Props = {
  connectedName: string
  contactInfo: { linkedin?: string; twitter?: string; website?: string } | null
  eventId: number
}

export default function ConnectButton({ connectedName, contactInfo, eventId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'duplicate'>('idle')

  async function handleConnect() {
    setState('loading')
    try {
      const res = await fetch('/api/attendee/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ connectedName, contactInfo, eventId }),
      })
      setState(res.status === 409 ? 'duplicate' : res.ok ? 'done' : 'idle')
    } catch {
      setState('idle')
    }
  }

  if (state === 'done') return <span style={{ fontSize: '0.75rem', color: '#059669' }}>Connected ✓</span>
  if (state === 'duplicate') return <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Already connected</span>

  return (
    <button
      onClick={handleConnect}
      disabled={state === 'loading'}
      style={{
        fontSize: '0.75rem',
        padding: '0.25rem 0.75rem',
        backgroundColor: state === 'loading' ? '#a5b4fc' : '#4f46e5',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        marginTop: '0.5rem',
      }}
    >
      {state === 'loading' ? 'Connecting…' : 'Connect'}
    </button>
  )
}
