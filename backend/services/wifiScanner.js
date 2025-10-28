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
    // node-wifi's scan returns array of networks
    const networks = await new Promise((resolve, reject) => {
      wifi.scan((err, nets) => {
        if (err) return reject(err);
        resolve(nets || []);
      });
    });

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

    await dataStore.updateMeasurementPointStatus(measurementPointId, 'done', { readings });
  } catch (err) {
    const error = { message: err.message, code: err.code || 'SCAN_ERROR' };
    await dataStore.updateMeasurementPointStatus(measurementPointId, 'failed', { error });
  }
}

module.exports = {
  performWifiScan
};
