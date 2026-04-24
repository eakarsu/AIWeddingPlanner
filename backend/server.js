const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
