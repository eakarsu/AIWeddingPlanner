const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transportation WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transportation WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { vehicle_type, company, capacity, price, pickup_time, pickup_location, dropoff_location, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO transportation (user_id, vehicle_type, company, capacity, price, pickup_time, pickup_location, dropoff_location, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.user.id, vehicle_type, company, capacity, price, pickup_time, pickup_location, dropoff_location, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { vehicle_type, company, capacity, price, pickup_time, pickup_location, dropoff_location, notes } = req.body;
    const result = await pool.query(
      'UPDATE transportation SET vehicle_type=$1, company=$2, capacity=$3, price=$4, pickup_time=$5, pickup_location=$6, dropoff_location=$7, notes=$8 WHERE id=$9 AND user_id=$10 RETURNING *',
      [vehicle_type, company, capacity, price, pickup_time, pickup_location, dropoff_location, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM transportation WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
