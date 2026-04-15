import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { sessionOptions, SessionData } from '@/lib/session'

export default async function SelectRolePage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (session.organizerId) redirect('/dashboard')
  if (session.attendeeAccountId) redirect('/attendee/dashboard')

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    },
    card: {
      background: '#ffffff',
      borderRadius: '24px',
      padding: '40px 36px',
      width: '100%',
      maxWidth: '420px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      border: '1px solid #e2e8f0',
    },
    back: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      color: '#6366f1',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: 600,
      marginBottom: '28px',
    },
    headline: {
      fontSize: '26px',
      fontWeight: 800,
      color: '#0f172a',
      letterSpacing: '-0.03em',
      marginBottom: '8px',
    },
    sub: {
      fontSize: '15px',
      color: '#64748b',
      lineHeight: 1.6,
      marginBottom: '28px',
    },
    roleCard: {
      display: 'block',
      width: '100%',
      border: '2px solid #e2e8f0',
      borderRadius: '18px',
      padding: '22px 20px',
      textDecoration: 'none',
      background: '#ffffff',
      marginBottom: '14px',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      cursor: 'pointer',
    },
    iconWrap: {
      width: '48px',
      height: '48px',
      borderRadius: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      marginBottom: '12px',
    },
    iconOrg: { background: '#ede9fe' },
    iconAtt: { background: '#d1fae5' },
    roleTitle: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: '4px',
    },
    roleDesc: {
      fontSize: '13px',
      color: '#64748b',
      lineHeight: 1.55,
      marginBottom: '14px',
    },
    roleArrow: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#6366f1',
    },
    divider: {
      textAlign: 'center',
      color: '#94a3b8',
      fontSize: '13px',
      fontWeight: 500,
      margin: '4px 0 18px',
    },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Link href="/" style={s.back}>← Back to home</Link>
        <h1 style={s.headline}>Welcome back.</h1>
        <p style={s.sub}>How are you joining today? We&apos;ll take you to the right place.</p>

        <Link href="/login" style={s.roleCard}>
          <div style={{ ...s.iconWrap, ...s.iconOrg }}>🏢</div>
          <div style={s.roleTitle}>I&apos;m an Organizer</div>
          <p style={s.roleDesc}>Manage your event, check in attendees, view analytics, and send updates.</p>
          <div style={s.roleArrow}>Go to Organizer Login →</div>
        </Link>

        <div style={s.divider}>— or —</div>

        <Link href="/attendee/login" style={s.roleCard}>
          <div style={{ ...s.iconWrap, ...s.iconAtt }}>🎟️</div>
          <div style={s.roleTitle}>I&apos;m an Attendee</div>
          <p style={s.roleDesc}>Access your badge, connect with people, and explore the event schedule.</p>
          <div style={{ ...s.roleArrow, color: '#10b981' }}>Go to Attendee Login →</div>
        </Link>
      </div>
    </div>
  )
}
