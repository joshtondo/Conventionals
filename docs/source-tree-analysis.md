# Conventionals — Source Tree Analysis

Root: `conventionals/` (Next.js app root)

```
conventionals/
│
├── app/                            ← All Next.js routes
│   ├── layout.tsx                  ← Root layout (Geist font, metadata)
│   ├── page.tsx                    ← Marketing landing page (public)
│   ├── globals.css                 ← Global reset/base styles
│   │
│   ├── login/                      ← Organizer login page
│   │   ├── page.tsx                  Server Component shell
│   │   └── LoginForm.tsx             Client island (form state)
│   ├── register/                   ← Organizer registration page
│   │   ├── page.tsx
│   │   └── RegisterForm.tsx
│   │
│   ├── dashboard/                  ← Organizer main dashboard
│   │   ├── page.tsx                  Server Component — session guard, loads events+stats
│   │   └── DashboardClient.tsx       Client island — event list, create form, delete button
│   │
│   ├── event/[id]/
│   │   └── upload/                 ← Attendee upload page (CSV or manual add)
│   │       ├── page.tsx              Server Component — session guard
│   │       └── UploadForm.tsx        Client island — manual add + CSV upload
│   │
│   ├── badge/[token]/
│   │   └── page.tsx                ← Public badge display page (QR code shown here)
│   │
│   ├── attendee/                   ← All attendee-facing pages
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── AttendeeLoginForm.tsx
│   │   ├── signup/
│   │   │   ├── page.tsx              Reads ?token= from searchParams
│   │   │   └── SignupForm.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx              Server Component — event history (linked by email)
│   │   ├── profile/
│   │   │   ├── page.tsx              Server Component — loads account data
│   │   │   └── ProfileForm.tsx       Client island — all profile fields + visibility toggle
│   │   ├── event/[id]/people/
│   │   │   ├── page.tsx              Server Component — browse public attendees at event
│   │   │   └── ConnectButton.tsx     Client island — "Connect" button with state
│   │   └── connections/
│   │       ├── page.tsx              Server Component — list saved connections
│   │       └── ConnectionCard.tsx    Client island — notes textarea with save
│   │
│   └── api/                        ← All API Route Handlers
│       ├── auth/                   ← Organizer auth namespace
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   ├── register/route.ts
│       │   └── me/route.ts
│       ├── events/                 ← Event CRUD
│       │   ├── route.ts              GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts          DELETE
│       │       └── attendees/
│       │           └── route.ts      POST (add single JSON or CSV multipart)
│       ├── badges/[token]/         ← Badge operations
│       │   ├── route.ts              GET (public badge data)
│       │   ├── checkin/route.ts      POST (check in)
│       │   └── resend/route.ts       POST (resend email, organizer-guarded)
│       └── attendee/               ← Attendee namespace
│           ├── auth/
│           │   ├── login/route.ts
│           │   ├── logout/route.ts
│           │   └── signup/route.ts
│           ├── profile/route.ts      PATCH (update profile)
│           └── connections/
│               ├── route.ts          POST (create connection)
│               └── [id]/route.ts     PATCH (update notes)
│
├── data/                           ← Data access layer (ALL marked server-only)
│   ├── auth.ts                       login(), createOrganizer(), getOrganizerById()
│   ├── events.ts                     getEvents(), getEventById(), createEvent(), deleteEvent()
│   ├── attendees.ts                  signup flow, loginAttendee(), getAttendeeAccount(),
│   │                                 updateProfile(), getEventHistory(), getPublicAttendeesForEvent(),
│   │                                 markInviteUsed()
│   ├── badges.ts                     createAttendeeAndBadge(), getBadgeByToken(),
│   │                                 checkinBadge(), resendBadge(), getDashboardStats(),
│   │                                 getAttendees()
│   └── connections.ts                createConnection(), getConnections(), updateConnectionNotes()
│
├── lib/                            ← Shared infrastructure (ALL marked server-only)
│   ├── db.ts                         Drizzle client singleton (neon HTTP driver)
│   ├── session.ts                    iron-session config, SessionData, withAuth, withAttendeeAuth
│   ├── email.ts                      SendGrid wrapper, sendBadgeEmail(), escapeHtml()
│   └── qr.ts                         generateQR(url) → base64 data URL
│
├── drizzle/                        ← Database schema and migrations
│   ├── schema.ts                     All table definitions (canonical source of truth)
│   ├── relations.ts                  Drizzle relational helpers
│   └── migrations/
│       ├── 0000_baseline.sql
│       ├── 0001_clever_logan.sql
│       ├── 0002_previous_payback.sql
│       ├── 0003_ambitious_squirrel_girl.sql   ← attendee_accounts
│       ├── 0004_misty_carnage.sql             ← connections
│       └── meta/                             ← drizzle-kit snapshots
│
├── .env.example                    ← Environment variable template
├── .env.local                      ← Local secrets (gitignored)
├── drizzle.config.ts               ← drizzle-kit config (uses DIRECT_URL)
├── next.config.ts                  ← Next.js config
├── tsconfig.json                   ← TypeScript config (@/ alias → root)
└── package.json
```

## Critical Entry Points

| Entry Point | Type | Purpose |
|---|---|---|
| `app/layout.tsx` | Server Component | Root HTML wrapper, font loading |
| `app/page.tsx` | Server Component | Public landing page |
| `app/dashboard/page.tsx` | Server Component | Organizer main view (guarded) |
| `app/attendee/dashboard/page.tsx` | Server Component | Attendee main view (guarded) |
| `lib/session.ts` | Server module | Session config + auth HOFs used everywhere |
| `lib/db.ts` | Server module | Drizzle singleton, imported by all data/ files |
| `drizzle/schema.ts` | Shared | Database schema, imported by data/ and drizzle-kit |
