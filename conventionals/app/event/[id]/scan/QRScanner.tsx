'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'

const C = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  accent: '#10b981',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  white: '#ffffff',
}

type ResultState =
  | { type: 'success'; name: string }
  | { type: 'duplicate' }
  | { type: 'error'; message: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractToken(raw: string): string | null {
  try {
    const url = new URL(raw)
    const parts = url.pathname.split('/').filter(Boolean)
    const token = parts[parts.length - 1]
    return UUID_RE.test(token) ? token : null
  } catch {
    // Not a URL — check if raw value itself is a UUID
    return UUID_RE.test(raw.trim()) ? raw.trim() : null
  }
}

export default function QRScanner({
  eventId,
  eventName,
}: {
  eventId: number
  eventName: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const pausedRef = useRef(false)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultState | null>(null)
  const [manualToken, setManualToken] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const doCheckin = useCallback(async (token: string) => {
    if (pausedRef.current) return
    pausedRef.current = true
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    setChecking(true)
    try {
      const res = await fetch(`/api/badges/${token}/checkin`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 404) {
        setResult({ type: 'error', message: 'Badge not found' })
      } else if (res.ok) {
        const data = await res.json()
        if (data.alreadyCheckedIn) {
          setResult({ type: 'duplicate' })
        } else {
          setResult({ type: 'success', name: '' })
        }
      } else {
        setResult({ type: 'error', message: 'Check-in failed — try again' })
      }
    } catch {
      setResult({ type: 'error', message: 'Network error — try again' })
    } finally {
      setChecking(false)
    }

    setTimeout(() => {
      setResult(null)
      pausedRef.current = false
      startScanLoop()
    }, 2500)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startScanLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const tick = () => {
      if (pausedRef.current) return
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })
        if (code) {
          const token = extractToken(code.data)
          if (token) {
            doCheckin(token)
            return
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [doCheckin])

  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          setCameraReady(true)
          startScanLoop()
        }
      } catch {
        setCameraError('Camera access denied or unavailable.')
      }
    }

    startCamera()

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [startScanLoop])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setManualError(null)
    const token = extractToken(manualToken.trim())
    if (!token) {
      setManualError('Invalid token format — paste the full badge URL or UUID.')
      return
    }
    doCheckin(token)
    setManualToken('')
  }

  const resultBg =
    result?.type === 'success'
      ? 'rgba(16,185,129,0.92)'
      : result?.type === 'duplicate'
      ? 'rgba(245,158,11,0.92)'
      : 'rgba(185,28,28,0.92)'

  const resultIcon =
    result?.type === 'success' ? '✅' : result?.type === 'duplicate' ? '⚠️' : '❌'

  const resultText =
    result?.type === 'success'
      ? 'Checked in!'
      : result?.type === 'duplicate'
      ? 'Already checked in'
      : result?.message ?? 'Error'

  return (
    <>
      <style>{`
        @keyframes scanline {
          0%, 100% { top: 12%; }
          50% { top: 78%; }
        }
        .scan-line {
          animation: scanline 2s ease-in-out infinite;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        paddingTop: '56px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          backgroundColor: '#0f172a',
        }}>
          <p style={{ color: C.white, fontWeight: 700, fontSize: '17px', margin: '0 0 2px' }}>
            Scan to Check In
          </p>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
            {eventName}
          </p>
        </div>

        {/* Camera viewport */}
        {!cameraError && (
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            aspectRatio: '1',
            backgroundColor: '#1e293b',
            overflow: 'hidden',
          }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: cameraReady ? 'block' : 'none',
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Loading state */}
            {!cameraReady && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '14px',
              }}>
                Starting camera…
              </div>
            )}

            {/* Corner frame guides */}
            {cameraReady && (
              <>
                {[
                  { top: '15%', left: '15%', borderTop: '3px solid #6366f1', borderLeft: '3px solid #6366f1', borderRadius: '4px 0 0 0' },
                  { top: '15%', right: '15%', borderTop: '3px solid #6366f1', borderRight: '3px solid #6366f1', borderRadius: '0 4px 0 0' },
                  { bottom: '15%', left: '15%', borderBottom: '3px solid #6366f1', borderLeft: '3px solid #6366f1', borderRadius: '0 0 0 4px' },
                  { bottom: '15%', right: '15%', borderBottom: '3px solid #6366f1', borderRight: '3px solid #6366f1', borderRadius: '0 0 4px 0' },
                ].map((style, i) => (
                  <div key={i} style={{ position: 'absolute', width: '28px', height: '28px', ...style }} />
                ))}

                {/* Animated scan line */}
                <div
                  className="scan-line"
                  style={{
                    position: 'absolute',
                    left: '15%',
                    right: '15%',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #6366f1, #818cf8, #6366f1, transparent)',
                    boxShadow: '0 0 8px #6366f1',
                    borderRadius: '2px',
                  }}
                />
              </>
            )}

            {/* Result overlay */}
            {result && (
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: resultBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}>
                <div style={{ fontSize: '48px' }}>{resultIcon}</div>
                <p style={{
                  color: C.white,
                  fontSize: '20px',
                  fontWeight: 800,
                  margin: 0,
                  textAlign: 'center',
                }}>
                  {resultText}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Camera error notice */}
        {cameraError && (
          <div style={{
            margin: '20px 20px 0',
            padding: '14px 16px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
          }}>
            <p style={{ color: '#f87171', fontSize: '14px', margin: '0 0 4px', fontWeight: 600 }}>
              📵 Camera unavailable
            </p>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              {cameraError} Use manual entry below.
            </p>
          </div>
        )}

        {/* Instruction text */}
        {cameraReady && !cameraError && (
          <p style={{
            color: '#64748b',
            fontSize: '13px',
            textAlign: 'center',
            margin: '12px 20px 0',
          }}>
            Point at an attendee&apos;s badge QR code
          </p>
        )}

        {/* Manual entry */}
        <div style={{
          margin: '20px 20px 40px',
          padding: '20px',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          flex: 1,
        }}>
          <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Manual check-in
          </p>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={manualToken}
              onChange={(e) => { setManualToken(e.target.value); setManualError(null) }}
              placeholder="Paste badge URL or token UUID"
              style={{
                width: '100%',
                height: '48px',
                padding: '0 14px',
                backgroundColor: '#0f172a',
                border: '1.5px solid #334155',
                borderRadius: '10px',
                fontSize: '14px',
                color: C.white,
                boxSizing: 'border-box',
              }}
            />
            {manualError && (
              <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{manualError}</p>
            )}
            <button
              type="submit"
              disabled={checking || !manualToken.trim()}
              style={{
                height: '48px',
                border: 'none',
                borderRadius: '10px',
                background: checking || !manualToken.trim()
                  ? '#334155'
                  : `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`,
                color: checking || !manualToken.trim() ? '#64748b' : C.white,
                fontSize: '15px',
                fontWeight: 700,
                cursor: checking || !manualToken.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {checking ? 'Checking in…' : 'Check In'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
