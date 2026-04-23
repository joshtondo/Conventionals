import 'server-only'
import QRCode from 'qrcode'

const QR_OPTS = {
  errorCorrectionLevel: 'H' as const, // 30% redundancy (vs default M at 15%)
  width: 600,                          // high-res source so it stays sharp on retina
  margin: 4,                           // generous quiet zone — tight margins break scans
  color: { dark: '#000000', light: '#ffffff' }, // pure black/white, no grey blending
}

export async function generateQR(badgeUrl: string): Promise<string> {
  return QRCode.toDataURL(badgeUrl, QR_OPTS)
}

export async function generateQRBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, { ...QR_OPTS, type: 'png' })
}
