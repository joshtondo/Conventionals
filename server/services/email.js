const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/** Escape user-supplied strings before interpolating into HTML email body */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Send a badge email with an embedded QR code to an attendee.
 * @param {Object} opts
 * @param {string} opts.toName       - Attendee's full name
 * @param {string} opts.toEmail      - Attendee's email address
 * @param {string} opts.badgeType    - Badge type label (e.g. "General", "VIP")
 * @param {string} opts.eventName    - Name of the event
 * @param {string} opts.badgeUrl     - Public URL for the attendee's credential page
 * @param {string} opts.qrDataUrl    - Base64 PNG data URL from qr.js
 * @returns {Promise<void>}
 */
async function sendBadgeEmail({ toName, toEmail, badgeType, eventName, badgeUrl, qrDataUrl }) {
  const safeName = escapeHtml(toName);
  const safeBadgeType = escapeHtml(badgeType);
  const safeEventName = escapeHtml(eventName);
  // badgeUrl is APP_URL (env-controlled) + UUID — no user input; qrDataUrl is generated internally
  const safeSubject = `Your ${safeEventName} Badge`;

  const msg = {
    to: toEmail,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: 'Conventials',
    },
    subject: safeSubject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 4px;">${safeEventName}</h1>
        <p style="color: #666; margin-top: 0;">Your digital badge is ready.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr>
            <td style="padding: 8px 0; color: #888; width: 120px;">Name</td>
            <td style="padding: 8px 0; font-weight: bold;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Badge Type</td>
            <td style="padding: 8px 0; font-weight: bold;">${safeBadgeType}</td>
          </tr>
        </table>

        <p style="margin-bottom: 8px; color: #555;">Present this QR code at the entrance:</p>
        <img src="${qrDataUrl}" alt="Check-in QR Code" style="width: 200px; height: 200px; display: block;" />

        <p style="margin-top: 24px;">
          <a href="${badgeUrl}" style="color: #4f46e5;">View your credential page &#x2192;</a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #aaa;">
          This badge was issued by ${safeEventName} via Conventials.
          If you did not register for this event, please ignore this email.
        </p>
      </div>
    `,
  };

  await sgMail.send(msg);
}

module.exports = { sendBadgeEmail };
