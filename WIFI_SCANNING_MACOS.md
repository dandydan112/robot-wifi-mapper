# Wi-Fi Scanning på macOS - Teknisk Dokumentation

## Problemet: Hvorfor virker node-wifi ikke på macOS?

### Forventet Funktionalitet

`node-wifi` npm pakken **burde** kunne scanne Wi-Fi netværk på macOS, Windows og Linux. På Windows virker den perfekt og returnerer en liste af alle tilgængelige netværk med SSID, BSSID, signalstyrke (RSSI), kanal, frekvens osv.

### Faktisk Adfærd på macOS

På macOS returnerer `node-wifi.scan()`:

- **Ingen fejl** - funktionen kører uden exceptions
- **Tom array** - `[]` i stedet for netværksliste
- **Ingen diagnostik** - ingen fejlbeskeder der forklarer hvorfor

## Årsagen: macOS Security Model

### Windows vs macOS - Forskellige sikkerhedsmodeller

#### Windows

- Bruger `netsh wlan show networks mode=bssid` kommando
- **Kræver IKKE admin/sudo** rettigheder
- Virker "out of the box" for alle brugere
- Windows tillader alle apps at se tilgængelige netværk

#### macOS

- Bruger `/System/Library/PrivateFrameworks/Apple80211.framework`
- **KRÆVER admin/sudo** rettigheder fra macOS 10.14+ (Mojave)
- Apple har strammet sikkerhedspolitikken for Wi-Fi interface adgang
- Uden sudo: `node-wifi.scan()` returnerer en **tom liste** (ikke en fejl!)
- Med sudo: Virker som forventet

### Hvorfor har Apple strammet sikkerheden?

Fra macOS 10.14 (Mojave) og nyere:

1. **Privacy Protection** - Wi-Fi scanning kan afsløre brugerens placering
2. **Location Services** - Wi-Fi netværk er knyttet til location data
3. **Sandboxing** - Apps skal eksplicit bede om tilladelse
4. **Entitlements** - Kun signerede apps med specifikke entitlements kan scanne uden sudo

`node-wifi` kan ikke få adgang til Wi-Fi interfacet uden admin rettigheder, og returnerer derfor en tom liste.

## Hvorfor ikke bare bruge Python/CoreWLAN script?

Vi overvejede at lave et Python script med PyObjC der bruger CoreWLAN framework direkte:

```python
from CoreWLAN import CWInterface
interface = CWInterface.interface()
networks = interface.scanForNetworksWithName_error_(None, None)[0]
```

### Problemer med Python-tilgangen

1. **PyObjC skal installeres** - ekstra dependency (`pip3 install pyobjc-framework-CoreWLAN`)
2. **Python miljø issues** - systemets Python vs Homebrew vs pyenv vs venv
3. **Stadig kræver sudo** - CoreWLAN API kræver også admin rettigheder for scanning
4. **Kompleksitet** - ekstra script at vedligeholde, fejlhåndtering på tværs af sprog
5. **Deployment** - skal sikre Python + PyObjC er installeret på alle maskiner

**Konklusion:** Det giver ingen fordel - vi skal stadig bruge sudo, men med ekstra kompleksitet.

## Den Rigtige Løsning

### Løsning 1: Brug system_profiler (ANBEFALET - INGEN SUDO NØDVENDIG) ✅

```bash
npm run dev:backend
```

**Fordele:**

- **Ingen sudo nødvendig!**
- Built-in macOS kommando
- Returnerer alle synlige netværk
- Virker out-of-the-box

**Ulemper:**

- Langsom (5-10 sekunder per scan)
- Mangler præcis RSSI data (bruger default -70 dBm)
- JSON output inkluderer ikke signalstyrke for alle netværk

**Implementation:**
`wifiScanner.js` prøver flere metoder i rækkefølge:

1. `node-wifi` (fejler på macOS uden sudo)
2. `airport -s` (fejler uden sudo - kun returnerer warning)
3. `airport -s` uden sudo (fejler)
4. **`system_profiler SPAirPortDataType -json`** ✅ VIRKER UDEN SUDO

**Status:** ✅ Dette virker uden sudo og er den anbefalede løsning

### Løsning 2: Kør backend med sudo (hvis du vil have hurtigere scanning)

```bash
sudo npm run dev:backend
```

**Fordele:**

- Potentielt hurtigere med `airport` utility
- Samme som Løsning 1 i praksis (da `airport` er deprecated)

**Ulemper:**

- Kræver password ved opstart
- Sikkerhedsrisiko
- **Giver ingen fordel** siden `airport` er deaktiveret af Apple

