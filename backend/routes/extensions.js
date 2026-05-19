// Apply pass 5 — backlog extensions for AIWeddingPlanner
//
// ENV VARS (consumed by NEEDS-CREDS endpoints; absence triggers 503 + missing: <ENV>):
//   STRIPE_SECRET_KEY                     (Stripe payment processing)
//   STRIPE_PUBLISHABLE_KEY                (FE hint, optional)
//   COUNSELING_REFERRAL_PROVIDER          (External directory; optional)
//
// All env-gated endpoints return 503 with `missing: <ENV>` when unset.
// CREATE TABLE IF NOT EXISTS only.

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');

async function ensureExtTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_reviews (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title VARCHAR(255),
      body TEXT,
      verified_purchase BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_review_responses (
      id SERIAL PRIMARY KEY,
      review_id INTEGER REFERENCES vendor_reviews(id) ON DELETE CASCADE,
      vendor_user_id INTEGER,
      response TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency VARCHAR(8) DEFAULT 'USD',
      vendor_id INTEGER,
      description TEXT,
      stripe_payment_intent_id VARCHAR(120),
      status VARCHAR(30) DEFAULT 'created',
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_assignments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      staff_name VARCHAR(120) NOT NULL,
      role VARCHAR(80) NOT NULL,
      contact VARCHAR(120),
      shift_start TIMESTAMP,
      shift_end TIMESTAMP,
      station VARCHAR(120),
      status VARCHAR(30) DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS counseling_referrals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      reason TEXT,
      provider_name VARCHAR(120),
      provider_url VARCHAR(255),
      status VARCHAR(30) DEFAULT 'suggested',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureExtTables();

function missingEnv(...keys) { return keys.filter(k => !process.env[k]); }

// ── 1) Vendor rating/review system (substantive feature, MECHANICAL impl) ──
router.get('/vendor-reviews/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  const { rows } = await pool.query(
    `SELECT vr.*, vrr.response AS vendor_response
       FROM vendor_reviews vr
       LEFT JOIN vendor_review_responses vrr ON vrr.review_id = vr.id
      WHERE vr.vendor_id = $1
      ORDER BY vr.created_at DESC LIMIT 200`,
    [vendorId]
  );
  const avg = rows.length === 0 ? 0 : rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length;
  res.json({ success: true, vendor_id: Number(vendorId), reviews: rows, count: rows.length, average_rating: Number(avg.toFixed(2)) });
});

router.post('/vendor-reviews', auth, async (req, res) => {
  const { vendor_id, rating, title, body, verified_purchase } = req.body || {};
  if (!vendor_id || !rating) return res.status(400).json({ error: 'vendor_id and rating required' });
  const r = parseInt(rating, 10);
  if (Number.isNaN(r) || r < 1 || r > 5) return res.status(400).json({ error: 'rating must be 1-5' });
  const ins = await pool.query(
    `INSERT INTO vendor_reviews (vendor_id, user_id, rating, title, body, verified_purchase) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [vendor_id, req.user.id, r, title || null, body || null, !!verified_purchase]
  );
  res.json({ success: true, review: ins.rows[0] });
});

router.post('/vendor-reviews/:reviewId/response', auth, async (req, res) => {
  const { response } = req.body || {};
  if (!response) return res.status(400).json({ error: 'response required' });
  const ins = await pool.query(
    `INSERT INTO vendor_review_responses (review_id, vendor_user_id, response) VALUES ($1,$2,$3) RETURNING *`,
    [req.params.reviewId, req.user.id, response]
  );
  res.json({ success: true, response: ins.rows[0] });
});

// ── 2) Payment processing: Stripe (NEEDS-CREDS) ────────────────────────────
router.post('/payments/intent', auth, async (req, res) => {
  const missing = missingEnv('STRIPE_SECRET_KEY');
  if (missing.length) return res.status(503).json({ error: 'Stripe not configured', missing: missing.join(',') });
  const { amount_cents, currency, vendor_id, description, metadata } = req.body || {};
  if (!amount_cents || amount_cents < 50) return res.status(400).json({ error: 'amount_cents >= 50 required' });
  // Stub: real impl would call stripe.paymentIntents.create. We persist a record
  // and return a synthetic intent id for testing without the live SDK.
  const intentId = `pi_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ins = await pool.query(
    `INSERT INTO payments (user_id, amount_cents, currency, vendor_id, description, stripe_payment_intent_id, status, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,'created',$7) RETURNING *`,
    [req.user.id, amount_cents, currency || 'USD', vendor_id || null, description || null, intentId, JSON.stringify(metadata || {})]
  );
  res.json({ success: true, payment: ins.rows[0], note: 'Stub PaymentIntent; install stripe SDK for live processing.' });
});

router.get('/payments', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]
  );
  res.json({ success: true, payments: rows });
});

