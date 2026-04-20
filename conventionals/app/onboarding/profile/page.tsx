'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const steps = ['Name', 'Role', 'Done']

export default function OrganizerOnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/organizer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Save failed')
      }
    } catch {
      setError('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', fontSize: '15px', color: '#0f172a', background: '#f8fafc',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎪</div>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Conventionals</span>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: i === 0 ? '28px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: i === 0 ? '#6366f1' : '#e2e8f0',
                transition: 'all 0.2s',
              }} />
            </div>
          ))}
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px', fontWeight: 600 }}>Step 1 of 2</span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Welcome! Let&apos;s set up your profile
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
          This only takes a minute. You can always update it later.
        </p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
              placeholder="How should attendees know you?"
              autoFocus
            />
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0' }}>
              This is shown on announcements and event pages.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              width: '100%', height: '50px',
              background: saving || !name.trim() ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              boxShadow: saving || !name.trim() ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
              marginBottom: '12px',
            }}
          >
            {saving ? 'Saving…' : 'Save & Continue →'}
          </button>
        </form>

        <Link
          href="/dashboard"
          style={{ display: 'block', textAlign: 'center' as const, fontSize: '13px', color: '#94a3b8', textDecoration: 'none', padding: '8px', fontWeight: 600 }}
        >
          Skip for now
        </Link>
      </div>
    </div>
  )
}
