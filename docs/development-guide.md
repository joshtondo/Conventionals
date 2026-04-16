# Conventionals — Development Guide

## Prerequisites

- Node.js 20+ (project uses `@types/node ^20`)
- A [Neon](https://neon.tech) PostgreSQL project with two connection strings:
  - **Pooled** (`DATABASE_URL`) — for runtime app queries
  - **Direct/non-pooled** (`DIRECT_URL`) — for running migrations only
- A [SendGrid](https://sendgrid.com) account with an API key and a verified sender email
- A Vercel account (for deployment)

## Local Setup

```bash
# 1. Clone and install
cd conventionals
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# 3. Run migrations (requires DIRECT_URL set in .env.local)
#    NOTE: drizzle-kit uses @neondatabase/serverless which requires
#    WebSocket support. The recommended approach is to run via
#    Neon SQL Editor or Vercel deploy hook.
#    If you have a way to provide WS support, run:
npx drizzle-kit migrate

# 4. Start dev server
npm run dev
# App available at http://localhost:3000
```

## Environment Variables

All defined in `.env.local` (gitignored). See `.env.example` for the template.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Neon connection string — used by the app at runtime |
| `DIRECT_URL` | Yes (migrations only) | Non-pooled Neon direct connection — used by `drizzle-kit migrate` only |
| `SESSION_SECRET` | Yes | At least 32 random characters. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SENDGRID_API_KEY` | Yes | SendGrid API key for badge emails |
| `SENDGRID_FROM_EMAIL` | Yes | Verified sender email address |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL, no trailing slash. E.g. `https://your-app.vercel.app` |

## Scripts

```bash
npm run dev      # Start Next.js dev server (hot reload)
npm run build    # Production build
npm run start    # Start production server (after build)
npm run lint     # Run ESLint
```

## Database Migrations

Migrations are managed by Drizzle Kit.

```bash
# Generate a new migration after editing drizzle/schema.ts
npx drizzle-kit generate

# Apply pending migrations (requires DIRECT_URL)
npx drizzle-kit migrate

# Open Drizzle Studio (DB browser)
npx drizzle-kit studio
```

**Important**: `@neondatabase/serverless` requires WebSocket support in Node.js for `drizzle-kit migrate`. If migration fails locally, apply the SQL files directly via the Neon dashboard SQL Editor.

## Key Patterns

### Adding a new API route

1. Create `app/api/<path>/route.ts`
2. Wrap handler with `withAuth` (organizer) or `withAttendeeAuth` (attendee) from `@/lib/session`
3. Put all DB logic in a new function in the relevant `data/` file (mark it `server-only`)

```typescript
// app/api/example/route.ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/session'
import { myDataFunction } from '@/data/myFile'

export const GET = withAuth(async (_req, { session }) => {
  const result = await myDataFunction(session.organizerId!)
  return NextResponse.json(result)
})
```

### Adding a new page

1. Create `app/<path>/page.tsx` as a Server Component
2. Check session, redirect if unauthorized
3. Extract any interactive parts into a separate `<Name>.tsx` Client Island (`'use client'`)

```typescript
// app/example/page.tsx
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, SessionData } from '@/lib/session'

export default async function ExamplePage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.organizerId) redirect('/login')
  // fetch data, render...
}
```

### `await params` in dynamic routes

Next.js 16 requires `params` to be awaited in both pages and route handlers:

```typescript
// Route handler
export const GET = withAuth(async (req, ctx) => {
  const { id } = await ctx.params  // ← must await
  ...
})

// Page
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // ← must await
  ...
}
```

### NULL comparisons in Drizzle

Use `isNull(column)` — NOT `eq(column, null)`:

```typescript
import { isNull, eq, and } from 'drizzle-orm'

// ✅ correct
.where(and(eq(connections.ownerId, id), isNull(connections.eventId)))

// ❌ wrong — generates broken SQL
.where(eq(connections.eventId, null))
```

## Testing

No automated test suite is currently configured. The project uses manual testing.

To test locally:
1. Register as an organizer at `/register`
2. Create an event, add an attendee (use a real email or check SendGrid activity)
3. Open the badge email, use the invite link to create an attendee account
4. Test attendee features: profile, people browse, connections

## Deployment

Deployed to Vercel via git push to `master`. Vercel automatically:
- Builds with `npm run build`
- Sets environment variables from the Vercel dashboard

**After adding a new migration**: Apply via Neon SQL Editor or a deploy hook that runs `drizzle-kit migrate`.
