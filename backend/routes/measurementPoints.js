const express = require('express');
const dataStore = require('../services/dataStore');
const wifiScanner = require('../services/wifiScanner');

const router = express.Router();

// Create measurement point
router.post('/', async (req, res) => {
  const { x, y, name } = req.body || {};
  
  // Basic validation
  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'x and y numeric coordinates are required' });
  }

  try {
    console.log('[measurementPoints] Creating measurement point', { x, y, name });
    const mp = await dataStore.createMeasurementPoint(x, y, name);
    
    // Respond immediately (keeps latency < 500ms). Start scan in background.
    // Include a short statusMessage for debugging in dev UIs
    const resp = { ...mp, statusMessage: 'created, scan scheduled' };
    res.status(201).json(resp);

    // Fire-and-forget
    setImmediate(() => {
      wifiScanner.performWifiScan(mp.id).catch(err => {
        // performWifiScan handles error and updates status, but log unexpected
        console.error('Unexpected scan error for', mp.id, err);
      });
    });
  } catch (err) {
    console.error('Error creating measurement point:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a measurement point by id
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    console.log('[measurementPoints] GET /:id', id);
    const mp = await dataStore.getMeasurementPoint(id);
    if (!mp) return res.status(404).json({ error: 'not_found' });
    // Add a small status message to help debugging in frontend
    const resp = { ...mp, statusMessage: `scan_status=${mp.scan_status}` };
    res.json(resp);
  } catch (err) {
    console.error('Error getting measurement point:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all measurement points (lightweight)
router.get('/', async (req, res) => {
  try {
    console.log('[measurementPoints] GET / - list all');
    const list = await dataStore.getAllMeasurementPoints();
    // Do not change body shape (frontend expects an array). Add a header for debug info.
    res.set('X-Status-Message', `returned ${Array.isArray(list) ? list.length : 0} measurement points`);
    res.json(list);
  } catch (err) {
    console.error('Error getting measurement points list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
