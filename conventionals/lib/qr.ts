import 'server-only'
import QRCode from 'qrcode'

export async function generateQR(badgeUrl: string): Promise<string> {
  return QRCode.toDataURL(badgeUrl)
}

export async function generateQRBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, { type: 'png', width: 300, margin: 2 })
}
