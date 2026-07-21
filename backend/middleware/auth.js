'use strict';
const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ error: 'bearer token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded.id || !decoded.tenantId || !decoded.role || !Array.isArray(decoded.subjectIds)) {
      return res.status(403).json({ error: 'signed actor, tenant, role, and subject claims required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
};
