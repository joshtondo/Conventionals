'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function AttendeeResetForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/attendee/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/attendee/login'), 2500)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to reset password')
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

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#b91c1c', fontSize: '14px' }}>Invalid reset link. Please request a new one.</p>
        <Link href="/attendee/forgot-password" style={{ color: '#059669', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>Request reset →</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ marginBottom: '20px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: '#d1fae5', color: '#059669' }}>
            🎟️ Attendee · Reset Password
          </span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', margin: '0 0 6px' }}>Choose a new password</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>Must be at least 8 characters.</p>

        {done ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
            <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#15803d' }}>Password updated!</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>Redirecting you to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required autoComplete="new-password" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} required autoComplete="new-password" />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', height: '50px', background: loading ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
            }}>
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AttendeeResetPasswordPage() {
  return <Suspense><AttendeeResetForm /></Suspense>
}
