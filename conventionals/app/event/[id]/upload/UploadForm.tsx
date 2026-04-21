'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import HamburgerDrawer from '@/components/HamburgerDrawer'

type AttendeeRow = {
  id: number
  name: string
  email: string
  createdAt: string | null
  badgeToken: string
  emailSent: boolean | null
  checkedIn: boolean | null
}

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '2rem',
    paddingTop: '72px',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 1rem',
  } as React.CSSProperties,
  divider: {
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  form: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  formTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 1rem',
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
    padding: '9px 12px',
    background: '#f5f3ff',
    border: '1.5px solid #ddd6fe',
    borderRadius: '10px',
    fontSize: '0.875rem',
    color: '#1e1b4b',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  } as React.CSSProperties,
  submitButton: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  } as React.CSSProperties,
  submitButtonDisabled: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#a5b4fc',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  formError: {
    color: '#b91c1c',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  csvResult: {
    color: '#065f46',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  sectionHeading: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 1rem',
  } as React.CSSProperties,
  emptyState: {
    color: '#6b7280',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '0.5rem 0.75rem',
    color: '#6b7280',
    fontWeight: '500',
    borderBottom: '1px solid #e5e7eb',
  } as React.CSSProperties,
  td: {
    padding: '0.625rem 0.75rem',
    color: '#111827',
    borderBottom: '1px solid #f3f4f6',
  } as React.CSSProperties,
  emailSentBadge: {
    fontSize: '0.75rem',
    fontWeight: '500',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
  } as React.CSSProperties,
  resendButton: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
  } as React.CSSProperties,
  resendButtonDisabled: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  resendSuccess: {
    fontSize: '0.75rem',
    color: '#065f46',
    fontWeight: '500',
  } as React.CSSProperties,
  fileInputArea: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    background: '#f5f3ff',
    border: '1.5px dashed #ddd6fe',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    userSelect: 'none',
  } as React.CSSProperties,
  fileInputHidden: {
    position: 'absolute',
    inset: 0,
    opacity: 0,
    cursor: 'pointer',
    width: '100%',
    height: '100%',
  } as React.CSSProperties,
}

