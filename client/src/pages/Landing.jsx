import { motion, useInView } from 'motion/react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Easing curve used throughout ────────────────────────────────────────────
const ease = [0.25, 0.46, 0.45, 0.94];

// ─── Shared animation variants ───────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

// ─── Inline styles ───────────────────────────────────────────────────────────
const s = {
  // Nav
  navBase: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    padding: '0 40px', height: '68px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'background 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease',
  },
  navScrolled: {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
  },
  logo: {
    fontSize: '19px', fontWeight: '800', color: '#4f46e5',
    letterSpacing: '-0.5px', cursor: 'default',
  },
  navSignIn: {
    padding: '9px 20px',
    background: 'transparent',
    color: '#4f46e5',
    border: '1.5px solid #e0e7ff',
    borderRadius: '10px',
    fontSize: '14px', fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  },

  // Hero
  heroWrap: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center',
    padding: '100px 40px 60px',
    position: 'relative', overflow: 'hidden',
    background: '#ffffff',
  },
  blob1: {
    position: 'absolute', top: '-160px', right: '-80px',
    width: '600px', height: '600px',
    background: 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', bottom: '-100px', left: '-100px',
    width: '500px', height: '500px',
    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
    color: '#4f46e5', borderRadius: '100px',
    padding: '5px 14px', fontSize: '12px', fontWeight: '700',
    letterSpacing: '0.6px', textTransform: 'uppercase',
    marginBottom: '20px',
    border: '1px solid rgba(99,102,241,0.2)',
  },
  h1: {
    fontSize: 'clamp(38px, 5.5vw, 68px)',
    fontWeight: '900',
    lineHeight: 1.05,
    margin: '0 0 22px',
    letterSpacing: '-2.5px',
    color: '#1e1b4b',
  },
  h1Grad: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    fontSize: '18px', color: '#6b7280', lineHeight: 1.65,
    margin: '0 0 36px', maxWidth: '500px',
  },
  ctaRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' },
  btnPrimary: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff', border: 'none',
    borderRadius: '12px', fontSize: '15px', fontWeight: '700',
    cursor: 'pointer', letterSpacing: '-0.2px',
    boxShadow: '0 4px 20px rgba(79,70,229,0.35)',
  },
  btnSecondary: {
    padding: '13px 24px',
    background: '#fff', color: '#4f46e5',
    border: '1.5px solid #e0e7ff',
    borderRadius: '12px', fontSize: '15px', fontWeight: '600',
    cursor: 'pointer',
  },
  trustRow: {
    marginTop: '36px', display: 'flex', alignItems: 'center',
    gap: '10px', color: '#9ca3af', fontSize: '13px',
  },
  trustDots: { display: 'flex', gap: '4px' },

  // Badge card mockup
  badgeCard: {
    background: '#fff', borderRadius: '22px',
    padding: '24px 22px',
    boxShadow: '0 24px 64px rgba(79,70,229,0.16), 0 4px 16px rgba(0,0,0,0.06)',
    width: '100%',
  },
  badgeHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '14px',
  },
  badgeLogoText: { fontSize: '11px', fontWeight: '800', color: '#4f46e5', letterSpacing: '-0.2px' },
  badgeEventName: { fontSize: '13px', fontWeight: '700', color: '#1e1b4b' },
  badgeDivider: { border: 'none', borderTop: '1px solid #f3f4f6', margin: '14px 0' },
  badgeQR: { display: 'flex', justifyContent: 'center', marginBottom: '14px' },
  badgeName: { fontSize: '18px', fontWeight: '800', color: '#1e1b4b', marginBottom: '6px', letterSpacing: '-0.5px' },
  badgeTypePill: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
    color: '#5b21b6',
    borderRadius: '6px', padding: '3px 10px',
    fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  badgeFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '14px',
  },
  scanBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: '8px',
    padding: '7px 14px', fontSize: '11px', fontWeight: '600',
    cursor: 'default',
  },

  // Section wrapper
  sectionWrap: { padding: '100px 40px' },
  sectionInner: { maxWidth: '1100px', margin: '0 auto' },
  sectionPill: {
    display: 'inline-block',
    background: '#ede9fe', color: '#4f46e5',
    borderRadius: '100px', padding: '4px 14px',
    fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px',
    textTransform: 'uppercase', marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: '800',
    color: '#1e1b4b', margin: '0 0 14px', letterSpacing: '-1.5px', lineHeight: 1.15,
  },
  sectionSub: {
    fontSize: '17px', color: '#6b7280', margin: '0 0 60px',
    lineHeight: 1.65, maxWidth: '540px',
  },

  // How it works
  howBg: { background: '#f8f7ff' },
  stepNum: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff', fontSize: '18px', fontWeight: '800',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '18px', flexShrink: 0,
    boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
  },
  stepIcon: {
    width: '52px', height: '52px', borderRadius: '14px',
    background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '18px',
    boxShadow: '0 2px 10px rgba(79,70,229,0.1)',
  },
  stepTitle: { fontSize: '18px', fontWeight: '700', color: '#1e1b4b', margin: '0 0 8px', letterSpacing: '-0.4px' },
  stepDesc: { fontSize: '14px', color: '#6b7280', lineHeight: 1.65, margin: 0 },
  stepCard: {
    flex: 1,
    background: '#fff', borderRadius: '18px',
    padding: '28px 24px',
    boxShadow: '0 2px 16px rgba(79,70,229,0.07)',
    border: '1px solid rgba(209,213,219,0.5)',
  },
  connector: {
    flex: '0 0 40px', height: '2px',
    background: 'linear-gradient(90deg, #c7d2fe, #ddd6fe)',
    alignSelf: 'center', marginTop: '-60px',
  },

  // Features
  featureCard: {
    background: '#fff', borderRadius: '18px',
    padding: '28px 26px',
    boxShadow: '0 2px 16px rgba(79,70,229,0.06)',
    border: '1px solid rgba(229,231,235,0.8)',
    cursor: 'default',
  },
  featureIcon: {
    width: '48px', height: '48px', borderRadius: '13px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '16px', fontSize: '22px',
  },
  featureTitle: { fontSize: '17px', fontWeight: '700', color: '#1e1b4b', margin: '0 0 8px', letterSpacing: '-0.3px' },
  featureDesc: { fontSize: '14px', color: '#6b7280', lineHeight: 1.65, margin: 0 },

  // Stats
  statsBg: {
    background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #6d28d9 100%)',
    padding: '80px 40px',
  },
  statsInner: { maxWidth: '900px', margin: '0 auto' },
  statCard: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '18px', padding: '28px 24px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.18)',
    textAlign: 'center',
  },
  statNum: { fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: '900', color: '#fff', lineHeight: 1, letterSpacing: '-2px' },
  statLabel: { fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', fontWeight: '500' },

  // CTA
  ctaBg: { padding: '100px 40px', background: '#fff' },
  ctaCard: {
    maxWidth: '760px', margin: '0 auto',
    background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 60%, #7c3aed 100%)',
    borderRadius: '28px', padding: '64px 48px',
    textAlign: 'center',
    boxShadow: '0 24px 64px rgba(79,70,229,0.3)',
    position: 'relative', overflow: 'hidden',
  },
  ctaGlow: {
    position: 'absolute', top: '-100px', right: '-100px',
    width: '400px', height: '400px',
    background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 60%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  ctaGlow2: {
    position: 'absolute', bottom: '-80px', left: '-80px',
    width: '300px', height: '300px',
    background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 60%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  ctaTitle: {
    fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: '900',
    color: '#fff', margin: '0 0 14px', letterSpacing: '-1.5px', lineHeight: 1.1,
    position: 'relative',
  },
  ctaSub: {
    fontSize: '17px', color: 'rgba(255,255,255,0.75)',
    margin: '0 0 36px', lineHeight: 1.6,
    position: 'relative',
  },
  ctaBtn: {
    padding: '15px 34px',
    background: '#fff', color: '#4f46e5',
    border: 'none', borderRadius: '12px',
    fontSize: '16px', fontWeight: '800',
    cursor: 'pointer', letterSpacing: '-0.3px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    position: 'relative',
  },

  // Footer
  footer: {
    padding: '32px 40px',
    borderTop: '1px solid #f3f4f6',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '12px',
  },
  footerLogo: { fontSize: '15px', fontWeight: '800', color: '#4f46e5', letterSpacing: '-0.3px' },
  footerCopy: { fontSize: '13px', color: '#9ca3af' },
};

// ─── QR Code SVG mockup ───────────────────────────────────────────────────────
function QRCodeMockup() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top-left finder pattern */}
      <rect x="8" y="8" width="32" height="32" rx="5" fill="#1e1b4b"/>
      <rect x="13" y="13" width="22" height="22" rx="3" fill="white"/>
      <rect x="18" y="18" width="12" height="12" rx="2" fill="#1e1b4b"/>
      {/* Top-right finder pattern */}
      <rect x="70" y="8" width="32" height="32" rx="5" fill="#1e1b4b"/>
      <rect x="75" y="13" width="22" height="22" rx="3" fill="white"/>
      <rect x="80" y="18" width="12" height="12" rx="2" fill="#1e1b4b"/>
      {/* Bottom-left finder pattern */}
      <rect x="8" y="70" width="32" height="32" rx="5" fill="#1e1b4b"/>
      <rect x="13" y="75" width="22" height="22" rx="3" fill="white"/>
      <rect x="18" y="80" width="12" height="12" rx="2" fill="#1e1b4b"/>
      {/* Data modules */}
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
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, iconBg, title, desc }) {
  return (
    <motion.div
      style={s.featureCard}
      variants={fadeUp}
      whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(79,70,229,0.13)', transition: { duration: 0.2 } }}
    >
      <div style={{ ...s.featureIcon, background: iconBg }}>{icon}</div>
      <p style={s.featureTitle}>{title}</p>
      <p style={s.featureDesc}>{desc}</p>
    </motion.div>
  );
}