**Status:** ⚠️ Ikke nødvendigt - brug Løsning 1 i stedet

### Strategi 2: Brug macOS Native Tools ✅

Implementer fallback der bruger macOS's egne kommandoer:

#### 2a. Python + CoreWLAN Framework

Apple's `CoreWLAN` framework er det officielle API til Wi-Fi på macOS.

```python
import objc
from CoreWLAN import CWInterface

interface = CWInterface.interface()
networks = interface.scanForNetworksWithName_error_(None, None)[0]
```

**Fordele:**

- Officielt Apple API
- Returnerer komplet data (SSID, BSSID, RSSI, kanal, sikkerhed)
- Ingen sudo nødvendig for scanning
- Stabilt og vedligeholdt af Apple

**Ulemper:**

- Kræver Python 3 + PyObjC installeret
- Ekstra dependency
- Platform-specifik kode

#### 2b. system_profiler SPAirPortDataType

```bash
system_profiler SPAirPortDataType -json
```

**Fordele:**

- Built-in macOS kommando
- JSON output
- Ingen ekstra dependencies

**Ulemper:**

- **Langsom** (5-10 sekunder)
- Returnerer ikke altid RSSI
- Verbose output

#### 2c. Swift Native Executable

Kompilér et lille Swift program der bruger CoreWLAN.

**Fordele:**

- Hurtig
- Ingen runtime dependencies
- Native performance

**Ulemper:**

- Skal kompileres for hver platform
- Ekstra build step

## Implementeret Løsning

Vi har valgt **hybrid tilgang med fallbacks**:

```javascript
// Prioriteret rækkefølge:
1. node-wifi (med timeout) - virker hvis sudo eller rettigheder OK
2. Python + CoreWLAN - primær macOS løsning
3. system_profiler - langsom backup
4. airport kommando - deprecated men kan stadig virke
```

### Hvorfor Python + CoreWLAN?

1. **Reliable**: CoreWLAN er Apple's officielle API
2. **Complete Data**: Returnerer alt vi har brug for
3. **No Sudo**: Fungerer uden administratorrettigheder
4. **Maintained**: Apple vedligeholder CoreWLAN
5. **Fast**: ~1-2 sekunder for komplet scan

### Kode Struktur

```
backend/services/
├── wifiScanner.js          # Main scanning logic med fallbacks
└── macos_wifi_scan.py      # CoreWLAN wrapper script
```

## Installation Requirements

### macOS

```bash
# Check hvis PyObjC er installeret:
python3 -c "import objc; print('OK')" 2>/dev/null || echo "Install needed"

# Installer PyObjC hvis mangler:
pip3 install pyobjc-framework-CoreWLAN
# eller
pip3 install pyobjc
```

### Windows

Ingen ekstra dependencies - `node-wifi` virker out-of-the-box.

### Linux

```bash
# nmcli er typisk pre-installeret
sudo apt-get install network-manager  # hvis mangler
```

## Testing

Test hver scanning metode individuelt:

```bash
# Test node-wifi
cd backend
node -e "const wifi = require('node-wifi'); wifi.init({iface: null}); wifi.scan((err, networks) => console.log(networks?.length || 'FAILED'))"

# Test Python CoreWLAN
python3 backend/services/macos_wifi_scan.py

# Test system_profiler
system_profiler SPAirPortDataType -json

# Test airport (deprecated)
/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s
```

## Konklusion

`node-wifi` er **ikke forældet eller broken** - den virker stadig på macOS **hvis** Node.js processen har de nødvendige rettigheder. Men Apple's sikkerhedsmodel gør det upraktisk for normale developer workflows.

Ved at tilføje native macOS fallbacks (primært Python + CoreWLAN) får vi:

- ✅ Cross-platform kompatibilitet
- ✅ Ingen sudo påkrævet
- ✅ Pålidelig scanning på alle platforme
- ✅ Samme data format (normaliseret i JavaScript)

## Fremtidige Forbedringer

1. **Swift Executable**: Kompilér et Swift program i build step
2. **Electron Integration**: Hvis vi laver desktop app, brug Electron's native APIs
3. **Permissions Prompt**: Bed om location permission ved første kørsel
4. **Cached Results**: Cache scan resultater i 10-30 sekunder

## References

- [node-wifi GitHub](https://github.com/friedrith/node-wifi)
- [Apple CoreWLAN Framework](https://developer.apple.com/documentation/corewlan)
- [PyObjC Documentation](https://pyobjc.readthedocs.io/)
- [macOS Network Programming Guide](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/NetworkingTopics/)
