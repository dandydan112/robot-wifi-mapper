const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const { initDb, projectDb, db } = require('./database/db');
const dbBackup = require('./database/backup');
const measurementPointsRouter = require('./routes/measurementPoints');
const app = express();

function mapFloorPlan(row) {
  if (!row) return null;
  let referencePoints = [];
  if (row.ReferencePoints) {
    try {
      referencePoints = JSON.parse(row.ReferencePoints);
    } catch (err) {
      referencePoints = [];
    }
  }

  return {
    id: row.FloorPlanId,
    name: row.Name,
    building: row.Building || null,
    description: row.Description || null,
    createdAt: row.CreationDate,
    updatedAt: row.UpdatedAt || row.CreationDate,
    imagePath: row.ImagePath || null,
    imageUrl: row.ImagePath || null,
    imageOriginalName: row.ImageOriginalName || null,
    imageMimeType: row.ImageMimeType || null,
    imageWidth: row.ImageWidth || null,
    imageHeight: row.ImageHeight || null,
    scaleFactor: row.ScaleFactor || null,
    referencePoints
  };
}

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

// Enable CORS for frontend on any localhost port
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

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
    const { name, building, description } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const trimmedName = String(name).trim();
    const trimmedBuilding = building !== undefined && building !== null ? String(building).trim() : null;
    const trimmedDescription = description !== undefined && description !== null ? String(description).trim() : null;
    const result = projectDb.createFloorPlan(trimmedName, trimmedBuilding, trimmedDescription);
    const floorPlan = projectDb.getFloorPlan(result.lastInsertRowid);
    res.status(201).json(mapFloorPlan(floorPlan));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/floor-plans', (req, res) => {
  try {
    const floorPlans = projectDb.getAllFloorPlans().map(mapFloorPlan);
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
    res.json(mapFloorPlan(floorPlan));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/floor-plans/:id', (req, res) => {
  try {
    const {
      name,
      building,
      description,
      imagePath,
      imageOriginalName,
      imageMimeType,
      imageWidth,
      imageHeight,
      scaleFactor,
      referencePoints
    } = req.body || {};

    const updates = {};
    if (name !== undefined) {
      if (name !== null) {
        const trimmedName = String(name).trim();
        if (!trimmedName) {
          return res.status(400).json({ error: 'name must not be empty' });
        }
        updates.name = trimmedName;
      }
    }
    if (building !== undefined) {
      updates.building = building === null ? null : String(building).trim();
    }
    if (description !== undefined) {
      updates.description = description === null ? null : String(description).trim();
    }
    if (imagePath !== undefined) updates.imagePath = imagePath;
    if (imageOriginalName !== undefined) updates.imageOriginalName = imageOriginalName;
    if (imageMimeType !== undefined) updates.imageMimeType = imageMimeType;
    if (imageWidth !== undefined) updates.imageWidth = imageWidth;
    if (imageHeight !== undefined) updates.imageHeight = imageHeight;
    if (scaleFactor !== undefined) updates.scaleFactor = scaleFactor;
    if (referencePoints !== undefined) {
      if (referencePoints === null) {
        updates.referencePoints = null;
      } else {
        updates.referencePoints = JSON.stringify(referencePoints);
      }
    }

    const result = projectDb.updateFloorPlanDetails(req.params.id, updates);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'FloorPlan ikke fundet' });
    }

    const updated = projectDb.getFloorPlan(req.params.id);
    res.json(mapFloorPlan(updated));
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
    db.prepare('DELETE FROM ACCESS_POINT_READING').run();
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

