'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const steps = ['Basics', 'Bio', 'Done']

export default function AttendeeOnboardingPage() {
  const router = useRouter()
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/attendee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          company: company.trim() || null,
          jobTitle: jobTitle.trim() || null,
          bio: bio.trim() || null,
        }),
      })
      if (res.ok) {
        router.push('/attendee/dashboard')
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

  const hasAnyInput = company.trim() || jobTitle.trim() || bio.trim()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎟️</div>
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
                background: i === 0 ? '#10b981' : '#e2e8f0',
                transition: 'all 0.2s',
              }} />
            </div>
          ))}
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px', fontWeight: 600 }}>Step 1 of 2</span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Welcome! Build your profile
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
          A complete profile helps you get better networking matches at events.
        </p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Software Engineer"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Company</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Short Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' as const }}
              placeholder="Tell people a bit about yourself and what you're working on…"
            />
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
              Used by our AI to suggest your best networking matches.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', height: '50px',
              background: saving ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
              marginBottom: '12px',
            }}
          >
            {saving ? 'Saving…' : hasAnyInput ? 'Save & Go to Dashboard →' : 'Continue →'}
          </button>
        </form>

        <Link
          href="/attendee/dashboard"
          style={{ display: 'block', textAlign: 'center' as const, fontSize: '13px', color: '#94a3b8', textDecoration: 'none', padding: '8px', fontWeight: 600 }}
        >
          Skip for now
        </Link>
      </div>
    </div>
  )
}
