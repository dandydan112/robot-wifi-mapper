const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Example API endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// In production you might serve built frontend from backend/static
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on ${port}`));
