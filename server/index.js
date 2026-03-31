console.log('DATABASE_URL:', process.env.DATABASE_URL);

require('dotenv').config();

// Startup env var assertions — fail fast with clear message rather than silent misbehavior
const REQUIRED_ENV = ['DATABASE_URL', 'SESSION_SECRET', 'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'APP_URL'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const badgeRoutes = require('./routes/badges');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow requests from the React dev server
app.use(cors({
  origin: process.env.APP_URL,
  credentials: true,
}));

app.use(express.json());

// Session middleware backed by PostgreSQL
// createTableIfMissing: true so the session table is auto-created if schema.sql was run without it
app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/badges', badgeRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Seed default admin organizer and event if none exists
async function seedAdmin() {
  const { rows } = await pool.query('SELECT id FROM organizers LIMIT 1');
  if (rows.length === 0) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.warn('No organizers found and ADMIN_EMAIL/ADMIN_PASSWORD not set. Skipping seed.');
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows: [organizer] } = await pool.query(
      'INSERT INTO organizers (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, hash]
    );
    await pool.query(
      `INSERT INTO events (organizer_id, name, event_date) VALUES ($1, 'Convention 2026', '2026-06-01')`,
      [organizer.id]
    );
    console.log(`Seeded admin organizer: ${email}`);
  }
}

app.listen(PORT, async () => {
  try {
    await seedAdmin();
  } catch (err) {
    console.error('Startup seed failed:', err.message);
    process.exit(1);
  }
  console.log(`Conventials server running on port ${PORT}`);
});
