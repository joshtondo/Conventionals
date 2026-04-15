'use client'

import { useState } from 'react'
import HamburgerDrawer from '@/components/HamburgerDrawer'

type SocialLinks = { linkedin?: string; twitter?: string; website?: string } | null

type AccountData = {
  id: number
  email: string
  name: string
  company: string | null
  jobTitle: string | null
  bio: string | null
  socialLinks: SocialLinks
  isPublic: boolean | null
}

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '2rem',
    paddingTop: '72px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    maxWidth: '600px',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 1.5rem',
  } as React.CSSProperties,
  sectionHeading: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    margin: '1.5rem 0 0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
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
  textarea: {
    width: '100%',
    padding: '9px 12px',
    background: '#f5f3ff',
    border: '1.5px solid #ddd6fe',
    borderRadius: '10px',
    fontSize: '0.875rem',
    color: '#1e1b4b',
    boxSizing: 'border-box' as const,
    minHeight: '100px',
    resize: 'vertical' as const,
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
    marginTop: '0.5rem',
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
    marginTop: '0.5rem',
  } as React.CSSProperties,
  formError: {
    color: '#b91c1c',
    fontSize: '0.875rem',
    marginTop: '0.75rem',
  } as React.CSSProperties,
  formSuccess: {
    color: '#065f46',
    fontSize: '0.875rem',
    marginTop: '0.75rem',
  } as React.CSSProperties,
}

export default function ProfileForm({ account }: { account: AccountData }) {
  const sl = account.socialLinks ?? {}
  const [name, setName] = useState(account.name)
  const [company, setCompany] = useState(account.company ?? '')
  const [jobTitle, setJobTitle] = useState(account.jobTitle ?? '')
  const [bio, setBio] = useState(account.bio ?? '')
  const [linkedin, setLinkedin] = useState(sl.linkedin ?? '')
  const [twitter, setTwitter] = useState(sl.twitter ?? '')
  const [website, setWebsite] = useState(sl.website ?? '')
  const [isPublic, setIsPublic] = useState(account.isPublic ?? true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      const res = await fetch('/api/attendee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          company: company || null,
          jobTitle: jobTitle || null,
          bio: bio || null,
          socialLinks: { linkedin: linkedin || undefined, twitter: twitter || undefined, website: website || undefined },
          isPublic,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save profile')
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={s.container}>
      <HamburgerDrawer variant="attendee" />
      <div style={s.card}>
        <h1 style={s.heading}>My Profile</h1>
        <form onSubmit={handleSubmit}>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="profile-name">Name *</label>
            <input
              id="profile-name"
              type="text"
              style={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="profile-company">Company</label>
            <input
              id="profile-company"
              type="text"
              style={s.input}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="profile-jobtitle">Job Title</label>
            <input
              id="profile-jobtitle"
              type="text"
              style={s.input}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              style={s.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about yourself"
            />
          </div>
          <p style={s.sectionHeading}>Social Links</p>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="profile-linkedin">LinkedIn URL</label>
            <input
              id="profile-linkedin"
              type="url"
              style={s.input}
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="profile-twitter">Twitter URL</label>
            <input
              id="profile-twitter"
              type="url"
              style={s.input}
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://twitter.com/yourhandle"
            />
          </div>
          <div style={s.formRow}>
            <label style={s.label} htmlFor="profile-website">Website URL</label>
            <input
              id="profile-website"
              type="url"
              style={s.input}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>
          <p style={s.sectionHeading}>Visibility</p>
          <div style={{ ...s.formRow, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id="profile-ispublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label style={{ ...s.label, marginBottom: 0 }} htmlFor="profile-ispublic">
              Make my profile public (visible to other attendees)
            </label>
          </div>
          <button
            type="submit"
            style={submitting ? s.submitButtonDisabled : s.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
          {error && <p style={s.formError}>{error}</p>}
          {success && <p style={s.formSuccess}>Saved!</p>}
        </form>
      </div>
    </div>
  )
}
