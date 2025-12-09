# Heatmap System Overhaul - Dokumentation

## Oversigt

Heatmap funktionaliteten er blevet fuldstændig omskrevet til at bruge Python-baseret videnskabelig visualisering i stedet for JavaScript canvas-baseret rendering.

## Ændringer

### 1. Ny Python Heatmap Generator

**Fil:** `backend/services/heatmap_generator.py`

- Bruger **scipy.interpolate.Rbf** (Radial Basis Function) til avanceret interpolation
- Bruger **matplotlib** til professionel visualisering
- Genererer high-quality PNG heatmaps med:
  - Floorplan som baggrund
  - RBF-interpoleret signal overlay
  - Målepunkter markeret med farvekodning
  - Colorbar med signalstyrke skala
  - Konfigurerbare farveskemaer (RdYlGn, RdYlBu, viridis, plasma, etc.)

**Funktionalitet:**

```python
HeatmapGenerator(floorplan_path, measurements, output_path,
                 metric='rssi', cmap='RdYlGn', vmin=-90, vmax=-30)
```

### 2. Backend API Endpoint

**Fil:** `backend/index.js`

Nyt endpoint: `POST /api/heatmap/generate`

**Request body:**

```json
{
  "floorPlanId": "uuid",
  "measurements": [...],
  "options": {
    "metric": "rssi",
    "colormap": "RdYlGn",
    "vmin": -90,
    "vmax": -30
  }
}
```

**Response:**

```json
{
  "success": true,
  "imageUrl": "/uploads/temp/heatmap-{timestamp}.png",
  "imageData": "data:image/png;base64,...",
  "heatmapId": "uuid"
}
```

**Proces:**

1. Modtager floorplan ID og målinger
2. Henter floorplan fra database
3. Skriver målinger til temp JSON fil
4. Kalder Python script via `spawn`
5. Returnerer genereret heatmap som base64 og URL

### 3. Forenklet Frontend

**Fil:** `frontend/HeatmapView.html`

**Fjernet:**

- ❌ Kompleks canvas-baseret rendering (500+ linjer)
- ❌ Gradient bereg ninger med radier og opacity
- ❌ AP filtering og selection logic
- ❌ Double-range sliders
- ❌ Real-time measurement list

**Tilføjet:**

- ✅ Simpel kontrolpanel med:
  - Farveskema selector
  - Min/max værdi inputs
  - "Generer Heatmap" knap
- ✅ Loading spinner under generering
- ✅ Display af genereret PNG image
- ✅ Error handling med brugervenlige beskeder
- ✅ Measurement count badge
- ✅ Information om RBF interpolation

**Ny størrelse:** ~270 linjer (fra 640+)

### 4. Python Dependencies

**Fil:** `backend/requirements.txt`

```txt
numpy>=1.21.0
scipy>=1.7.0
matplotlib>=3.4.0
Pillow>=9.0.0
```

## Fordele ved Ny Løsning

### 1. Videnskabelig Præcision

- **RBF Interpolation:** Radial Basis Functions giver matematisk korrekt interpolation mellem målepunkter
- **Smooth Gradients:** Naturlige overgange mellem signalstyrker
- **Predictive Accuracy:** Bedre estimering af signalstyrke i umålte områder

### 2. Professionel Visualisering

- **Matplotlib:** Industry-standard plotting bibliotek
- **Customizable Colormaps:** Mange validerede farveskemaer
- **High-Quality Output:** Vector-quality rendering, skalerer perfekt
- **Scientific Standards:** Colorbar, legends, proper scaling

### 3. Performance

- **Server-side Rendering:** Tung beregning foregår på backend
- **Cached Results:** Genererede heatmaps kan gemmes og genbruges
- **Browser Efficiency:** Kun image display, ingen kompleks JavaScript

### 4. Maintainability

- **Separation of Concerns:** Beregning (Python) vs Display (HTML)
- **Reusable Script:** Python script kan køres standalone
- **Clear Dependencies:** Eksplicitte requirements
- **Testable:** Python unit tests mulige

## Anvendelse

### For Brugere

1. Upload floorplan
2. Tilføj minimum 3 målepunkter
3. Gå til Heatmap view
4. Vælg farveskema og værdiområde
5. Klik "Generer Heatmap"
6. Vent på generering (typisk 2-5 sekunder)
7. Se resultatet

