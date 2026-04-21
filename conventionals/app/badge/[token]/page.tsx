import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getBadgeWithProfile } from '@/data/badges'
import { generateQR } from '@/lib/qr'
import BadgeShareButton from '@/components/BadgeShareButton'
import { initials } from '@/lib/utils'

function interestChips(jobTitle: string | null, company: string | null): string[] {
  const chips: string[] = []
  if (jobTitle) {
    jobTitle.split(/[\s,/]+/).slice(0, 3).forEach(w => {
      if (w.length > 2) chips.push(w)
    })
  }
  if (chips.length < 3 && company) {
    chips.push(company.split(/\s+/)[0])
  }
  return chips.slice(0, 4)
}

export default async function BadgePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const badge = await getBadgeWithProfile(token)
  if (!badge) notFound()

  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/badge/${token}`
  const qrDataUrl = await generateQR(badgeUrl)

  const sl = badge.socialLinks ?? {}
  const hasSocial = sl.linkedin || sl.twitter || sl.website
  const chips = interestChips(badge.jobTitle ?? null, badge.company ?? null)
  const hasProfile = badge.bio || badge.jobTitle || badge.company || chips.length > 0

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
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
        boxShadow: '0 8px 40px rgba(99,102,241,0.14)',
        border: '1px solid #e2e8f0',
      }}>

        {/* Gradient header with dot-pattern texture */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)',
          backgroundImage: [
            'radial-gradient(rgba(255,255,255,0.12) 1.5px, transparent 1.5px)',
            'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)',
          ].join(', '),
          backgroundSize: '22px 22px, 100% 100%',
          padding: '36px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          position: 'relative',
        }}>
          {/* Avatar with verified checkmark */}
          <div style={{ position: 'relative', marginBottom: '6px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}>
              {initials(badge.attendeeName)}
            </div>
            {/* Verified checkmark overlay */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: '#fff',
              fontWeight: 700,
            }}>
              ✓
            </div>
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

          {/* Job title + company */}
          {(badge.jobTitle || badge.company) && (
            <p style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.82)',
              margin: 0,
              textAlign: 'center',
              fontWeight: 500,
            }}>
              {[badge.jobTitle, badge.company].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Event name */}
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.65)',
            margin: 0,
            textAlign: 'center',
            fontWeight: 500,
          }}>
            📅 {badge.eventName}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>

          {/* Interest chips */}
          {chips.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '20px',
            }}>
              {chips.map((chip, i) => (
                <span key={i} style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: '#ede9fe',
                  color: '#6366f1',
                }}>
                  {chip}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {badge.bio && (
            <p style={{
              fontSize: '14px',
              color: '#475569',
              lineHeight: 1.6,
              margin: hasProfile ? '0 0 20px' : '0 0 20px',
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
              <Image
                src={qrDataUrl}
                alt="Badge QR Code"
                width={200}
                height={200}
                unoptimized
                style={{ display: 'block', borderRadius: '8px' }}
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
              marginBottom: '16px',
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

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <BadgeShareButton badgeUrl={badgeUrl} />
            </div>
            <a
              href="/attendee/profile"
              style={{
                height: '48px',
                padding: '0 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Edit Profile
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
