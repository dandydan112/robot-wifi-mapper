## Quickstart:

### Prerequisites

- Node.js installed

### Installation

1. Run `npm i` to install dependencies

## Running the code

2. Run `npm run dev` to start development servers (frontend + backend)

3. Running the code on mac.

- sudo npm run dev:backend
- sudo npm run dev:frontend

### Testing

Run `node test-signalstyrke.js` in root to test the signal strength API

## Important paths

- Database file (SQLite): `wifi-mapper.db` in project root (when enabled).
- Uploads directory: `backend/uploads/` (for large floorplans/files).

### API Endpoints (full list)

Below is a full list of backend API endpoints implemented in this project. Paths are relative to the server root (for development the server listens on port 4000 by default).

General notes:

- All responses are JSON unless otherwise stated.
- Large payloads (uploads/base64) are accepted where noted; backend accepts JSON payloads with up to ~100MB.

Endpoints:

- GET /api/health

  - Description: Health check. Returns server status and timestamp.
  - Response: { status: 'ok', time: '<ISO timestamp>' }

- POST /api/upload

  - Description: Upload a file (floorplan or other). Multipart/form-data with field `file`.
  - Accepts: image/jpeg, image/png, image/gif, image/svg, application/pdf
  - Response: { message, file: { filename, originalname, mimetype, size, url } }

- DELETE /api/uploads/:filename

  - Description: Delete an uploaded file by filename.
  - Response: { message: 'Fil slettet' }

- POST /api/projects

  - Description: Create a project.
  - Body: { name: string, description?: string }
  - Response: { id, name, description }

- GET /api/projects

  - Description: List all projects.
  - Response: [ { id, name, description, ... } ]

- GET /api/projects/:id

  - Description: Get project details.
  - Response: { id, name, description, ... }

- PUT /api/projects/:id

  - Description: Update project's name/description.
  - Body: { name, description }
  - Response: { id, name, description }

- PATCH /api/projects/:id/status

  - Description: Update the project's status (e.g. 'draft', 'measuring', 'completed').
  - Body: { status: string }
  - Response: { id, status }

- DELETE /api/projects/:id

  - Description: Delete a single project and related data.
  - Response: { message }

- DELETE /api/projects

  - Description: Admin endpoint to delete all projects and related tables (measurements, calibrations, reports).
  - Response: { message, deletedProjects }

- POST /api/projects/:id/measurements

  - Description: Add a raw measurement to a project (legacy/local DB route).
  - Body: { x: number, y: number, signalStrength?: number, ssid?: string, frequency?: number }
  - Response: { id }

- GET /api/projects/:id/measurements

  - Description: Get all measurements for a project.
  - Response: [ { id, x, y, signalStrength, ssid, frequency, timestamp } ]

- POST /api/projects/:id/calibration

  - Description: Save calibration / floor plan data for a project. The body may include base64 image data or a file URL (if uploaded).
  - Body example: { floorPlanImage: '<base64 or url>', referencePoints?: [ ... ] }
  - Response: { message }

- GET /api/projects/:id/calibration

  - Description: Get calibration data for a project.
  - Response: { floor_plan_image|floor_plan_file_url, reference_points, ... }

- POST /api/projects/:id/reports

  - Description: Save a generated report (JSON payload depends on report type).
  - Body: { reportType: string, reportData: object }
  - Response: { id }

- GET /api/projects/:id/reports

  - Description: List saved reports for a project.
  - Response: [ { id, reportType, createdAt, ... } ]

- GET /api/database/info

  - Description: Database information and stats (when DB-backed mode is active).
  - Response: object with DB metadata.

- POST /api/database/export

  - Description: Export the database to a JSON file in `exports/`.
  - Response: { message, filename, path }

- POST /api/database/copy
  - Description: Copy the database file to `exports/` with a timestamped name.
  - Response: { message, filename, path }

Measurement points (scan-centric API)

- POST /api/measurement-points

  - Description: Create a measurement point and schedule a Wi‑Fi scan. The endpoint responds immediately with the created point; the scan runs in background and the server will create per-AP child measurement points when complete.
  - Body: { x: number, y: number, name?: string }
  - Response: created measurement point object (id, x, y, scan_status:'pending', createdAt ...)

- GET /api/measurement-points/:id

  - Description: Get a measurement point and its scan status/data.
  - Response: full measurement point object (includes scan_status, readings array when available)

- GET /api/measurement-points
  - Description: List all measurement points (lightweight objects). Each entry includes a small `readings` preview (first reading only) and `parentId` when the point is a child created from a scan.
  - Response: [ { id, name, x, y, scan_status, parentId, readings: [ { ssid, bssid, rssi, frequency } ], createdAt } ]

### Dependencies

- `express` - Web server framework
- `node-wifi` - Cross-platform Wi-Fi scanning
- `concurrently` - Run multiple commands
- `vite` - Frontend build tool
- `sqlite3 / better-sqlite3` - SQLite drivers used for persistence
