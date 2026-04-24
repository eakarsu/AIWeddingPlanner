const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guests WHERE user_id = $1 ORDER BY name ASC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, rsvp_status, meal_preference, plus_one, group_name, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO guests (user_id, name, email, phone, rsvp_status, meal_preference, plus_one, group_name, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.user.id, name, email, phone, rsvp_status || 'pending', meal_preference, plus_one || false, group_name, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, rsvp_status, meal_preference, plus_one, group_name, notes } = req.body;
    const result = await pool.query(
      'UPDATE guests SET name=$1, email=$2, phone=$3, rsvp_status=$4, meal_preference=$5, plus_one=$6, group_name=$7, notes=$8 WHERE id=$9 AND user_id=$10 RETURNING *',
      [name, email, phone, rsvp_status, meal_preference, plus_one, group_name, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM guests WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
