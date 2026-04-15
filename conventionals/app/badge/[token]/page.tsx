import { notFound } from 'next/navigation'
import { getBadgeWithProfile } from '@/data/badges'
import { generateQR } from '@/lib/qr'
import BadgeShareButton from '@/components/BadgeShareButton'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default async function BadgePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const badge = await getBadgeWithProfile(token)
  if (!badge) notFound()

  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/badge/${token}`
  const qrDataUrl = await generateQR(badgeUrl)

  const sl = badge.socialLinks ?? {}
  const hasSocial = sl.linkedin || sl.twitter || sl.website

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(99,102,241,0.12)',
        border: '1px solid #e2e8f0',
      }}>

        {/* Gradient header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)',
          padding: '32px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}>
          {/* Avatar */}
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            marginBottom: '4px',
          }}>
            {initials(badge.attendeeName)}
          </div>

          {/* Name */}
          <p style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.03em',
            textAlign: 'center',
          }}>
            {badge.attendeeName}
          </p>

          {/* Event name */}
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.75)',
            margin: 0,
            textAlign: 'center',
            fontWeight: 500,
          }}>
            📅 {badge.eventName}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>

          {/* Bio */}
          {badge.bio && (
            <p style={{
              fontSize: '14px',
              color: '#475569',
              lineHeight: 1.6,
              margin: '0 0 20px',
              textAlign: 'center',
            }}>
              {badge.bio}
            </p>
          )}

          {/* QR code */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <div style={{
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              backgroundColor: '#f8fafc',
              marginBottom: '10px',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Badge QR Code"
                style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
              />
            </div>
            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              margin: 0,
              wordBreak: 'break-all',
              textAlign: 'center',
              maxWidth: '260px',
            }}>
              {badgeUrl}
            </p>
          </div>

          {/* Social links */}
          {hasSocial && (
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '20px',
            }}>
              {sl.linkedin && (
                <a href={sl.linkedin} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '13px',
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '5px 14px',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}>
                  LinkedIn
                </a>
              )}
              {sl.twitter && (
                <a href={sl.twitter} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '13px',
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '5px 14px',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}>
                  Twitter
                </a>
              )}
              {sl.website && (
                <a href={sl.website} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '13px',
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '5px 14px',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}>
                  Website
                </a>
              )}
            </div>
          )}

          {/* Share button */}
          <BadgeShareButton badgeUrl={badgeUrl} />
        </div>
      </div>
    </div>
  )
}