// ── 3) Day-of staff management (substantive feature, MECHANICAL impl) ──────
// PRODUCT-DECISION: roles enum: 'coordinator','server','bartender','setup',
// 'security','dj','photographer','floral','other'. Status enum:
// 'scheduled','checked_in','no_show','done'.
router.post('/staff', auth, async (req, res) => {
  const { staff_name, role, contact, shift_start, shift_end, station, notes } = req.body || {};
  if (!staff_name || !role) return res.status(400).json({ error: 'staff_name and role required' });
  const allowed = ['coordinator','server','bartender','setup','security','dj','photographer','floral','other'];
  const r = allowed.includes(role) ? role : 'other';
  const ins = await pool.query(
    `INSERT INTO staff_assignments (user_id, staff_name, role, contact, shift_start, shift_end, station, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, staff_name, r, contact || null, shift_start || null, shift_end || null, station || null, notes || null]
  );
  res.json({ success: true, assignment: ins.rows[0] });
});

router.get('/staff', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM staff_assignments WHERE user_id = $1 ORDER BY shift_start NULLS LAST`, [req.user.id]
  );
  res.json({ success: true, assignments: rows });
});

router.post('/staff/:id/status', auth, async (req, res) => {
  const allowed = ['scheduled','checked_in','no_show','done'];
  const { status } = req.body || {};
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of: ${allowed.join(',')}` });
  const upd = await pool.query(
    `UPDATE staff_assignments SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
    [status, req.params.id, req.user.id]
  );
  if (upd.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
  res.json({ success: true, assignment: upd.rows[0] });
});

// ── 4) Marriage counseling referrals (NEEDS-PRODUCT-DECISION) ──────────────
// PRODUCT-DECISION: counseling is sensitive — system NEVER auto-contacts third
// parties. Endpoint records user-stated reason and surfaces a curated short
// list of self-directed national resources (no PHI shared). When
// COUNSELING_REFERRAL_PROVIDER is set, includes that provider's URL too.
router.post('/counseling/referral', auth, async (req, res) => {
  const { reason } = req.body || {};
  const baseProviders = [
    { name: 'AAMFT Therapist Locator', url: 'https://www.aamft.org/Directories/Find_a_Therapist.aspx' },
    { name: 'Psychology Today Couples Therapy Directory', url: 'https://www.psychologytoday.com/us/therapists/couples-counseling' },
    { name: '988 Suicide & Crisis Lifeline (US)', url: 'https://988lifeline.org/' }
  ];
  if (process.env.COUNSELING_REFERRAL_PROVIDER) {
    baseProviders.push({ name: process.env.COUNSELING_REFERRAL_PROVIDER, url: process.env.COUNSELING_REFERRAL_PROVIDER });
  }
  const ins = await pool.query(
    `INSERT INTO counseling_referrals (user_id, reason, provider_name, provider_url, status)
     VALUES ($1,$2,$3,$4,'suggested') RETURNING *`,
    [req.user.id, reason || null, baseProviders[0].name, baseProviders[0].url]
  );
  res.json({
    success: true,
    referral: ins.rows[0],
    suggested_resources: baseProviders,
    note: 'Self-directed referrals only; no third-party contact is initiated by this system.'
  });
});

router.get('/counseling/referrals', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM counseling_referrals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [req.user.id]
  );
  res.json({ success: true, referrals: rows });
});

module.exports = router;