// ─── Step card ───────────────────────────────────────────────────────────────
function StepCard({ number, icon, title, desc }) {
  return (
    <motion.div style={s.stepCard} variants={fadeUp}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <div style={s.stepNum}>{number}</div>
        <div style={s.stepIcon}>{icon}</div>
      </div>
      <p style={s.stepTitle}>{title}</p>
      <p style={s.stepDesc}>{desc}</p>
    </motion.div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ number, label }) {
  return (
    <motion.div style={s.statCard} variants={fadeUp}>
      <div style={s.statNum}>{number}</div>
      <div style={s.statLabel}>{label}</div>
    </motion.div>
  );
}

// ─── Animated section wrapper ─────────────────────────────────────────────────
function AnimatedSection({ children, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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
        <span style={s.logo}>Conventionals</span>
        <motion.button
          style={s.navSignIn}
          onClick={() => navigate('/login')}
          whileHover={{ background: '#f5f3ff', borderColor: '#c7d2fe' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
        >
          Sign in
        </motion.button>
      </motion.nav>

      {/* ── HERO ── */}
      <section style={s.heroWrap}>
        <div style={s.blob1} />
        <div style={s.blob2} />

        <div className="landing-hero-inner">
          {/* Left */}
          <div className="landing-hero-left">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.1 }}
            >
              <span style={s.pill}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="5" fill="#4f46e5"/>
                </svg>
                Event badging, reimagined
              </span>
            </motion.div>

            <motion.h1
              style={s.h1}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease, delay: 0.18 }}
            >
              Badge your attendees{' '}
              <span style={s.h1Grad}>in seconds.</span>
            </motion.h1>

            <motion.p
              style={s.heroSub}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.26 }}
            >
              Upload a CSV. Generate personalised QR badges. Check people in at
              the door. No complexity, no bloat — just events that run smoothly.
            </motion.p>

            <motion.div
              style={s.ctaRow}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.34 }}
            >
              <motion.button
                style={s.btnPrimary}
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.03, boxShadow: '0 8px 28px rgba(79,70,229,0.45)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                Get started free →
              </motion.button>
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

            <motion.div
              style={s.trustRow}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
            >
              <div style={s.trustDots}>
                {['#4f46e5', '#7c3aed', '#a855f7', '#c084fc', '#e879f9'].map((c, i) => (
                  <div key={i} style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i > 0 ? '-8px' : 0 }} />
                ))}
              </div>
              <span>Trusted by event organizers worldwide</span>
            </motion.div>
          </div>

          {/* Right — Floating badge card */}
          <div className="landing-hero-right">
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
                  <div style={s.badgeHeader}>
                    <span style={s.badgeLogoText}>CONVENTIONALS</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>2026</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e1b4b', marginBottom: '4px' }}>
                    TechConf Summit
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>
                    April 12–14 · San Francisco
                  </div>

                  <hr style={s.badgeDivider} />

                  <div style={s.badgeQR}>
                    <QRCodeMockup />
                  </div>

                  <hr style={s.badgeDivider} />

                  <div style={s.badgeName}>Jane Smith</div>
                  <div style={s.badgeTypePill}>VIP Speaker</div>

                  <div style={s.badgeFooter}>
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
          <AnimatedSection>
            <motion.div variants={fadeUp} transition={{ duration: 0.5, ease }} style={{ textAlign: 'center' }}>
              <span style={s.sectionPill}>How it works</span>
              <h2 style={{ ...s.sectionTitle, textAlign: 'center' }}>Three steps to a flawless event</h2>
              <p style={{ ...s.sectionSub, textAlign: 'center', margin: '0 auto 60px' }}>
                From zero to fully badged attendees in the time it takes to brew a coffee.
              </p>
            </motion.div>

            <div className="landing-steps">
              <StepCard
                number="1"
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                title="Create your event"
                desc="Give your event a name and date. That's it — your organizer dashboard is ready in seconds."
              />
              <div className="landing-step-connector" style={s.connector} />
              <StepCard
                number="2"
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                title="Upload your CSV"
                desc="Drop in your attendee list — name, email, badge type. We handle duplicates, skip bad rows, and keep going."
              />
              <div className="landing-step-connector" style={s.connector} />
              <StepCard
                number="3"
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                title="Badges sent automatically"
                desc="Every attendee gets a personalized QR badge by email. Scan at the door for instant, contactless check-in."
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={s.sectionWrap}>
        <div style={s.sectionInner}>
          <AnimatedSection>
            <motion.div variants={fadeUp} transition={{ duration: 0.5, ease }}>
              <span style={s.sectionPill}>Features</span>
              <h2 style={s.sectionTitle}>Everything you need.</h2>
              <p style={s.sectionSub}>Nothing you don't. Built for organizers who care about getting it right.</p>
            </motion.div>

            <div className="landing-features-grid">
              <FeatureCard
                icon="📱"
                iconBg="#ede9fe"
                title="QR Check-in"
                desc="Scan any attendee's badge at the door. Instant confirmation, zero friction, no app required on their end."
              />
              <FeatureCard
                icon="✉️"
                iconBg="#e0f2fe"
                title="Automatic Email Delivery"
                desc="Badges are emailed the moment you upload. No chasing, no manual work — it just happens."
              />
              <FeatureCard
                icon="📊"
                iconBg="#f0fdf4"
                title="Live Attendance Analytics"
                desc="Watch your check-in numbers climb in real time. Total attendees, checked-in count, and attendance rate — always up to date."
              />
              <FeatureCard
                icon="⚡"
                iconBg="#fefce8"
                title="Bulk CSV Import"
                desc="500 attendees in one upload. Conventionals processes them all, skips duplicates silently, and reports exactly what happened."
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={s.statsBg}>
        <div style={s.statsInner}>
          <AnimatedSection>
            <motion.div variants={fadeUp} transition={{ duration: 0.5, ease }} style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '800', color: '#fff', margin: '0 0 10px', letterSpacing: '-1px' }}>
                Built for scale, designed for simplicity
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                From intimate workshops to stadium-scale conferences
              </p>
            </motion.div>

            <div className="landing-stats-grid">
              <StatCard number="10,000+" label="Events managed" />
              <StatCard number="500K+" label="Badges issued" />
              <StatCard number="99.9%" label="Email delivery rate" />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={s.ctaBg}>
        <AnimatedSection>
          <motion.div style={s.ctaCard} variants={fadeUp} transition={{ duration: 0.55, ease }}>
            <div style={s.ctaGlow} />
            <div style={s.ctaGlow2} />
            <p style={s.ctaTitle}>Ready to run a flawless event?</p>
            <p style={s.ctaSub}>
              Join event organizers who've stopped stressing about badge logistics
              and started focusing on what matters.
            </p>
            <motion.button
              style={s.ctaBtn}
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              Get started today →
            </motion.button>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <span style={s.footerLogo}>Conventionals</span>
        <span style={s.footerCopy}>© 2026 Conventionals. All rights reserved.</span>
      </footer>
    </div>
  );
}
