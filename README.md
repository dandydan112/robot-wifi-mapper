# WiFi Coverage Analysis App

This repository contains the WiFi Coverage Analysis application. It provides a frontend UI (Vite) and a Node.js/Express backend that can perform Wi‑Fi scans and persist project data in a local SQLite database.

Live design reference: https://www.figma.com/design/2gDoUgJelg9ApQjKj2Qk1W/WiFi-Coverage-Analysis-App

## Quickstart

Prerequisites:
- Node.js (LTS recommended)

Installation:
1. Run `npm i` to install dependencies

Run the app:
1. Run `npm run dev` to start both backend and frontend (concurrently). The frontend runs on Vite (default http://localhost:5173) and the backend listens on the configured port (usually 4000).

Testing:
- A small test script is provided for quick Wi‑Fi scan checks (if available): `node backend/debug_scan.js`

## Features

- Frontend app to create projects, upload floor plans, add measurement points and generate heatmaps.
- Backend can perform Wi‑Fi scans and automatically create per-AP child measurement points for each scan.
- Stores projects, measurements, calibration and reports in a local SQLite database.
- Large file handling: uploads larger than ~10MB are stored as files in `backend/uploads/` and the database stores file URLs instead of base64.

## Important paths

- Database file (SQLite): `wifi-mapper.db` in project root (when enabled).
- Uploads directory: `backend/uploads/` (for large floorplans/files).

## API Highlights

- `POST /api/measurement-points` - Create a measurement point and trigger a Wi‑Fi scan (backend will create per-AP child points).
- `GET /api/measurement-points/:id` - Get a measurement point and its scan status/data.
- `GET /api/measurement-points` - List all measurement points.
- `GET /api/health` - Health check endpoint.

## Dependencies

- express - Web server framework
- node-wifi - Wi‑Fi scanning (platform dependent)
- concurrently - Run frontend and backend together during development
- vite - Frontend dev server/build tool
- sqlite3 / better-sqlite3 - SQLite drivers used for persistence

## Notes

- The project contains both a legacy localStorage code path and a newer SQLite-backed path. In development the app prefers the SQLite/database-backed APIs when available.

If you hit issues starting the dev servers, check `package.json` for the `dev` script and ensure no other process is locking the backend port (default 4000). Use PowerShell to find/stop processes if needed.

