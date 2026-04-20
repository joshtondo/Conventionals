'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'motion/react'
import { Ticket, Upload, ScanLine, LayoutDashboard, Users, ShieldCheck } from 'lucide-react'

// ─── Easing ──────────────────────────────────────────────────────────────────
const ease: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

// ─── Variants ────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary:      '#6366f1',
  primaryDark:  '#4f46e5',
  primaryLight: '#ede9fe',
  accent:       '#10b981',
  accentLight:  '#d1fae5',
  text:         '#0f172a',
  text2:        '#475569',
  text3:        '#94a3b8',
  border:       '#e2e8f0',
  surface:      '#f8fafc',
  white:        '#ffffff',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  // Nav
  navBase: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0,
    zIndex: 100,
    padding: '0 40px',
    height: '68px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'background 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease',
  } as React.CSSProperties,
  navScrolled: {
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
  } as React.CSSProperties,
  logo: {
    fontSize: '19px', fontWeight: 800, color: C.primaryDark,
    letterSpacing: '-0.5px', textDecoration: 'none',
  } as React.CSSProperties,
  navBtnOutline: {
    padding: '9px 20px',
    background: 'transparent', color: C.text2,
    border: `1.5px solid ${C.border}`,
    borderRadius: '10px', fontSize: '14px', fontWeight: 600,
    textDecoration: 'none',
    minHeight: '44px', display: 'inline-flex', alignItems: 'center',
  } as React.CSSProperties,
  navBtnFilled: {
    padding: '9px 20px',
    background: `linear-gradient(135deg,${C.primaryDark},${C.primary})`,
    color: C.white, border: 'none',
    borderRadius: '10px', fontSize: '14px', fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 2px 12px rgba(99,102,241,0.3)',
    minHeight: '44px', display: 'inline-flex', alignItems: 'center',
  } as React.CSSProperties,
  navBtns: { display: 'flex', gap: '10px', alignItems: 'center' } as React.CSSProperties,

  // Hero
  heroWrap: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center',
    padding: '100px 40px 60px',
    background: C.white,
    position: 'relative' as const, overflow: 'hidden',
  } as React.CSSProperties,
  blob1: {
    position: 'absolute' as const, top: '-160px', right: '-80px',
    width: '600px', height: '600px',
    background: 'radial-gradient(circle,rgba(167,139,250,0.18) 0%,transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none' as const,
  } as React.CSSProperties,
  blob2: {
    position: 'absolute' as const, bottom: '-100px', left: '-100px',
    width: '500px', height: '500px',
    background: `radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)`,
    borderRadius: '50%', pointerEvents: 'none' as const,
  } as React.CSSProperties,
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: C.primaryLight,
    color: C.primaryDark, borderRadius: '100px',
    padding: '5px 14px', fontSize: '12px', fontWeight: 700,
    letterSpacing: '0.6px', textTransform: 'uppercase' as const,
    marginBottom: '20px', border: '1px solid rgba(99,102,241,0.2)',
  } as React.CSSProperties,
  h1: {
    fontSize: 'clamp(38px,5.5vw,68px)',
    fontWeight: 900, lineHeight: 1.05,
    margin: '0 0 22px', letterSpacing: '-2.5px', color: C.text,
  } as React.CSSProperties,
  h1Grad: {
    background: `linear-gradient(135deg,${C.primaryDark} 0%,${C.primary} 50%,#818cf8 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  heroSub: {
    fontSize: '18px', color: C.text2, lineHeight: 1.65,
    margin: '0 0 36px', maxWidth: '500px',
  } as React.CSSProperties,
  ctaRow: {
    display: 'flex', gap: '12px', flexWrap: 'wrap' as const,
    alignItems: 'center', marginBottom: '40px',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '15px 30px',
    background: `linear-gradient(135deg,${C.primaryDark},${C.primary})`,
    color: C.white, border: 'none',
    borderRadius: '14px', fontSize: '15px', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '-0.2px',
    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
    minHeight: '50px',
  } as React.CSSProperties,
  btnSecondary: {
    padding: '14px 26px',
    background: C.white, color: C.primaryDark,
    border: `1.5px solid ${C.primaryLight}`,
    borderRadius: '14px', fontSize: '15px', fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center',
    minHeight: '50px',
  } as React.CSSProperties,

  // Hero stats
  heroStats: {
    display: 'flex', gap: '16px', flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  heroStat: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '14px', padding: '14px 20px',
    minWidth: '90px',
  } as React.CSSProperties,
  heroStatNum: {
    fontSize: '22px', fontWeight: 800, color: C.primary,
    letterSpacing: '-0.04em', lineHeight: 1,
  } as React.CSSProperties,
  heroStatLabel: {
    fontSize: '12px', color: C.text3, fontWeight: 500, marginTop: '3px',
  } as React.CSSProperties,

  // Badge card (right side)
  badgeCard: {
    background: C.white, borderRadius: '22px', padding: '24px 22px',
    boxShadow: '0 24px 64px rgba(99,102,241,0.16),0 4px 16px rgba(0,0,0,0.06)',
    width: '100%',
    border: `1px solid ${C.border}`,
  } as React.CSSProperties,
  badgeCardHeader: {
    background: `linear-gradient(135deg,${C.primaryDark},${C.primary})`,
    borderRadius: '14px', padding: '20px',
    marginBottom: '16px', textAlign: 'center' as const,
    position: 'relative' as const,
  } as React.CSSProperties,
  badgeAvatar: {
    width: '60px', height: '60px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    border: '2px solid rgba(255,255,255,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px', fontWeight: 800, color: C.white,
    margin: '0 auto 10px',
  } as React.CSSProperties,
  badgeName: { fontSize: '18px', fontWeight: 800, color: C.white, marginBottom: '2px', letterSpacing: '-0.5px' } as React.CSSProperties,
  badgeTitle: { fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '0' } as React.CSSProperties,
  badgeDivider: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '14px 0' } as React.CSSProperties,
  badgeTagRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '14px' } as React.CSSProperties,
  badgeTag: {
    background: C.primaryLight, color: C.primaryDark,
    borderRadius: '999px', padding: '4px 10px',
    fontSize: '11px', fontWeight: 600,
  } as React.CSSProperties,
  badgeTagGreen: {
    background: C.accentLight, color: '#059669',
    borderRadius: '999px', padding: '4px 10px',
    fontSize: '11px', fontWeight: 600,
  } as React.CSSProperties,
  badgeQrRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
  badgeQr: {
    width: '64px', height: '64px',
    background: C.surface, borderRadius: '10px',
    border: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '10px', color: C.text3, textAlign: 'center' as const,
  } as React.CSSProperties,
  scanBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: C.primaryDark, color: C.white,
    border: 'none', borderRadius: '8px',
    padding: '8px 14px', fontSize: '11px', fontWeight: 600, cursor: 'default',
    minHeight: '36px',
  } as React.CSSProperties,
  checkedTag: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: C.accentLight, color: '#059669',
    borderRadius: '999px', padding: '4px 10px',
    fontSize: '11px', fontWeight: 600,
  } as React.CSSProperties,

  // Section
  sectionWrap: { padding: '100px 40px' } as React.CSSProperties,
  sectionInner: { maxWidth: '1100px', margin: '0 auto' } as React.CSSProperties,
  sectionPill: {
    display: 'inline-block',
    background: C.primaryLight, color: C.primaryDark,
    borderRadius: '100px', padding: '4px 14px',
    fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px',
    textTransform: 'uppercase' as const, marginBottom: '14px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 'clamp(26px,3vw,42px)', fontWeight: 800,
    color: C.text, margin: '0 0 14px', letterSpacing: '-1.5px', lineHeight: 1.15,
  } as React.CSSProperties,
  sectionSub: {
    fontSize: '17px', color: C.text2, margin: '0 0 60px',
    lineHeight: 1.65, maxWidth: '540px',
  } as React.CSSProperties,

  // How it works
  howBg: { background: C.surface } as React.CSSProperties,
  stepCard: {
    flex: 1,
    background: C.white, borderRadius: '18px', padding: '28px 24px',
    boxShadow: '0 2px 16px rgba(99,102,241,0.07)',
    border: `1px solid ${C.border}`,
  } as React.CSSProperties,
  stepNum: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: `linear-gradient(135deg,${C.primaryDark},${C.primary})`,
    color: C.white, fontSize: '18px', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '18px', flexShrink: 0,
    boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
  } as React.CSSProperties,
  stepTitle: { fontSize: '18px', fontWeight: 700, color: C.text, margin: '0 0 8px', letterSpacing: '-0.4px' } as React.CSSProperties,
  stepDesc: { fontSize: '14px', color: C.text2, lineHeight: 1.65, margin: 0 } as React.CSSProperties,
  connector: {
    flex: '0 0 40px', height: '2px',
    background: `linear-gradient(90deg,${C.primaryLight},#ddd6fe)`,
    alignSelf: 'center', marginTop: '-60px',
  } as React.CSSProperties,

  // Features
  featureCard: {
    background: C.white, borderRadius: '18px', padding: '28px 26px',
    boxShadow: '0 2px 16px rgba(99,102,241,0.06)',
    border: `1px solid ${C.border}`,
  } as React.CSSProperties,
  featureIcon: {
    width: '48px', height: '48px', borderRadius: '13px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '16px',
  } as React.CSSProperties,
  featureTitle: { fontSize: '17px', fontWeight: 700, color: C.text, margin: '0 0 8px', letterSpacing: '-0.3px' } as React.CSSProperties,
  featureDesc: { fontSize: '14px', color: C.text2, lineHeight: 1.65, margin: 0 } as React.CSSProperties,

  // Stats
  statsBg: {
    background: `linear-gradient(135deg,#312e81 0%,${C.primaryDark} 50%,${C.primary} 100%)`,
    padding: '80px 40px',
  } as React.CSSProperties,
  statsInner: { maxWidth: '900px', margin: '0 auto' } as React.CSSProperties,
  statCard: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '18px', padding: '28px 24px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.18)',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  statNum: { fontSize: 'clamp(36px,4vw,52px)', fontWeight: 900, color: C.white, lineHeight: 1, letterSpacing: '-2px' } as React.CSSProperties,
  statLabel: { fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', fontWeight: 500 } as React.CSSProperties,

  // CTA
  ctaBg: { padding: '100px 40px', background: C.white } as React.CSSProperties,
  ctaCard: {
    maxWidth: '760px', margin: '0 auto',
    background: `linear-gradient(135deg,#312e81 0%,${C.primaryDark} 60%,${C.primary} 100%)`,
    borderRadius: '28px', padding: '64px 48px',
    textAlign: 'center' as const,
    boxShadow: '0 24px 64px rgba(99,102,241,0.3)',
    position: 'relative' as const, overflow: 'hidden',
  } as React.CSSProperties,
  ctaGlow: {
    position: 'absolute' as const, top: '-100px', right: '-100px',
    width: '400px', height: '400px',
    background: 'radial-gradient(circle,rgba(167,139,250,0.3) 0%,transparent 60%)',
    borderRadius: '50%', pointerEvents: 'none' as const,
  } as React.CSSProperties,
  ctaGlow2: {
    position: 'absolute' as const, bottom: '-80px', left: '-80px',
    width: '300px', height: '300px',
    background: 'radial-gradient(circle,rgba(16,185,129,0.2) 0%,transparent 60%)',
    borderRadius: '50%', pointerEvents: 'none' as const,
  } as React.CSSProperties,
  ctaTitle: {
    fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900,
    color: C.white, margin: '0 0 14px', letterSpacing: '-1.5px', lineHeight: 1.1,
    position: 'relative' as const,
  } as React.CSSProperties,
  ctaSub: {
    fontSize: '17px', color: 'rgba(255,255,255,0.75)',
    margin: '0 0 36px', lineHeight: 1.6, position: 'relative' as const,
  } as React.CSSProperties,
  ctaBtnRow: {
    display: 'flex', gap: '12px', justifyContent: 'center',
    flexWrap: 'wrap' as const, position: 'relative' as const,
  } as React.CSSProperties,
  ctaBtnWhite: {
    padding: '15px 34px',
    background: C.white, color: C.primaryDark,
    border: 'none', borderRadius: '12px',
    fontSize: '16px', fontWeight: 800,
    cursor: 'pointer', letterSpacing: '-0.3px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
    minHeight: '52px',
  } as React.CSSProperties,
  ctaBtnOutline: {
    padding: '15px 34px',
    background: 'transparent', color: C.white,
    border: '1.5px solid rgba(255,255,255,0.4)',
    borderRadius: '12px', fontSize: '16px', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '-0.3px',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
    minHeight: '52px',
  } as React.CSSProperties,

  // Footer
  footer: {
    padding: '32px 40px',
    borderTop: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap' as const, gap: '12px',
  } as React.CSSProperties,
  footerLogo: { fontSize: '15px', fontWeight: 800, color: C.primaryDark, letterSpacing: '-0.3px', textDecoration: 'none' } as React.CSSProperties,
  footerLinks: { display: 'flex', gap: '20px', listStyle: 'none', margin: 0, padding: 0 } as React.CSSProperties,
  footerLink: { color: C.text3, textDecoration: 'none', fontSize: '13px' } as React.CSSProperties,
  footerCopy: { fontSize: '13px', color: C.text3 } as React.CSSProperties,
}

// ─── QR mockup ────────────────────────────────────────────────────────────────
function QRMockup() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <rect x="8" y="8" width="32" height="32" rx="5" fill={C.text}/>
      <rect x="13" y="13" width="22" height="22" rx="3" fill="white"/>
      <rect x="18" y="18" width="12" height="12" rx="2" fill={C.text}/>
      <rect x="70" y="8" width="32" height="32" rx="5" fill={C.text}/>
      <rect x="75" y="13" width="22" height="22" rx="3" fill="white"/>
      <rect x="80" y="18" width="12" height="12" rx="2" fill={C.text}/>
      <rect x="8" y="70" width="32" height="32" rx="5" fill={C.text}/>
      <rect x="13" y="75" width="22" height="22" rx="3" fill="white"/>
      <rect x="18" y="80" width="12" height="12" rx="2" fill={C.text}/>
      <rect x="48" y="8" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="48" y="20" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="8" y="48" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="20" y="48" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="48" y="48" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="60" y="48" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="72" y="48" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="84" y="48" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="96" y="48" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="48" y="60" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="60" y="60" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="72" y="60" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="84" y="60" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="48" y="72" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="60" y="72" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="72" y="84" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="84" y="84" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="96" y="72" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="48" y="84" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="60" y="96" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="84" y="96" width="8" height="8" rx="2" fill={C.primary}/>
      <rect x="96" y="84" width="8" height="8" rx="2" fill={C.text}/>
      <rect x="96" y="96" width="8" height="8" rx="2" fill={C.text}/>
    </svg>
  )
}

