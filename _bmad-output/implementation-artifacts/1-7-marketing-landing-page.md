# Story 1.7: Marketing Landing Page

Status: done

## Story

As a **visitor**,
I want to see a professional landing page when I visit Conventionals,
So that I understand what the platform does and can sign up or log in.

## Acceptance Criteria

**Given** I visit `/`
**When** the page loads
**Then** I see a full marketing landing page — not a redirect — with the following sections in order:
  1. Sticky navigation bar: Conventionals logo (indigo), nav links (Features, How It Works, For Attendees), "Attendee Login" outlined button, "Organizer Login" filled indigo button
  2. Hero section: indigo gradient background, headline "Run Better Events. Build Lasting Connections.", subheadline, "Get Started →" CTA linking to `/register`, secondary "Organizer Login" link
  3. Features grid (3×2): six feature cards using `lucide-react` icons (Ticket, Upload, ScanLine, LayoutDashboard, Users, ShieldCheck) with title and one-line description each
  4. How It Works: three numbered steps (indigo circle indicators) — Create event → Add attendees → Check in & connect
  5. CTA banner: indigo gradient, "Ready to run your next convention?" with "Create Your First Event →" button linking to `/register`
  6. Footer: logo + tagline, navigation links, Organizer Login + Attendee Login links

**And** the page uses indigo (`#4f46e5`) as the primary brand color with inline styles (no Tailwind)
**And** `lucide-react` is installed as a dependency
**And** the page is a Server Component (no `'use client'` needed — no interactivity)
**And** "Get Started →" and "Create Your First Event →" both link to `/register`
**And** "Attendee Login" links to `/attendee/login`
**And** "Organizer Login" links to `/login`

## Tasks / Subtasks

- [x] Task 1: Install `lucide-react` dependency (AC: lucide-react icons in features grid)
  - [x] Run `npm install lucide-react` from `conventionals/`
  - [x] Verify it appears in `package.json` dependencies

- [x] Task 2: Replace `app/page.tsx` with landing page Server Component (AC: full landing page at `/`)
  - [x] Remove the existing `redirect('/login')` content entirely
  - [x] Implement as a single Server Component — no `'use client'` directive
  - [x] Section 1 — Sticky nav: `<Link href="/">` logo (required by @next/next/no-html-link-for-pages ESLint rule), nav links, "Attendee Login" outlined button, "Organizer Login" filled indigo button
  - [x] Section 2 — Hero: indigo gradient, headline, subheadline, "Get Started →" to `/register`, secondary login link
  - [x] Section 3 — Features grid: `id="features"`, 3-column 2-row grid, six cards with lucide-react icons
  - [x] Section 4 — How It Works: `id="how-it-works"`, three numbered steps with indigo circle indicators
  - [x] Section 5 — CTA banner: indigo gradient, "Ready to run your next convention?", "Create Your First Event →" to `/register`
  - [x] Section 6 — Footer: logo + tagline, nav links, Organizer Login + Attendee Login
  - [x] All styles via `s` object with `as React.CSSProperties` — no Tailwind, no CSS files

- [x] Task 3: Update `app/layout.tsx` metadata (AC: remove "Create Next App" placeholder)
  - [x] Updated `title` to `"Conventionals"` and `description` to `"Run better events. Build lasting connections."`

- [x] Task 4: Verify TypeScript and lint
  - [x] `npx tsc --noEmit` from `conventionals/` — 0 errors
  - [x] `npm run lint` — 0 errors, 1 pre-existing warning in `drizzle/schema.ts` (not from this story)

## Dev Notes

### ⚠️ UX Approval Required — Design Content

The six feature cards require titles and one-line descriptions. The epics spec only provides icon names, not copy. The following copy is proposed — **review with XdJos before implementing, per UX-DR1**:

| Icon | Title | Description |
|------|-------|-------------|
| `Ticket` | Badge Management | Generate QR-coded badges and deliver them by email automatically. |
| `Upload` | Bulk Attendee Import | Upload a CSV to register hundreds of attendees in seconds. |
| `ScanLine` | QR Code Check-in | Scan badges at the door for instant, accurate attendance tracking. |
| `LayoutDashboard` | Organizer Dashboard | View your events, attendance stats, and attendee lists in one place. |
| `Users` | Attendee Profiles | Attendees create cross-event profiles to connect with others. |
| `ShieldCheck` | Secure & Reliable | Iron-session authentication keeps organizer and attendee data protected. |

**Also propose a subheadline** for the Hero section (epics says "subheadline" without specifying copy):
> "The all-in-one platform for managing events, badges, and attendee connections."

**Do NOT implement this story without the user confirming the above copy is acceptable.**

### Files to Create / Modify

```
conventionals/
├── app/
│   ├── page.tsx          ← REPLACE: full landing page (currently redirect('/login'))
│   └── layout.tsx        ← MODIFY: update metadata title/description
└── package.json          ← MODIFIED by npm install lucide-react
```

### `app/layout.tsx` — Metadata Update

