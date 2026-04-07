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
    margin: '0 0 0.375rem',
  } as React.CSSProperties,
  subheading: {
    fontSize: '0.875rem',
    color: '#6b7280',
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
  inputReadonly: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
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
}

export default function SignupForm({
  token,
  name,
  email,
}: {
  token: string
  name: string
  email: string
}) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/attendee/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to create account')
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
        <h1 style={s.heading}>Create your Conventionals account</h1>
        <p style={s.subheading}>Welcome, {name}! Set a password to get started.</p>
        <form onSubmit={handleSubmit}>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="signup-name">Name</label>
            <input
              id="signup-name"
              type="text"
              style={s.inputReadonly}
              value={name}
              readOnly
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              style={s.inputReadonly}
              value={email}
              readOnly
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="signup-password">Password *</label>
            <input
              id="signup-password"
              type="password"
              style={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              required
            />
          </div>
          <button
            type="submit"
            style={submitting ? s.submitButtonDisabled : s.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
          {error && <p style={s.formError}>{error}</p>}
        </form>
      </div>
    </div>
  )
}
