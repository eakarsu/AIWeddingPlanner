const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const { generalLimiter, authLimiter, aiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

// Rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/ai', aiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/timeline', require('./routes/timeline'));
app.use('/api/seating', require('./routes/seating'));
app.use('/api/guests', require('./routes/guests'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/registry', require('./routes/registry'));
app.use('/api/photography', require('./routes/photography'));
app.use('/api/music', require('./routes/music'));
app.use('/api/florals', require('./routes/florals'));
app.use('/api/transportation', require('./routes/transportation'));
app.use('/api/accommodation', require('./routes/accommodation'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/rsvp', require('./routes/rsvp'));
app.use('/api/website', require('./routes/website'));
app.use('/api/ext', require('./routes/extensions')); // Apply pass 5 backlog: vendor reviews, payments, staff, counseling
app.use('/api/custom', require('./routes/customFeatures'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Something went wrong',
  });
});

// // === Batch 09 Gaps & Frontend Mounts ===
app.use('/api/gap-nonai-aiweddingplanner', require('./routes/batch09GapNonai')); // // === Batch 09 Gaps & Frontend Mounts ===

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

