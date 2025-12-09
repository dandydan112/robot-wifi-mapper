const Database = require('better-sqlite3');
const path = require('path');

// Connect to the existing database
const dbPath = path.join(__dirname, 'wifi-mapper.db');
const db = new Database(dbPath);

console.log('Starting database migration to new schema...');
console.log('Database path:', dbPath);

// Enable foreign keys
db.pragma('foreign_keys = OFF'); // Temporarily disable for migration

try {
  // Begin transaction
  db.exec('BEGIN TRANSACTION');

  console.log('\n1. Backing up old ACCESS_POINT data...');
  const oldAccessPoints = db.prepare('SELECT * FROM ACCESS_POINT').all();
  console.log(`   Found ${oldAccessPoints.length} ACCESS_POINT records`);

  console.log('\n2. Backing up old MEASURINGPOINT data...');
  const oldMeasuringPoints = db.prepare('SELECT * FROM MEASURINGPOINT').all();
  console.log(`   Found ${oldMeasuringPoints.length} MEASURINGPOINT records`);

  console.log('\n3. Dropping old tables...');
  db.exec('DROP TABLE IF EXISTS MEASURINGPOINT');
  db.exec('DROP TABLE IF EXISTS ACCESS_POINT');
  console.log('   Old tables dropped');

  console.log('\n4. Creating new MEASURINGPOINT table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS MEASURINGPOINT (
      MeasuringpointId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT,
      X REAL NOT NULL,
      Y REAL NOT NULL,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      ScanStatus TEXT DEFAULT 'pending',
      FloorPlanId INTEGER NOT NULL,
      FOREIGN KEY (FloorPlanId) REFERENCES FLOOR_PLAN(FloorPlanId) ON DELETE CASCADE
    )
  `);
  console.log('   MEASURINGPOINT table created');

  console.log('\n5. Creating new ACCESS_POINT_READING table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS ACCESS_POINT_READING (
      AccessPointReadingId INTEGER PRIMARY KEY AUTOINCREMENT,
      Ssid TEXT,
      Bssid TEXT,
      Rssi REAL,
      Frequency REAL,
      Channel INTEGER,
      MeasuringPointId INTEGER NOT NULL,
      FOREIGN KEY (MeasuringPointId) REFERENCES MEASURINGPOINT(MeasuringpointId) ON DELETE CASCADE
    )
  `);
  console.log('   ACCESS_POINT_READING table created');

  console.log('\n6. Migrating data to new schema...');
  
  // Create a default floor plan if none exists
  const floorPlans = db.prepare('SELECT * FROM FLOOR_PLAN').all();
  let defaultFloorPlanId;
  
  if (floorPlans.length === 0) {
    console.log('   Creating default floor plan...');
    const result = db.prepare('INSERT INTO FLOOR_PLAN (Name) VALUES (?)').run('Migrated Floor Plan');
    defaultFloorPlanId = result.lastInsertRowid;
  } else {
    defaultFloorPlanId = floorPlans[0].FloorPlanId;
    console.log(`   Using existing floor plan ID: ${defaultFloorPlanId}`);
  }

  // Migrate old data to new structure
  // Strategy: Each old MEASURINGPOINT becomes a new MEASURINGPOINT with an ACCESS_POINT_READING
  const insertMeasuringPoint = db.prepare(`
    INSERT INTO MEASURINGPOINT (Name, X, Y, ScanStatus, FloorPlanId, CreatedAt, UpdatedAt)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const insertReading = db.prepare(`
    INSERT INTO ACCESS_POINT_READING (Ssid, Bssid, Rssi, Frequency, Channel, MeasuringPointId)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let migratedCount = 0;
  for (const oldPoint of oldMeasuringPoints) {
    // Find the corresponding ACCESS_POINT
    const accessPoint = oldAccessPoints.find(ap => ap.AccessPointId === oldPoint.AccessPointId);
    
    if (!accessPoint) {
      console.warn(`   Warning: No ACCESS_POINT found for MEASURINGPOINT ${oldPoint.MeasuringpointId}`);
      continue;
    }

    // Use Position as both X and Y (or derive from Location if available)
    const x = oldPoint.Position || 0;
    const y = accessPoint.Location || 0;
    
    // Create name from AccessPoint InternetName
    const name = accessPoint.InternetName || `Point ${oldPoint.MeasuringpointId}`;

    // Insert new measuring point
    const result = insertMeasuringPoint.run(
      name,
      x,
      y,
      'done', // Assume old data is already scanned
      accessPoint.FloorPlanId || defaultFloorPlanId
    );

    const newMeasuringPointId = result.lastInsertRowid;

    // Insert reading with data from both old tables
    insertReading.run(
      accessPoint.InternetName,           // Ssid
      accessPoint.MACAdress,              // Bssid
      oldPoint.SignalStrength,            // Rssi
      accessPoint.FrequencyBand ? parseFloat(accessPoint.FrequencyBand) : null, // Frequency
      null,                               // Channel (not in old schema)
      newMeasuringPointId
    );

    migratedCount++;
  }

  console.log(`   Migrated ${migratedCount} measuring points with readings`);

  // Commit transaction
  db.exec('COMMIT');
  console.log('\n✅ Migration completed successfully!');
  
  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');

  // Show final counts
  console.log('\n📊 Final database state:');
  const finalCounts = {
    floorPlans: db.prepare('SELECT COUNT(*) as count FROM FLOOR_PLAN').get().count,
    rooms: db.prepare('SELECT COUNT(*) as count FROM ROOM').get().count,
    measuringPoints: db.prepare('SELECT COUNT(*) as count FROM MEASURINGPOINT').get().count,
    readings: db.prepare('SELECT COUNT(*) as count FROM ACCESS_POINT_READING').get().count,
    heatmaps: db.prepare('SELECT COUNT(*) as count FROM HEATMAP').get().count
  };
  
  console.log(`   Floor Plans: ${finalCounts.floorPlans}`);
  console.log(`   Rooms: ${finalCounts.rooms}`);
  console.log(`   Measuring Points: ${finalCounts.measuringPoints}`);
  console.log(`   Access Point Readings: ${finalCounts.readings}`);
  console.log(`   Heatmaps: ${finalCounts.heatmaps}`);

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  db.exec('ROLLBACK');
  db.pragma('foreign_keys = ON');
  process.exit(1);
}

db.close();
console.log('\n✨ Database migration complete and connection closed.\n');
