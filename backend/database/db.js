const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Compute cross-platform database location with sensible defaults.
// Priority (highest -> lowest): 
//   1. DB_PATH env var (full path)
//   2. DB_DIR env var + DB_FILE (or wifi-mapper.db)
//   3. USE_SYSTEM_DB_PATH=true -> use OS app data folder
//   4. DEFAULT: local project database folder (backward compatible)
const envDbPath = process.env.DB_PATH;
const envDbDir = process.env.DB_DIR;
const envDbFile = process.env.DB_FILE || 'wifi-mapper.db';
const useSystemPath = process.env.USE_SYSTEM_DB_PATH === 'true';

let dbPath;

if (envDbPath) {
  // Explicit full path provided
  dbPath = envDbPath;
} else if (envDbDir) {
  // Custom directory + filename
  dbPath = path.join(envDbDir, envDbFile);
} else if (useSystemPath) {
  // Use OS-appropriate app data folder (opt-in via env var)
  const baseDir = process.platform === 'win32' 
    ? (process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'))
    : process.platform === 'darwin' 
    ? path.join(os.homedir(), 'Library', 'Application Support')
    : path.join(os.homedir(), '.local', 'share');

  const dbFolder = path.join(baseDir, 'wifi-mapper');
  try {
    fs.mkdirSync(dbFolder, { recursive: true });
  } catch (e) {
    // ignore if cannot create
  }
  dbPath = path.join(dbFolder, envDbFile);
} else {
  // DEFAULT: Use local project database folder (backward compatible)
  dbPath = path.join(__dirname, envDbFile);
}

// Ensure directory exists for dbPath
try {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
} catch (e) {
  // ignore - at worst the DB file will be created in current working dir
}

const db = new Database(dbPath);

// Sikrer at database er optimeret
db.pragma('journal_mode = WAL');

// Aktiver foreign key constraints (påkrævet for CASCADE DELETE)
db.pragma('foreign_keys = ON');

// Helper to ensure optional columns exist on a table (idempotent)
function ensureColumn(tableName, columnName, columnDefinition) {
  const infoStmt = db.prepare(`PRAGMA table_info(${tableName})`);
  const columns = infoStmt.all();
  const exists = columns.some(col => col.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

// Opret tabeller
const initDb = () => {
  // FLOOR_PLAN tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS FLOOR_PLAN (
      FloorPlanId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Building TEXT,
      Description TEXT,
      CreationDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      ImagePath TEXT,
      ImageOriginalName TEXT,
      ImageMimeType TEXT,
      ImageWidth REAL,
      ImageHeight REAL,
      ReferencePoints TEXT
    )
  `);

  // ROOM tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS ROOM (
      RoomId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      FloorPlanId INTEGER NOT NULL,
      FOREIGN KEY (FloorPlanId) REFERENCES FLOOR_PLAN(FloorPlanId) ON DELETE CASCADE
    )
  `);

  // MEASUREMENTPOINT tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS MEASUREMENTPOINT (
      MeasurementPointId INTEGER PRIMARY KEY AUTOINCREMENT,
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

  // ACCESS_POINT_READING tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS ACCESS_POINT_READING (
      AccessPointReadingId INTEGER PRIMARY KEY AUTOINCREMENT,
      Ssid TEXT,
      Bssid TEXT,
      Rssi REAL,
      Frequency REAL,
      Channel INTEGER,
      MeasurementPointId INTEGER NOT NULL,
      FOREIGN KEY (MeasurementPointId) REFERENCES MEASUREMENTPOINT(MeasurementPointId) ON DELETE CASCADE
    )
  `);

  // HEATMAP tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS HEATMAP (
      HeatmapId INTEGER PRIMARY KEY AUTOINCREMENT,
      GenerationDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      FloorPlanId INTEGER NOT NULL,
      FOREIGN KEY (FloorPlanId) REFERENCES FLOOR_PLAN(FloorPlanId) ON DELETE CASCADE
    )
  `);

  // Ensure extended metadata columns exist (added in schema overhaul)
  ensureColumn('FLOOR_PLAN', 'UpdatedAt', 'DATETIME');
  ensureColumn('FLOOR_PLAN', 'Building', 'TEXT');
  ensureColumn('FLOOR_PLAN', 'Description', 'TEXT');
  ensureColumn('FLOOR_PLAN', 'ImagePath', 'TEXT');
  ensureColumn('FLOOR_PLAN', 'ImageOriginalName', 'TEXT');
  ensureColumn('FLOOR_PLAN', 'ImageMimeType', 'TEXT');
  ensureColumn('FLOOR_PLAN', 'ImageWidth', 'REAL');
  ensureColumn('FLOOR_PLAN', 'ImageHeight', 'REAL');
  ensureColumn('FLOOR_PLAN', 'ReferencePoints', 'TEXT');

  console.log('Database initialiseret på:', dbPath);
};

