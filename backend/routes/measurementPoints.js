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
    const mp = await dataStore.createMeasurementPoint(x, y, name);
    
    // Respond immediately (keeps latency < 500ms). Start scan in background.
    res.status(201).json(mp);

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
    const mp = await dataStore.getMeasurementPoint(id);
    if (!mp) return res.status(404).json({ error: 'not_found' });
    res.json(mp);
  } catch (err) {
    console.error('Error getting measurement point:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all measurement points (lightweight)
router.get('/', async (req, res) => {
  try {
    const list = await dataStore.getAllMeasurementPoints();
    res.json(list);
  } catch (err) {
    console.error('Error getting measurement points list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
