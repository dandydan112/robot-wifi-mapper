const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

async function loadData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { measurementPoints: {} };
  }
}

async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function generateId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

async function createMeasurementPoint(x, y, name) {
  const data = await loadData();
  const id = generateId();
  const mp = {
    id,
    name: name || null,
    x,
    y,
    scan_status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readings: []
  };
  data.measurementPoints[id] = mp;
  await saveData(data);
  return mp;
}

async function getMeasurementPoint(id) {
  const data = await loadData();
  return data.measurementPoints[id];
}

async function getAllMeasurementPoints() {
  const data = await loadData();
  // Return a lightweight listing but include parentId and a small readings preview
  return Object.values(data.measurementPoints || {}).map(mp => ({
    id: mp.id,
    name: mp.name,
    x: mp.x,
    y: mp.y,
    scan_status: mp.scan_status,
    parentId: mp.parentId || null,
      // Keep backward compatibility: include a `readings` array (first reading only)
      readings: Array.isArray(mp.readings) && mp.readings[0] ? [
        {
          ssid: mp.readings[0].ssid || null,
          bssid: mp.readings[0].bssid || mp.readings[0].mac || null,
          rssi: mp.readings[0].rssi || mp.readings[0].signal_level || null,
          frequency: mp.readings[0].frequency || null,
          channel: mp.readings[0].channel || null
        }
      ] : [],
    createdAt: mp.createdAt,
    updatedAt: mp.updatedAt
  }));
}

async function updateMeasurementPointStatus(id, status, additionalData = {}) {
  const data = await loadData();
  const mp = data.measurementPoints[id];
  if (!mp) return null;
  
  mp.scan_status = status;
  mp.updatedAt = new Date().toISOString();
  Object.assign(mp, additionalData);
  
  await saveData(data);
  return mp;
}

async function createMeasurementPointsFromReadings(originalId, readings) {
  const data = await loadData();
  const orig = data.measurementPoints[originalId];
  if (!orig) return [];

  // Deduplicate by BSSID when available, otherwise by SSID
  const seen = new Set();
  const newPoints = [];

  for (let i = 0; i < (readings || []).length; i++) {
    const r = readings[i];
    const key = r.bssid || r.ssid || `index-${i}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const id = generateId();
    const nameParts = [];
    if (orig.name) nameParts.push(orig.name);
    if (r.ssid) nameParts.push(r.ssid);
    const name = nameParts.length ? nameParts.join(' - ') : id;

    const mp = {
      id,
      name,
      x: orig.x,
      y: orig.y,
      scan_status: 'done',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readings: [r],
      parentId: originalId
    };

    data.measurementPoints[id] = mp;
    newPoints.push(mp);
  }

  await saveData(data);
  return newPoints;
}

module.exports = {
  createMeasurementPoint,
  getMeasurementPoint,
  getAllMeasurementPoints,
  updateMeasurementPointStatus,
  createMeasurementPointsFromReadings
};
