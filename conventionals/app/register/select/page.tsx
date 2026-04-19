import Link from 'next/link'

export default function RegisterSelectPage() {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Link href="/login/select" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6366f1',
          textDecoration: 'none', fontSize: '14px', fontWeight: 600, marginBottom: '28px',
        }}>
          ← Back
        </Link>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            🎪
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Conventionals</span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', margin: '0 0 6px' }}>Create your account</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
          Choose the account type that fits your role.
        </p>

        {/* Organizer card */}
        <Link href="/register" style={{ textDecoration: 'none', display: 'block', marginBottom: '14px' }}>
          <div style={{
            border: '2px solid #e2e8f0', borderRadius: '16px', padding: '20px',
            display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
            }}>
              🏢
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>Event Organizer</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                Create and manage events, upload attendees, scan check-ins, send announcements.
              </div>
            </div>
            <span style={{ fontSize: '20px', color: '#6366f1', flexShrink: 0 }}>›</span>
          </div>
        </Link>

        {/* Attendee card */}
        <Link href="/attendee/register" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            border: '2px solid #e2e8f0', borderRadius: '16px', padding: '20px',
            display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
            }}>
              🎟️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>Attendee</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                Create a profile, connect with other attendees, and access your event badges.
              </div>
            </div>
            <span style={{ fontSize: '20px', color: '#059669', flexShrink: 0 }}>›</span>
          </div>
        </Link>

        <p style={{ textAlign: 'center' as const, fontSize: '13px', color: '#64748b', margin: '24px 0 0' }}>
          Already have an account?{' '}
          <Link href="/login/select" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
