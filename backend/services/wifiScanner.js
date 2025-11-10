const wifi = require('node-wifi');
const dataStore = require('./dataStore');

// Initialize wifi scanner (iface: null -> pick system default)
wifi.init({ iface: null });

async function performWifiScan(measurementPointId) {
  const mp = await dataStore.getMeasurementPoint(measurementPointId);
  if (!mp) return;

  // Update status -> in_progress
  await dataStore.updateMeasurementPointStatus(measurementPointId, 'in_progress');

  try {
    console.log(`[wifiScanner] Starting scan for measurementPointId=${measurementPointId}`);
    // node-wifi's scan returns array of networks
    const networks = await new Promise((resolve, reject) => {
      wifi.scan((err, nets) => {
        if (err) return reject(err);
        resolve(nets || []);
      });
    });

    console.log(`[wifiScanner] Scan completed for ${measurementPointId}: found ${Array.isArray(networks) ? networks.length : 0} networks`);
    if (!Array.isArray(networks) || networks.length === 0) {
      console.warn(`[wifiScanner] No networks detected for ${measurementPointId}`);
    }

    // Map networks to the required fields
    const readings = (networks || []).map(n => ({
      ssid: n.ssid || null,
      bssid: n.bssid || n.mac || null,
      rssi: n.signal_level !== undefined ? n.signal_level : null,
      frequency: n.frequency || null,
      channel: n.channel || null,
      // keep raw object for debugging
      raw: n
    }));

    // Create individual measurement points for each detected network (so the UI
    // can show/filter each signal separately). We still update the original
    // measurement point with the aggregated readings.
    try {
      if (dataStore && typeof dataStore.createMeasurementPointsFromReadings === 'function') {
        await dataStore.createMeasurementPointsFromReadings(measurementPointId, readings);
      } else {
        console.warn('[wifiScanner] createMeasurementPointsFromReadings not available on dataStore - skipping child creation');
      }
    } catch (e) {
      console.error('Error creating measurement points from readings:', e);
    }

    await dataStore.updateMeasurementPointStatus(measurementPointId, 'done', { readings });
  } catch (err) {
    const error = { message: err.message, code: err.code || 'SCAN_ERROR' };
    await dataStore.updateMeasurementPointStatus(measurementPointId, 'failed', { error });
  }
}

module.exports = {
  performWifiScan
};
