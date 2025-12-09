# WiFi Mapper Database Dokumentation

## Relationel Databasemodel

Denne database følger det relationelle databaseskema som er defineret for WiFi Mapper systemet.

### Tabeller og Relationer

#### FLOOR_PLAN

Hovedtabellen for etage planer.

**Kolonner:**

- `FloorPlanId` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - Unik identifikator for etage planen
- `Name` (TEXT, NOT NULL) - Navn på etage planen
- `CreationDate` (DATETIME, DEFAULT CURRENT_TIMESTAMP) - Oprettelsesdato

**Relationer:**

- En FLOOR_PLAN kan have mange ROOM (1:\*)
- En FLOOR_PLAN kan have mange MEASURINGPOINT (1:\*)
- En FLOOR_PLAN kan have mange HEATMAP (1:\*)

#### ROOM

Repræsenterer rum på en etage plan.

**Kolonner:**

- `RoomId` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - Unik identifikator for rummet
- `Name` (TEXT, NOT NULL) - Navn på rummet
- `FloorPlanId` (INTEGER, NOT NULL, FOREIGN KEY) - Reference til FLOOR_PLAN

**Relationer:**

- Mange ROOM tilhører én FLOOR_PLAN (\*:1)

#### MEASURINGPOINT

Repræsenterer målinger af WiFi signalstyrke på specifikke positioner.

**Kolonner:**

- `MeasuringpointId` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - Unik identifikator for målepunktet
- `Name` (TEXT) - Navn på målepunktet (valgfrit)
- `X` (REAL, NOT NULL) - X-koordinat position hvor målingen blev taget
- `Y` (REAL, NOT NULL) - Y-koordinat position hvor målingen blev taget
- `CreatedAt` (DATETIME, DEFAULT CURRENT_TIMESTAMP) - Oprettelsesdato
- `UpdatedAt` (DATETIME, DEFAULT CURRENT_TIMESTAMP) - Sidst opdateret
- `ScanStatus` (TEXT, DEFAULT 'pending') - Status for WiFi scanning (pending, scanning, done, error)
- `FloorPlanId` (INTEGER, NOT NULL, FOREIGN KEY) - Reference til FLOOR_PLAN

**Relationer:**

- Mange MEASURINGPOINT tilhører én FLOOR_PLAN (\*:1)
- En MEASURINGPOINT kan have mange ACCESS_POINT_READING (1:\*)

#### ACCESS_POINT_READING

Repræsenterer individuelle WiFi access point målinger for et målepunkt.

**Kolonner:**

- `AccessPointReadingId` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - Unik identifikator for målingen
- `Ssid` (TEXT) - WiFi netværksnavn (SSID)
- `Bssid` (TEXT) - MAC adresse for access point (BSSID)
- `Rssi` (REAL) - Modtaget signalstyrke indikator (dBm)
- `Frequency` (REAL) - Frekvens i MHz
- `Channel` (INTEGER) - WiFi kanal nummer
- `MeasuringPointId` (INTEGER, NOT NULL, FOREIGN KEY) - Reference til MEASURINGPOINT

**Relationer:**

- Mange ACCESS_POINT_READING tilhører én MEASURINGPOINT (\*:1)

#### HEATMAP

Repræsenterer genererede heatmaps for visualisering.

**Kolonner:**

- `HeatmapId` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - Unik identifikator for heatmap
- `GenerationDate` (DATETIME, DEFAULT CURRENT_TIMESTAMP) - Genereringsdato
- `FloorPlanId` (INTEGER, NOT NULL, FOREIGN KEY) - Reference til FLOOR_PLAN

**Relationer:**

- Mange HEATMAP tilhører én FLOOR_PLAN (\*:1)

---

## Database Operationer

### FLOOR_PLAN Operationer

- `createFloorPlan(name)` - Opret ny etage plan
- `getAllFloorPlans()` - Hent alle etage planer
- `getFloorPlan(id)` - Hent specifik etage plan
- `updateFloorPlan(id, name)` - Opdater etage plan
- `deleteFloorPlan(id)` - Slet etage plan (cascade sletning)

### ROOM Operationer

- `createRoom(name, floorPlanId)` - Opret nyt rum
- `getRoomsByFloorPlan(floorPlanId)` - Hent alle rum for en etage plan
- `getRoom(id)` - Hent specifikt rum
- `updateRoom(id, name)` - Opdater rum
- `deleteRoom(id)` - Slet rum

### MEASURINGPOINT Operationer

- `createMeasuringPoint(name, x, y, floorPlanId, scanStatus)` - Opret nyt målepunkt
- `getMeasuringPointsByFloorPlan(floorPlanId)` - Hent alle målepunkter for en etage plan
- `getMeasuringPoint(id)` - Hent specifikt målepunkt
- `getAllMeasuringPoints()` - Hent alle målepunkter
- `updateMeasuringPoint(id, name, x, y, scanStatus)` - Opdater målepunkt
- `updateMeasuringPointStatus(id, scanStatus)` - Opdater kun målepunkt status
- `deleteMeasuringPoint(id)` - Slet målepunkt

### ACCESS_POINT_READING Operationer

