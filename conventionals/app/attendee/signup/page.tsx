import { getAttendeeByInviteToken } from '@/data/attendees'
import SignupForm from './SignupForm'

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '400px',
    width: '100%',
  } as React.CSSProperties,
  errorHeading: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#b91c1c',
    margin: '0 0 0.5rem',
  } as React.CSSProperties,
  errorText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  } as React.CSSProperties,
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.errorHeading}>Invalid Link</h1>
        <p style={s.errorText}>{message}</p>
      </div>
    </div>
  )
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams

  if (!token) {
    return <ErrorCard message="This invite link has already been used or is invalid" />
  }

  const attendee = await getAttendeeByInviteToken(token)
  if (!attendee) {
    return <ErrorCard message="This invite link has already been used or is invalid" />
  }

  return <SignupForm token={token} name={attendee.name} email={attendee.email} />
}