// ─── Badge mockup ─────────────────────────────────────────────────────────────
function BadgeMockup() {
  return (
    <div style={s.badgeCard}>
      <div style={s.badgeCardHeader}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          SalesConf 2024
        </div>
        <div style={s.badgeAvatar}>AK</div>
        <div style={s.badgeName}>Alex Kim</div>
        <div style={s.badgeTitle}>Account Executive · Salesforce</div>
      </div>
      <div style={s.badgeTagRow}>
        <span style={s.badgeTag}>Enterprise Sales</span>
        <span style={s.badgeTagGreen}>✓ Checked In</span>
        <span style={s.badgeTag}>SaaS</span>
      </div>
      <hr style={s.badgeDivider} />
      <div style={s.badgeQrRow}>
        <div style={s.badgeQr}>
          <QRMockup />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <span style={s.checkedTag}>✓ Verified</span>
          <button style={s.scanBtn}>
            <ScanLine size={12} />
            Share Badge
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, iconBg }: { icon: React.ReactNode; title: string; desc: string; iconBg: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref} style={s.featureCard} variants={fadeUp} initial="hidden" animate={inView ? 'visible' : 'hidden'} transition={{ duration: 0.5, ease }}>
      <div style={{ ...s.featureIcon, background: iconBg }}>{icon}</div>
      <div style={s.featureTitle}>{title}</div>
      <p style={s.featureDesc}>{desc}</p>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ ...s.navBase, ...(scrolled ? s.navScrolled : {}) }}>
        <Link href="/" style={s.logo}>Conventionals</Link>
        <div style={s.navBtns}>
          <Link href="/login/select" style={s.navBtnOutline}>Log In</Link>
          <Link href="/register/select" style={s.navBtnFilled}>Create Account</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={s.heroWrap}>
        <div style={s.blob1} />
        <div style={s.blob2} />
        <div className="hero-inner">
          <motion.div className="hero-left" variants={stagger} initial="hidden" animate="visible">
            <motion.div style={s.pill} variants={fadeUp} transition={{ duration: 0.5, ease }}>
              ✨ Event experiences, reinvented
            </motion.div>
            <motion.h1 style={s.h1} variants={fadeUp} transition={{ duration: 0.55, ease }}>
              Connect, network,{' '}
              <span style={s.h1Grad}>and grow</span>{' '}
              at every event.
            </motion.h1>
            <motion.p style={s.heroSub} variants={fadeUp} transition={{ duration: 0.55, ease }}>
              The smart badge and networking platform for modern events. Organizers run it effortlessly — attendees love every moment.
            </motion.p>
            <motion.div style={s.ctaRow} variants={fadeUp} transition={{ duration: 0.5, ease }}>
              <Link href="/login/select" style={s.btnPrimary}>Log In</Link>
              <Link href="/register/select" style={s.btnSecondary}>Create Account</Link>
            </motion.div>
            <motion.div style={s.heroStats} variants={fadeUp} transition={{ duration: 0.5, ease }}>
              <div style={s.heroStat}>
                <div style={s.heroStatNum}>12k+</div>
                <div style={s.heroStatLabel}>Events</div>
              </div>
              <div style={s.heroStat}>
                <div style={s.heroStatNum}>500k</div>
                <div style={s.heroStatLabel}>Attendees</div>
              </div>
              <div style={s.heroStat}>
                <div style={{ ...s.heroStatNum, color: C.accent }}>98%</div>
                <div style={s.heroStatLabel}>Satisfaction</div>
              </div>
            </motion.div>
          </motion.div>
          <div className="hero-right">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.25, ease }}
              style={{ width: '100%' }}
            >
              <BadgeMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section style={s.sectionWrap}>
        <div style={s.sectionInner}>
          <div style={s.sectionPill}>Features</div>
          <h2 style={s.sectionTitle}>Everything you need to run a great event</h2>
          <p style={s.sectionSub}>From badge creation to real-time check-in and attendee networking — all in one place.</p>
          <div className="features-grid">
            <FeatureCard icon={<Ticket size={22} color={C.primary} />} iconBg={C.primaryLight} title="Digital Badges" desc="Beautiful, scannable QR badges delivered instantly to every attendee by email." />
            <FeatureCard icon={<Upload size={22} color="#7c3aed" />} iconBg="#f5f3ff" title="CSV Bulk Import" desc="Import hundreds of attendees in seconds from your existing spreadsheet." />
            <FeatureCard icon={<ScanLine size={22} color={C.accent} />} iconBg={C.accentLight} title="QR Check-In" desc="Scan attendees in at the door — no paper lists, no delays, no chaos." />
            <FeatureCard icon={<LayoutDashboard size={22} color="#f59e0b" />} iconBg="#fef3c7" title="Live Dashboard" desc="Watch check-ins roll in with a real-time dashboard that updates as you go." />
            <FeatureCard icon={<Users size={22} color={C.primary} />} iconBg={C.primaryLight} title="Attendee Networking" desc="Swipe-to-connect lets attendees discover and connect with the right people at your event." />
            <FeatureCard icon={<ShieldCheck size={22} color={C.accent} />} iconBg={C.accentLight} title="Secure & Private" desc="Attendee data stays private. Profile visibility is always in the attendee's control." />
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section style={{ ...s.sectionWrap, ...s.howBg }}>
        <div style={s.sectionInner}>
          <div style={s.sectionPill}>How it works</div>
          <h2 style={s.sectionTitle}>Up and running in minutes</h2>
          <p style={s.sectionSub}>No training needed. No lengthy setup. Just a great event experience from day one.</p>
          <div className="steps-row">
            <div style={s.stepCard}>
              <div style={s.stepNum}>1</div>
              <div style={s.stepTitle}>Create your event</div>
              <p style={s.stepDesc}>Set up your event details, add your capacity, and get a shareable invite link instantly.</p>
            </div>
            <div className="step-connector" style={s.connector} />
            <div style={s.stepCard}>
              <div style={s.stepNum}>2</div>
              <div style={s.stepTitle}>Invite attendees</div>
              <p style={s.stepDesc}>Import via CSV or share your link. Each attendee gets a digital badge delivered by email.</p>
            </div>
            <div className="step-connector" style={s.connector} />
            <div style={s.stepCard}>
              <div style={s.stepNum}>3</div>
              <div style={s.stepTitle}>Run the event</div>
              <p style={s.stepDesc}>Scan QR codes to check in, monitor attendance live, and watch your attendees connect.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section style={s.statsBg}>
        <div style={s.statsInner}>
          <div className="stats-grid">
            {[
              { num: '12,000+', label: 'Events hosted' },
              { num: '500,000+', label: 'Badges delivered' },
              { num: '98%', label: 'Organizer satisfaction' },
            ].map(({ num, label }) => (
              <div key={label} style={s.statCard}>
                <div style={s.statNum}>{num}</div>
                <div style={s.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={s.ctaBg}>
        <div style={s.ctaCard}>
          <div style={s.ctaGlow} />
          <div style={s.ctaGlow2} />
          <h2 style={s.ctaTitle}>Ready to run your best event yet?</h2>
          <p style={s.ctaSub}>Join thousands of organizers who trust Conventionals to make every event memorable.</p>
          <div style={s.ctaBtnRow}>
            <Link href="/register/select" style={s.ctaBtnWhite}>Get Started Free</Link>
            <Link href="/login/select" style={s.ctaBtnOutline}>Log In</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <Link href="/" style={s.footerLogo}>Conventionals</Link>
        <ul style={s.footerLinks}>
          <li><a href="#" style={s.footerLink}>Privacy</a></li>
          <li><a href="#" style={s.footerLink}>Terms</a></li>
          <li><a href="#" style={s.footerLink}>Contact</a></li>
        </ul>
        <span style={s.footerCopy}>© 2026 Conventionals</span>
      </footer>
    </>
  )
}
