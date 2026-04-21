'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { initials } from '@/lib/utils'

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

const orgSections = [
  {
    label: 'Event',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Attendees', href: '/dashboard/attendees', icon: '👥' },
      { label: 'Scan Check-in', href: '__scan__', icon: '📷' },
      { label: 'Manage Attendees', href: '__manage__', icon: '📋' },
      { label: 'Schedule', href: '/dashboard/schedule', icon: '📅' },
      { label: 'Shared Events', href: '/dashboard/shared', icon: '🤝' },
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
      { label: 'Discover People', href: '/attendee/dashboard?tab=discover', icon: '✨' },
      { label: 'Connections', href: '/attendee/connections', icon: '🤝' },
      { label: 'Schedule', href: '/attendee/dashboard?tab=schedule', icon: '📅' },
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
  const [bellOpen, setBellOpen] = useState(false)
  const [notifications, setNotifications] = useState<{ id: number; type: string; title: string; message: string; createdAt: string | null }[]>([])
  const [notifLoaded, setNotifLoaded] = useState(false)
  const unreadCount = notifLoaded ? notifications.length : 0

  // Extract event ID from current path (e.g. /event/42/upload → 42)
  const eventIdFromPath = pathname.match(/^\/event\/(\d+)/)?.[1] ?? null
  const scanHref = eventIdFromPath ? `/event/${eventIdFromPath}/scan` : '/dashboard'
  const manageHref = eventIdFromPath ? `/event/${eventIdFromPath}/upload` : '/dashboard'
  const profileUrl = variant === 'organizer' ? '/dashboard/profile' : '/attendee/profile'

  // Prefetch notifications in background so they're ready when bell opens
  useEffect(() => {
    if (variant !== 'organizer') return
    const t = setTimeout(() => {
      fetch('/api/notifications', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then((data: typeof notifications) => { setNotifications(data); setNotifLoaded(true) })
        .catch(() => setNotifLoaded(true))
    }, 800)
    return () => clearTimeout(t)
  }, [variant]) // eslint-disable-line react-hooks/exhaustive-deps

  function openBell() {
    const opening = !bellOpen
    setBellOpen(opening)
    if (!opening || variant !== 'organizer') return

    // Refresh in background every time bell opens
    fetch('/api/notifications', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: typeof notifications) => {
        setNotifications(data)
        setNotifLoaded(true)
        const nonSetup = data.filter((n: typeof notifications[0]) => n.type !== 'profile_setup')
        if (nonSetup.length > 0) {
          fetch('/api/notifications/read', { method: 'POST', credentials: 'include' }).catch(() => {})
        }
      })
      .catch(() => {})
  }

  function dismissProfileSetup(id: number) {
    fetch(`/api/notifications/${id}/dismiss`, { method: 'POST', credentials: 'include' }).catch(() => {})
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  function notifIcon(type: string) {
    if (type === 'checkin') return '✅'
    if (type === 'registration') return '🎟️'
    if (type === 'announcement') return '📢'
    if (type === 'profile_setup') return '👤'
    if (type === 'invite') return '🤝'
    return '🔔'
  }

  function timeAgo(iso: string | null) {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const sections = variant === 'organizer' ? orgSections : attSections
  const logoutUrl = variant === 'organizer' ? '/api/auth/logout' : '/api/attendee/auth/logout'
  const loginUrl = variant === 'organizer' ? '/login' : '/attendee/login'
  const defaultTitle = variant === 'organizer' ? 'Dashboard' : 'My Events'
  const title = pageTitle ?? defaultTitle
  const roleLabel = userRole ?? (variant === 'organizer' ? 'Event Organizer' : 'Attendee')
  const userInitials = userName ? initials(userName) : (variant === 'organizer' ? 'OR' : 'AT')

  function isActive(href: string) {
    if (href === '__scan__') return pathname.endsWith('/scan')
    if (href === '__manage__') return pathname.endsWith('/upload')
    // Strip query params before comparing
    const hrefPath = href.split('?')[0]
    return pathname === hrefPath || pathname.startsWith(hrefPath + '/')
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

  function resolveHref(item: { href: string; label: string }) {
    if (item.href === '__scan__') return scanHref
    if (item.href === '__manage__') return manageHref
    return item.href
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
          <div style={{ position: 'relative' }}>
            <button
              onClick={openBell}
              aria-label="Notifications"
              style={{
                width: '36px',
                height: '36px',
                background: bellOpen ? '#ede9fe' : C.surface,
                borderRadius: '10px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              🔔
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  minWidth: '16px',
                  height: '16px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
            {bellOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 150 }}
                  onClick={() => setBellOpen(false)}
                />
                <div style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: '300px',
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  zIndex: 200,
                  overflow: 'hidden',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Notifications</span>
                    {notifications.length > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: C.primary, background: '#ede9fe', padding: '2px 8px', borderRadius: '999px' }}>
                        {notifications.length} new
                      </span>
                    )}
                  </div>
                  {!notifLoaded ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center' as const, color: C.text3, fontSize: '13px' }}>Loading…</div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center' as const }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
                      <p style={{ margin: 0, fontSize: '13px', color: C.text2, fontWeight: 600 }}>All caught up!</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.text3 }}>No new notifications</p>
                    </div>
                  ) : (
                    notifications.map(n => n.type === 'profile_setup' ? (
                      <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: 'linear-gradient(135deg, #fafafe, #f5f3ff)' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '18px', flexShrink: 0 }}>👤</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '1px' }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: C.text2, lineHeight: 1.4 }}>{n.message}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', paddingLeft: '28px' }}>
                          <a href="/dashboard/profile" onClick={() => { dismissProfileSetup(n.id); setBellOpen(false) }} style={{
                            fontSize: '12px', fontWeight: 700, color: C.white, background: C.primary,
                            padding: '4px 12px', borderRadius: '6px', textDecoration: 'none',
                          }}>
                            Complete Profile →
                          </a>
                          <button onClick={() => dismissProfileSetup(n.id)} style={{
                            fontSize: '12px', fontWeight: 600, color: C.text3, background: 'none',
                            border: 'none', cursor: 'pointer', padding: '4px 8px',
                          }}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{notifIcon(n.type)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '1px' }}>{n.title}</div>
                          <div style={{ fontSize: '12px', color: C.text3, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
                        </div>
                        <div style={{ fontSize: '11px', color: C.text3, flexShrink: 0, marginTop: '2px' }}>{timeAgo(n.createdAt)}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Profile avatar — clicks through to profile */}
          <Link
            href={profileUrl}
            aria-label="Go to profile"
            style={{
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
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {userInitials}
          </Link>
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
                const active = isActive(item.href)
                const href = resolveHref(item)
                return (
                  <Link
                    key={item.label}
                    href={href}
                    onClick={() => setOpen(false)}
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
