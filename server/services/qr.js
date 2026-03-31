const QRCode = require('qrcode');

/**
 * Generate a QR code for the given URL.
 * @param {string} url - The badge URL to encode.
 * @returns {Promise<string>} Base64-encoded PNG data URL.
 */
async function generateQR(url) {
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

module.exports = { generateQR };