// MEASURINGPOINT API endpoints
app.post('/api/floor-plans/:floorPlanId/measuring-points', (req, res) => {
  try {
    const { name, x, y, scanStatus } = req.body;
    const result = projectDb.createMeasuringPoint(name, x, y, req.params.floorPlanId, scanStatus);
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      name, 
      x, 
      y, 
      scanStatus: scanStatus || 'pending',
      floorPlanId: req.params.floorPlanId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/floor-plans/:floorPlanId/measuring-points', (req, res) => {
  try {
    const measuringPoints = projectDb.getMeasuringPointsByFloorPlan(req.params.floorPlanId);
    res.json(measuringPoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/measuring-points', (req, res) => {
  try {
    const measuringPoints = projectDb.getAllMeasuringPoints();
    res.json(measuringPoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/measuring-points/:id', (req, res) => {
  try {
    const measuringPoint = projectDb.getMeasuringPoint(req.params.id);
    if (!measuringPoint) {
      return res.status(404).json({ error: 'MeasuringPoint ikke fundet' });
    }
    res.json(measuringPoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/measuring-points/:id', (req, res) => {
  try {
    const { name, x, y, scanStatus } = req.body;
    const result = projectDb.updateMeasuringPoint(req.params.id, name, x, y, scanStatus);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'MeasuringPoint ikke fundet' });
    }
    res.json({ id: req.params.id, name, x, y, scanStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/measuring-points/:id/status', (req, res) => {
  try {
    const { scanStatus } = req.body;
    const result = projectDb.updateMeasuringPointStatus(req.params.id, scanStatus);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'MeasuringPoint ikke fundet' });
    }
    res.json({ id: req.params.id, scanStatus });
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

// ACCESS_POINT_READING API endpoints
app.post('/api/measuring-points/:measuringPointId/readings', (req, res) => {
  try {
    const { ssid, bssid, rssi, frequency, channel } = req.body;
    const result = projectDb.createAccessPointReading(ssid, bssid, rssi, frequency, channel, req.params.measuringPointId);
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      ssid, 
      bssid, 
      rssi, 
      frequency, 
      channel, 
      measuringPointId: req.params.measuringPointId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/measuring-points/:measuringPointId/readings', (req, res) => {
  try {
    const readings = projectDb.getAccessPointReadingsByMeasuringPoint(req.params.measuringPointId);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/readings/:id', (req, res) => {
  try {
    const reading = projectDb.getAccessPointReading(req.params.id);
    if (!reading) {
      return res.status(404).json({ error: 'Reading ikke fundet' });
    }
    res.json(reading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/readings/:id', (req, res) => {
  try {
    const result = projectDb.deleteAccessPointReading(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Reading ikke fundet' });
    }
    res.json({ message: 'Reading slettet' });
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

// Generate heatmap endpoint
app.post('/api/heatmap/generate', async (req, res) => {
  console.log('[Heatmap] POST /api/heatmap/generate called');
  console.log('[Heatmap] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { floorPlanId, measurements, options } = req.body;
    
    console.log('[Heatmap] floorPlanId:', floorPlanId);
    console.log('[Heatmap] measurements count:', measurements?.length);
    console.log('[Heatmap] options:', options);
    
    if (!floorPlanId || !measurements || measurements.length < 3) {
      console.log('[Heatmap] Validation failed - need floor plan ID and at least 3 measurements');
      return res.status(400).json({ 
        error: 'Need floor plan ID and at least 3 measurements' 
      });
    }
    
    // Get floor plan from database
    console.log('[Heatmap] Fetching floor plan from database...');
    const floorPlan = projectDb.getFloorPlan(floorPlanId);
    console.log('[Heatmap] Floor plan from DB:', floorPlan);
    
    if (!floorPlan) {
      console.log('[Heatmap] Floor plan not found in database');
      return res.status(404).json({ error: 'Floor plan not found' });
    }
    
    const floorPlanPath = path.join(__dirname, floorPlan.ImagePath);
    console.log('[Heatmap] Floor plan path:', floorPlanPath);
    console.log('[Heatmap] File exists:', fs.existsSync(floorPlanPath));
    
    if (!fs.existsSync(floorPlanPath)) {
      console.log('[Heatmap] Floor plan image file not found at path');
      return res.status(404).json({ error: 'Floor plan image file not found' });
    }
    
    // Create temp files for measurements and output
    const tempDir = path.join(__dirname, 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      console.log('[Heatmap] Creating temp directory:', tempDir);
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const measurementsFile = path.join(tempDir, `measurements-${timestamp}.json`);
    const outputFile = path.join(tempDir, `heatmap-${timestamp}.png`);
    
    console.log('[Heatmap] Writing measurements to:', measurementsFile);
    // Write measurements to temp file
    fs.writeFileSync(measurementsFile, JSON.stringify(measurements));
    
    // Call Python script
    const { spawn } = require('child_process');
    const pythonScript = path.join(__dirname, 'services', 'heatmap_generator.py');
    
    console.log('[Heatmap] Python script path:', pythonScript);
    console.log('[Heatmap] Script exists:', fs.existsSync(pythonScript));
    
    const args = [
      pythonScript,
      '--floorplan', floorPlanPath,
      '--measurements', measurementsFile,
      '--output', outputFile,
      '--metric', options?.metric || 'rssi',
      '--cmap', options?.colormap || 'RdYlGn'
    ];
    
    if (options?.style) args.push('--style', options.style);
    if (options?.vmin !== undefined) args.push('--vmin', options.vmin.toString());
    if (options?.vmax !== undefined) args.push('--vmax', options.vmax.toString());
    
    console.log('[Heatmap] Spawning python3 with args:', args);
    // Use full path to python3 to ensure correct environment
    const pythonPath = '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';
    const python = spawn(pythonPath, args);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('[Heatmap] Python stdout:', output);
    });
    
    python.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log('[Heatmap] Python stderr:', output);
    });
    
    python.on('close', (code) => {
      console.log('[Heatmap] Python process exited with code:', code);
      
      // Clean up measurements file
      try {
        fs.unlinkSync(measurementsFile);
        console.log('[Heatmap] Cleaned up measurements file');
      } catch (err) {
        console.error('[Heatmap] Failed to delete temp measurements file:', err);
      }
      
      if (code !== 0) {
        console.error('[Heatmap] Python script failed with error:', stderr);
        return res.status(500).json({ 
          error: 'Failed to generate heatmap',
          details: stderr 
        });
      }
      
      console.log('[Heatmap] Checking for output file:', outputFile);
      // Read and send the generated image
      if (fs.existsSync(outputFile)) {
        console.log('[Heatmap] Output file exists, reading...');
        const imageBuffer = fs.readFileSync(outputFile);
        const base64Image = imageBuffer.toString('base64');
        console.log('[Heatmap] Image converted to base64, length:', base64Image.length);
        
        // Save heatmap to database
        try {
          const heatmapId = projectDb.createHeatmap({
            FloorPlanId: floorPlanId,
            Type: options?.metric || 'rssi',
            ImagePath: `/uploads/temp/heatmap-${timestamp}.png`,
            Settings: JSON.stringify(options || {})
          });
          
          console.log('[Heatmap] Saved to database with ID:', heatmapId);
          
          res.json({
            success: true,
            imageUrl: `/uploads/temp/heatmap-${timestamp}.png`,
            imageData: `data:image/png;base64,${base64Image}`,
            heatmapId
          });
        } catch (dbErr) {
          console.error('[Heatmap] Failed to save heatmap to database:', dbErr);
          // Still send the image even if DB save fails
          res.json({
            success: true,
            imageUrl: `/uploads/temp/heatmap-${timestamp}.png`,
            imageData: `data:image/png;base64,${base64Image}`
          });
        }
      } else {
        console.error('[Heatmap] Output file was not created');
        res.status(500).json({ error: 'Heatmap file not created' });
      }
    });
    
  } catch (error) {
    console.error('[Heatmap] Exception in endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// In production you might serve built frontend from backend/static
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on ${port}`));
