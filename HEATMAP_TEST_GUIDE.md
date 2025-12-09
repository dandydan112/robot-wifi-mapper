# Heatmap Test Guide

## 🧪 Test Checklist

### 1. Python Script Test (Standalone)

#### Forberedelse

```bash
cd /Users/jeppeleth/Downloads/robot-wifi-mapper-systemoverhaul/backend
```

#### Opret test data

```bash
cat > test_measurements.json << 'EOF'
[
  {"id": 1, "x": 100, "y": 100, "rssi": -45, "ssid": "TestWiFi"},
  {"id": 2, "x": 300, "y": 100, "rssi": -65, "ssid": "TestWiFi"},
  {"id": 3, "x": 200, "y": 250, "rssi": -55, "ssid": "TestWiFi"},
  {"id": 4, "x": 50, "y": 200, "rssi": -75, "ssid": "TestWiFi"},
  {"id": 5, "x": 350, "y": 200, "rssi": -70, "ssid": "TestWiFi"}
]
EOF
```

#### Find et test floorplan

```bash
# Brug et eksisterende floorplan fra uploads, eller opret et test billede
# Eksempel: Hvis du har uploadet en floorplan, find den i uploads/
ls -la uploads/
```

#### Kør scriptet

```bash
python3 services/heatmap_generator.py \
  --floorplan uploads/[DIT-FLOORPLAN].png \
  --measurements test_measurements.json \
  --output test_heatmap.png \
  --cmap RdYlGn \
  --vmin -90 \
  --vmax -30
```

#### Verificer output

```bash
# Check at filen blev oprettet
ls -lh test_heatmap.png

# Åbn billedet
open test_heatmap.png  # macOS
```

**Forventet resultat:**

- ✅ Script kører uden fejl
- ✅ PNG fil oprettes
- ✅ Billede viser floorplan med colored overlay
- ✅ Målepunkter er markeret med dots
- ✅ Colorbar vises på siden

---

### 2. Backend API Test

#### Start backend

```bash
cd /Users/jeppeleth/Downloads/robot-wifi-mapper-systemoverhaul/backend
node index.js
```

**Forventet output:**

```
Database initialiseret på: ...
Backend listening on 4000
```

#### Test health endpoint

```bash
curl http://localhost:4000/api/health
```

**Forventet:**

```json
{ "status": "ok", "time": "2025-12-09T..." }
```

#### Test heatmap endpoint (efter at have data i database)

Først, opret et projekt og upload floorplan gennem frontend, eller brug eksisterende data.

Så:

```bash
# Find dit floorPlanId fra databasen eller frontend
# Eksempel request:
curl -X POST http://localhost:4000/api/heatmap/generate \
  -H "Content-Type: application/json" \
  -d '{
    "floorPlanId": 1,
    "measurements": [
      {"x": 100, "y": 100, "rssi": -45},
      {"x": 300, "y": 100, "rssi": -65},
      {"x": 200, "y": 250, "rssi": -55}
    ],
    "options": {
      "colormap": "RdYlGn",
      "vmin": -90,
      "vmax": -30
    }
  }'
```

**Forventet respons:**

```json
{
  "success": true,
  "imageUrl": "/uploads/temp/heatmap-1234567890.png",
  "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "heatmapId": 1
}
```

---

### 3. Frontend Integration Test

#### Start frontend

```bash
# Terminal 1: Backend (hvis ikke allerede kører)
cd backend
node index.js

# Terminal 2: Frontend (hvis du bruger Vite dev server)
cd ..
npm run dev
# Eller åbn frontend/index.html direkte
```

#### Test workflow:

1. **Opret projekt**

   - Klik på "Opret nyt projekt"
   - Indtast navn
   - Gem

2. **Upload floorplan**

   - Gå til "Upload" tab
   - Vælg et PNG/JPG billede
   - Upload

3. **Tilføj målepunkter**

   - Gå til "Målepunkter" tab
   - Klik på 5+ forskellige steder på floorplan
   - For hvert punkt, indtast:
     - Signal strength (-30 til -90 dBm)
     - SSID (valgfrit)
     - BSSID (valgfrit)
   - Gem hvert punkt

4. **Generer heatmap**
   - Gå til "Heatmap" tab
   - Verificer at der står "X målepunkter"
   - Vælg farveskema (prøv forskellige)
   - Klik "Generer Heatmap"
   - Vent 2-5 sekunder

**Forventet resultat:**

- ✅ Loading spinner vises under generering
- ✅ Heatmap billede vises efter færdig
- ✅ Billede viser floorplan med signal overlay
- ✅ Målepunkter er synlige
- ✅ Colorbar viser signalstyrke skala
- ✅ Ingen fejl i console

