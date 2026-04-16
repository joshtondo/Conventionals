# Conventionals — Project Overview

## What It Is

Conventionals is a web-based event management platform with two distinct user roles:

- **Organizers** — create events, upload attendee lists (CSV or manual), generate QR-coded badge emails, and track check-ins from a dashboard.
- **Attendees** — receive a badge email with an invite link, create a cross-event account, manage a public profile, browse other attendees at an event, and save connections with notes.

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.2 |
| Language | TypeScript | ^5 |
| Runtime | Node.js / Vercel Edge-compatible | — |
| Database | PostgreSQL (Neon serverless) | — |
| ORM | Drizzle ORM | ^0.45.2 |
| Auth | iron-session v8 | ^8.0.4 |
| Email | SendGrid (@sendgrid/mail) | ^8.1.6 |
| QR Codes | qrcode | ^1.5.4 |
| CSV Parsing | csv-parse | ^6.2.1 |
| Password Hashing | bcryptjs | ^3.0.3 |
| UI Icons | lucide-react | ^1.7.0 |
| Deployment | Vercel | — |

## Architecture Type

**Monolith** — single Next.js application with:
- Server Components for data-fetching pages
- Client Islands for interactive forms/components
- App Router API routes for all backend logic
- A strict `data/` access layer (all files marked `server-only`)

## Repository Structure

Single repo, single app under `conventionals/`.

```
Conventionals/
├── conventionals/          ← Next.js application root
│   ├── app/                ← All routes (pages + API)
│   ├── data/               ← Database access layer (server-only)
│   ├── lib/                ← Shared infrastructure (db, session, email, qr)
│   ├── drizzle/            ← Schema definitions and migrations
│   └── ...config files
├── _bmad-output/           ← BMad planning and implementation artifacts
└── docs/                   ← This documentation
```

## Key Concepts

**Dual-auth model**: A single `iron-session` cookie carries either `organizerId` or `attendeeAccountId`. The `withAuth` and `withAttendeeAuth` HOFs guard API routes for each role.

**Email-based identity linking**: `attendees.email` is the bridge between the organizer-created `attendees` record and the attendee-created `attendee_accounts` record. This lets an attendee see their event history across any event they were registered for.

**Invite flow**: When an organizer adds an attendee, a badge email is sent with a unique `inviteToken`. The attendee clicks the link to create their `attendee_accounts` record, which marks the invite as used.

## Deployment

Deployed to Vercel. Uses Neon's pooled `DATABASE_URL` at runtime and a direct (non-pooled) `DIRECT_URL` for Drizzle migrations only.

## Links

- [Architecture](./architecture.md)
- [API Contracts](./api-contracts.md)
- [Data Models](./data-models.md)
- [Component Inventory](./component-inventory.md)
- [Source Tree](./source-tree-analysis.md)
- [Development Guide](./development-guide.md)
