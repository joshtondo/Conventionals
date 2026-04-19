'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AttendeeRegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/attendee/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })
      if (res.ok) {
        router.push('/attendee/dashboard')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Registration failed')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', fontSize: '15px', color: '#0f172a', background: '#f8fafc',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Link href="/register/select" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#059669', textDecoration: 'none', fontSize: '14px', fontWeight: 600, marginBottom: '28px' }}>
          ← Back
        </Link>

        <div style={{ marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: '#d1fae5', color: '#059669' }}>
            🎟️ Attendee Account
          </span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', margin: '0 0 6px' }}>Create your profile</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
          Set up your attendee account to manage badges and connect with others.
        </p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Alex Johnson" required autoComplete="name" />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="At least 8 characters" required autoComplete="new-password" />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', height: '50px',
            background: loading ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
            marginBottom: '20px',
          }}>
            {loading ? 'Creating account…' : 'Create Attendee Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center' as const, fontSize: '13px', color: '#64748b', margin: 0 }}>
          Already have an account?{' '}
          <Link href="/attendee/login" style={{ color: '#059669', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
