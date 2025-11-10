# robot-wifi-mapper — Linux quickstart

Quick, minimal instructions to get the project running on Debian/Ubuntu.

Prerequisites
- Node 20.x (recommended)
- npm (bundled)

Install system deps:

```bash
sudo apt update
sudo apt install -y build-essential python3 pkg-config libsqlite3-dev libssl-dev wireless-tools iw network-manager curl git
```

Install Node (nvm recommended) and project deps:

```bash
# install nvm (optional)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
source ~/.bashrc
nvm install 20

npm install
```

Run

```bash
# backend only
npm run dev:backend

# frontend only
npm run dev:frontend

# both (dev)
npm run dev
```

Verify

```bash
curl http://localhost:4000/api/health
# expect: { "status": "ok", "time": "..." }
```

Notes
- `better-sqlite3` requires Node 20+, so prefer Node 20 to avoid engine warnings.
- `node-wifi` uses `nmcli`/`iwlist`; ensure `nmcli`/`iwlist` exist. If scans fail due to permissions you can run the server as root or give node capabilities:

```bash
sudo setcap cap_net_raw,cap_net_admin+eip "$(which node)"
```

- Database: SQLite files are created in `backend/database/`. Exports/backups go to `exports/`.
