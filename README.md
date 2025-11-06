# WiFi Coverage Analysis App

This is a code bundle for WiFi Coverage Analysis App. The original project is available at https://www.figma.com/design/2gDoUgJelg9ApQjKj2Qk1W/WiFi-Coverage-Analysis-App.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

**Vigtig note**: Applikationen starter nu på http://localhost:5174 (frontend) og backend på port 4000.

Nedenstående ReadMe er genereret af Copilot.

### QuotaExceededError løst

- **Problem**: localStorage fyldte op og gav QuotaExceededError
- **Løsning**: Skiftet til SQLite database i stedet for localStorage
- **Resultat**: Ingen begrænsning på datamængde

### Gem-knap tilføjet

- **Placering**: I "Rapport & Eksport" siden
- **Funktion**: Gemmer projekt og rapport data til database
- **UI**: Grøn bekræftelse når gemt succesfuldt

### 📁 Stor Fil Håndtering (CAD/PDF Support)

- **Problem løst**: 413 Payload Too Large fejl
- **Support for**: CAD tegninger, PDF filer, store billeder (op til 100MB)
- **Auto-detektering**: Store filer (>10MB) uploades automatisk som filer
- **Fil typer**: JPEG, PNG, GIF, PDF, SVG
- **Storage**: Filer gemmes i `backend/uploads/` mappen
- **Database**: Gemmer fil URL i stedet for base64 data

## Database Funktionalitet

Applikationen bruger nu SQLite som lokal database til at gemme:

- **Projekter**: WiFi mapping projekter med navn og beskrivelse
- **Målinger**: WiFi signal målinger med koordinater og signal styrke
- **Kalibrering**: Gulvplan kalibrering data (understøtter både base64 og fil upload)
- **Rapporter**: Genererede WiFi coverage rapporter

### Database Features

- **Lokal database**: Hele databasen er gemt i filen `wifi-mapper.db`
- **Portabel**: Database filen kan kopieres til andre computere
- **Backup**: Eksporter/importer data som JSON eller kopier database filen
- **REST API**: Fuld API til CRUD operationer

### API Endpoints

#### Projekter

- `GET /api/projects` - Hent alle projekter
- `POST /api/projects` - Opret nyt projekt
- `GET /api/projects/:id` - Hent specifik projekt
- `PUT /api/projects/:id` - Opdater projekt
- `DELETE /api/projects/:id` - Slet projekt

#### Målinger

- `POST /api/projects/:id/measurements` - Tilføj måling til projekt
- `GET /api/projects/:id/measurements` - Hent alle målinger for projekt

#### Kalibrering

- `POST /api/projects/:id/calibration` - Gem kalibrering data
- `GET /api/projects/:id/calibration` - Hent kalibrering data

#### Rapporter

- `POST /api/projects/:id/reports` - Gem rapport
- `GET /api/projects/:id/reports` - Hent rapporter for projekt

#### Database Administration

- `GET /api/database/info` - Hent database information
- `POST /api/database/export` - Eksporter database som JSON
- `POST /api/database/copy` - Kopier database fil

### Test Database

Åbn `database-test.html` i en browser for at teste database funktionaliteten.

### Transport mellem computere

For at flytte projekter til en anden computer:

1. **Kopier hele `wifi-mapper.db` filen** (anbefalet)
2. **Eller brug JSON eksport** via `/api/database/export` endpoint

### Database placering

Database filen `wifi-mapper.db` gemmes i projektets rod directory.

## Running the database

Npm install sqlite3 better-sqlite3
