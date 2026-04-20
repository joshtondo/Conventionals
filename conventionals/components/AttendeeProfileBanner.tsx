'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const DISMISS_KEY = 'att_profile_banner_dismissed'

export default function AttendeeProfileBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      border: '1.5px solid #86efac',
      borderRadius: '14px',
      padding: '14px 16px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>👤</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803d', marginBottom: '3px' }}>
          Finish setting up your profile
        </div>
        <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5, marginBottom: '10px' }}>
          Add your job title, company, and bio to get better AI networking matches at events.
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/attendee/profile" style={{
            display: 'inline-block', padding: '6px 16px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
            textDecoration: 'none', boxShadow: '0 2px 6px rgba(16,185,129,0.25)',
          }}>
            Complete Profile →
          </Link>
          <button onClick={dismiss} style={{
            background: 'none', border: 'none', fontSize: '13px', color: '#6b7280',
            cursor: 'pointer', fontWeight: 600, padding: '6px 8px',
          }}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
