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

        {/* Google SSO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' as const }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>
        <a href="/api/attendee/auth/google" style={{
          width: '100%', height: '48px', border: '1.5px solid #e2e8f0', borderRadius: '12px',
          background: '#fff', fontSize: '14px', fontWeight: 600, color: '#374151',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          textDecoration: 'none', marginBottom: '24px', boxSizing: 'border-box' as const,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <p style={{ textAlign: 'center' as const, fontSize: '13px', color: '#64748b', margin: 0 }}>
          Already have an account?{' '}
          <Link href="/attendee/login" style={{ color: '#059669', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
