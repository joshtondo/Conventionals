import 'server-only'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

type SendBadgeEmailParams = {
  to: string
  name: string
  badgeUrl: string
  qrDataUrl: string
  inviteUrl: string
}

export async function sendBadgeEmail({
  to,
  name,
  badgeUrl,
  qrDataUrl,
  inviteUrl,
}: SendBadgeEmailParams): Promise<boolean> {
  const safeName = escapeHtml(name)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Hi ${safeName}, your badge is ready!</h1>
      <p>Scan the QR code below to check in at the event:</p>
      <img src="${qrDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
      <p><a href="${badgeUrl}">View your badge online</a></p>
      <hr />
      <p>Want to create a Conventionals account to connect with other attendees?</p>
      <p><a href="${inviteUrl}">Set up your account</a></p>
    </div>
  `
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: 'Your Event Badge',
      html,
    })
    return true
  } catch (err) {
    console.error('SendGrid error:', (err as Error).message)
    return false
  }
}
