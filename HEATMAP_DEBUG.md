# Heatmap Debug Guide

## Problem: 404 fejl ved /api/heatmap/generate

### Quick Fix Steps:

1. **Genstart Backend**

   ```bash
   cd /Users/jeppeleth/Downloads/robot-wifi-mapper-systemoverhaul/backend
   # Stop existing process (Ctrl+C)
   node index.js
   ```

2. **Verificer Backend Logger**
   Du skulle se:

   ```
   Database initialiseret på: ...
   Backend listening on 4000
   ```

3. **Test Endpoint Direkte**

   ```bash
   curl http://localhost:4000/api/health
   # Skulle returnere: {"status":"ok","time":"..."}
   ```

4. **Tilføj Målepunkter**

   - Du SKAL have mindst **3 målepunkter**
   - Gå til "Målepunkter" tab
   - Klik på 3+ forskellige steder på floorplan
   - For hvert: Indtast signal strength (fx -60, -70, -50 dBm)
   - Gem alle punkter

5. **Generer Heatmap**
   - Gå til "Heatmap" tab
   - Knappen skulle nu være aktiv (hvis 3+ punkter)
   - Klik "Generer Heatmap"
   - Se console og backend terminal for debug output

### Expected Console Output (Frontend):

```
[Heatmap] generateHeatmap called
[Heatmap] floorPlan: {id: 59, imageUrl: "/uploads/...", ...}
[Heatmap] measurements: [{x: 970, y: 663, rssi: -60}, ...]
[Heatmap] Sending request to backend: {...}
[Heatmap] Response status: 200
[Heatmap] Response ok: true
[Heatmap] Success result: {success: true, imageData: "data:image/png;base64,..."}
```

### Expected Terminal Output (Backend):

```
[Heatmap] POST /api/heatmap/generate called
[Heatmap] Request body: {...}
[Heatmap] floorPlanId: 59
[Heatmap] measurements count: 3
[Heatmap] Fetching floor plan from database...
[Heatmap] Floor plan from DB: {...}
[Heatmap] Floor plan path: /Users/.../backend/uploads/file-...png
[Heatmap] File exists: true
[Heatmap] Writing measurements to: /Users/.../backend/uploads/temp/measurements-...json
[Heatmap] Python script path: /Users/.../backend/services/heatmap_generator.py
[Heatmap] Script exists: true
[Heatmap] Spawning python3 with args: [...]
[Heatmap] Python stdout: [INFO] Loaded floor plan: 3024x1964
[Heatmap] Python stdout: [INFO] Extracted 3 valid measurement points
[Heatmap] Python stdout: [INFO] Performing radial basis function interpolation...
[Heatmap] Python stdout: [INFO] Value range: -70.0 to -50.0
[Heatmap] Python stdout: [INFO] Heatmap saved to /Users/.../backend/uploads/temp/heatmap-...png
[Heatmap] Python process exited with code: 0
[Heatmap] Cleaned up measurements file
[Heatmap] Checking for output file: /Users/.../backend/uploads/temp/heatmap-...png
[Heatmap] Output file exists, reading...
[Heatmap] Image converted to base64, length: 1234567
[Heatmap] Saved to database with ID: 1
```

## Troubleshooting

### If you see "404 Not Found"

**Check 1: Is backend running?**

```bash
curl http://localhost:4000/api/health
```

If this fails, backend is not running.

**Check 2: Is endpoint registered?**
Look in backend terminal for:

```
Backend listening on 4000
```

**Check 3: Port conflict?**

```bash
lsof -i :4000
# Kill if another process is using it
kill -9 <PID>
```

### If you see "Need floor plan ID and at least 3 measurements"

- Du har ikke nok målepunkter!
- Gå til Målepunkter tab
- Tilføj flere punkter

### If you see "Floor plan not found"

- FloorPlanId sendes ikke korrekt
- Check console: `[Heatmap] floorPlanId: ...`
- Skulle være et tal (59, 60, etc.)

### If you see "Floor plan image file not found"

- ImagePath i database peger på forkert sted
- Backend log viser: `[Heatmap] Floor plan path: ...`
- Check at filen eksisterer på det sted

### If Python script fails

**Common errors:**

1. **"python3: command not found"**

   ```bash
   which python3
   # If not found, install Python 3
   ```

2. **"ModuleNotFoundError: No module named 'scipy'"**

   ```bash
   cd backend
   pip3 install -r requirements.txt
   ```

3. **"Failed to load floor plan"**

   - Fil findes ikke på angivet sti
   - Check ImagePath i database

4. **"Need at least 3 measurement points"**
   - Measurements JSON har < 3 punkter
   - Eller punkter mangler x, y, rssi felter

## Current Status

Baseret på dine logs:

- ✅ Backend kører på port 4000
- ✅ Frontend loader korrekt
- ✅ Floor plan uploaded (ID: 59)
- ❌ **Kun 1 målepunkt tilføjet** (behøver 3+)
- ❓ Backend endpoint ikke kaldt endnu

## Next Steps

1. Genstart backend (for at få ny logging kode)
2. Tilføj 2 flere målepunkter
3. Gå til Heatmap tab
4. Klik "Generer Heatmap"
5. Kopier console output (browser + terminal)
6. Share if still error

---

**Note:** Den nye logging kode vil vise præcis hvad der sker på hvert trin!
