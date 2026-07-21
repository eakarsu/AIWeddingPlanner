'use strict';
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { createRouter } = require('./router');
const { postgres } = require('./store');
const { evaluate } = require('./domain');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function auth(req, res, next) {
  const secret = process.env.JWT_SECRET || '';
  const token = req.headers.authorization && req.headers.authorization.match(/^Bearer (.+)$/)?.[1];
  if (secret.length < 32) return res.status(503).json({ error: 'secure JWT configuration required' });
  if (!token) return res.status(401).json({ error: 'bearer token required' });
  try { req.user = jwt.verify(token, secret, { algorithms: ['HS256'] }); }
  catch (_) { return res.status(401).json({ error: 'invalid token' }); }
  next();
}

module.exports = createRouter({
  db: postgres(pool),
  auth,
  evaluate,
  workflow: 'wedding-service-fulfillment',
  providers: ["payment","tax","inventory","scheduling","messaging","accounting","delivery","vendor-portal","venue-system","webhook"],
  approverRoles: ["staff_reviewer","finance_reviewer","service_reviewer","admin"]
});
