'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '400px',
    width: '100%',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 1.5rem',
  } as React.CSSProperties,
  formRow: {
    marginBottom: '1rem',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.375rem',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#111827',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  submitButton: {
    width: '100%',
    padding: '0.625rem 1.25rem',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  submitButtonDisabled: {
    width: '100%',
    padding: '0.625rem 1.25rem',
    backgroundColor: '#a5b4fc',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'not-allowed',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  formError: {
    color: '#b91c1c',
    fontSize: '0.875rem',
    marginTop: '0.75rem',
  } as React.CSSProperties,
  link: {
    display: 'block',
    textAlign: 'center' as const,
    marginTop: '1.25rem',
    fontSize: '0.8rem',
    color: '#6b7280',
    textDecoration: 'none',
  } as React.CSSProperties,
}

export default function AttendeeLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/attendee/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Invalid email or password')
        return
      }
      router.push('/attendee/dashboard')
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.heading}>Attendee Login</h1>
        <form onSubmit={handleSubmit}>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="attendee-login-email">Email</label>
            <input
              id="attendee-login-email"
              type="email"
              style={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="attendee-login-password">Password</label>
            <input
              id="attendee-login-password"
              type="password"
              style={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            style={submitting ? s.submitButtonDisabled : s.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
          {error && <p style={s.formError}>{error}</p>}
        </form>
        <a href="/login" style={s.link}>Organizer? Log in here →</a>
      </div>
    </div>
  )
}
