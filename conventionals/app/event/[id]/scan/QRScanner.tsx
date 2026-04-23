'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'
import { initials } from '@/lib/utils'

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

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

type ResultState =
  | { type: 'success'; name: string }
  | { type: 'duplicate'; name: string }
  | { type: 'error'; message: string }

type CheckinRecord = {
  id: number
  name: string
  time: Date
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractToken(raw: string): string | null {
  try {
    const url = new URL(raw)
    const parts = url.pathname.split('/').filter(Boolean)
    const token = parts[parts.length - 1]
    return UUID_RE.test(token) ? token : null
  } catch {
    return UUID_RE.test(raw.trim()) ? raw.trim() : null
  }
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function QRScanner({
  eventName,
}: {
  eventId: number
  eventName: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pausedRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [needsTap, setNeedsTap] = useState(false)
  const [result, setResult] = useState<ResultState | null>(null)
  const [manualToken, setManualToken] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([])
  const checkinCounter = useRef(0)

  const doCheckin = useCallback(async (token: string) => {
    if (pausedRef.current) return
    pausedRef.current = true

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
        const name = data.name ?? 'Attendee'
        if (data.alreadyCheckedIn) {
          setResult({ type: 'duplicate', name })
        } else {
          setResult({ type: 'success', name })
          setRecentCheckins(prev => [
            { id: ++checkinCounter.current, name, time: new Date() },
            ...prev.slice(0, 4),
          ])
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
    }, 2500)
  }, [])

  // Starts the jsQR RAF decode loop on the playing video.
  // We use RAF + jsQR instead of @zxing/browser because zxing's scan loop:
  //  (a) captures canvas dimensions once at startup — if videoWidth/videoHeight
  //      haven't resolved yet (common on mobile) the canvas is 0×0 forever, and
  //  (b) uses setTimeout(500ms) between attempts — too slow for reliable scanning.
  // RAF runs at ~60fps and we check dimensions every frame, so there's no race.
  const startLoop = useCallback(() => {
    // Create an offscreen canvas for frame capture
    const canvas = document.createElement('canvas')
    // ctx is checked inside tick each frame — if it's null the tick is a no-op
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    let frameCount = 0

    function tick() {
      // Read both refs fresh each tick — avoids TypeScript closure-narrowing issues
      // and handles the case where the video element is removed from the DOM.
      const video = videoRef.current
      if (!video || !ctx) return

      // Wait until the video has actual frame data and reported its dimensions.
      // readyState >= HAVE_CURRENT_DATA (2) means at least one frame is available.
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Resize canvas to match the current video frame (handles orientation changes)
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

        // Throttle jsQR to every 3rd frame (~20fps at 60Hz) to keep the main
        // thread free on mobile. Drawing still happens every frame so the
        // viewfinder stays smooth.
        frameCount++
        if (frameCount % 3 === 0 && !pausedRef.current) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          // inversionAttempts: 'dontInvert' — our QR codes are always black-on-white
          // (forced by lib/qr.ts), so no need to try the inverted pass.
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (code?.data) {
            const token = extractToken(code.data)
            if (token) doCheckin(token)
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [doCheckin])

  // Called when user taps the iOS "Start Camera" button.
  // video.play() here is inside a user-gesture, which iOS requires.
  const activateCamera = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    setNeedsTap(false)
    try {
      await video.play()
      setCameraReady(true)
      startLoop()
    } catch {
      setCameraError('Camera access denied or unavailable.')
    }
  }, [startLoop])

  useEffect(() => {
    let mounted = true

    async function startCamera() {
      // Read the ref inside the async fn so TypeScript can narrow it here
      const video = videoRef.current
      if (!video) return

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        })
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        // Set srcObject BEFORE play() — do NOT await loadedmetadata first.
        // For MediaStream sources, loadedmetadata can fire synchronously before
        // the handler is attached, which causes the Promise to hang forever.
        video.srcObject = stream

        try {
          await video.play()
          if (!mounted) return
          setCameraReady(true)
          startLoop()
        } catch {
          // iOS Safari blocks autoplay without a user gesture — show tap prompt
          if (mounted) setNeedsTap(true)
        }
      } catch {
        if (mounted) setCameraError('Camera access denied or unavailable.')
      }
    }

    startCamera()

    return () => {
      mounted = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [startLoop])

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
      ? `Checked in! ${result.name}`
      : result?.type === 'duplicate'
      ? `Already checked in${result.name ? ' · ' + result.name : ''}`
      : (result as { type: 'error'; message: string } | null)?.message ?? 'Error'

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
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ color: C.white, fontWeight: 700, fontSize: '17px', margin: '0 0 2px' }}>
              Scan to Check In
            </p>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              {eventName}
            </p>
          </div>
          {cameraReady && !result && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Scanning</span>
            </div>
          )}
        </div>

        {/* Success banner */}
        {result?.type === 'success' && (
          <div style={{
            margin: '0 20px 12px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideDown 0.2s ease',
          }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.white }}>{result.name}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '1px' }}>Just checked in</div>
            </div>
          </div>
        )}

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

            {/* Loading state */}
            {!cameraReady && !needsTap && (
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

            {/* iOS tap-to-start */}
            {needsTap && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                backgroundColor: '#0f172a',
              }}>
                <span style={{ fontSize: '40px' }}>📷</span>
                <button
                  onClick={activateCamera}
                  style={{
                    padding: '14px 28px',
                    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
                    color: C.white,
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tap to Start Camera
                </button>
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
            {result && result.type !== 'success' && (
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
                  padding: '0 16px',
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
          margin: '20px 20px 0',
          padding: '20px',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
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

        {/* Recent check-ins */}
        {recentCheckins.length > 0 && (
          <div style={{
            margin: '16px 20px 40px',
          }}>
            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              Recent Check-Ins
            </p>
            {recentCheckins.map((record, i) => (
              <div key={record.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                border: '1px solid #334155',
                marginBottom: '8px',
                animation: i === 0 ? 'slideDown 0.2s ease' : undefined,
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.white,
                  flexShrink: 0,
                }}>
                  {initials(record.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C.white }}>{record.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{formatTime(record.time)}</div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: '#d1fae5',
                  color: '#059669',
                }}>
                  ✓ In
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom spacer when no recent checkins */}
        {recentCheckins.length === 0 && <div style={{ height: '40px' }} />}
      </div>
    </>
  )
}
