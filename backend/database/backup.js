const fs = require('fs');
const path = require('path');
const { db } = require('./db');

const dbBackup = {
  // Eksporter database som JSON for backup
  exportToJson: (outputPath) => {
    try {
      const data = {
        projects: db.prepare('SELECT * FROM projects').all(),
        measurements: db.prepare('SELECT * FROM measurements').all(),
        calibrations: db.prepare('SELECT * FROM calibrations').all(),
        reports: db.prepare('SELECT * FROM reports').all(),
        exportDate: new Date().toISOString()
      };

      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`Database eksporteret til: ${outputPath}`);
      return true;
    } catch (error) {
      console.error('Fejl ved eksport:', error);
      return false;
    }
  },

  // Importer database fra JSON backup
  importFromJson: (inputPath) => {
    try {
      const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      
      // Ryd eksisterende data (valgfrit)
      db.exec('DELETE FROM reports');
      db.exec('DELETE FROM calibrations');
      db.exec('DELETE FROM measurements');
      db.exec('DELETE FROM projects');

      // Indsæt projekter
      if (data.projects) {
        const insertProject = db.prepare('INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
        for (const project of data.projects) {
          insertProject.run(project.id, project.name, project.description, project.created_at, project.updated_at);
        }
      }

      // Indsæt målinger
      if (data.measurements) {
        const insertMeasurement = db.prepare('INSERT INTO measurements (id, project_id, x_coordinate, y_coordinate, signal_strength, ssid, frequency, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const measurement of data.measurements) {
          insertMeasurement.run(measurement.id, measurement.project_id, measurement.x_coordinate, measurement.y_coordinate, measurement.signal_strength, measurement.ssid, measurement.frequency, measurement.timestamp);
        }
      }

      // Indsæt kalibreringer
      if (data.calibrations) {
        const insertCalibration = db.prepare('INSERT INTO calibrations (id, project_id, floor_plan_image, scale_factor, reference_points, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        for (const calibration of data.calibrations) {
          insertCalibration.run(calibration.id, calibration.project_id, calibration.floor_plan_image, calibration.scale_factor, calibration.reference_points, calibration.created_at);
        }
      }

      // Indsæt rapporter
      if (data.reports) {
        const insertReport = db.prepare('INSERT INTO reports (id, project_id, report_type, report_data, generated_at) VALUES (?, ?, ?, ?, ?)');
        for (const report of data.reports) {
          insertReport.run(report.id, report.project_id, report.report_type, report.report_data, report.generated_at);
        }
      }

      console.log(`Database importeret fra: ${inputPath}`);
      return true;
    } catch (error) {
      console.error('Fejl ved import:', error);
      return false;
    }
  },

  // Kopier database fil direkte
  copyDatabaseFile: (destinationPath) => {
    try {
      const dbPath = path.join(__dirname, '..', '..', 'wifi-mapper.db');
      fs.copyFileSync(dbPath, destinationPath);
      console.log(`Database kopieret til: ${destinationPath}`);
      return true;
    } catch (error) {
      console.error('Fejl ved kopiering:', error);
      return false;
    }
  },

  // Hent database info
  getDatabaseInfo: () => {
    const dbPath = path.join(__dirname, '..', '..', 'wifi-mapper.db');
    const stats = fs.statSync(dbPath);
    
    return {
      path: dbPath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      projectCount: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
      measurementCount: db.prepare('SELECT COUNT(*) as count FROM measurements').get().count
    };
  }
};

module.exports = dbBackup;