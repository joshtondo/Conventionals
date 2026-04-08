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
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
  } as React.CSSProperties,
  logo: {
    fontSize: '19px', fontWeight: 800, color: '#4f46e5',
    letterSpacing: '-0.5px', textDecoration: 'none',
  } as React.CSSProperties,
  navLinks: {
    display: 'flex', alignItems: 'center', gap: '28px',
    listStyle: 'none', margin: 0, padding: 0,
  } as React.CSSProperties,
  navLink: {
    color: '#374151', textDecoration: 'none',
    fontSize: '14px', fontWeight: 500,
    transition: 'color 0.15s',
  } as React.CSSProperties,
  navBtnOutline: {
    padding: '8px 18px',
    background: 'transparent', color: '#374151',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px', fontSize: '14px', fontWeight: 600,
    textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s',
  } as React.CSSProperties,
  navBtnFilled: {
    padding: '8px 18px',
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', border: 'none',
    borderRadius: '10px', fontSize: '14px', fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 2px 12px rgba(79,70,229,0.3)',
  } as React.CSSProperties,

  // Hero
  heroWrap: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center',
    padding: '100px 40px 60px',
    background: '#ffffff',
    position: 'relative' as const, overflow: 'hidden',
  } as React.CSSProperties,
  blob1: {
    position: 'absolute' as const, top: '-160px', right: '-80px',
    width: '600px', height: '600px',
    background: 'radial-gradient(circle,rgba(167,139,250,0.22) 0%,transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none' as const,
  } as React.CSSProperties,
  blob2: {
    position: 'absolute' as const, bottom: '-100px', left: '-100px',
    width: '500px', height: '500px',
    background: 'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none' as const,
  } as React.CSSProperties,
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'linear-gradient(135deg,#ede9fe,#e0e7ff)',
    color: '#4f46e5', borderRadius: '100px',
    padding: '5px 14px', fontSize: '12px', fontWeight: 700,
    letterSpacing: '0.6px', textTransform: 'uppercase' as const,
    marginBottom: '20px', border: '1px solid rgba(99,102,241,0.2)',
  } as React.CSSProperties,
  h1: {
    fontSize: 'clamp(38px,5.5vw,68px)',
    fontWeight: 900, lineHeight: 1.05,
    margin: '0 0 22px', letterSpacing: '-2.5px', color: '#1e1b4b',
  } as React.CSSProperties,
  h1Grad: {
    background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a855f7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  heroSub: {
    fontSize: '18px', color: '#6b7280', lineHeight: 1.65,
    margin: '0 0 36px', maxWidth: '500px',
  } as React.CSSProperties,
  ctaRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' as const, alignItems: 'center' } as React.CSSProperties,
  btnPrimary: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', border: 'none',
    borderRadius: '12px', fontSize: '15px', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '-0.2px',
    boxShadow: '0 4px 20px rgba(79,70,229,0.35)',
    textDecoration: 'none', display: 'inline-block',
  } as React.CSSProperties,
  btnSecondary: {
    padding: '13px 24px',
    background: '#fff', color: '#4f46e5',
    border: '1.5px solid #e0e7ff',
    borderRadius: '12px', fontSize: '15px', fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
  } as React.CSSProperties,
  trustRow: {
    marginTop: '36px', display: 'flex', alignItems: 'center',
    gap: '10px', color: '#9ca3af', fontSize: '13px',
  } as React.CSSProperties,

  // Badge card
  badgeCard: {
    background: '#fff', borderRadius: '22px', padding: '24px 22px',
    boxShadow: '0 24px 64px rgba(79,70,229,0.16),0 4px 16px rgba(0,0,0,0.06)',
    width: '100%',
  } as React.CSSProperties,
  badgeDivider: { border: 'none', borderTop: '1px solid #f3f4f6', margin: '14px 0' } as React.CSSProperties,
  badgeName: { fontSize: '18px', fontWeight: 800, color: '#1e1b4b', marginBottom: '6px', letterSpacing: '-0.5px' } as React.CSSProperties,
  badgeTypePill: {
    display: 'inline-block',
    background: 'linear-gradient(135deg,#ede9fe,#e0e7ff)',
    color: '#5b21b6', borderRadius: '6px', padding: '3px 10px',
    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  } as React.CSSProperties,
  scanBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: '8px',
    padding: '7px 14px', fontSize: '11px', fontWeight: 600, cursor: 'default',
  } as React.CSSProperties,

  // Section
  sectionWrap: { padding: '100px 40px' } as React.CSSProperties,
  sectionInner: { maxWidth: '1100px', margin: '0 auto' } as React.CSSProperties,
  sectionPill: {
    display: 'inline-block',
    background: '#ede9fe', color: '#4f46e5',
    borderRadius: '100px', padding: '4px 14px',
    fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px',
    textTransform: 'uppercase' as const, marginBottom: '14px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 'clamp(26px,3vw,42px)', fontWeight: 800,
    color: '#1e1b4b', margin: '0 0 14px', letterSpacing: '-1.5px', lineHeight: 1.15,
  } as React.CSSProperties,
  sectionSub: {
    fontSize: '17px', color: '#6b7280', margin: '0 0 60px',
    lineHeight: 1.65, maxWidth: '540px',
  } as React.CSSProperties,

  // How it works
  howBg: { background: '#f8f7ff' } as React.CSSProperties,
  stepCard: {
    flex: 1,
    background: '#fff', borderRadius: '18px', padding: '28px 24px',
    boxShadow: '0 2px 16px rgba(79,70,229,0.07)',
    border: '1px solid rgba(209,213,219,0.5)',
  } as React.CSSProperties,
  stepNum: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', fontSize: '18px', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '18px', flexShrink: 0,
    boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
  } as React.CSSProperties,
  stepIcon: {
    width: '48px', height: '48px', borderRadius: '14px',
    background: '#f5f3ff', display: 'flex', alignItems: 'center',
    justifyContent: 'center', marginBottom: '14px',
  } as React.CSSProperties,
  stepTitle: { fontSize: '18px', fontWeight: 700, color: '#1e1b4b', margin: '0 0 8px', letterSpacing: '-0.4px' } as React.CSSProperties,
  stepDesc: { fontSize: '14px', color: '#6b7280', lineHeight: 1.65, margin: 0 } as React.CSSProperties,
  connector: {
    flex: '0 0 40px', height: '2px',
    background: 'linear-gradient(90deg,#c7d2fe,#ddd6fe)',
    alignSelf: 'center', marginTop: '-60px',
  } as React.CSSProperties,

  // Features
  featureCard: {
    background: '#fff', borderRadius: '18px', padding: '28px 26px',
    boxShadow: '0 2px 16px rgba(79,70,229,0.06)',
    border: '1px solid rgba(229,231,235,0.8)',
  } as React.CSSProperties,
  featureIcon: {
    width: '48px', height: '48px', borderRadius: '13px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '16px',
  } as React.CSSProperties,
  featureTitle: { fontSize: '17px', fontWeight: 700, color: '#1e1b4b', margin: '0 0 8px', letterSpacing: '-0.3px' } as React.CSSProperties,
  featureDesc: { fontSize: '14px', color: '#6b7280', lineHeight: 1.65, margin: 0 } as React.CSSProperties,

  // Stats
  statsBg: {
    background: 'linear-gradient(135deg,#312e81 0%,#4f46e5 50%,#6d28d9 100%)',
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
  statNum: { fontSize: 'clamp(36px,4vw,52px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-2px' } as React.CSSProperties,
  statLabel: { fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', fontWeight: 500 } as React.CSSProperties,

  // CTA
  ctaBg: { padding: '100px 40px', background: '#fff' } as React.CSSProperties,
  ctaCard: {
    maxWidth: '760px', margin: '0 auto',
    background: 'linear-gradient(135deg,#312e81 0%,#4f46e5 60%,#7c3aed 100%)',
    borderRadius: '28px', padding: '64px 48px',
    textAlign: 'center' as const,
    boxShadow: '0 24px 64px rgba(79,70,229,0.3)',
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
    background: 'radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 60%)',
    borderRadius: '50%', pointerEvents: 'none' as const,
  } as React.CSSProperties,
  ctaTitle: {
    fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900,
    color: '#fff', margin: '0 0 14px', letterSpacing: '-1.5px', lineHeight: 1.1,
    position: 'relative' as const,
  } as React.CSSProperties,
  ctaSub: {
    fontSize: '17px', color: 'rgba(255,255,255,0.75)',
    margin: '0 0 36px', lineHeight: 1.6, position: 'relative' as const,
  } as React.CSSProperties,
  ctaBtn: {
    padding: '15px 34px',
    background: '#fff', color: '#4f46e5',
    border: 'none', borderRadius: '12px',
    fontSize: '16px', fontWeight: 800,
    cursor: 'pointer', letterSpacing: '-0.3px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    position: 'relative' as const,
    textDecoration: 'none', display: 'inline-block',
  } as React.CSSProperties,

  // Footer
  footer: {
    padding: '32px 40px',
    borderTop: '1px solid #f3f4f6',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap' as const, gap: '12px',
  } as React.CSSProperties,
  footerLogo: { fontSize: '15px', fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.3px', textDecoration: 'none' } as React.CSSProperties,
  footerLinks: { display: 'flex', gap: '20px', listStyle: 'none', margin: 0, padding: 0 } as React.CSSProperties,
  footerLink: { color: '#9ca3af', textDecoration: 'none', fontSize: '13px' } as React.CSSProperties,
  footerCopy: { fontSize: '13px', color: '#9ca3af' } as React.CSSProperties,
}

// ─── QR mockup ────────────────────────────────────────────────────────────────
function QRMockup() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <rect x="8" y="8" width="32" height="32" rx="5" fill="#1e1b4b"/>
      <rect x="13" y="13" width="22" height="22" rx="3" fill="white"/>
      <rect x="18" y="18" width="12" height="12" rx="2" fill="#1e1b4b"/>
      <rect x="70" y="8" width="32" height="32" rx="5" fill="#1e1b4b"/>
      <rect x="75" y="13" width="22" height="22" rx="3" fill="white"/>
      <rect x="80" y="18" width="12" height="12" rx="2" fill="#1e1b4b"/>
      <rect x="8" y="70" width="32" height="32" rx="5" fill="#1e1b4b"/>
      <rect x="13" y="75" width="22" height="22" rx="3" fill="white"/>
      <rect x="18" y="80" width="12" height="12" rx="2" fill="#1e1b4b"/>
      <rect x="48" y="8" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="58" y="8" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="48" y="18" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="58" y="28" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="8" y="48" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="18" y="48" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="28" y="58" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="8" y="58" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="48" y="48" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="58" y="48" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="68" y="48" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="78" y="48" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="88" y="48" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="98" y="48" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="48" y="58" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="68" y="58" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="88" y="58" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="48" y="68" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="58" y="68" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="78" y="68" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="98" y="68" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="48" y="78" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="68" y="78" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="88" y="78" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="58" y="88" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="78" y="88" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="98" y="88" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="48" y="98" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
      <rect x="68" y="98" width="8" height="8" rx="1.5" fill="#1e1b4b"/>
    </svg>
  )
}

