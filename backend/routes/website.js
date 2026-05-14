const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Ensure website table exists
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wedding_websites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      slug VARCHAR(100) UNIQUE,
      theme VARCHAR(50) DEFAULT 'classic',
      hero_title TEXT,
      hero_subtitle TEXT,
      story TEXT,
      schedule TEXT,
      registry_blurb TEXT,
      travel_info TEXT,
      faq TEXT,
      published BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
ensureTables().catch(console.error);

function slugify(s) {
  return (s || 'wedding')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// GET /api/website  – fetch this user's website
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM wedding_websites WHERE user_id=$1', [req.user.id]);
    res.json(result.rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/website  – upsert content
router.put('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      slug, theme, hero_title, hero_subtitle, story,
      schedule, registry_blurb, travel_info, faq, published,
    } = req.body;

    let finalSlug = slug && slugify(slug);
    if (!finalSlug) {
      const profile = await pool.query(
        'SELECT partner1_name, partner2_name FROM wedding_profile WHERE user_id=$1', [userId]
      );
      const p = profile.rows[0] || {};
      finalSlug = slugify(`${p.partner1_name || 'partner1'}-${p.partner2_name || 'partner2'}`) || `wedding-${userId}`;
    }

    // Ensure slug is unique
    let attempt = finalSlug, n = 1;
    while (true) {
      const conflict = await pool.query('SELECT user_id FROM wedding_websites WHERE slug=$1 AND user_id<>$2', [attempt, userId]);
      if (conflict.rows.length === 0) break;
      n++;
      attempt = `${finalSlug}-${n}`;
    }
    finalSlug = attempt;

    const result = await pool.query(
      `INSERT INTO wedding_websites (user_id, slug, theme, hero_title, hero_subtitle, story, schedule, registry_blurb, travel_info, faq, published, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         slug=$2, theme=$3, hero_title=$4, hero_subtitle=$5, story=$6,
         schedule=$7, registry_blurb=$8, travel_info=$9, faq=$10, published=$11, updated_at=NOW()
       RETURNING *`,
      [userId, finalSlug, theme || 'classic', hero_title, hero_subtitle, story, schedule, registry_blurb, travel_info, faq, !!published]
    );
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// PUBLIC: GET /api/website/public/:slug  – render data
router.get('/public/:slug', async (req, res) => {
  try {
    const ws = await pool.query('SELECT * FROM wedding_websites WHERE slug=$1 AND published=true', [req.params.slug]);
    if (ws.rows.length === 0) return res.status(404).json({ error: 'Website not found or not published' });
    const site = ws.rows[0];
    const [profileRows, registryRows, timelineRows] = await Promise.all([
      pool.query('SELECT partner1_name, partner2_name, wedding_date, venue_name, ceremony_time, reception_time, hashtag, color_palette, wedding_style FROM wedding_profile WHERE user_id=$1', [site.user_id]),
      pool.query('SELECT item_name, category, price, store, url FROM registry_items WHERE user_id=$1 AND COALESCE(purchased,false)=false ORDER BY price DESC LIMIT 12', [site.user_id]),
      pool.query("SELECT title, due_date, category FROM timeline_items WHERE user_id=$1 AND completed=false AND due_date IS NOT NULL ORDER BY due_date ASC LIMIT 8", [site.user_id]),
    ]);
    res.json({
      site,
      profile: profileRows.rows[0] || {},
      registry: registryRows.rows,
      schedule: timelineRows.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
