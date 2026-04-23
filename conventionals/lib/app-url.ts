import 'server-only'

let hasWarnedMissingAppUrl = false

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit && explicit.trim()) return normalizeBaseUrl(explicit)

  // Vercel populates these at runtime. Prefer production domain when present.
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProd && vercelProd.trim()) return normalizeBaseUrl(vercelProd)

  const vercelPreview = process.env.VERCEL_URL
  if (vercelPreview && vercelPreview.trim()) return normalizeBaseUrl(vercelPreview)

  if (!hasWarnedMissingAppUrl) {
    hasWarnedMissingAppUrl = true
    console.warn(
      '[app-url] Unable to resolve app URL. Set NEXT_PUBLIC_APP_URL on Vercel ' +
      '(recommended) or rely on VERCEL_PROJECT_PRODUCTION_URL/VERCEL_URL.'
    )
  }

  return ''
}
