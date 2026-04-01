const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const crypto = require('crypto');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { generateQR } = require('../services/qr');
const { sendBadgeEmail } = require('../services/email');

const router = express.Router();

/**
 * GET /api/events
 * Returns all events belonging to the logged-in organizer.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, event_date FROM events WHERE organizer_id = $1 ORDER BY event_date DESC, id DESC',
      [req.session.organizerId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Events list error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/events
 * Create a new event for the logged-in organizer.
 */
router.post('/', requireAuth, async (req, res) => {
  const { name, event_date } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Event name is required' });
  }
  try {
    const { rows: [event] } = await pool.query(
      'INSERT INTO events (organizer_id, name, event_date) VALUES ($1, $2, $3) RETURNING id, name, event_date',
      [req.session.organizerId, name.trim(), event_date || null]
    );
    res.status(201).json(event);
  } catch (err) {
    console.error('Create event error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/events/:id/attendees
 * Manually add a single attendee, generate their badge, and send their email.
 */
router.post('/:id/attendees', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  const { name, email, badge_type } = req.body;
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const eventResult = await pool.query(
      'SELECT id, name FROM events WHERE id = $1 AND organizer_id = $2',
      [eventId, req.session.organizerId]
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventResult.rows[0];

    const normalizedEmail = email.trim().toLowerCase();
    const badgeType = badge_type?.trim() || 'General';

    const attendeeResult = await pool.query(
      `INSERT INTO attendees (event_id, name, email, badge_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, email) DO NOTHING
       RETURNING id`,
      [eventId, name.trim(), normalizedEmail, badgeType]
    );

    if (attendeeResult.rows.length === 0) {
      return res.status(409).json({ error: 'An attendee with that email already exists for this event' });
    }

    const attendeeId = attendeeResult.rows[0].id;
    const token = crypto.randomUUID();

    await pool.query('INSERT INTO badges (attendee_id, token) VALUES ($1, $2)', [attendeeId, token]);

    const badgeUrl = `${process.env.APP_URL}/badge/${token}`;
    let emailSent = false;

    try {
      const qrDataUrl = await generateQR(badgeUrl);
      await sendBadgeEmail({
        toName: name.trim(),
        toEmail: normalizedEmail,
        badgeType,
        eventName: event.name,
        badgeUrl,
        qrDataUrl,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error(`Email failed for ${normalizedEmail}:`, emailErr.message);
    }

    await pool.query('UPDATE badges SET email_sent = $1 WHERE token = $2', [emailSent, token]);

    res.status(201).json({ name: name.trim(), email: normalizedEmail, badgeType, token, emailSent });
  } catch (err) {
    console.error('Manual attendee add error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5 MB file size cap — large enough for any real attendee list, prevents memory DoS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const REQUIRED_COLUMNS = ['name', 'email', 'badge_type'];

/**
 * POST /api/events/:id/upload
 * Accepts a CSV file, generates badges, and dispatches emails.
 * Protected — requires active admin session.
 */
router.post('/:id/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const eventId = parseInt(req.params.id, 10);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  // Verify the event exists and belongs to this organizer
  let event;
  try {
    const eventResult = await pool.query(
      'SELECT id, name FROM events WHERE id = $1 AND organizer_id = $2',
      [eventId, req.session.organizerId]
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    event = eventResult.rows[0];
  } catch (err) {
    console.error('Event lookup error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Parse CSV from buffer
  let rows;
  try {
    rows = await new Promise((resolve, reject) => {
      parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  } catch {
    return res.status(400).json({ error: 'Failed to parse CSV file' });
  }

  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: 'No attendee rows found in CSV' });
  }

  // Normalize row keys to lowercase so Excel-exported headers (Name, Email, Badge_Type) work
  const normalizedRows = rows.map(row =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]))
  );

  // Validate headers
  const headers = Object.keys(normalizedRows[0]);
  const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  if (missing.length > 0) {
    return res.status(400).json({
      error: `CSV is missing required columns: ${missing.join(', ')}`,
    });
  }

  const issued = [];
  const skipped = [];
  const errors = [];

  for (const row of normalizedRows) {
    const name = row['name']?.trim();
    const email = row['email']?.trim().toLowerCase();
    const badgeType = row['badge_type']?.trim() || 'General';

    if (!name || !email) {
      skipped.push({ email: email || '(missing)', reason: 'Missing name or email' });
      continue;
    }

    try {
      // Insert attendee — skip on duplicate email for this event
      const attendeeResult = await pool.query(
        `INSERT INTO attendees (event_id, name, email, badge_type)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id, email) DO NOTHING
         RETURNING id`,
        [eventId, name, email, badgeType]
      );

      if (attendeeResult.rows.length === 0) {
        skipped.push({ email, reason: 'Duplicate email in event' });
        continue;
      }

      const attendeeId = attendeeResult.rows[0].id;
      const token = crypto.randomUUID();

      await pool.query(
        'INSERT INTO badges (attendee_id, token) VALUES ($1, $2)',
        [attendeeId, token]
      );

      // Generate QR and send email
      const badgeUrl = `${process.env.APP_URL}/badge/${token}`;
      let emailSent = false;

      try {
        const qrDataUrl = await generateQR(badgeUrl);
        await sendBadgeEmail({
          toName: name,
          toEmail: email,
          badgeType,
          eventName: event.name,
          badgeUrl,
          qrDataUrl,
        });
        emailSent = true;
        issued.push({ name, email, badgeType, token });
      } catch (emailErr) {
        console.error(`Email failed for ${email}:`, emailErr.message);
        errors.push({ email, reason: 'Email delivery failed' });
        // Badge is persisted with email_sent=false — organizer can see it in errors list
      }

      await pool.query(
        'UPDATE badges SET email_sent = $1 WHERE token = $2',
        [emailSent, token]
      );
    } catch (err) {
      console.error(`Failed to process attendee ${email}:`, err.message);
      errors.push({ email, reason: 'Processing error' });
    }
  }

  res.json({
    issued: issued.length,
    skipped: skipped.length,
    skippedDetails: skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
});

/**
 * GET /api/events/:id/stats
 * Returns total attendee count and checked-in count for an event.
 */
router.get('/:id/stats', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  try {
    const eventResult = await pool.query(
      'SELECT id FROM events WHERE id = $1 AND organizer_id = $2',
      [eventId, req.session.organizerId]
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { rows: [stats] } = await pool.query(
      `SELECT
         COUNT(*)                                    AS total,
         COUNT(*) FILTER (WHERE b.checked_in = TRUE) AS checked_in
       FROM attendees a
       JOIN badges b ON b.attendee_id = a.id
       WHERE a.event_id = $1`,
      [eventId]
    );

    res.json({ total: parseInt(stats.total, 10), checkedIn: parseInt(stats.checked_in, 10) });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/events/:id/attendees
 * Returns all attendees for an event with their badge/check-in status.
 */
router.get('/:id/attendees', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  try {
    const eventResult = await pool.query(
      'SELECT id FROM events WHERE id = $1 AND organizer_id = $2',
      [eventId, req.session.organizerId]
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { rows } = await pool.query(
      `SELECT
         a.id, a.name, a.email, a.badge_type,
         b.checked_in, b.checked_in_at, b.token
       FROM attendees a
       JOIN badges b ON b.attendee_id = a.id
       WHERE a.event_id = $1
       ORDER BY a.name ASC`,
      [eventId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Attendees error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
