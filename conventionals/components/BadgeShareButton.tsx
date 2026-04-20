'use client'

import { useState } from 'react'

export default function BadgeShareButton({ badgeUrl }: { badgeUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(badgeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text manually — not implemented for simplicity
    }
  }

  return (
    <button
      onClick={handleShare}
      style={{
        width: '100%',
        height: '48px',
        border: 'none',
        borderRadius: '12px',
        background: copied
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background 0.2s',
        letterSpacing: '-0.01em',
      }}
    >
      {copied ? '✓ Copied!' : '↗ Share Badge'}
    </button>
  )
}
