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

// Opret tabeller
const initDb = () => {
  // FLOOR_PLAN tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS FLOOR_PLAN (
      FloorPlanId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      CreationDate DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // ACCESS_POINT tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS ACCESS_POINT (
      AccessPointId INTEGER PRIMARY KEY AUTOINCREMENT,
      InternetName TEXT NOT NULL,
      Location REAL,
      FrequencyBand TEXT,
      MACAdress TEXT,
      FloorPlanId INTEGER NOT NULL,
      FOREIGN KEY (FloorPlanId) REFERENCES FLOOR_PLAN(FloorPlanId) ON DELETE CASCADE
    )
  `);

  // MEASURINGPOINT tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS MEASURINGPOINT (
      MeasuringpointId INTEGER PRIMARY KEY AUTOINCREMENT,
      Position REAL NOT NULL,
      SignalStrength REAL NOT NULL,
      AccessPointId INTEGER NOT NULL,
      FOREIGN KEY (AccessPointId) REFERENCES ACCESS_POINT(AccessPointId) ON DELETE CASCADE
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

  console.log('Database initialiseret på:', dbPath);
};

// Database operationer
const projectDb = {
  // FLOOR_PLAN operationer
  createFloorPlan: (name) => {
    const stmt = db.prepare('INSERT INTO FLOOR_PLAN (Name) VALUES (?)');
    return stmt.run(name);
  },

  getAllFloorPlans: () => {
    return db.prepare('SELECT * FROM FLOOR_PLAN ORDER BY CreationDate DESC').all();
  },

  getFloorPlan: (id) => {
    return db.prepare('SELECT * FROM FLOOR_PLAN WHERE FloorPlanId = ?').get(id);
  },

  updateFloorPlan: (id, name) => {
    const stmt = db.prepare('UPDATE FLOOR_PLAN SET Name = ? WHERE FloorPlanId = ?');
    return stmt.run(name, id);
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

  // ACCESS_POINT operationer
  createAccessPoint: (internetName, location, frequencyBand, macAdress, floorPlanId) => {
    const stmt = db.prepare('INSERT INTO ACCESS_POINT (InternetName, Location, FrequencyBand, MACAdress, FloorPlanId) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(internetName, location, frequencyBand, macAdress, floorPlanId);
  },

  getAccessPointsByFloorPlan: (floorPlanId) => {
    return db.prepare('SELECT * FROM ACCESS_POINT WHERE FloorPlanId = ?').all(floorPlanId);
  },

  getAccessPoint: (id) => {
    return db.prepare('SELECT * FROM ACCESS_POINT WHERE AccessPointId = ?').get(id);
  },

  updateAccessPoint: (id, internetName, location, frequencyBand, macAdress) => {
    const stmt = db.prepare('UPDATE ACCESS_POINT SET InternetName = ?, Location = ?, FrequencyBand = ?, MACAdress = ? WHERE AccessPointId = ?');
    return stmt.run(internetName, location, frequencyBand, macAdress, id);
  },

  deleteAccessPoint: (id) => {
    const stmt = db.prepare('DELETE FROM ACCESS_POINT WHERE AccessPointId = ?');
    return stmt.run(id);
  },

  // MEASURINGPOINT operationer
  createMeasuringPoint: (position, signalStrength, accessPointId) => {
    const stmt = db.prepare('INSERT INTO MEASURINGPOINT (Position, SignalStrength, AccessPointId) VALUES (?, ?, ?)');
    return stmt.run(position, signalStrength, accessPointId);
  },

  getMeasuringPointsByAccessPoint: (accessPointId) => {
    return db.prepare('SELECT * FROM MEASURINGPOINT WHERE AccessPointId = ?').all(accessPointId);
  },

  getMeasuringPoint: (id) => {
    return db.prepare('SELECT * FROM MEASURINGPOINT WHERE MeasuringpointId = ?').get(id);
  },

  updateMeasuringPoint: (id, position, signalStrength) => {
    const stmt = db.prepare('UPDATE MEASURINGPOINT SET Position = ?, SignalStrength = ? WHERE MeasuringpointId = ?');
    return stmt.run(position, signalStrength, id);
  },

  deleteMeasuringPoint: (id) => {
    const stmt = db.prepare('DELETE FROM MEASURINGPOINT WHERE MeasuringpointId = ?');
    return stmt.run(id);
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