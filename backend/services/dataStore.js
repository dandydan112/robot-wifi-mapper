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
  return Object.values(data.measurementPoints || {}).map(mp => ({
    id: mp.id,
    name: mp.name,
    x: mp.x,
    y: mp.y,
    scan_status: mp.scan_status,
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

module.exports = {
  createMeasurementPoint,
  getMeasurementPoint,
  getAllMeasurementPoints,
  updateMeasurementPointStatus
};
