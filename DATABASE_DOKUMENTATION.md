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
- En FLOOR_PLAN kan have mange ACCESS_POINT (1:\*)
- En FLOOR_PLAN kan have mange HEATMAP (1:\*)

#### ROOM

Repræsenterer rum på en etage plan.

**Kolonner:**

- `RoomId` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - Unik identifikator for rummet
- `Name` (TEXT, NOT NULL) - Navn på rummet
- `FloorPlanId` (INTEGER, NOT NULL, FOREIGN KEY) - Reference til FLOOR_PLAN

**Relationer:**

- Mange ROOM tilhører én FLOOR_PLAN (\*:1)

#### ACCESS_POINT

Repræsenterer WiFi access points på en etage plan.

**Kolonner:**

- `AccessPointId` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - Unik identifikator for access point
- `InternetName` (TEXT, NOT NULL) - SSID/Internet navn (f.eks. WiFi netværksnavn)
- `Location` (REAL) - Placering på etage planen
- `FrequencyBand` (TEXT) - Frekvensbånd (f.eks. 2.4GHz, 5GHz)
- `MACAdress` (TEXT) - MAC adresse for access point
- `FloorPlanId` (INTEGER, NOT NULL, FOREIGN KEY) - Reference til FLOOR_PLAN

**Relationer:**

- Mange ACCESS_POINT tilhører én FLOOR_PLAN (\*:1)
- En ACCESS_POINT kan have mange MEASURINGPOINT (1:\*)

#### MEASURINGPOINT

Repræsenterer målinger af WiFi signalstyrke.

**Kolonner:**

- `MeasuringpointId` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - Unik identifikator for målepunktet
- `Position` (REAL, NOT NULL) - Position hvor målingen blev taget
- `SignalStrength` (REAL, NOT NULL) - Målte signalstyrke
- `AccessPointId` (INTEGER, NOT NULL, FOREIGN KEY) - Reference til ACCESS_POINT

**Relationer:**

- Mange MEASURINGPOINT tilhører én ACCESS_POINT (\*:1)

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

### ACCESS_POINT Operationer

- `createAccessPoint(internetName, location, frequencyBand, macAdress, floorPlanId)` - Opret nyt access point
- `getAccessPointsByFloorPlan(floorPlanId)` - Hent alle access points for en etage plan
- `getAccessPoint(id)` - Hent specifikt access point
- `updateAccessPoint(id, internetName, location, frequencyBand, macAdress)` - Opdater access point
- `deleteAccessPoint(id)` - Slet access point

### MEASURINGPOINT Operationer

- `createMeasuringPoint(position, signalStrength, accessPointId)` - Opret nyt målepunkt
- `getMeasuringPointsByAccessPoint(accessPointId)` - Hent alle målepunkter for et access point
- `getMeasuringPoint(id)` - Hent specifikt målepunkt
- `updateMeasuringPoint(id, position, signalStrength)` - Opdater målepunkt
- `deleteMeasuringPoint(id)` - Slet målepunkt

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

### ACCESS_POINT Endpoints

- `POST /api/floor-plans/:floorPlanId/access-points` - Opret nyt access point
- `GET /api/floor-plans/:floorPlanId/access-points` - Hent alle access points for etage plan
- `PUT /api/access-points/:id` - Opdater access point
- `DELETE /api/access-points/:id` - Slet access point

### MEASURINGPOINT Endpoints

- `POST /api/access-points/:accessPointId/measuring-points` - Opret nyt målepunkt
- `GET /api/access-points/:accessPointId/measuring-points` - Hent alle målepunkter for access point
- `PUT /api/measuring-points/:id` - Opdater målepunkt
- `DELETE /api/measuring-points/:id` - Slet målepunkt

### HEATMAP Endpoints

- `POST /api/floor-plans/:floorPlanId/heatmaps` - Opret nyt heatmap
- `GET /api/floor-plans/:floorPlanId/heatmaps` - Hent alle heatmaps for etage plan
- `DELETE /api/heatmaps/:id` - Slet heatmap

### Database Backup Endpoints

- `GET /api/database/info` - Hent database information
- `POST /api/database/export` - Eksporter database til JSON
- `POST /api/database/copy` - Kopier database fil

---

## Foreign Key Relationer

Databasen anvender CASCADE DELETE for at sikre referentiel integritet:

1. Når en FLOOR_PLAN slettes:

   - Alle tilknyttede ROOM slettes automatisk
   - Alle tilknyttede ACCESS_POINT slettes automatisk
   - Alle tilknyttede HEATMAP slettes automatisk

2. Når en ACCESS_POINT slettes:
   - Alle tilknyttede MEASURINGPOINT slettes automatisk

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
  "accessPoints": [...],
  "measuringPoints": [...],
  "heatmaps": [...],
  "measurementPoints": {...},
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
- `roomCount` - Antal rum
- `accessPointCount` - Antal access points
- `measuringPointCount` - Antal målepunkter
- `heatmapCount` - Antal heatmaps