// ─── Animated section container ───────────────────────────────────────────────
function AnimSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={stagger} style={style}>
      {children}
    </motion.div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ Icon, title, desc, iconBg }: { Icon: React.ElementType; title: string; desc: string; iconBg: string }) {
  return (
    <motion.div
      style={s.featureCard}
      variants={fadeUp}
      transition={{ duration: 0.45, ease }}
      whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(79,70,229,0.13)', transition: { duration: 0.2 } }}
    >
      <div style={{ ...s.featureIcon, background: iconBg }}>
        <Icon size={22} color="#4f46e5" />
      </div>
      <p style={s.featureTitle}>{title}</p>
      <p style={s.featureDesc}>{desc}</p>
    </motion.div>
  )
}

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({ n, Icon, title, desc }: { n: number; Icon: React.ElementType; title: string; desc: string }) {
  return (
    <motion.div style={s.stepCard} variants={fadeUp} transition={{ duration: 0.45, ease }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={s.stepNum}>{n}</div>
        <div style={s.stepIcon}><Icon size={22} color="#4f46e5" /></div>
      </div>
      <p style={s.stepTitle}>{title}</p>
      <p style={s.stepDesc}>{desc}</p>
    </motion.div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const features = [
  { Icon: Ticket,          iconBg: '#ede9fe', title: 'QR Badge Delivery',    desc: 'Generate personalised QR-coded badges and deliver them to every attendee by email automatically.' },
  { Icon: Upload,          iconBg: '#e0f2fe', title: 'Bulk CSV Import',       desc: '500 attendees in one upload. Duplicates are skipped silently, and you get a precise report of what happened.' },
  { Icon: ScanLine,        iconBg: '#f0fdf4', title: 'Instant QR Check-in',   desc: 'Scan badges at the door for contactless, real-time attendance tracking. No app required for attendees.' },
  { Icon: LayoutDashboard, iconBg: '#fefce8', title: 'Live Analytics',        desc: 'Watch check-in numbers climb in real time. Total attendees, checked-in count, and attendance rate always up to date.' },
  { Icon: Users,           iconBg: '#fdf2f8', title: 'Attendee Profiles',     desc: 'Attendees create cross-event profiles and connect with other people they meet — long after the event ends.' },
  { Icon: ShieldCheck,     iconBg: '#f0fdf4', title: 'Secure by Default',     desc: 'Iron-session authentication, timing-safe logins, and strict ownership checks keep all data protected.' },
]

const steps = [
  { n: 1, Icon: LayoutDashboard, title: 'Create your event',     desc: 'Give your event a name and date. Your organizer dashboard is ready in seconds — no complicated setup.' },
  { n: 2, Icon: Upload,          title: 'Upload your CSV',        desc: 'Drop in your attendee list. We handle duplicates, skip bad rows, and badge everyone else automatically.' },
  { n: 3, Icon: ScanLine,        title: 'Check in at the door',   desc: 'Every attendee receives a QR badge by email. Scan it on arrival for instant, accurate check-in.' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div>
      {/* ── NAV ── */}
      <motion.nav
        style={{ ...s.navBase, ...(scrolled ? s.navScrolled : {}) }}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <Link href="/" style={s.logo}>Conventionals</Link>

        <ul style={s.navLinks}>
          <li><button onClick={() => scrollTo('features')} style={{ ...s.navLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Features</button></li>
          <li><button onClick={() => scrollTo('how-it-works')} style={{ ...s.navLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>How It Works</button></li>
        </ul>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/attendee/login" style={s.navBtnOutline}>Attendee Login</Link>
          <Link href="/login" style={s.navBtnFilled}>Organizer Login</Link>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <section style={s.heroWrap}>
        <div style={s.blob1} />
        <div style={s.blob2} />

        <div className="hero-inner">
          {/* Left */}
          <div className="hero-left">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.1 }}>
              <span style={s.pill}>
                <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#4f46e5"/></svg>
                Event badging, reimagined
              </span>
            </motion.div>

            <motion.h1 style={s.h1} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease, delay: 0.18 }}>
              Run better events.<br />
              <span style={s.h1Grad}>Build lasting connections.</span>
            </motion.h1>

            <motion.p style={s.heroSub} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.26 }}>
              The all-in-one platform for managing events, badges, and attendee
              connections — without the complexity.
            </motion.p>

            <motion.div style={s.ctaRow} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.34 }}>
              <motion.div whileHover={{ scale: 1.03, boxShadow: '0 8px 28px rgba(79,70,229,0.45)' }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
                <Link href="/register" style={s.btnPrimary}>Get started free →</Link>
              </motion.div>
              <motion.button
                style={s.btnSecondary}
                onClick={() => scrollTo('how-it-works')}
                whileHover={{ background: '#f5f3ff', borderColor: '#c7d2fe' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                See how it works
              </motion.button>
            </motion.div>

            <motion.div style={s.trustRow} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.55 }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['#4f46e5','#7c3aed','#a855f7','#c084fc','#e879f9'].map((c, i) => (
                  <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i > 0 ? -8 : 0 }} />
                ))}
              </div>
              <span>Trusted by event organizers worldwide</span>
            </motion.div>
          </div>

          {/* Right — floating badge card */}
          <div className="hero-right">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.65, ease, delay: 0.3 }}
            >
              <motion.div
                animate={{ y: [0, -14, 0], rotate: [-1, 1, -1] }}
                transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity }}
                style={{ willChange: 'transform' }}
              >
                <div style={s.badgeCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.2px' }}>CONVENTIONALS</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>2026</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e1b4b', marginBottom: '4px' }}>TechConf Summit</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>April 12–14 · San Francisco</div>
                  <hr style={s.badgeDivider} />
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                    <QRMockup />
                  </div>
                  <hr style={s.badgeDivider} />
                  <div style={s.badgeName}>Jane Smith</div>
                  <div style={s.badgeTypePill}>VIP Speaker</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Scan to check in</span>
                    <div style={s.scanBtn}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                      Check in
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ ...s.sectionWrap, ...s.howBg }}>
        <div style={s.sectionInner}>
          <AnimSection>
            <motion.div variants={fadeUp} transition={{ duration: 0.5, ease }} style={{ textAlign: 'center' }}>
              <span style={s.sectionPill}>How it works</span>
              <h2 style={{ ...s.sectionTitle, textAlign: 'center' }}>Three steps to a flawless event</h2>
              <p style={{ ...s.sectionSub, textAlign: 'center', margin: '0 auto 60px' }}>
                From zero to fully badged attendees in the time it takes to brew a coffee.
              </p>
            </motion.div>

            <div className="steps-row">
              {steps.map((step, i) => (
                <div key={step.n} style={{ display: 'contents' }}>
                  <StepCard {...step} />
                  {i < steps.length - 1 && (
                    <div className="step-connector" style={s.connector} />
                  )}
                </div>
              ))}
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={s.sectionWrap}>
        <div style={s.sectionInner}>
          <AnimSection>
            <motion.div variants={fadeUp} transition={{ duration: 0.5, ease }}>
              <span style={s.sectionPill}>Features</span>
              <h2 style={s.sectionTitle}>Everything you need.</h2>
              <p style={s.sectionSub}>Nothing you don&apos;t. Built for organizers who care about getting it right.</p>
            </motion.div>
            <div className="features-grid">
              {features.map((f) => <FeatureCard key={f.title} {...f} />)}
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={s.statsBg}>
        <div style={s.statsInner}>
          <AnimSection>
            <motion.div variants={fadeUp} transition={{ duration: 0.5, ease }} style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-1px' }}>
                Built for scale, designed for simplicity
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                From intimate workshops to stadium-scale conferences
              </p>
            </motion.div>
            <div className="stats-grid">
              {[
                { n: '10,000+', label: 'Events managed' },
                { n: '500K+',   label: 'Badges issued' },
                { n: '99.9%',   label: 'Email delivery rate' },
              ].map(({ n, label }) => (
                <motion.div key={label} style={s.statCard} variants={fadeUp} transition={{ duration: 0.45, ease }}>
                  <div style={s.statNum}>{n}</div>
                  <div style={s.statLabel}>{label}</div>
                </motion.div>
              ))}
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={s.ctaBg}>
        <AnimSection>
          <motion.div style={s.ctaCard} variants={fadeUp} transition={{ duration: 0.55, ease }}>
            <div style={s.ctaGlow} />
            <div style={s.ctaGlow2} />
            <p style={s.ctaTitle}>Ready to run a flawless event?</p>
            <p style={s.ctaSub}>
              Join event organizers who&apos;ve stopped stressing about badge logistics
              and started focusing on what matters.
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
              <Link href="/register" style={s.ctaBtn}>Create your first event →</Link>
            </motion.div>
          </motion.div>
        </AnimSection>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <Link href="/" style={s.footerLogo}>Conventionals</Link>
        <ul style={s.footerLinks}>
          <li><Link href="/login" style={s.footerLink}>Organizer Login</Link></li>
          <li><Link href="/attendee/login" style={s.footerLink}>Attendee Login</Link></li>
          <li><Link href="/register" style={s.footerLink}>Sign Up</Link></li>
        </ul>
        <span style={s.footerCopy}>© 2026 Conventionals</span>
      </footer>
    </div>
  )
}