### For Udviklere

**Test Python script direkte:**

```bash
cd backend
python3 services/heatmap_generator.py \
  --floorplan uploads/floorplan.png \
  --measurements temp/measurements.json \
  --output temp/heatmap.png \
  --cmap RdYlGn \
  --vmin -90 \
  --vmax -30
```

**Start backend:**

```bash
cd backend
node index.js
```

**Test endpoint:**

```bash
curl -X POST http://localhost:4000/api/heatmap/generate \
  -H "Content-Type: application/json" \
  -d '{
    "floorPlanId": "...",
    "measurements": [...],
    "options": {"colormap": "RdYlGn"}
  }'
```

## Migration Notes

### Data Kompatibilitet

✅ Fuld bagudkompatibilitet - samme measurement data struktur bruges:

```json
{
  "id": 1,
  "x": 100,
  "y": 200,
  "rssi": -65,
  "signalStrength": -65,
  "ssid": "MyWiFi",
  "bssid": "AA:BB:CC:DD:EE:FF"
}
```

### Database

Ingen ændringer til database schema - bruger eksisterende:

- `FloorPlans` table
- `MeasurementPoints` table
- `Heatmaps` table (til at gemme genererede heatmaps)

## Konfiguration

### Colormap Options

- `RdYlGn` - Rød-Gul-Grøn (default, bedst til WiFi)
- `RdYlBu` - Rød-Gul-Blå
- `viridis` - Perceptually uniform
- `plasma` - High contrast
- `inferno` - Warm tones
- `hot` - Heat colors
- `cool` - Cool colors

### Signal Range

Standard: -90 dBm til -30 dBm

- Kan justeres per heatmap
- Påvirker farveskala men ikke interpolation

## Fremtidige Forbedringer

### Mulige Udvidelser

1. **Multiple Metrics:** RSSI, throughput, jitter, packet loss
2. **Time Series:** Animerede heatmaps over tid
3. **Comparison Mode:** Side-by-side før/efter
4. **Export Formats:** PDF, SVG, høj-res PNG
5. **Advanced Options:** Interpolation method, smoothing factor
6. **Batch Processing:** Generer multiple heatmaps samtidig
7. **Contour Lines:** Isolinjer for signalstyrker

### Optimering

- Cache Python process for hurtigere respons
- WebSocket for real-time progress
- Progressive rendering for store floorplans

## Teknisk Reference

### RBF Interpolation

```python
from scipy.interpolate import Rbf
rbf = Rbf(x_coords, y_coords, signal_values, function='linear')
interpolated_signal = rbf(grid_x, grid_y)
```

**Function Options:**

- `linear` - Brugt som default (god balance)
- `cubic` - Glattere, men kan overshoot
- `thin_plate` - Meget glat, langsom
- `multiquadric` - God for spredte punkter

### Matplotlib Setup

```python
matplotlib.use('Agg')  # Non-interactive backend
fig, ax = plt.subplots(figsize=(width/dpi, height/dpi), dpi=dpi)
ax.imshow(floorplan)
ax.imshow(heatmap_data, alpha=0.6, cmap='RdYlGn')
plt.savefig(output_path, dpi=300, bbox_inches='tight')
```

## Troubleshooting

### Python Script Errors

**Problem:** "Failed to load floor plan"
**Løsning:** Check at ImagePath i database peger på eksisterende fil

**Problem:** "Need at least 3 measurement points"
**Løsning:** Tilføj flere målepunkter før generering

**Problem:** "Interpolation failed"
**Løsning:** Check at målepunkter ikke er identiske koordinater

### Backend Errors

**Problem:** "python3: command not found"
**Løsning:** Installer Python 3 eller opdater PATH

**Problem:** "ModuleNotFoundError: No module named 'scipy'"
**Løsning:** `pip3 install -r backend/requirements.txt`

### Frontend Errors

**Problem:** Heatmap vises ikke
**Løsning:** Check browser console, verificer backend kører på port 4000

**Problem:** "Failed to generate heatmap"
**Løsning:** Check backend logs for Python script errors

## Dato og Version

**Implementeret:** December 9, 2025
**Version:** 2.0.0
**Baseret på:** python-wifi-survey-heatmap by jantman
