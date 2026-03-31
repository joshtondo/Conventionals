const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, password_hash FROM organizers WHERE email = $1',
      [email]
    );

    const organizer = result.rows[0];
    // Use constant-time comparison even when organizer not found to prevent timing attacks
    // Valid 60-char bcrypt hash used as dummy for constant-time comparison when user not found
    const hash = organizer ? organizer.password_hash : '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const valid = await bcrypt.compare(password, hash);

    if (!organizer || !valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.organizerId = organizer.id;
    res.json({ ok: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/me — check session status
router.get('/me', (req, res) => {
  if (req.session && req.session.organizerId) {
    return res.json({ authenticated: true, organizerId: req.session.organizerId });
  }
  res.status(401).json({ authenticated: false });
});

module.exports = router;
