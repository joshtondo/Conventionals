import 'server-only'
import QRCode from 'qrcode'

export async function generateQR(badgeUrl: string): Promise<string> {
  return QRCode.toDataURL(badgeUrl)
}
