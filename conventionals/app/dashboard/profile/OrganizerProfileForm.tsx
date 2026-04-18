'use client'

import { useState } from 'react'

const C = {
  primary: '#6366f1',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
  surface: '#f8fafc',
  danger: '#b91c1c',
}

type Props = {
  name: string
  email: string
}

export default function OrganizerProfileForm({ name: initialName, email }: Props) {
  const [name, setName] = useState(initialName)
  const [savingName, setSavingName] = useState(false)
  const [nameFeedback, setNameFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwFeedback, setPwFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setNameFeedback(null)
    try {
      const res = await fetch('/api/organizer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setNameFeedback({ ok: true, msg: 'Name updated!' })
      } else {
        const data = await res.json().catch(() => ({}))
        setNameFeedback({ ok: false, msg: data.error ?? 'Failed to update name' })
      }
    } catch {
      setNameFeedback({ ok: false, msg: 'Network error' })
    } finally {
      setSavingName(false)
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwFeedback(null)
    if (newPassword !== confirmPassword) {
      setPwFeedback({ ok: false, msg: 'New passwords do not match' })
      return
    }
    if (newPassword.length < 8) {
      setPwFeedback({ ok: false, msg: 'Password must be at least 8 characters' })
      return
    }
    setSavingPw(true)
    try {
      const res = await fetch('/api/organizer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        setPwFeedback({ ok: true, msg: 'Password updated!' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json().catch(() => ({}))
        setPwFeedback({ ok: false, msg: data.error ?? 'Failed to update password' })
      }
    } catch {
      setPwFeedback({ ok: false, msg: 'Network error' })
    } finally {
      setSavingPw(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: `1.5px solid ${C.border}`,
    borderRadius: '10px',
    fontSize: '14px',
    color: C.text,
    background: C.surface,
    boxSizing: 'border-box',
    outline: 'none',
  }

  const sectionCard: React.CSSProperties = {
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 700,
    color: C.text2,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '16px',
  }

  const label: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: C.text2,
    marginBottom: '6px',
  }

  return (
    <div>
      {/* Account info */}
      <form onSubmit={handleSaveName}>
        <div style={sectionCard}>
          <p style={sectionTitle}>Account Info</p>

          <div style={{ marginBottom: '14px' }}>
            <label style={label} htmlFor="org-email">Email</label>
            <input
              id="org-email"
              type="email"
              value={email}
              disabled
              style={{ ...inputStyle, background: '#f1f5f9', color: C.text3, cursor: 'not-allowed' }}
            />
            <p style={{ fontSize: '11px', color: C.text3, marginTop: '4px' }}>Email cannot be changed.</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={label} htmlFor="org-name">Display Name</label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
              required
              placeholder="Your name"
            />
          </div>

          {nameFeedback && (
            <p style={{ fontSize: '13px', color: nameFeedback.ok ? '#059669' : C.danger, marginBottom: '12px' }}>
              {nameFeedback.msg}
            </p>
          )}

          <button
            type="submit"
            disabled={savingName}
            style={{
              height: '44px',
              padding: '0 20px',
              background: savingName ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: C.white,
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: savingName ? 'not-allowed' : 'pointer',
            }}
          >
            {savingName ? 'Saving…' : 'Save Name'}
          </button>
        </div>
      </form>

      {/* Password change */}
      <form onSubmit={handleSavePassword}>
        <div style={sectionCard}>
          <p style={sectionTitle}>Change Password</p>

          <div style={{ marginBottom: '14px' }}>
            <label style={label} htmlFor="current-pw">Current Password</label>
            <input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              style={inputStyle}
              required
              autoComplete="current-password"
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={label} htmlFor="new-pw">New Password</label>
            <input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={label} htmlFor="confirm-pw">Confirm New Password</label>
            <input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
              autoComplete="new-password"
            />
          </div>

          {pwFeedback && (
            <p style={{ fontSize: '13px', color: pwFeedback.ok ? '#059669' : C.danger, marginBottom: '12px' }}>
              {pwFeedback.msg}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPw}
            style={{
              height: '44px',
              padding: '0 20px',
              background: savingPw ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: C.white,
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: savingPw ? 'not-allowed' : 'pointer',
            }}
          >
            {savingPw ? 'Updating…' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
