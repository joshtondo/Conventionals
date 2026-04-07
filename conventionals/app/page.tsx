import Link from 'next/link'
import { Ticket, Upload, ScanLine, LayoutDashboard, Users, ShieldCheck } from 'lucide-react'

const s = {
  page: {
    fontFamily: 'inherit',
  } as React.CSSProperties,

  // Nav
  nav: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  } as React.CSSProperties,
  navLogo: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#4f46e5',
    textDecoration: 'none',
  } as React.CSSProperties,
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  navLink: {
    color: '#374151',
    textDecoration: 'none',
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  navActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  } as React.CSSProperties,
  navBtnOutline: {
    padding: '0.375rem 0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#374151',
    fontSize: '0.875rem',
    textDecoration: 'none',
  } as React.CSSProperties,
  navBtnFilled: {
    padding: '0.375rem 0.875rem',
    border: '1px solid #4f46e5',
    borderRadius: '6px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '0.875rem',
    textDecoration: 'none',
  } as React.CSSProperties,

  // Hero
  hero: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#ffffff',
    padding: '6rem 2rem',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  heroHeading: {
    fontSize: '3rem',
    fontWeight: '700',
    marginBottom: '1rem',
    lineHeight: 1.2,
  } as React.CSSProperties,
  heroSubheading: {
    fontSize: '1.25rem',
    opacity: 0.9,
    maxWidth: '600px',
    margin: '0 auto 2.5rem',
  } as React.CSSProperties,
  heroActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  heroCta: {
    padding: '0.75rem 2rem',
    backgroundColor: '#ffffff',
    color: '#4f46e5',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
    textDecoration: 'none',
  } as React.CSSProperties,
  heroSecondary: {
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'underline',
    fontSize: '1rem',
  } as React.CSSProperties,

  // Features
  features: {
    padding: '5rem 2rem',
    backgroundColor: '#f9fafb',
  } as React.CSSProperties,
  sectionHeading: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center' as const,
    marginBottom: '3rem',
  } as React.CSSProperties,
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    maxWidth: '1000px',
    margin: '0 auto',
  } as React.CSSProperties,
  featureCard: {
    backgroundColor: '#ffffff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  } as React.CSSProperties,
  featureIcon: {
    color: '#4f46e5',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  featureTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.375rem',
  } as React.CSSProperties,
  featureDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    lineHeight: 1.5,
  } as React.CSSProperties,

  // How It Works
  howItWorks: {
    padding: '5rem 2rem',
    backgroundColor: '#ffffff',
  } as React.CSSProperties,
  steps: {
    display: 'flex',
    gap: '2rem',
    justifyContent: 'center',
    maxWidth: '800px',
    margin: '0 auto',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  step: {
    textAlign: 'center' as const,
    flex: '1',
    minWidth: '180px',
  } as React.CSSProperties,
  stepNumber: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: '700',
    margin: '0 auto 1rem',
  } as React.CSSProperties,
  stepTitle: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.375rem',
  } as React.CSSProperties,
  stepDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
  } as React.CSSProperties,

  // CTA Banner
  ctaBanner: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#ffffff',
    padding: '5rem 2rem',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  ctaHeading: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  ctaBtn: {
    padding: '0.875rem 2.5rem',
    backgroundColor: '#ffffff',
    color: '#4f46e5',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1.0625rem',
    textDecoration: 'none',
    display: 'inline-block',
  } as React.CSSProperties,

  // Footer
  footer: {
    backgroundColor: '#111827',
    color: '#9ca3af',
    padding: '3rem 2rem',
  } as React.CSSProperties,
  footerInner: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    gap: '2rem',
  } as React.CSSProperties,
  footerLogo: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#ffffff',
    display: 'block',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  footerTagline: {
    fontSize: '0.875rem',
  } as React.CSSProperties,
  footerLinks: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap' as const,
    listStyle: 'none',
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  footerLink: {
    color: '#9ca3af',
    textDecoration: 'none',
    fontSize: '0.875rem',
  } as React.CSSProperties,
}

const features = [
  { Icon: Ticket,          title: 'Badge Management',     desc: 'Generate QR-coded badges and deliver them by email automatically.' },
  { Icon: Upload,          title: 'Bulk Attendee Import', desc: 'Upload a CSV to register hundreds of attendees in seconds.' },
  { Icon: ScanLine,        title: 'QR Code Check-in',     desc: 'Scan badges at the door for instant, accurate attendance tracking.' },
  { Icon: LayoutDashboard, title: 'Organizer Dashboard',  desc: 'View your events, attendance stats, and attendee lists in one place.' },
  { Icon: Users,           title: 'Attendee Profiles',    desc: 'Attendees create cross-event profiles to connect with others.' },
  { Icon: ShieldCheck,     title: 'Secure & Reliable',    desc: 'Iron-session authentication keeps organizer and attendee data protected.' },
]

const steps = [
  { n: 1, title: 'Create an event',    desc: 'Set up your event in seconds — no complicated setup required.' },
  { n: 2, title: 'Add attendees',      desc: 'Upload a CSV or add individually. Badges are emailed automatically.' },
  { n: 3, title: 'Check in & connect', desc: 'Scan QR codes at the door and let attendees connect with each other.' },
]

export default function HomePage() {
  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <Link href="/" style={s.navLogo}>Conventionals</Link>
        <ul style={s.navLinks}>
          <li><a href="#features" style={s.navLink}>Features</a></li>
          <li><a href="#how-it-works" style={s.navLink}>How It Works</a></li>
          <li><a href="#features" style={s.navLink}>For Attendees</a></li>
        </ul>
        <div style={s.navActions}>
          <a href="/attendee/login" style={s.navBtnOutline}>Attendee Login</a>
          <a href="/login" style={s.navBtnFilled}>Organizer Login</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <h1 style={s.heroHeading}>Run Better Events.<br />Build Lasting Connections.</h1>
        <p style={s.heroSubheading}>
          The all-in-one platform for managing events, badges, and attendee connections.
        </p>
        <div style={s.heroActions}>
          <a href="/register" style={s.heroCta}>Get Started →</a>
          <a href="/login" style={s.heroSecondary}>Organizer Login</a>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={s.features}>
        <h2 style={s.sectionHeading}>Everything you need to run great events</h2>
        <div style={s.featureGrid}>
          {features.map(({ Icon, title, desc }) => (
            <div key={title} style={s.featureCard}>
              <div style={s.featureIcon}><Icon size={28} /></div>
              <h3 style={s.featureTitle}>{title}</h3>
              <p style={s.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={s.howItWorks}>
        <h2 style={s.sectionHeading}>How It Works</h2>
        <div style={s.steps}>
          {steps.map(({ n, title, desc }) => (
            <div key={n} style={s.step}>
              <div style={s.stepNumber}>{n}</div>
              <h3 style={s.stepTitle}>{title}</h3>
              <p style={s.stepDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={s.ctaBanner}>
        <h2 style={s.ctaHeading}>Ready to run your next convention?</h2>
        <a href="/register" style={s.ctaBtn}>Create Your First Event →</a>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div>
            <span style={s.footerLogo}>Conventionals</span>
            <span style={s.footerTagline}>Run better events. Build lasting connections.</span>
          </div>
          <ul style={s.footerLinks}>
            <li><a href="#features" style={s.footerLink}>Features</a></li>
            <li><a href="#how-it-works" style={s.footerLink}>How It Works</a></li>
            <li><a href="/login" style={s.footerLink}>Organizer Login</a></li>
            <li><a href="/attendee/login" style={s.footerLink}>Attendee Login</a></li>
          </ul>
        </div>
      </footer>
    </div>
  )
}
