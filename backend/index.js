const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { initDb, projectDb, db } = require('./database/db');
const dbBackup = require('./database/backup');
const measurementPointsRouter = require('./routes/measurementPoints');
const app = express();

// Opret uploads directory hvis den ikke findes
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer konfiguration til fil uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Kun billeder og PDF filer er tilladt'));
  }
});

// Øg payload grænsen for store billeder og data
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Servér uploadede filer statisk
app.use('/uploads', express.static(uploadsDir));

// Initialiser database ved opstart
initDb();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Fil upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ingen fil uploadet' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`
    };

    res.json({ 
      message: 'Fil uploadet succesfuldt',
      file: fileInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Slet uploadet fil
app.delete('/api/uploads/:filename', (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Fil slettet' });
    } else {
      res.status(404).json({ error: 'Fil ikke fundet' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FLOOR_PLAN API endpoints
app.post('/api/floor-plans', (req, res) => {
  try {
    const { name } = req.body;
    const result = projectDb.createFloorPlan(name);
    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/floor-plans', (req, res) => {
  try {
    const floorPlans = projectDb.getAllFloorPlans();
    res.json(floorPlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/floor-plans/:id', (req, res) => {
  try {
    const floorPlan = projectDb.getFloorPlan(req.params.id);
    if (!floorPlan) {
      return res.status(404).json({ error: 'FloorPlan ikke fundet' });
    }
    res.json(floorPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/floor-plans/:id', (req, res) => {
  try {
    const { name } = req.body;
    const result = projectDb.updateFloorPlan(req.params.id, name);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'FloorPlan ikke fundet' });
    }
    res.json({ id: req.params.id, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.delete('/api/floor-plans/:id', (req, res) => {
  try {
    const result = projectDb.deleteFloorPlan(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'FloorPlan ikke fundet' });
    }
    res.json({ message: 'FloorPlan slettet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoint til at rydde alle floor plans
app.delete('/api/floor-plans', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM FLOOR_PLAN').run();
    // Clean up related data (cascade should handle this, but being explicit)
    db.prepare('DELETE FROM HEATMAP').run();
    db.prepare('DELETE FROM MEASURINGPOINT').run();
    db.prepare('DELETE FROM ACCESS_POINT').run();
    db.prepare('DELETE FROM ROOM').run();
    
    res.json({ 
      message: 'Alle floor plans slettet', 
      deletedFloorPlans: result.changes 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ROOM API endpoints
app.post('/api/floor-plans/:floorPlanId/rooms', (req, res) => {
  try {
    const { name } = req.body;
    const result = projectDb.createRoom(name, req.params.floorPlanId);
    res.status(201).json({ id: result.lastInsertRowid, name, floorPlanId: req.params.floorPlanId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/floor-plans/:floorPlanId/rooms', (req, res) => {
  try {
    const rooms = projectDb.getRoomsByFloorPlan(req.params.floorPlanId);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/rooms/:id', (req, res) => {
  try {
    const { name } = req.body;
    const result = projectDb.updateRoom(req.params.id, name);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Room ikke fundet' });
    }
    res.json({ id: req.params.id, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rooms/:id', (req, res) => {
  try {
    const result = projectDb.deleteRoom(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Room ikke fundet' });
    }
    res.json({ message: 'Room slettet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ACCESS_POINT API endpoints
app.post('/api/floor-plans/:floorPlanId/access-points', (req, res) => {
  try {
    const { internetName, location, frequencyBand, macAdress } = req.body;
    const result = projectDb.createAccessPoint(internetName, location, frequencyBand, macAdress, req.params.floorPlanId);
    res.status(201).json({ id: result.lastInsertRowid, internetName, location, frequencyBand, macAdress, floorPlanId: req.params.floorPlanId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/floor-plans/:floorPlanId/access-points', (req, res) => {
  try {
    const accessPoints = projectDb.getAccessPointsByFloorPlan(req.params.floorPlanId);
    res.json(accessPoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/access-points/:id', (req, res) => {
  try {
    const { internetName, location, frequencyBand, macAdress } = req.body;
    const result = projectDb.updateAccessPoint(req.params.id, internetName, location, frequencyBand, macAdress);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'AccessPoint ikke fundet' });
    }
    res.json({ id: req.params.id, internetName, location, frequencyBand, macAdress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/access-points/:id', (req, res) => {
  try {
    const result = projectDb.deleteAccessPoint(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'AccessPoint ikke fundet' });
    }
    res.json({ message: 'AccessPoint slettet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MEASURINGPOINT API endpoints
app.post('/api/access-points/:accessPointId/measuring-points', (req, res) => {
  try {
    const { position, signalStrength } = req.body;
    const result = projectDb.createMeasuringPoint(position, signalStrength, req.params.accessPointId);
    res.status(201).json({ id: result.lastInsertRowid, position, signalStrength, accessPointId: req.params.accessPointId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/access-points/:accessPointId/measuring-points', (req, res) => {
  try {
    const measuringPoints = projectDb.getMeasuringPointsByAccessPoint(req.params.accessPointId);
    res.json(measuringPoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/measuring-points/:id', (req, res) => {
  try {
    const { position, signalStrength } = req.body;
    const result = projectDb.updateMeasuringPoint(req.params.id, position, signalStrength);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'MeasuringPoint ikke fundet' });
    }
    res.json({ id: req.params.id, position, signalStrength });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/measuring-points/:id', (req, res) => {
  try {
    const result = projectDb.deleteMeasuringPoint(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'MeasuringPoint ikke fundet' });
    }
    res.json({ message: 'MeasuringPoint slettet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HEATMAP API endpoints
app.post('/api/floor-plans/:floorPlanId/heatmaps', (req, res) => {
  try {
    const result = projectDb.createHeatmap(req.params.floorPlanId);
    res.status(201).json({ id: result.lastInsertRowid, floorPlanId: req.params.floorPlanId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/floor-plans/:floorPlanId/heatmaps', (req, res) => {
  try {
    const heatmaps = projectDb.getHeatmapsByFloorPlan(req.params.floorPlanId);
    res.json(heatmaps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/heatmaps/:id', (req, res) => {
  try {
    const result = projectDb.deleteHeatmap(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Heatmap ikke fundet' });
    }
    res.json({ message: 'Heatmap slettet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Database backup og info endpoints
app.get('/api/database/info', (req, res) => {
  try {
    const info = dbBackup.getDatabaseInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/database/export', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `wifi-mapper-backup-${timestamp}.json`;
    const exportPath = path.join(__dirname, '..', 'exports', filename);
    
    // Opret exports mappe hvis den ikke findes
    const fs = require('fs');
    const exportsDir = path.dirname(exportPath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const success = dbBackup.exportToJson(exportPath);
    if (success) {
      res.json({ 
        message: 'Database eksporteret', 
        filename: filename,
        path: exportPath 
      });
    } else {
      res.status(500).json({ error: 'Eksport fejlede' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/database/copy', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `wifi-mapper-${timestamp}.db`;
    const copyPath = path.join(__dirname, '..', 'exports', filename);
    
    // Opret exports mappe hvis den ikke findes
    const fs = require('fs');
    const exportsDir = path.dirname(copyPath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const success = dbBackup.copyDatabaseFile(copyPath);
    if (success) {
      res.json({ 
        message: 'Database kopieret', 
        filename: filename,
        path: copyPath 
      });
    } else {
      res.status(500).json({ error: 'Kopiering fejlede' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mount measurement-points router
app.use('/api/measurement-points', measurementPointsRouter);

// In production you might serve built frontend from backend/static
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on ${port}`));