Change only the `metadata` export:

```ts
export const metadata: Metadata = {
  title: "Conventionals",
  description: "Run better events. Build lasting connections.",
};
```

Do NOT remove the Geist font setup or globals.css import.

### `app/page.tsx` — Reference Implementation

```tsx
import { Ticket, Upload, ScanLine, LayoutDashboard, Users, ShieldCheck } from 'lucide-react'

const s = {
  // Layout
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
    marginBottom: '2.5rem',
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

export default function HomePage() {
  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <a href="/" style={s.navLogo}>Conventionals</a>
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
          {[
            { n: 1, title: 'Create an event',   desc: 'Set up your event in seconds — no complicated setup required.' },
            { n: 2, title: 'Add attendees',      desc: 'Upload a CSV or add individually. Badges are emailed automatically.' },
            { n: 3, title: 'Check in & connect', desc: 'Scan QR codes at the door and let attendees connect with each other.' },
          ].map(({ n, title, desc }) => (
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
```

### Key Implementation Rules

**DO:**
- Replace `app/page.tsx` entirely — the existing redirect is removed
- Use `<a href="...">` tags (not `<Link>`) — plain `<a>` is correct for a Server Component; `<Link>` works too but not required
- Use `lucide-react` icon components directly (they are RSC-compatible)
- Keep everything in one file (`app/page.tsx`) unless the file grows unwieldy — splitting into sub-components is OK as long as all remain Server Components (no `'use client'`)
- `as const` on string literal style values (`position`, `textAlign`) — needed to satisfy `React.CSSProperties`

**DO NOT:**
- Add `'use client'` — this page has zero interactivity
- Import from `next/link` instead of plain `<a>` (either works, but don't mix inconsistently)
- Add Tailwind classes
- Change font setup or globals.css in `layout.tsx`

### Previous Story Learnings (Stories 1.1–1.6)

- All commands run from `conventionals/` directory
- `@/*` alias maps to `conventionals/` root
- No Tailwind — inline styles via `s` object with `as React.CSSProperties`
- Brand color `#4f46e5` (indigo); error red `#b91c1c`; `#111827` for dark text; `#6b7280` for muted
- ESLint does NOT ignore `_` prefix vars — avoid unused destructuring
- Pre-existing lint warning in `drizzle/schema.ts` (`sql` unused) — do not address
- `lucide-react` icons are RSC-compatible — can be used in Server Components without `'use client'`
- `position: 'sticky' as const` — TypeScript requires `as const` on string literal CSS values

### Project Structure After This Story

```
conventionals/
├── app/
│   ├── page.tsx          ← REPLACED: full landing page (was redirect('/login'))
│   └── layout.tsx        ← MODIFIED: metadata title + description
└── package.json          ← MODIFIED: + lucide-react
```

### Architecture References

- [Source: epics.md#Story 1.7] — exact section list, icon names, link targets
- [Source: architecture.md#Frontend Architecture] — Server Components for pages with no interactivity
- [Source: architecture.md#Enforcement Guidelines] — no Tailwind, inline `s` styles
- [Source: epics.md#UX Design Requirements] — UX-DR1: design content must be approved before implementation

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_One lint deviation: `app/page.tsx` nav logo required `<Link href="/">` (Next.js `<Link>`) instead of `<a href="/">` — ESLint rule `@next/next/no-html-link-for-pages` rejects plain `<a>` tags for in-app page navigation. Fixed immediately. All other links use `<a>` (non-root-page hrefs — ESLint does not flag those)._

### Completion Notes List

- **Task 1 ✅**: `lucide-react` installed — appears in `package.json` dependencies.
- **Task 2 ✅**: `app/page.tsx` replaced — full 6-section Server Component: sticky nav, hero, features grid (6 lucide-react icons), how it works (3 steps), CTA banner, footer. Nav logo uses `<Link>` (required by ESLint); all other links use `<a>`. Inline `s` styles throughout.
- **Task 3 ✅**: `app/layout.tsx` metadata updated — title "Conventionals", description "Run better events. Build lasting connections."
- **Task 4 ✅**: `npx tsc --noEmit` — 0 errors. `npm run lint` — 0 errors, 1 pre-existing warning.

### File List

- `conventionals/app/page.tsx` (replaced — full landing page)
- `conventionals/app/layout.tsx` (modified — metadata)
- `conventionals/package.json` (modified — + lucide-react)
- `conventionals/package-lock.json` (modified — lockfile updated by npm install)

### Review Findings

- [x] [Review][Patch] Dead `marginBottom` property in `s.heroSubheading` [conventionals/app/page.tsx:83] — `marginBottom: '2.5rem'` is overridden by `margin: '0 auto 2.5rem'` that follows it in the same object; property is dead code

### Change Log

- 2026-04-06: Story created.
- 2026-04-06: Implementation complete. All tasks done. `npx tsc --noEmit` 0 errors, lint 0 errors.
- 2026-04-06: Code review complete. 0 decision-needed, 1 patch, 0 deferred, 9 dismissed.
