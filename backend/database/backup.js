const fs = require('fs');
const path = require('path');
const { db, dbPath } = require('./db');

// Path to data.json (measurement points stored by dataStore)
const dataJsonPath = path.join(__dirname, '..', 'data.json');

const dbBackup = {
  // Eksporter database som JSON for backup
  exportToJson: (outputPath) => {
    try {
      const data = {
        floorPlans: db.prepare('SELECT * FROM FLOOR_PLAN').all(),
        rooms: db.prepare('SELECT * FROM ROOM').all(),
        accessPoints: db.prepare('SELECT * FROM ACCESS_POINT').all(),
        measuringPoints: db.prepare('SELECT * FROM MEASURINGPOINT').all(),
        heatmaps: db.prepare('SELECT * FROM HEATMAP').all(),
        // Include measurementPoints (from data.json) so point-scans are preserved in backups
        measurementPoints: (fs.existsSync(dataJsonPath) ? JSON.parse(fs.readFileSync(dataJsonPath, 'utf8')) : null),
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
      
      // Ryd eksisterende data (i korrekt rækkefølge pga. foreign keys)
      db.exec('DELETE FROM HEATMAP');
      db.exec('DELETE FROM MEASURINGPOINT');
      db.exec('DELETE FROM ACCESS_POINT');
      db.exec('DELETE FROM ROOM');
      db.exec('DELETE FROM FLOOR_PLAN');

      // Indsæt FLOOR_PLAN
      if (data.floorPlans) {
        const insertFloorPlan = db.prepare('INSERT INTO FLOOR_PLAN (FloorPlanId, Name, CreationDate) VALUES (?, ?, ?)');
        for (const floorPlan of data.floorPlans) {
          insertFloorPlan.run(floorPlan.FloorPlanId, floorPlan.Name, floorPlan.CreationDate);
        }
      }

      // Indsæt ROOM
      if (data.rooms) {
        const insertRoom = db.prepare('INSERT INTO ROOM (RoomId, Name, FloorPlanId) VALUES (?, ?, ?)');
        for (const room of data.rooms) {
          insertRoom.run(room.RoomId, room.Name, room.FloorPlanId);
        }
      }

      // Indsæt ACCESS_POINT
      if (data.accessPoints) {
        const insertAccessPoint = db.prepare('INSERT INTO ACCESS_POINT (AccessPointId, InternetName, Location, FrequencyBand, MACAdress, FloorPlanId) VALUES (?, ?, ?, ?, ?, ?)');
        for (const accessPoint of data.accessPoints) {
          insertAccessPoint.run(accessPoint.AccessPointId, accessPoint.InternetName, accessPoint.Location, accessPoint.FrequencyBand, accessPoint.MACAdress, accessPoint.FloorPlanId);
        }
      }

      // Indsæt MEASURINGPOINT
      if (data.measuringPoints) {
        const insertMeasuringPoint = db.prepare('INSERT INTO MEASURINGPOINT (MeasuringpointId, Position, SignalStrength, AccessPointId) VALUES (?, ?, ?, ?)');
        for (const measuringPoint of data.measuringPoints) {
          insertMeasuringPoint.run(measuringPoint.MeasuringpointId, measuringPoint.Position, measuringPoint.SignalStrength, measuringPoint.AccessPointId);
        }
      }

      // Indsæt HEATMAP
      if (data.heatmaps) {
        const insertHeatmap = db.prepare('INSERT INTO HEATMAP (HeatmapId, GenerationDate, FloorPlanId) VALUES (?, ?, ?)');
        for (const heatmap of data.heatmaps) {
          insertHeatmap.run(heatmap.HeatmapId, heatmap.GenerationDate, heatmap.FloorPlanId);
        }
      }

      console.log(`Database importeret fra: ${inputPath}`);
      // If measurementPoints are present in the JSON, write them to backend/data.json
      try {
        if (data.measurementPoints) {
          fs.writeFileSync(dataJsonPath, JSON.stringify(data.measurementPoints, null, 2), 'utf8');
          console.log('measurementPoints written to', dataJsonPath);
        }
      } catch (e) {
        console.warn('Could not write measurementPoints to data.json:', e.message || e);
      }

      return true;
    } catch (error) {
      console.error('Fejl ved import:', error);
      return false;
    }
  },

  // Kopier database fil direkte
  copyDatabaseFile: (destinationPath) => {
    try {
      const source = dbPath || path.join(__dirname, '..', '..', 'wifi-mapper.db');
      fs.copyFileSync(source, destinationPath);
      console.log(`Database kopieret fra ${source} til: ${destinationPath}`);
      return true;
    } catch (error) {
      console.error('Fejl ved kopiering:', error);
      return false;
    }
  },

  // Hent database info
  getDatabaseInfo: () => {
    const source = dbPath || path.join(__dirname, '..', '..', 'wifi-mapper.db');
    if (!fs.existsSync(source)) {
      return { path: source, exists: false };
    }
    const stats = fs.statSync(source);

    return {
      path: source,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      floorPlanCount: db.prepare('SELECT COUNT(*) as count FROM FLOOR_PLAN').get().count,
      roomCount: db.prepare('SELECT COUNT(*) as count FROM ROOM').get().count,
      accessPointCount: db.prepare('SELECT COUNT(*) as count FROM ACCESS_POINT').get().count,
      measuringPointCount: db.prepare('SELECT COUNT(*) as count FROM MEASURINGPOINT').get().count,
      heatmapCount: db.prepare('SELECT COUNT(*) as count FROM HEATMAP').get().count
    };
  }
};

module.exports = dbBackup;