'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Variant = 'organizer' | 'attendee'

const C = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  white: '#ffffff',
  overlay: 'rgba(0,0,0,0.35)',
}

const organizerNav = [
  { label: 'My Events', href: '/dashboard', icon: '📋' },
]

const attendeeNav = [
  { label: 'My Events', href: '/attendee/dashboard', icon: '📋' },
  { label: 'Profile', href: '/attendee/profile', icon: '👤' },
  { label: 'Connections', href: '/attendee/connections', icon: '🤝' },
]

export default function HamburgerDrawer({ variant }: { variant: Variant }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const navItems = variant === 'organizer' ? organizerNav : attendeeNav
  const logoutUrl = variant === 'organizer' ? '/api/auth/logout' : '/api/attendee/auth/logout'
  const loginUrl = variant === 'organizer' ? '/login' : '/attendee/login'

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch(logoutUrl, { method: 'POST', credentials: 'include' })
    } catch {
      // network error — redirect anyway
    }
    router.push(loginUrl)
  }

  return (
    <>
      {/* Fixed top bar */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: C.white,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 100,
      }}>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          style={{
            width: '44px',
            height: '44px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: C.text,
            borderRadius: '8px',
            padding: 0,
            flexShrink: 0,
          }}
        >
          ☰
        </button>
        <span style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '15px',
          fontWeight: 700,
          color: C.primary,
          letterSpacing: '-0.02em',
          pointerEvents: 'none',
        }}>
          Conventionals
        </span>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: C.overlay,
            zIndex: 200,
          }}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        aria-label="Navigation menu"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: C.white,
          boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px',
          borderBottom: `1px solid ${C.border}`,
          height: '56px',
          boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: C.primary, letterSpacing: '-0.02em' }}>
            Conventionals
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            style={{
              width: '44px',
              height: '44px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: C.text2,
              borderRadius: '8px',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                height: '48px',
                borderRadius: '10px',
                textDecoration: 'none',
                color: C.text,
                fontSize: '15px',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Logout */}
        <div style={{ padding: '12px 8px', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 12px',
              height: '48px',
              width: '100%',
              border: 'none',
              background: 'none',
              borderRadius: '10px',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              color: loggingOut ? C.text2 : '#b91c1c',
              fontSize: '15px',
              fontWeight: 500,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>🚪</span>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </nav>
    </>
  )
}
