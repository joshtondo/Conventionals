'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Login failed')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Back link */}
        <Link href="/login/select" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: '#6366f1',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '28px',
        }}>
          ← Back
        </Link>

        {/* Role badge pill */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            background: '#ede9fe',
            color: '#6366f1',
          }}>
            🏢 Organizer Login
          </span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: '26px',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '-0.03em',
          margin: '0 0 6px',
        }}>
          Welcome back
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          margin: '0 0 28px',
          lineHeight: 1.6,
        }}>
          Sign in to manage your events and attendees.
        </p>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#b91c1c',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px',
            }} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              style={{
                width: '100%',
                padding: '13px 16px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '15px',
                color: '#0f172a',
                background: '#f8fafc',
                boxSizing: 'border-box' as const,
                outline: 'none',
              }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px',
            }} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              style={{
                width: '100%',
                padding: '13px 16px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '15px',
                color: '#0f172a',
                background: '#f8fafc',
                boxSizing: 'border-box' as const,
                outline: 'none',
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: 'right' as const, marginBottom: '20px' }}>
            <Link href="/forgot-password" style={{ fontSize: '13px', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '50px',
              background: loading
                ? '#a5b4fc'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
              marginBottom: '20px',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center' as const, fontSize: '13px', color: '#64748b', margin: 0 }}>
          Don&apos;t have an account?{' '}
          <Link href="/register/select" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
