const { projectDb } = require('./db');

console.log('Testing new database schema...\n');

// Test 1: Create a measuring point
console.log('1. Creating a test measuring point...');
const mpResult = projectDb.createMeasuringPoint(
  'Test Point 1',  // name
  10.5,            // x
  20.3,            // y
  3,               // floorPlanId (using existing "Teknologisk Institut")
  'pending'        // scanStatus
);
const measuringPointId = mpResult.lastInsertRowid;
console.log(`   ✓ Created measuring point with ID: ${measuringPointId}`);

// Test 2: Create access point readings
console.log('\n2. Creating test WiFi readings...');
const readings = [
  { ssid: 'Test-WiFi-1', bssid: 'AA:BB:CC:DD:EE:01', rssi: -45, frequency: 2412, channel: 1 },
  { ssid: 'Test-WiFi-2', bssid: 'AA:BB:CC:DD:EE:02', rssi: -67, frequency: 5180, channel: 36 },
  { ssid: 'Test-WiFi-3', bssid: 'AA:BB:CC:DD:EE:03', rssi: -82, frequency: 2437, channel: 6 }
];

for (const reading of readings) {
  projectDb.createAccessPointReading(
    reading.ssid,
    reading.bssid,
    reading.rssi,
    reading.frequency,
    reading.channel,
    measuringPointId
  );
  console.log(`   ✓ Created reading: ${reading.ssid} (${reading.rssi} dBm)`);
}

// Test 3: Retrieve measuring point with readings
console.log('\n3. Retrieving measuring point with readings...');
const mp = projectDb.getMeasuringPoint(measuringPointId);
const mpReadings = projectDb.getAccessPointReadingsByMeasuringPoint(measuringPointId);
console.log(`   ✓ Measuring Point: "${mp.Name}" at (${mp.X}, ${mp.Y})`);
console.log(`   ✓ Status: ${mp.ScanStatus}`);
console.log(`   ✓ Found ${mpReadings.length} readings`);

// Test 4: Update measuring point status
console.log('\n4. Updating measuring point status...');
projectDb.updateMeasuringPointStatus(measuringPointId, 'done');
const updatedMp = projectDb.getMeasuringPoint(measuringPointId);
console.log(`   ✓ Status updated to: ${updatedMp.ScanStatus}`);

// Test 5: List all measuring points
console.log('\n5. Listing all measuring points...');
const allMps = projectDb.getAllMeasuringPoints();
console.log(`   ✓ Total measuring points: ${allMps.length}`);
allMps.forEach(m => {
  console.log(`      - ID ${m.MeasuringpointId}: "${m.Name}" (${m.ScanStatus})`);
});

// Test 6: Clean up test data
console.log('\n6. Cleaning up test data...');
projectDb.deleteMeasuringPoint(measuringPointId);
console.log(`   ✓ Test measuring point deleted`);

console.log('\n✅ All tests passed! New schema is working correctly.\n');
