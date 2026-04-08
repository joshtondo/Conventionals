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
  eventName: string
  badgeType: string
}

export async function sendBadgeEmail({
  to,
  name,
  badgeUrl,
  qrDataUrl,
  inviteUrl,
  eventName,
  badgeType,
}: SendBadgeEmailParams): Promise<boolean> {
  const safeName = escapeHtml(name)
  const safeEvent = escapeHtml(eventName)
  const safeBadgeType = escapeHtml(badgeType)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Event Badge</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:380px;background:#ffffff;border-radius:22px;box-shadow:0 24px 64px rgba(79,70,229,0.13),0 4px 16px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 0;">

              <!-- Card header: logo + year -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                <tr>
                  <td style="font-size:11px;font-weight:800;color:#4f46e5;letter-spacing:-0.2px;">CONVENTIONALS</td>
                  <td align="right" style="font-size:11px;color:#9ca3af;font-weight:500;">2026</td>
                </tr>
              </table>

              <!-- Event name -->
              <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1e1b4b;">${safeEvent}</p>

              <!-- Divider -->
              <div style="border-top:1px solid #f3f4f6;margin:16px 0;"></div>

              <!-- QR code -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center">
                    <img src="${qrDataUrl}" alt="Your QR Code" width="160" height="160" style="display:block;border:0;" />
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top:1px solid #f3f4f6;margin:16px 0;"></div>

              <!-- Attendee name -->
              <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1e1b4b;letter-spacing:-0.5px;">${safeName}</p>

              <!-- Badge type pill -->
              <span style="display:inline-block;background:linear-gradient(135deg,#ede9fe,#e0e7ff);color:#5b21b6;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${safeBadgeType}</span>

              <!-- Footer row -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:11px;color:#9ca3af;vertical-align:middle;">Scan to check in</td>
                  <td align="right">
                    <a href="${badgeUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;text-decoration:none;">View badge →</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Indigo footer band -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;">Hi ${safeName}, your badge is ready!</p>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7);line-height:1.5;">
                Show this QR code at the door for instant check-in. No app required.
              </p>
            </td>
          </tr>
        </table>

        <!-- Connect CTA below card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:380px;margin-top:20px;background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(79,70,229,0.07);border:1px solid #e0e7ff;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#1e1b4b;">Connect with other attendees</p>
              <p style="margin:0 0 14px;font-size:13px;color:#6b7280;line-height:1.5;">
                Create a Conventionals account to share your contact info and stay in touch after the event.
              </p>
              <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;text-decoration:none;">Set up your account →</a>
            </td>
          </tr>
        </table>

        <!-- Footer text -->
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
          © 2026 Conventionals · <a href="${badgeUrl}" style="color:#9ca3af;">View badge online</a>
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `Your badge for ${eventName}`,
      html,
    })
    return true
  } catch (err) {
    console.error('SendGrid error:', (err as Error).message)
    return false
  }
}
