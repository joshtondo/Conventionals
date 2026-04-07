import 'server-only'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '@/drizzle/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle> | undefined }

const sql = neon(process.env.DATABASE_URL)

export const db = globalForDb.db ?? drizzle({ client: sql, schema })

if (process.env.NODE_ENV !== 'production') globalForDb.db = db
