import { NextRequest, NextResponse } from 'next/server'
import { generateQRBuffer } from '@/lib/qr'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })
  if (url.length > 2048) return new NextResponse('url too long', { status: 400 })

  // Only allow QR codes for paths within this app — prevents open proxy abuse
  const isRelative = url.startsWith('/')
  const isOwnOrigin = APP_URL && url.startsWith(APP_URL)
  if (!isRelative && !isOwnOrigin) {
    return new NextResponse('url must be a relative path or this app\'s origin', { status: 400 })
  }

  const buffer = await generateQRBuffer(url)
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
