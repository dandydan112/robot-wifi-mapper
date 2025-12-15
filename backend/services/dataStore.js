const { projectDb } = require('../database/db');

async function createMeasurementPoint(x, y, name, floorPlanId) {
  console.log('📍 createMeasurementPoint called:', { x, y, name, floorPlanId });
  
  if (!floorPlanId) {
    const error = new Error('floorPlanId is required');
    error.code = 'missing_floor_plan_id';
    throw error;
  }

  const floorPlan = projectDb.getFloorPlan(floorPlanId);
  if (!floorPlan) {
    const error = new Error(`Floor plan ${floorPlanId} not found`);
    error.code = 'floor_plan_not_found';
    throw error;
  }

  const result = projectDb.createMeasuringPoint(name, x, y, floorPlanId, 'pending');
  console.log('✅ Measurement point created, ID:', result.lastInsertRowid);
  
  const mpId = result.lastInsertRowid;
  const created = projectDb.getMeasuringPoint(mpId);

  const mp = {
    id: mpId.toString(),
    name: created?.Name || name || null,
    x: created?.X ?? x,
    y: created?.Y ?? y,
    scan_status: created?.ScanStatus || 'pending',
    floorPlanId,
    createdAt: created?.CreatedAt || new Date().toISOString(),
    updatedAt: created?.UpdatedAt || new Date().toISOString(),
    readings: []
  };
  return mp;
}

async function getMeasurementPoint(id) {
  const mp = projectDb.getMeasuringPoint(id);
  if (!mp) return null;
  
  const readings = projectDb.getAccessPointReadingsByMeasuringPoint(id);
  
  return {
    id: mp.MeasurementPointId.toString(),
    name: mp.Name,
    x: mp.X,
    y: mp.Y,
    scan_status: mp.ScanStatus,
    floorPlanId: mp.FloorPlanId,
    createdAt: mp.CreatedAt,
    updatedAt: mp.UpdatedAt,
    readings: readings.map(r => ({
      id: r.AccessPointReadingId,
      ssid: r.Ssid,
      bssid: r.Bssid,
      rssi: r.Rssi,
      frequency: r.Frequency,
      channel: r.Channel
    }))
  };
}

async function getAllMeasurementPoints(filters = {}) {
  const { floorPlanId } = filters;
  console.log('🔍 getAllMeasurementPoints called:', { floorPlanId });
  
  const mps = floorPlanId
    ? projectDb.getMeasuringPointsByFloorPlan(floorPlanId)
    : projectDb.getAllMeasuringPoints();
  
  console.log(`📊 Found ${mps.length} measurement points`);
  
  return mps.map(mp => {
    const readings = projectDb.getAccessPointReadingsByMeasuringPoint(mp.MeasurementPointId);
    
    return {
      id: mp.MeasurementPointId.toString(),
      name: mp.Name,
      x: mp.X,
      y: mp.Y,
      scan_status: mp.ScanStatus,
      floorPlanId: mp.FloorPlanId,
      parentId: null,
      readings: readings.map(r => ({
        id: r.AccessPointReadingId,
        ssid: r.Ssid || null,
        bssid: r.Bssid || null,
        rssi: r.Rssi || null,
        frequency: r.Frequency || null,
        channel: r.Channel || null
      })),
      createdAt: mp.CreatedAt,
      updatedAt: mp.UpdatedAt
    };
  });
}

async function updateMeasurementPointStatus(id, status, additionalData = {}) {
  const result = projectDb.updateMeasuringPointStatus(id, status);
  if (result.changes === 0) return null;
  
  // Handle additional data like readings
  if (additionalData.readings && Array.isArray(additionalData.readings)) {
    // Delete old readings and insert new ones
    projectDb.deleteAccessPointReadingsByMeasuringPoint(id);
    
    for (const reading of additionalData.readings) {
      projectDb.createAccessPointReading(
        reading.ssid || null,
        reading.bssid || reading.mac || null,
        reading.rssi || reading.signal_level || null,
        reading.frequency || null,
        reading.channel || null,
        id
      );
    }
  }
  
  return await getMeasurementPoint(id);
}

async function createMeasurementPointsFromReadings(originalId, readings) {
  const orig = await getMeasurementPoint(originalId);
  if (!orig) return [];

  // Deduplicate by BSSID when available, otherwise by SSID
  const seen = new Set();
  const newPoints = [];

  for (let i = 0; i < (readings || []).length; i++) {
    const r = readings[i];
    // Use BSSID if available. If not, use SSID. 
    // If SSID is '<redacted>' (macOS privacy), treat as unique by appending index to avoid deduplicating them all away.
    let key = r.bssid || r.ssid || `index-${i}`;
    if (key === '<redacted>') {
      key = `redacted-${i}`;
    }

    if (seen.has(key)) continue;
    seen.add(key);

    const nameParts = [];
    if (orig.name) nameParts.push(orig.name);
    if (r.ssid) nameParts.push(r.ssid);
    const name = nameParts.length ? nameParts.join(' - ') : `Point-${Date.now()}`;

    // Create measuring point
    const result = projectDb.createMeasuringPoint(name, orig.x, orig.y, orig.floorPlanId, 'done');
    const newId = result.lastInsertRowid;
    
    // Create access point reading
    projectDb.createAccessPointReading(
      r.ssid || null,
      r.bssid || null,
      r.rssi || null,
      r.frequency || null,
      r.channel || null,
      newId
    );

    const mp = {
      id: newId.toString(),
      name,
      x: orig.x,
      y: orig.y,
      scan_status: 'done',
      floorPlanId: orig.floorPlanId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readings: [r],
      parentId: originalId
    };

    newPoints.push(mp);
  }

  return newPoints;
}

async function deleteMeasurementPoint(id) {
  console.log('🗑️ deleteMeasurementPoint called:', id);
  
  // First check if exists
  const mp = projectDb.getMeasuringPoint(id);
  if (!mp) {
    const error = new Error(`Measurement point ${id} not found`);
    error.code = 'not_found';
    throw error;
  }
  
  // Delete all access point readings first
  console.log('  Deleting access point readings...');
  projectDb.deleteAccessPointReadingsByMeasuringPoint(id);
  
  // Then delete the measurement point
  console.log('  Deleting measurement point...');
  const result = projectDb.deleteMeasuringPoint(id);
  
  console.log('✅ Measurement point deleted:', id, 'Changes:', result.changes);
  
  return { 
    success: true, 
    id, 
    deletedReadings: result.changes 
  };
}

module.exports = {
  createMeasurementPoint,
  getMeasurementPoint,
  getAllMeasurementPoints,
  updateMeasurementPointStatus,
  createMeasurementPointsFromReadings,
  deleteMeasurementPoint
};

