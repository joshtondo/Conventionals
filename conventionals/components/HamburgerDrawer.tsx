'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

type Variant = 'organizer' | 'attendee'

export type HamburgerDrawerProps = {
  variant: Variant
  pageTitle?: string
  userName?: string
  userRole?: string
}

const C = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  accent: '#10b981',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  white: '#ffffff',
  overlay: 'rgba(0,0,0,0.4)',
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const orgSections = [
  {
    label: 'Event',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Attendees', href: '/dashboard/attendees', icon: '👥' },
      { label: 'Scan Check-in', href: null, icon: '📷', hrefPrefix: '/event/' },
      { label: 'Schedule', href: '/dashboard/schedule', icon: '📅' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Announcements', href: '/dashboard/announcements', icon: '📢' },
      { label: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
      { label: 'Event Settings', href: '/dashboard/settings', icon: '⚙️' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', href: '/dashboard/profile', icon: '👤' },
    ],
  },
]

const attSections = [
  {
    label: 'Discover',
    items: [
      { label: 'My Events', href: '/attendee/dashboard', icon: '📋' },
      { label: 'Connections', href: '/attendee/connections', icon: '🤝' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', href: '/attendee/profile', icon: '👤' },
    ],
  },
]

export default function HamburgerDrawer({
  variant,
  pageTitle,
  userName = '',
  userRole,
}: HamburgerDrawerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const sections = variant === 'organizer' ? orgSections : attSections
  const logoutUrl = variant === 'organizer' ? '/api/auth/logout' : '/api/attendee/auth/logout'
  const loginUrl = variant === 'organizer' ? '/login' : '/attendee/login'
  const defaultTitle = variant === 'organizer' ? 'Dashboard' : 'My Events'
  const title = pageTitle ?? defaultTitle
  const roleLabel = userRole ?? (variant === 'organizer' ? 'Event Organizer' : 'Attendee')
  const userInitials = userName ? initials(userName) : (variant === 'organizer' ? 'OR' : 'AT')

  function isActive(href: string | null) {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch(logoutUrl, { method: 'POST', credentials: 'include' })
    } catch {
      // redirect anyway
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
        justifyContent: 'space-between',
        padding: '0 12px',
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Left — hamburger */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            background: C.surface,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderRadius: '10px',
            padding: 0,
            flexShrink: 0,
          }}
        >
          {[0,1,2].map(i => (
            <div key={i} style={{ width: '16px', height: '2px', background: C.text2, borderRadius: '2px' }} />
          ))}
        </button>

        {/* Center — page title */}
        <span style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '15px',
          fontWeight: 700,
          color: C.text,
          letterSpacing: '-0.01em',
          pointerEvents: 'none',
        }}>
          {title}
        </span>

        {/* Right — bell + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: C.surface,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            position: 'relative',
            cursor: 'pointer',
          }}>
            🔔
            <div style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid #fff',
            }} />
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.white,
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}>
            {userInitials}
          </div>
        </div>
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
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Drawer header — logo + user */}
        <div style={{
          padding: '50px 20px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}>
              🎪
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
              Conventionals
            </span>
          </div>
          {/* User row */}
          {userName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.white,
                fontSize: '14px',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {userInitials}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{userName}</div>
                <div style={{ fontSize: '12px', color: C.text3, marginTop: '1px' }}>{roleLabel}</div>
              </div>
            </div>
          )}
        </div>

        {/* Nav sections */}
        <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {sections.map((section) => (
            <div key={section.label}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: C.text3,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                padding: '8px 8px 4px',
              }}>
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = item.href ? isActive(item.href) : false
                // For scan check-in, point to first event (disabled if no href)
                const href = item.href ?? '#'
                return (
                  <Link
                    key={item.label}
                    href={href}
                    onClick={() => { if (item.href) setOpen(false) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '0 12px',
                      height: '44px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: active ? C.primary : C.text2,
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '2px',
                      background: active ? '#ede9fe' : 'transparent',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontSize: '17px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ padding: '12px', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 12px',
              height: '44px',
              width: '100%',
              border: 'none',
              background: 'none',
              borderRadius: '10px',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              color: loggingOut ? C.text2 : '#b91c1c',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '17px', width: '20px', textAlign: 'center' }}>🚪</span>
            {loggingOut ? 'Logging out…' : 'Sign Out'}
          </button>
        </div>
      </nav>
    </>
  )
}
