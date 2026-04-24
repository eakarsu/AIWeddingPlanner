const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM wedding_profile WHERE user_id = $1', [req.user.id]);
    res.json(result.rows.length > 0 ? result.rows[0] : {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', auth, async (req, res) => {
  try {
    const { partner1_name, partner2_name, wedding_date, venue_name, wedding_style, color_palette, total_budget, guest_count_target, ceremony_time, reception_time, website_url, hashtag, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO wedding_profile (user_id, partner1_name, partner2_name, wedding_date, venue_name, wedding_style, color_palette, total_budget, guest_count_target, ceremony_time, reception_time, website_url, hashtag, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT(user_id) DO UPDATE SET partner1_name=$2, partner2_name=$3, wedding_date=$4, venue_name=$5, wedding_style=$6, color_palette=$7, total_budget=$8, guest_count_target=$9, ceremony_time=$10, reception_time=$11, website_url=$12, hashtag=$13, notes=$14
       RETURNING *`,
      [req.user.id, partner1_name, partner2_name, wedding_date, venue_name, wedding_style, color_palette, total_budget, guest_count_target, ceremony_time, reception_time, website_url, hashtag, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