- `createAccessPointReading(ssid, bssid, rssi, frequency, channel, measuringPointId)` - Opret ny WiFi måling
- `getAccessPointReadingsByMeasuringPoint(measuringPointId)` - Hent alle målinger for et målepunkt
- `getAccessPointReading(id)` - Hent specifik måling
- `deleteAccessPointReading(id)` - Slet specifik måling
- `deleteAccessPointReadingsByMeasuringPoint(measuringPointId)` - Slet alle målinger for et målepunkt

### HEATMAP Operationer

- `createHeatmap(floorPlanId)` - Opret nyt heatmap
- `getHeatmapsByFloorPlan(floorPlanId)` - Hent alle heatmaps for en etage plan
- `getHeatmap(id)` - Hent specifikt heatmap
- `deleteHeatmap(id)` - Slet heatmap

---

## API Endpoints

### FLOOR_PLAN Endpoints

- `POST /api/floor-plans` - Opret ny etage plan
- `GET /api/floor-plans` - Hent alle etage planer
- `GET /api/floor-plans/:id` - Hent specifik etage plan
- `PUT /api/floor-plans/:id` - Opdater etage plan
- `DELETE /api/floor-plans/:id` - Slet etage plan
- `DELETE /api/floor-plans` - Slet alle etage planer (admin)

### ROOM Endpoints

- `POST /api/floor-plans/:floorPlanId/rooms` - Opret nyt rum
- `GET /api/floor-plans/:floorPlanId/rooms` - Hent alle rum for etage plan
- `PUT /api/rooms/:id` - Opdater rum
- `DELETE /api/rooms/:id` - Slet rum

### MEASURINGPOINT Endpoints

- `POST /api/floor-plans/:floorPlanId/measuring-points` - Opret nyt målepunkt
- `GET /api/floor-plans/:floorPlanId/measuring-points` - Hent alle målepunkter for etage plan
- `GET /api/measuring-points` - Hent alle målepunkter
- `GET /api/measuring-points/:id` - Hent specifikt målepunkt
- `PUT /api/measuring-points/:id` - Opdater målepunkt (name, x, y, scanStatus)
- `PATCH /api/measuring-points/:id/status` - Opdater kun målepunkt status
- `DELETE /api/measuring-points/:id` - Slet målepunkt

### ACCESS_POINT_READING Endpoints

- `POST /api/measuring-points/:measuringPointId/readings` - Opret ny WiFi måling
- `GET /api/measuring-points/:measuringPointId/readings` - Hent alle målinger for målepunkt
- `GET /api/readings/:id` - Hent specifik måling
- `DELETE /api/readings/:id` - Slet måling

### HEATMAP Endpoints

- `POST /api/floor-plans/:floorPlanId/heatmaps` - Opret nyt heatmap
- `GET /api/floor-plans/:floorPlanId/heatmaps` - Hent alle heatmaps for etage plan
- `DELETE /api/heatmaps/:id` - Slet heatmap

### Measurement Points Router (fra dataStore.js)

- `POST /api/measurement-points` - Opret målepunkt med WiFi scan
- `GET /api/measurement-points` - List alle målepunkter (lightweight)
- `GET /api/measurement-points/:id` - Hent specifikt målepunkt med readings

### Database Backup Endpoints

- `GET /api/database/info` - Hent database information
- `POST /api/database/export` - Eksporter database til JSON
- `POST /api/database/copy` - Kopier database fil

---

## Foreign Key Relationer

Databasen anvender CASCADE DELETE for at sikre referentiel integritet:

1. Når en FLOOR_PLAN slettes:

   - Alle tilknyttede ROOM slettes automatisk
   - Alle tilknyttede MEASURINGPOINT slettes automatisk
   - Alle tilknyttede HEATMAP slettes automatisk

2. Når en MEASURINGPOINT slettes:
   - Alle tilknyttede ACCESS_POINT_READING slettes automatisk

---

## Database Placering

Databasen kan placeres forskellige steder afhængigt af miljøvariabler:

1. **DB_PATH** - Fuld sti til database fil
2. **DB_DIR** + **DB_FILE** - Brugerdefineret mappe og filnavn
3. **USE_SYSTEM_DB_PATH=true** - Anvend OS-specifik app data mappe
4. **Standard** - Lokal projekt database mappe (backward compatible)

---

## Backup og Restore

### JSON Export Format

Backups gemmes i JSON format med følgende struktur:

```json
{
  "floorPlans": [...],
  "rooms": [...],
  "measuringPoints": [...],
  "accessPointReadings": [...],
  "heatmaps": [...],
  "exportDate": "ISO-8601 timestamp"
}
```

### Database Info

`getDatabaseInfo()` returnerer:

- `path` - Sti til database fil
- `size` - Filstørrelse
- `created` - Oprettelsesdato
- `modified` - Senest modificeret dato
- `floorPlanCount` - Antal etage planer
- `measuringPointCount` - Antal målepunkter
- `readingCount` - Antal WiFi målinger
- `roomCount` - Antal rum
- `accessPointCount` - Antal access points
- `measuringPointCount` - Antal målepunkter
- `heatmapCount` - Antal heatmaps