---

### 4. Error Handling Tests

#### Test: For få målepunkter

1. Gå til Heatmap view med kun 2 målepunkter
2. Klik "Generer Heatmap"

**Forventet:**

- ❌ Error message: "Behov for et floor plan og mindst 3 målepunkter"
- Button er disabled hvis < 3 points

#### Test: Manglende floorplan

1. Opret projekt uden floorplan
2. Tilføj målepunkter
3. Gå til Heatmap view
4. Prøv at generere

**Forventet:**

- ❌ Button disabled
- ℹ️ Message om manglende floorplan

#### Test: Backend ikke tilgængelig

1. Stop backend (Ctrl+C)
2. Prøv at generere heatmap

**Forventet:**

- ❌ Error message: "Kunne ikke generere heatmap: Failed to fetch"
- Loading skjules
- Placeholder vises igen

---

### 5. Colormap Tests

Test forskellige farveskemaer og verificer de fungerer:

1. **RdYlGn** (Rød-Gul-Grøn) - Default

   - Grøn = stærkt signal
   - Gul = medium
   - Rød = svagt

2. **RdYlBu** (Rød-Gul-Blå)

   - Blå = stærkt signal
   - Alternative colorscheme

3. **viridis** - Farveblinde-venlig

   - Perceptually uniform
   - Lilla til gul

4. **plasma** - Høj kontrast
   - Lilla til gul/lyserød
   - God til præsentationer

Test at hver colormap:

- ✅ Genererer heatmap uden fejl
- ✅ Viser korrekte farver
- ✅ Colorbar matcher heatmap

---

### 6. Value Range Tests

Test forskellige min/max værdier:

#### Test 1: Standard range

- Min: -90 dBm
- Max: -30 dBm

#### Test 2: Narrow range (zoom in)

- Min: -70 dBm
- Max: -50 dBm

Forventet: Mere kontrast, mindre range

#### Test 3: Wide range

- Min: -100 dBm
- Max: -20 dBm

Forventet: Mindre kontrast, større range

---

### 7. Performance Tests

#### Test: Få målepunkter (3-5)

- Forventet tid: 2-3 sekunder

#### Test: Medium målepunkter (10-20)

- Forventet tid: 3-5 sekunder

#### Test: Mange målepunkter (50+)

- Forventet tid: 5-10 sekunder

**Note:** Første generering kan tage længere (matplotlib font cache).

---

### 8. Browser Compatibility

Test i forskellige browsere:

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

Verificer:

- ✅ Layout ser korrekt ud
- ✅ Controls fungerer
- ✅ Heatmap vises korrekt
- ✅ No console errors

---

## 🐛 Fejlfinding

### "ModuleNotFoundError: No module named 'scipy'"

```bash
cd backend
pip3 install -r requirements.txt
```

### "Failed to load floor plan"

Check:

1. Floorplan er uploadet
2. ImagePath i database er korrekt
3. Fil eksisterer på disk

### "python3: command not found"

Installer Python 3:

```bash
# macOS
brew install python3

# Verificer
python3 --version
```

### Heatmap genereres men vises ikke

Check:

1. Backend console for Python fejl
2. Browser console for network errors
3. CORS settings i backend

### Timeout errors

Øg timeout i backend/index.js hvis store floorplans.

---

## ✅ Success Criteria

Alle tests bestået hvis:

- [x] Python script kan køre standalone
- [x] Backend API returnerer valid heatmap
- [x] Frontend kan vise genereret heatmap
- [x] Error handling virker korrekt
- [x] Alle colormaps fungerer
- [x] Performance er acceptabel (< 10 sek)
- [x] Works in all major browsers

---

## 📊 Test Results Template

```
=== HEATMAP TEST RESULTS ===
Dato: [Dato]
Tester: [Navn]

1. Python Script:        [ ] PASSED  [ ] FAILED
2. Backend API:          [ ] PASSED  [ ] FAILED
3. Frontend Integration: [ ] PASSED  [ ] FAILED
4. Error Handling:       [ ] PASSED  [ ] FAILED
5. Colormaps:           [ ] PASSED  [ ] FAILED
6. Value Ranges:        [ ] PASSED  [ ] FAILED
7. Performance:         [ ] PASSED  [ ] FAILED
8. Browser Compat:      [ ] PASSED  [ ] FAILED

Noter:
[Eventuelle problemer eller observationer]

Status: [ ] READY FOR PRODUCTION  [ ] NEEDS FIXES
```

---

**Happy Testing! 🚀**
