import 'server-only'
import QRCode from 'qrcode'

export async function generateQR(badgeUrl: string): Promise<string> {
  return QRCode.toDataURL(badgeUrl, {
    errorCorrectionLevel: 'H',
    width: 600,
    margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

export async function generateQRBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    type: 'png',
    errorCorrectionLevel: 'H',
    width: 600,
    margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  })
}
