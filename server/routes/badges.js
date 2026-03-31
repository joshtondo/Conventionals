const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

/**
 * GET /api/badges/:token
 * Public — no auth required. Returns attendee info for the badge page.
 * Does NOT expose email address.
 */
router.get('/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT
         a.name, a.badge_type,
         e.name AS event_name, e.event_date,
         b.checked_in, b.checked_in_at
       FROM badges b
       JOIN attendees a ON a.id = b.attendee_id
       JOIN events e ON e.id = a.event_id
       WHERE b.token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Badge lookup error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/badges/:token/checkin
 * Protected — requires organizer session. Marks a badge as checked in.
 * Idempotent: double-scanning returns { alreadyCheckedIn: true } rather than an error.
 */
router.post('/:token/checkin', requireAuth, async (req, res) => {
  const { token } = req.params;

  try {
    // Verify the badge's event belongs to this organizer
    const ownerCheck = await pool.query(
      `SELECT b.id
       FROM badges b
       JOIN attendees a ON a.id = b.attendee_id
       JOIN events e ON e.id = a.event_id
       WHERE b.token = $1 AND e.organizer_id = $2`,
      [token, req.session.organizerId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    const { rows } = await pool.query(
      `UPDATE badges
       SET checked_in = TRUE, checked_in_at = NOW()
       WHERE token = $1 AND checked_in = FALSE
       RETURNING checked_in_at`,
      [token]
    );

    if (rows.length === 0) {
      // Badge was already checked in
      return res.json({ alreadyCheckedIn: true });
    }

    res.json({ checkedIn: true, checkedInAt: rows[0].checked_in_at });
  } catch (err) {
    console.error('Check-in error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
