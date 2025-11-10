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

// Projekt API endpoints
app.post('/api/projects', (req, res) => {
  try {
    const { name, description } = req.body;
    const result = projectDb.createProject(name, description);
    res.status(201).json({ id: result.lastInsertRowid, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', (req, res) => {
  try {
    const projects = projectDb.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = projectDb.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Projekt ikke fundet' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  try {
    const { name, description } = req.body;
    const result = projectDb.updateProject(req.params.id, name, description);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Projekt ikke fundet' });
    }
    res.json({ id: req.params.id, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/projects/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const result = projectDb.updateProjectStatus(req.params.id, status);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Projekt ikke fundet' });
    }
    res.json({ id: req.params.id, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const result = projectDb.deleteProject(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Projekt ikke fundet' });
    }
    res.json({ message: 'Projekt slettet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoint til at rydde alle projekter
app.delete('/api/projects', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM projects').run();
    // Clean up related data
    db.prepare('DELETE FROM measurements').run();
    db.prepare('DELETE FROM calibrations').run();
    db.prepare('DELETE FROM reports').run();
    
    res.json({ 
      message: 'Alle projekter slettet', 
      deletedProjects: result.changes 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Målinger API endpoints
app.post('/api/projects/:id/measurements', (req, res) => {
  try {
    const { x, y, signalStrength, ssid, frequency } = req.body;
    const result = projectDb.addMeasurement(req.params.id, x, y, signalStrength, ssid, frequency);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id/measurements', (req, res) => {
  try {
    const measurements = projectDb.getMeasurements(req.params.id);
    res.json(measurements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kalibrering API endpoints
app.post('/api/projects/:id/calibration', (req, res) => {
  try {
    const { floorPlanImage, scaleFactor, referencePoints } = req.body;
    console.log('Calibration POST received:', {
      projectId: req.params.id,
      hasFloorPlanImage: !!floorPlanImage,
      floorPlanImageType: typeof floorPlanImage,
      scaleFactor,
      referencePointsCount: referencePoints?.length
    });
    const result = projectDb.saveCalibration(req.params.id, floorPlanImage, scaleFactor, referencePoints);
    res.status(201).json({ message: 'Kalibrering gemt' });
  } catch (error) {
    console.error('Error saving calibration:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id/calibration', (req, res) => {
  try {
    const calibration = projectDb.getCalibration(req.params.id);
    res.json(calibration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rapport API endpoints
app.post('/api/projects/:id/reports', (req, res) => {
  try {
    const { reportType, reportData } = req.body;
    const result = projectDb.saveReport(req.params.id, reportType, reportData);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id/reports', (req, res) => {
  try {
    const reports = projectDb.getReports(req.params.id);
    res.json(reports);
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
