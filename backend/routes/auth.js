const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ error: 'name, email, and a password of at least 12 characters are required' });
    }
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );
    const token = jwt.sign({ id: String(result.rows[0].id), email, role: 'planner',
      tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`account:${result.rows[0].id}`] },
      process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });
    res.json({ user: result.rows[0], token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: String(user.id), email: user.email, role: user.role || 'planner',
      tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`account:${user.id}`] },
      process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role || 'planner' }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
