const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------------------------------------------------------------------------
// Authenticated routes – generate / list tokens for guests
// ---------------------------------------------------------------------------

// POST /api/rsvp/generate/:guestId – create a token for a guest
router.post('/generate/:guestId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { guestId } = req.params;
    const guest = await pool.query(
      'SELECT id, name, email FROM guests WHERE id=$1 AND user_id=$2',
      [guestId, userId]
    );
    if (guest.rows.length === 0) return res.status(404).json({ error: 'Guest not found' });

    // Re-use existing valid token if any
    const existing = await pool.query(
      `SELECT token FROM rsvp_tokens WHERE guest_id=$1 AND user_id=$2 AND used=false LIMIT 1`,
      [guestId, userId]
    );
    if (existing.rows.length > 0) {
      return res.json({ token: existing.rows[0].token, guest: guest.rows[0] });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 6);
    await pool.query(
      `INSERT INTO rsvp_tokens (user_id, guest_id, token, expires_at)
       VALUES ($1,$2,$3,$4)`,
      [userId, guestId, token, expires]
    );
    res.json({ token, guest: guest.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rsvp/generate-all – create tokens for every guest
router.post('/generate-all', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const guests = await pool.query('SELECT id FROM guests WHERE user_id=$1', [userId]);
    const created = [];
    for (const g of guests.rows) {
      const existing = await pool.query(
        'SELECT token FROM rsvp_tokens WHERE guest_id=$1 AND user_id=$2 AND used=false LIMIT 1',
        [g.id, userId]
      );
      if (existing.rows.length > 0) {
        created.push({ guestId: g.id, token: existing.rows[0].token, reused: true });
        continue;
      }
      const token = crypto.randomBytes(20).toString('hex');
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 6);
      await pool.query(
        'INSERT INTO rsvp_tokens (user_id, guest_id, token, expires_at) VALUES ($1,$2,$3,$4)',
        [userId, g.id, token, expires]
      );
      created.push({ guestId: g.id, token, reused: false });
    }
    res.json({ count: created.length, tokens: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rsvp/list – list every token + guest for the user
router.get('/list', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT t.token, t.used, t.expires_at, t.created_at,
              g.id as guest_id, g.name, g.email, g.rsvp_status, g.meal_preference, g.plus_one
         FROM rsvp_tokens t
         JOIN guests g ON g.id = t.guest_id
        WHERE t.user_id = $1
     ORDER BY g.name ASC`,
      [userId]
    );
    res.json({ tokens: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Public routes (no auth) – guests use these from the public microsite
// ---------------------------------------------------------------------------

// GET /api/rsvp/public/:token – fetch invitation details
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT t.token, t.used, t.expires_at,
              g.id as guest_id, g.name as guest_name, g.email, g.rsvp_status,
              g.meal_preference, g.plus_one, g.group_name, g.notes,
              p.partner1_name, p.partner2_name, p.wedding_date, p.venue_name,
              p.ceremony_time, p.reception_time, p.wedding_style, p.color_palette,
              p.hashtag, p.website_url
         FROM rsvp_tokens t
         JOIN guests g ON g.id = t.guest_id
    LEFT JOIN wedding_profile p ON p.user_id = t.user_id
        WHERE t.token = $1`,
      [token]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invalid invitation token' });
    const row = result.rows[0];
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invitation link has expired' });
    }
    res.json({ invitation: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rsvp/public/:token – submit/update the RSVP
router.post('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { rsvp_status, meal_preference, plus_one, plus_one_name, dietary_restrictions, message } = req.body;

    if (!['confirmed', 'declined', 'pending'].includes(rsvp_status)) {
      return res.status(400).json({ error: 'Invalid rsvp_status' });
    }

    const tokenRow = await pool.query(
      'SELECT user_id, guest_id, expires_at FROM rsvp_tokens WHERE token=$1',
      [token]
    );
    if (tokenRow.rows.length === 0) return res.status(404).json({ error: 'Invalid token' });
    const { guest_id, expires_at } = tokenRow.rows[0];
    if (expires_at && new Date(expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invitation has expired' });
    }

    const notesAddon = [
      plus_one_name ? `Plus-one name: ${plus_one_name}` : null,
      dietary_restrictions ? `Dietary: ${dietary_restrictions}` : null,
      message ? `Message: ${message}` : null,
    ].filter(Boolean).join(' | ');

    const updateSql = `
      UPDATE guests
         SET rsvp_status = $1,
             meal_preference = COALESCE($2, meal_preference),
             plus_one = COALESCE($3, plus_one),
             notes = CASE WHEN $4 <> '' THEN COALESCE(notes, '') || ' | ' || $4 ELSE notes END
       WHERE id = $5
   RETURNING id, name, rsvp_status, meal_preference, plus_one, notes`;

    const updated = await pool.query(updateSql, [
      rsvp_status,
      meal_preference || null,
      typeof plus_one === 'boolean' ? plus_one : null,
      notesAddon,
      guest_id,
    ]);

    await pool.query('UPDATE rsvp_tokens SET used=true WHERE token=$1', [token]);

    res.json({ message: 'RSVP recorded — thank you!', guest: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
