# Database Schema Migration Summary

## Overview

Successfully refactored the database from the old schema to the new relational schema as specified. The system maintains the same functionality with improved data structure.

## Schema Changes

### 1. MEASURINGPOINT Table (Refactored)

**Old Structure:**

- Position (REAL)
- SignalStrength (REAL)
- AccessPointId (FK to ACCESS_POINT)

**New Structure:**

- Name (TEXT)
- X (REAL)
- Y (REAL)
- CreatedAt (DATETIME)
- UpdatedAt (DATETIME)
- ScanStatus (TEXT)
- FloorPlanId (FK to FLOOR_PLAN)

**Key Changes:**

- Now directly linked to FLOOR_PLAN instead of ACCESS_POINT
- Position split into X, Y coordinates
- SignalStrength removed (moved to readings)
- Added Name, timestamps, and scan status tracking

### 2. ACCESS_POINT Table (Removed)

The old ACCESS_POINT table has been completely removed. Its functionality is replaced by ACCESS_POINT_READING.

### 3. ACCESS_POINT_READING Table (New)

**Structure:**

- AccessPointReadingId (PK)
- Ssid (TEXT) - WiFi network name
- Bssid (TEXT) - MAC address
- Rssi (REAL) - Signal strength in dBm
- Frequency (REAL) - Frequency in MHz
- Channel (INTEGER) - WiFi channel number
- MeasuringPointId (FK to MEASURINGPOINT)

**Purpose:**

- Stores individual WiFi access point readings for each measuring point
- Multiple readings can exist per measuring point
- Captures detailed WiFi information for each scan

### 4. FLOOR_PLAN, ROOM, HEATMAP (Unchanged)

These tables maintain their original structure.

## Relationship Changes

### Old Relationships:

```
FLOOR_PLAN (1) ---> (*) ACCESS_POINT (1) ---> (*) MEASURINGPOINT
```

### New Relationships:

```
FLOOR_PLAN (1) ---> (*) MEASURINGPOINT (1) ---> (*) ACCESS_POINT_READING
```

## API Endpoint Changes

### Removed Endpoints:

- `POST /api/floor-plans/:floorPlanId/access-points`
- `GET /api/floor-plans/:floorPlanId/access-points`
- `PUT /api/access-points/:id`
- `DELETE /api/access-points/:id`
- `POST /api/access-points/:accessPointId/measuring-points`
- `GET /api/access-points/:accessPointId/measuring-points`

### New Endpoints:

#### MEASURINGPOINT Endpoints:

- `POST /api/floor-plans/:floorPlanId/measuring-points` - Create measuring point
- `GET /api/floor-plans/:floorPlanId/measuring-points` - List measuring points by floor plan
- `GET /api/measuring-points` - List all measuring points
- `GET /api/measuring-points/:id` - Get specific measuring point
- `PUT /api/measuring-points/:id` - Update measuring point (name, x, y, scanStatus)
- `PATCH /api/measuring-points/:id/status` - Update only scan status
- `DELETE /api/measuring-points/:id` - Delete measuring point

#### ACCESS_POINT_READING Endpoints:

- `POST /api/measuring-points/:measuringPointId/readings` - Create WiFi reading
- `GET /api/measuring-points/:measuringPointId/readings` - List readings for measuring point
- `GET /api/readings/:id` - Get specific reading
- `DELETE /api/readings/:id` - Delete reading

## Database Operations Changes

### New Operations:

#### MEASURINGPOINT:

- `createMeasuringPoint(name, x, y, floorPlanId, scanStatus)`
- `getMeasuringPointsByFloorPlan(floorPlanId)`
- `getAllMeasuringPoints()`
- `updateMeasuringPoint(id, name, x, y, scanStatus)`
- `updateMeasuringPointStatus(id, scanStatus)`

#### ACCESS_POINT_READING:

- `createAccessPointReading(ssid, bssid, rssi, frequency, channel, measuringPointId)`
- `getAccessPointReadingsByMeasuringPoint(measuringPointId)`
- `getAccessPointReading(id)`
- `deleteAccessPointReading(id)`
- `deleteAccessPointReadingsByMeasuringPoint(measuringPointId)`

### Removed Operations:

- All ACCESS_POINT CRUD operations

## DataStore Integration

The `dataStore.js` service has been updated to:

- Use the new database schema instead of JSON file storage
- Create/retrieve measuring points using the database
- Store WiFi readings as ACCESS_POINT_READING records
- Maintain backward compatibility with existing API consumers
- Auto-create a default floor plan if needed

## Cascade Delete Behavior

### Updated Cascade Rules:

1. Deleting a FLOOR_PLAN cascades to:

   - All ROOM records
   - All MEASURINGPOINT records
   - All HEATMAP records

2. Deleting a MEASURINGPOINT cascades to:
   - All ACCESS_POINT_READING records

## Migration Notes

### Data Migration Required:

If you have existing data in the old schema, you will need to:

1. Export existing data using the old schema
2. Transform the data structure:
   - Convert ACCESS_POINT + MEASURINGPOINT pairs to new MEASURINGPOINT records
   - Create ACCESS_POINT_READING records from the signal strength data
3. Import into the new schema

### Breaking Changes:

- All API endpoints related to access-points have changed
- Frontend code will need updates to work with new endpoints
- Database structure is incompatible with old schema

## Testing Recommendations

1. Test measuring point creation with X, Y coordinates
2. Test WiFi scanning and reading storage
3. Test measuring point status updates
4. Test cascade deletes for floor plans
5. Test backward compatibility with measurement-points router
6. Verify all CRUD operations for readings

## Benefits of New Schema

1. **Better Data Organization**: Measuring points are now first-class citizens directly linked to floor plans
2. **More Flexible**: Multiple WiFi readings can be associated with each measuring point
3. **Clearer Semantics**: X, Y coordinates and scan status are more explicit
4. **Improved Tracking**: Timestamps (CreatedAt, UpdatedAt) enable better audit trails
5. **Scalable**: Can easily add more reading types or measuring point attributes

## Files Modified

1. `/backend/database/db.js` - Schema and operations
2. `/backend/index.js` - API endpoints
3. `/backend/services/dataStore.js` - Integration layer
4. `/DATABASE_DOKUMENTATION.md` - Documentation
