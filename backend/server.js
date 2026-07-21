'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { generalLimiter, authLimiter, aiLimiter } = require('./middleware/rateLimiter');
const auth = require('./middleware/auth');
const governanceRouter = require('./governance');

for (const name of ['DATABASE_URL', 'GOVERNANCE_TENANT_ID']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;
const generatedRoutesEnabled = process.env.ENABLE_GENERATED_FEATURES === 'true' && process.env.NODE_ENV !== 'production';

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);

app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', generatedRoutesEnabled, timestamp: new Date().toISOString() });
});

app.use('/api', auth);
app.use('/api/governance', governanceRouter);

const operationalRoutes = [
  ['/api/vendors', './routes/vendors'], ['/api/budget', './routes/budget'],
  ['/api/timeline', './routes/timeline'], ['/api/seating', './routes/seating'],
  ['/api/guests', './routes/guests'], ['/api/venues', './routes/venues'],
  ['/api/menu', './routes/menu'], ['/api/invitations', './routes/invitations'],
  ['/api/registry', './routes/registry'], ['/api/photography', './routes/photography'],
  ['/api/music', './routes/music'], ['/api/florals', './routes/florals'],
  ['/api/transportation', './routes/transportation'], ['/api/accommodation', './routes/accommodation'],
  ['/api/profile', './routes/profile'], ['/api/notes', './routes/notes'],
  ['/api/dashboard', './routes/dashboard'], ['/api/rsvp', './routes/rsvp']
];
operationalRoutes.forEach(([mount, modulePath]) => app.use(mount, require(modulePath)));

if (generatedRoutesEnabled) {
  app.use('/api/ai', aiLimiter, require('./routes/ai'));
  app.use('/api/custom', require('./routes/customFeatures'));
  const customViewsRoutes = require('./routes/customViews');
  app.use('/api/custom-views', customViewsRoutes);
}

app.use((req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err.message);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
