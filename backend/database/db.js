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

// Opret tabeller
const initDb = () => {
  // Projekter tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tilføj status kolonne hvis den ikke findes (migration)
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'draft'`);
  } catch (e) {
    // Kolonne findes allerede
  }

  // WiFi målinger tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      x_coordinate REAL NOT NULL,
      y_coordinate REAL NOT NULL,
      signal_strength INTEGER NOT NULL,
      ssid TEXT,
      frequency REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Kalibrering data tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS calibrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      floor_plan_image TEXT, -- Base64 data or file URL
      floor_plan_file_url TEXT, -- URL til uploadet fil
      floor_plan_filename TEXT, -- Original filnavn
      floor_plan_size INTEGER, -- Filstørrelse i bytes
      scale_factor REAL,
      reference_points TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Rapporter tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      report_type TEXT NOT NULL,
      report_data TEXT, -- JSON string
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialiseret på:', dbPath);
};

// Database operationer
const projectDb = {
  // Projekter
  createProject: (name, description) => {
    const stmt = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)');
    return stmt.run(name, description);
  },

  getAllProjects: () => {
    return db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  },

  getProject: (id) => {
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  },

  updateProject: (id, name, description) => {
    const stmt = db.prepare('UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(name, description, id);
  },

  updateProjectStatus: (id, status) => {
    const stmt = db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(status, id);
  },

  deleteProject: (id) => {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    return stmt.run(id);
  },

  // Målinger
  addMeasurement: (projectId, x, y, signalStrength, ssid, frequency) => {
    const stmt = db.prepare('INSERT INTO measurements (project_id, x_coordinate, y_coordinate, signal_strength, ssid, frequency) VALUES (?, ?, ?, ?, ?, ?)');
    return stmt.run(projectId, x, y, signalStrength, ssid, frequency);
  },

  getMeasurements: (projectId) => {
    return db.prepare('SELECT * FROM measurements WHERE project_id = ? ORDER BY timestamp').all(projectId);
  },

  // Kalibrering
  saveCalibration: (projectId, floorPlanData, scaleFactor, referencePoints) => {
    // Håndter både base64 data og fil URL
    const isFileUpload = floorPlanData && typeof floorPlanData === 'object' && floorPlanData.url;
    
    if (isFileUpload) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO calibrations 
        (project_id, floor_plan_file_url, floor_plan_filename, floor_plan_size, scale_factor, reference_points) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      return stmt.run(
        projectId, 
        floorPlanData.url, 
        floorPlanData.originalname, 
        floorPlanData.size, 
        scaleFactor, 
        JSON.stringify(referencePoints)
      );
    } else {
      // Bagudkompatibilitet med base64 data
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO calibrations 
        (project_id, floor_plan_image, scale_factor, reference_points) 
        VALUES (?, ?, ?, ?)
      `);
      return stmt.run(projectId, floorPlanData, scaleFactor, JSON.stringify(referencePoints));
    }
  },

  getCalibration: (projectId) => {
    const result = db.prepare('SELECT * FROM calibrations WHERE project_id = ? ORDER BY created_at DESC LIMIT 1').get(projectId);
    if (result && result.reference_points) {
      result.reference_points = JSON.parse(result.reference_points);
    }
    return result;
  },

  // Rapporter
  saveReport: (projectId, reportType, reportData) => {
    const stmt = db.prepare('INSERT INTO reports (project_id, report_type, report_data) VALUES (?, ?, ?)');
    return stmt.run(projectId, reportType, JSON.stringify(reportData));
  },

  getReports: (projectId) => {
    const results = db.prepare('SELECT * FROM reports WHERE project_id = ? ORDER BY generated_at DESC').all(projectId);
    return results.map(report => ({
      ...report,
      report_data: JSON.parse(report.report_data)
    }));
  }
};

module.exports = { initDb, projectDb, db, dbPath };