// Database operationer
const projectDb = {
  // FLOOR_PLAN operationer
  createFloorPlan: (name, building = null, description = null) => {
    const stmt = db.prepare('INSERT INTO FLOOR_PLAN (Name, Building, Description) VALUES (?, ?, ?)');
    return stmt.run(name, building, description);
  },

  getAllFloorPlans: () => {
    return db.prepare('SELECT * FROM FLOOR_PLAN ORDER BY CreationDate DESC').all();
  },

  getFloorPlan: (id) => {
    return db.prepare('SELECT * FROM FLOOR_PLAN WHERE FloorPlanId = ?').get(id);
  },

  updateFloorPlan: (id, name) => {
    const stmt = db.prepare('UPDATE FLOOR_PLAN SET Name = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE FloorPlanId = ?');
    return stmt.run(name, id);
  },

  updateFloorPlanDetails: (id, updates = {}) => {
    const setClauses = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      if (updates.name === undefined || updates.name === null) {
        // Ignore nullish name updates to preserve NOT NULL constraint
      } else {
        setClauses.push('Name = ?');
        values.push(updates.name);
      }
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'building')) {
      setClauses.push('Building = ?');
      values.push(updates.building);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
      setClauses.push('Description = ?');
      values.push(updates.description);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'imagePath')) {
      setClauses.push('ImagePath = ?');
      values.push(updates.imagePath);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'imageOriginalName')) {
      setClauses.push('ImageOriginalName = ?');
      values.push(updates.imageOriginalName);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'imageMimeType')) {
      setClauses.push('ImageMimeType = ?');
      values.push(updates.imageMimeType);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'imageWidth')) {
      setClauses.push('ImageWidth = ?');
      values.push(updates.imageWidth);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'imageHeight')) {
      setClauses.push('ImageHeight = ?');
      values.push(updates.imageHeight);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'referencePoints')) {
      setClauses.push('ReferencePoints = ?');
      values.push(updates.referencePoints);
    }

    if (setClauses.length === 0) {
      return { changes: 0 };
    }

    setClauses.push('UpdatedAt = CURRENT_TIMESTAMP');
    const stmt = db.prepare(`UPDATE FLOOR_PLAN SET ${setClauses.join(', ')} WHERE FloorPlanId = ?`);
    values.push(id);
    return stmt.run(...values);
  },

  deleteFloorPlan: (id) => {
    const stmt = db.prepare('DELETE FROM FLOOR_PLAN WHERE FloorPlanId = ?');
    return stmt.run(id);
  },

  // ROOM operationer
  createRoom: (name, floorPlanId) => {
    const stmt = db.prepare('INSERT INTO ROOM (Name, FloorPlanId) VALUES (?, ?)');
    return stmt.run(name, floorPlanId);
  },

  getRoomsByFloorPlan: (floorPlanId) => {
    return db.prepare('SELECT * FROM ROOM WHERE FloorPlanId = ?').all(floorPlanId);
  },

  getRoom: (id) => {
    return db.prepare('SELECT * FROM ROOM WHERE RoomId = ?').get(id);
  },

  updateRoom: (id, name) => {
    const stmt = db.prepare('UPDATE ROOM SET Name = ? WHERE RoomId = ?');
    return stmt.run(name, id);
  },

  deleteRoom: (id) => {
    const stmt = db.prepare('DELETE FROM ROOM WHERE RoomId = ?');
    return stmt.run(id);
  },

  // MEASUREMENTPOINT operationer
  createMeasuringPoint: (name, x, y, floorPlanId, scanStatus = 'pending') => {
    const stmt = db.prepare('INSERT INTO MEASUREMENTPOINT (Name, X, Y, FloorPlanId, ScanStatus) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(name, x, y, floorPlanId, scanStatus);
  },

  getMeasuringPointsByFloorPlan: (floorPlanId) => {
    return db.prepare('SELECT * FROM MEASUREMENTPOINT WHERE FloorPlanId = ?').all(floorPlanId);
  },

  getMeasuringPoint: (id) => {
    return db.prepare('SELECT * FROM MEASUREMENTPOINT WHERE MeasurementPointId = ?').get(id);
  },

  getAllMeasuringPoints: () => {
    return db.prepare('SELECT * FROM MEASUREMENTPOINT ORDER BY CreatedAt DESC').all();
  },

  updateMeasuringPoint: (id, name, x, y, scanStatus) => {
    const stmt = db.prepare('UPDATE MEASUREMENTPOINT SET Name = ?, X = ?, Y = ?, ScanStatus = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE MeasurementPointId = ?');
    return stmt.run(name, x, y, scanStatus, id);
  },

  updateMeasuringPointStatus: (id, scanStatus) => {
    const stmt = db.prepare('UPDATE MEASUREMENTPOINT SET ScanStatus = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE MeasurementPointId = ?');
    return stmt.run(scanStatus, id);
  },

  deleteMeasuringPoint: (id) => {
    const stmt = db.prepare('DELETE FROM MEASUREMENTPOINT WHERE MeasurementPointId = ?');
    return stmt.run(id);
  },

  // ACCESS_POINT_READING operationer
  createAccessPointReading: (ssid, bssid, rssi, frequency, channel, measuringPointId) => {
    const stmt = db.prepare('INSERT INTO ACCESS_POINT_READING (Ssid, Bssid, Rssi, Frequency, Channel, MeasurementPointId) VALUES (?, ?, ?, ?, ?, ?)');
    return stmt.run(ssid, bssid, rssi, frequency, channel, measuringPointId);
  },

  getAccessPointReadingsByMeasuringPoint: (measuringPointId) => {
    return db.prepare('SELECT * FROM ACCESS_POINT_READING WHERE MeasurementPointId = ?').all(measuringPointId);
  },

  getAccessPointReading: (id) => {
    return db.prepare('SELECT * FROM ACCESS_POINT_READING WHERE AccessPointReadingId = ?').get(id);
  },

  deleteAccessPointReading: (id) => {
    const stmt = db.prepare('DELETE FROM ACCESS_POINT_READING WHERE AccessPointReadingId = ?');
    return stmt.run(id);
  },

  deleteAccessPointReadingsByMeasuringPoint: (measuringPointId) => {
    const stmt = db.prepare('DELETE FROM ACCESS_POINT_READING WHERE MeasurementPointId = ?');
    return stmt.run(measuringPointId);
  },

  // HEATMAP operationer
  createHeatmap: (floorPlanId) => {
    const stmt = db.prepare('INSERT INTO HEATMAP (FloorPlanId) VALUES (?)');
    return stmt.run(floorPlanId);
  },

  getHeatmapsByFloorPlan: (floorPlanId) => {
    return db.prepare('SELECT * FROM HEATMAP WHERE FloorPlanId = ? ORDER BY GenerationDate DESC').all(floorPlanId);
  },

  getHeatmap: (id) => {
    return db.prepare('SELECT * FROM HEATMAP WHERE HeatmapId = ?').get(id);
  },

  deleteHeatmap: (id) => {
    const stmt = db.prepare('DELETE FROM HEATMAP WHERE HeatmapId = ?');
    return stmt.run(id);
  }
};

module.exports = { initDb, projectDb, db, dbPath };