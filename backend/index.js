const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Import routes
const measurementPointsRouter = require('./routes/measurementPoints');

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount routes
app.use('/api/measurement-points', measurementPointsRouter);

// In production you might serve built frontend from backend/static
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on ${port}`));
