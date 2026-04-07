import { notFound } from 'next/navigation'
import { getBadgeByToken } from '@/data/badges'
import { generateQR } from '@/lib/qr'

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
    textAlign: 'center' as const,
    maxWidth: '400px',
    width: '100%',
  } as React.CSSProperties,
  name: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.5rem',
  } as React.CSSProperties,
  eventName: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0 0 1.5rem',
  } as React.CSSProperties,
  qr: {
    width: '200px',
    height: '200px',
    margin: '0 auto 1.5rem',
    display: 'block',
  } as React.CSSProperties,
  tokenLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    wordBreak: 'break-all' as const,
  } as React.CSSProperties,
}

export default async function BadgePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const badge = await getBadgeByToken(token)
  if (!badge) notFound()

  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/badge/${token}`
  const qrDataUrl = await generateQR(badgeUrl)

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.name}>{badge.attendeeName}</h1>
        <p style={s.eventName}>{badge.eventName}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR Code" style={s.qr} />
        <p style={s.tokenLabel}>{badgeUrl}</p>
      </div>
    </div>
  )
}
