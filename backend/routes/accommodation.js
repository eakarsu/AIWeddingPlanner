const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accommodation WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accommodation WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { hotel_name, address, room_type, price_per_night, nights, guests_count, check_in, check_out, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO accommodation (user_id, hotel_name, address, room_type, price_per_night, nights, guests_count, check_in, check_out, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [req.user.id, hotel_name, address, room_type, price_per_night, nights, guests_count, check_in, check_out, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { hotel_name, address, room_type, price_per_night, nights, guests_count, check_in, check_out, notes } = req.body;
    const result = await pool.query(
      'UPDATE accommodation SET hotel_name=$1, address=$2, room_type=$3, price_per_night=$4, nights=$5, guests_count=$6, check_in=$7, check_out=$8, notes=$9 WHERE id=$10 AND user_id=$11 RETURNING *',
      [hotel_name, address, room_type, price_per_night, nights, guests_count, check_in, check_out, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM accommodation WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
