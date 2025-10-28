## Running the code

### Prerequisites
- Node.js installed
- **Wi-Fi permissions** (Windows may require admin privileges for Wi-Fi scanning)
- Available Wi-Fi networks for testing

### Installation
1. Run `npm i` to install dependencies
2. Run `npm run dev` to start development servers (frontend + backend)

### Testing
Run `node test-signalstyrke.js` to test the signal strength API

### API Endpoints
- `POST /api/measurement-points` - Create measurement point with Wi-Fi scan
- `GET /api/measurement-points/:id` - Get measurement point with signal data
- `GET /api/measurement-points` - List all measurement points
- `GET /api/health` - Health check

### Dependencies
- `express` - Web server framework
- `node-wifi` - Cross-platform Wi-Fi scanning
- `concurrently` - Run multiple commands
- `vite` - Frontend build tool  