export default function UploadForm({
  eventId,
  eventName,
  attendees,
  userName = '',
}: {
  eventId: number
  eventName: string
  attendees: AttendeeRow[]
  userName?: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState<{ added: number; skipped: number } | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const [resendingTokens, setResendingTokens] = useState<Set<string>>(new Set())
  const [resentTokens, setResentTokens] = useState<Set<string>>(new Set())
  const [resendError, setResendError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/events/${eventId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to add attendee')
        return
      }
      setName('')
      setEmail('')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setCsvFile(file)
    setCsvError(null)
    setCsvResult(null)
    if (!file) return
    try {
      const text = await file.text()
      const firstLine = text.split('\n')[0].toLowerCase()
      if (!firstLine.includes('name') || !firstLine.includes('email')) {
        setCsvError('CSV must have "name" and "email" column headers in the first row.')
      }
    } catch {
      // If we can't read the file locally, let the server validate it
    }
  }

  async function handleCsvUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!csvFile) return
    setCsvError(null)
    setCsvResult(null)
    setCsvUploading(true)
    try {
      const fd = new FormData()
      fd.append('csv', csvFile)
      const res = await fetch(`/api/events/${eventId}/attendees`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setCsvError(data.error ?? 'Upload failed')
        return
      }
      const data = await res.json()
      setCsvResult(data)
      setCsvFile(null)
      if (csvInputRef.current) csvInputRef.current.value = ''
      router.refresh()
    } catch {
      setCsvError('Network error — please try again')
    } finally {
      setCsvUploading(false)
    }
  }

  async function handleResend(token: string) {
    setResendError(null)
    setResendingTokens(prev => new Set(prev).add(token))
    try {
      const res = await fetch(`/api/badges/${token}/resend`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResendError(data.error ?? 'Resend failed')
        return
      }
      if (data.emailSent === false) {
        setResendError('Email could not be sent — check your email configuration.')
        return
      }
      setResentTokens(prev => new Set(prev).add(token))
    } catch {
      setResendError('Network error — please try again')
    } finally {
      setResendingTokens(prev => { const s = new Set(prev); s.delete(token); return s })
    }
  }

  return (
    <div style={s.container}>
      <HamburgerDrawer variant="organizer" pageTitle={eventName} userName={userName} />
      <h1 style={s.heading}>{eventName}</h1>
      <div style={s.divider} />

      <form style={s.form} onSubmit={handleAdd}>
        <p style={s.formTitle}>Add Attendee</p>
        <div style={s.formRow}>
          <label style={s.label} htmlFor="attendee-name">Name *</label>
          <input
            id="attendee-name"
            type="text"
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice Johnson"
            required
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label} htmlFor="attendee-email">Email *</label>
          <input
            id="attendee-email"
            type="email"
            style={s.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. alice@example.com"
            required
          />
        </div>
        <button
          type="submit"
          style={submitting ? s.submitButtonDisabled : s.submitButton}
          disabled={submitting}
        >
          {submitting ? 'Adding…' : 'Add Attendee'}
        </button>
        {error && <p style={s.formError}>{error}</p>}
      </form>

      <form style={s.form} onSubmit={handleCsvUpload}>
        <p style={s.formTitle}>Bulk Upload CSV</p>
        <div style={s.formRow}>
          <label style={s.label} htmlFor="csv-file">CSV File (columns: name, email) *</label>
          <div style={s.fileInputArea}>
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>📎</span>
            <span style={{ color: csvFile ? '#1e1b4b' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {csvFile ? csvFile.name : 'Choose a CSV file…'}
            </span>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              ref={csvInputRef}
              onChange={handleCsvFileChange}
              required
              style={s.fileInputHidden}
            />
          </div>
        </div>
        <button
          type="submit"
          style={csvUploading ? s.submitButtonDisabled : s.submitButton}
          disabled={csvUploading || !csvFile}
        >
          {csvUploading ? 'Uploading…' : 'Upload CSV'}
        </button>
        {csvError && <p style={s.formError}>{csvError}</p>}
        {csvResult && (
          <p style={s.csvResult}>
            {csvResult.added} added, {csvResult.skipped} skipped
          </p>
        )}
      </form>

      <div style={s.divider} />
      <p style={s.sectionHeading}>
        Attendees {attendees.length > 0 ? `(${attendees.length})` : ''}
      </p>

      {resendError && <p style={s.formError}>{resendError}</p>}

      {attendees.length === 0 ? (
        <p style={s.emptyState}>No attendees yet.</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Token</th>
              <th style={s.th}>Checked In</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Resend</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((a) => {
              const sending = resendingTokens.has(a.badgeToken)
              const sent = resentTokens.has(a.badgeToken)
              return (
                <tr key={a.id}>
                  <td style={s.td}>{a.name}</td>
                  <td style={s.td}>{a.email}</td>
                  <td style={s.td}>{a.badgeToken.slice(0, 8)}…</td>
                  <td style={s.td}>{a.checkedIn ? 'Yes' : 'No'}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.emailSentBadge,
                      backgroundColor: a.emailSent ? '#d1fae5' : '#f3f4f6',
                      color: a.emailSent ? '#065f46' : '#6b7280',
                    }}>
                      {a.emailSent ? 'Sent' : 'Not sent'}
                    </span>
                  </td>
                  <td style={s.td}>
                    {sent ? (
                      <span style={s.resendSuccess}>Sent ✓</span>
                    ) : (
                      <button
                        style={sending ? s.resendButtonDisabled : s.resendButton}
                        disabled={sending}
                        onClick={() => handleResend(a.badgeToken)}
                      >
                        {sending ? 'Sending…' : 'Resend'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
