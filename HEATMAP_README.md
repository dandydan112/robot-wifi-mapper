# WiFi Heatmap - Quick Start Guide

## 🎯 Hvad er nyt?

Heatmap funktionaliteten bruger nu **Python-baseret videnskabelig visualisering** med:

- ✅ **Scipy RBF interpolation** - Matematisk korrekt signalstyrke estimation
- ✅ **Matplotlib rendering** - Professionel, high-quality output
- ✅ **Konfigurerbare farveskemaer** - Flere scientific colormaps
- ✅ **Server-side processing** - Ingen tung JavaScript i browseren

## 🚀 Installation

### 1. Python Dependencies

```bash
cd backend
pip3 install -r requirements.txt
```

Dette installerer:

- numpy (numeriske beregninger)
- scipy (interpolation)
- matplotlib (visualisering)
- Pillow (image processing)

### 2. Verificer Installation

```bash
python3 services/heatmap_generator.py --help
```

Du skulle se hjælpe-teksten for scriptet.

## 📖 Anvendelse

### For Slutbrugere

1. **Start systemet:**

   ```bash
   # Terminal 1 - Backend
   cd backend
   node index.js

   # Terminal 2 - Frontend (hvis du bruger Vite)
   cd frontend
   npm run dev
   ```

2. **Opret projekt og upload floorplan**

3. **Tilføj minimum 3 målepunkter** med WiFi data

4. **Gå til Heatmap view**

5. **Konfigurer settings:**

   - Vælg farveskema (RdYlGn anbefales for WiFi)
   - Sæt min/max værdier (default: -90 til -30 dBm)

6. **Klik "Generer Heatmap"**
   - Systemet sender data til backend
   - Python script genererer heatmap
   - Billede vises i browseren (2-5 sekunder)

### For Udviklere

#### Test Python Script Direkte

Opret test data fil `test_measurements.json`:

```json
[
  { "id": 1, "x": 100, "y": 100, "rssi": -65 },
  { "id": 2, "x": 300, "y": 100, "rssi": -55 },
  { "id": 3, "x": 200, "y": 200, "rssi": -70 }
]
```

Kør scriptet:

```bash
python3 backend/services/heatmap_generator.py \
  --floorplan path/to/floorplan.png \
  --measurements test_measurements.json \
  --output test_heatmap.png \
  --cmap RdYlGn \
  --vmin -90 \
  --vmax -30
```

#### Test Backend API

```bash
curl -X POST http://localhost:4000/api/heatmap/generate \
  -H "Content-Type: application/json" \
  -d '{
    "floorPlanId": "your-floorplan-uuid",
    "measurements": [
      {"x": 100, "y": 100, "rssi": -65},
      {"x": 300, "y": 100, "rssi": -55},
      {"x": 200, "y": 200, "rssi": -70}
    ],
    "options": {
      "colormap": "RdYlGn",
      "vmin": -90,
      "vmax": -30
    }
  }'
```

## 🎨 Farveskemaer

| Colormap   | Beskrivelse          | Bedst til                   |
| ---------- | -------------------- | --------------------------- |
| **RdYlGn** | Rød-Gul-Grøn         | WiFi signalstyrke (default) |
| RdYlBu     | Rød-Gul-Blå          | Alternativ til RdYlGn       |
| viridis    | Perceptually uniform | Farveblinde-venlig          |
| plasma     | Høj kontrast         | Print/præsentationer        |
| inferno    | Varme toner          | Intensitet                  |
| hot        | Heat colors          | Klassisk heat map           |
| cool       | Kølige toner         | Omvendt heat map            |

## 📊 Data Format

Heatmap generator forventer målinger i dette format:

```json
{
  "id": 1,
  "x": 150, // X koordinat på floorplan
  "y": 200, // Y koordinat på floorplan
  "rssi": -65, // Signal strength i dBm
  "signalStrength": -65, // Alternative field
  "ssid": "MyWiFi", // Optional
  "bssid": "AA:BB:CC:DD:EE:FF" // Optional
}
```

**Mindste krav:**

- `x` og `y` koordinater
- `rssi` eller `signalStrength` værdi
- Minimum **3 målepunkter** for interpolation

## 🔧 Konfiguration

### Signal Range Guidelines

| dBm Range    | Signal Quality | Recommendation |
| ------------ | -------------- | -------------- |
| -30 til -50  | Fremragende    | Grøn zone      |
| -51 til -70  | God            | Gul zone       |
| -71 til -85  | Svag           | Orange zone    |
| -86 til -100 | Meget svag     | Rød zone       |

### Python Script Options

```
--metric METRIC       Metric to visualize (default: rssi)
--cmap CMAP          Colormap name (default: RdYlGn)
--vmin VMIN          Minimum value for color scale
--vmax VMAX          Maximum value for color scale
```

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'scipy'"

```bash
pip3 install scipy numpy matplotlib Pillow
```

### "Failed to load floor plan"

- Check at floorplan filen eksisterer
- Verificer sti i database er korrekt
- Supported formats: PNG, JPG, GIF

### "Need at least 3 measurement points"

- Tilføj flere målepunkter
- Minimum 3 for RBF interpolation
- 5-10 anbefales for bedre accuracy

### Heatmap vises ikke i frontend

1. Check backend kører på port 4000
2. Åbn browser console for fejl
3. Verificer CORS settings i backend

### Python script timeout

- Store floorplans kan tage længere tid
- Øg timeout i backend/index.js hvis nødvendigt
- Typisk 5-10 sekunder er nok

## 📁 Fil Struktur

```
backend/
├── services/
│   └── heatmap_generator.py    # Python heatmap generator
├── uploads/
│   └── temp/                   # Generated heatmaps gemmes her
├── requirements.txt            # Python dependencies
└── index.js                    # Backend med /api/heatmap/generate

frontend/
└── HeatmapView.html           # Simpel UI til heatmap display
```

## 🚦 Status & Performance

### Typisk Genererings Tid

- 3-5 målepunkter: **2-3 sekunder**
- 10-20 målepunkter: **3-5 sekunder**
- 50+ målepunkter: **5-10 sekunder**

### Output Quality

- **DPI:** 100 (default, kan justeres)
- **Format:** PNG med alpha transparency
- **Size:** Matcher floorplan dimensions
- **Quality:** Production-ready

## 📚 Yderligere Ressourcer

- **Scipy RBF Documentation:** https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.Rbf.html
- **Matplotlib Colormaps:** https://matplotlib.org/stable/tutorials/colors/colormaps.html
- **Original python-wifi-survey-heatmap:** https://github.com/jantman/python-wifi-survey-heatmap

## 💡 Tips & Tricks

1. **Bedre Interpolation:** Flere målepunkter = mere accurate heatmap
2. **Jævn Fordeling:** Spred målepunkter ud over hele floorplan
3. **Corner Points:** Tilføj målepunkter i hjørner for fuld coverage
4. **Colormap Choice:** RdYlGn er mest intuitiv for WiFi (grøn=godt, rød=dårligt)
5. **Value Range:** Justér vmin/vmax baseret på dine faktiske målinger

## 📝 Changelog

### Version 2.0.0 (December 9, 2025)

- ✨ Komplet omskrivning til Python-baseret løsning
- ✨ RBF interpolation for scientific accuracy
- ✨ Multiple colormap support
- ✨ Server-side rendering
- 🗑️ Fjernet kompleks JavaScript canvas rendering
- 📉 Reduceret frontend kode fra 640+ til ~270 linjer

---

**Need help?** Se `HEATMAP_OVERHAUL.md` for detaljeret teknisk dokumentation.
