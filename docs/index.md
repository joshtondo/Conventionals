# Conventionals — Documentation Index

**Generated:** 2026-04-07
**Scan level:** Deep
**Project type:** Web — Next.js 16.2.2 monolith

---

## Quick Reference

- **Primary language:** TypeScript
- **Framework:** Next.js 16.2.2 (App Router)
- **Architecture:** Layered / Islands (Server Components + Client Islands)
- **Database:** PostgreSQL via Neon (serverless), Drizzle ORM
- **Auth:** iron-session v8, cookie-based, dual-role (organizer / attendee)
- **Deployment:** Vercel
- **App root:** `conventionals/`

---

## Generated Documentation

- [Project Overview](./project-overview.md) — What it is, tech stack summary, key concepts
- [Architecture](./architecture.md) — Layer diagram, session model, data flows, technology decisions
- [Data Models](./data-models.md) — All 7 tables, columns, constraints, migration history
- [API Contracts](./api-contracts.md) — All 20 API endpoints with request/response schemas
- [Component Inventory](./component-inventory.md) — All pages and client islands with descriptions
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory tree with entry points
- [Development Guide](./development-guide.md) — Local setup, env vars, key patterns, deployment

---

## Getting Started (New Developer)

1. Read [Project Overview](./project-overview.md) first — understand the two user roles and the invite flow.
2. Read [Architecture](./architecture.md) — understand the Server Component + Client Island split and the `withAuth`/`withAttendeeAuth` HOF pattern.
3. Set up locally using [Development Guide](./development-guide.md).
4. For any DB work, see [Data Models](./data-models.md) and `conventionals/drizzle/schema.ts`.
5. For any API work, see [API Contracts](./api-contracts.md) and the relevant file in `conventionals/data/`.
