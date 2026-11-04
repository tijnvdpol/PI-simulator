# Pi-simulator

Een virtuele Raspberry Pi in je browser. Je sleept een led, knop, buzzer, temperatuursensor, potmeter, dimbare led, RGB-led, servo,
afstandssensor of OLED-scherm naar de werkbank, verbindt ze met de pinnen van de Pi en programmeert ze in Python — zonder echte hardware.
Alle teksten zijn Nederlands.

## Starten

```bash
npm install        # kopieert ook Pyodide naar public/pyodide (postinstall)
npm run dev        # http://localhost:5173
npm test           # Vitest (inclusief de tests van de nep-gpiozero, die in Pyodide draaien)
npm run build      # productiebuild in dist/
```

Rooktest in een echte browser (Chromium via Playwright, tegen de productiebuild):

```bash
npm run build && node scripts/smoke.mjs
```

## Hoe het werkt

| Onderdeel | Waar |
|---|---|
| Werkbank-staat (onderdelen, draden, waarschuwingen) | `src/bench` |
| Werkbank in 3D (three + react-three-fiber) | `src/bench3d` |
| Schermindeling, editor, console | `src/ui` |
| Python-motor (Pyodide in een Web Worker) | `src/engine` |
| Nep-`gpiozero` (Python, zelfde API als de echte) | `src/python/gpiozero` |
| Projectbestand (JSON, met versienummer en omzetting van oudere versies) | `src/project` |
| Aansluitingen per onderdeel, geschikte pinnen, meldingen | `src/bench/terminals.ts`, `src/bench/partStatus.ts` |
| Nep-`luma` (OLED) | `src/python/luma` |

- De hoofdthread en de worker delen een `SharedArrayBuffer` (`HardwareState`). Zo zijn knoppen en sensoren leesbaar terwijl Python
  in een `while True:` met `sleep` zit. Daarvoor moet de pagina **cross-origin-isolated** zijn: de headers
  `Cross-Origin-Opener-Policy: same-origin` en `Cross-Origin-Embedder-Policy: require-corp` staan in `vite.config.ts` (dev + preview)
  en `vercel.json`. Pyodide en de lettertypes worden daarom zelf gehost.
- **Stop** beëindigt de worker (ook bij een oneindige lus) en start meteen een nieuwe; alle onderdelen gaan uit.
- Pyodide heeft geen threads. `blink()`, `beep()`, `when_pressed` en `pause()` draaien daarom op een eigen scheduler
  (`src/python/gpiozero/_scheduler.py`) terwijl je code wacht in `sleep()` of `pause()`.
- Beperking: omdat er geen threads zijn, lopen `blink()`/`beep()`/`when_pressed` alleen vooruit zolang je code wacht (`sleep`, `pause`, `wait_for_press`). Een lus zonder `sleep` laat ze stilstaan; zet er een korte `sleep(0.01)` in.
- De nep-gpiozero kent `LED`, `PWMLED`, `RGBLED`, `Button`, `Buzzer`, `Servo`, `AngularServo`, `DistanceSensor` en `MCP3008`.
  Temperatuursensor en potmeter zijn analoge onderdelen op een MCP3008-kanaal: `(MCP3008(channel=0).voltage - 0.5) * 100` geeft
  graden Celsius. Daarnaast is er een nep-`luma` (`luma.core.interface.serial.i2c`, `luma.core.render.canvas`, `luma.oled.device.ssd1306`)
  met echte Pillow (`ImageDraw`, `ImageFont`) voor het OLED-scherm.
- Projecten worden opgeslagen in `localStorage`, kunnen als bestand worden gedownload/geïmporteerd en gedeeld via een link
  (het project zit gecomprimeerd met lz-string in de URL-hash).

## De 3D-werkbank

De werkbank is 3D (`src/bench3d`) en wordt lazy geladen, tegelijk met Pyodide. De staat (`src/bench`) is niet veranderd: de 3D-weergave
leest dezelfde onderdelen, pin-opstelling en live-waarden als de 2D-versie deed.

- **Maten:** de printplaat is 85 × 56 mm met een 2×20-header van 2,54 mm steek (`geometry.ts`). 1 mm = 8 werkbankeenheden, dus
  opgeslagen `x`/`y` van onderdelen blijven kloppen. Elke pin heeft een bekende 3D-positie (`pinWorld`); draden eindigen daar precies.
- **Modellen** (`models/`): alles opgebouwd uit vormen, geen downloads en geen logo op de printplaat. Elk onderdeel is één component met
  de props `{ part, live }`, zodat er later een glTF-model voor in de plaats kan. De 40 pinnen zijn één `InstancedMesh`.
- **Tekenen:** `frameloop="demand"`; er wordt alleen getekend als er iets verandert (zie de rooktest). Zonder WebGL staat er een melding.
- **Bedienen:** slepen en neerzetten klikt vast op een raster van 4 mm naast de Pi; aansluiten gaat via het pinmenu (klik op een
  onderdeel); `Tab` naar de onderdelenlijst werkt voor wie geen muis gebruikt (Enter kiest, Delete verwijdert, spatie drukt een knop in).
- **Labels en schuifjes** zijn gewone HTML die per frame op hun 3D-plek wordt gezet (`OverlayProjector`), geen drei-`Html`.
- `?debug` achter de url maakt de renderer beschikbaar als `window.__pisimGl` (aantal frames, tekenaanroepen); de rooktest gebruikt dat.

## Kleuren

Alle kleuren staan als thema-tokens in `src/styles/theme.css`. Een test (`no-hardcoded-colors.test.ts`) zorgt dat er geen
`#rrggbb`-waarden buiten dat bestand terechtkomen. De 3D-scène leest haar kleuren uit die tokens (`bench3d/palette.ts`).

## Deployen (Vercel)

Importeer de repo in Vercel als statische Vite-site. `vercel.json` bevat de build-opdracht, de uitvoermap (`dist`) en de
COOP/COEP-headers. Er is geen backend.

## Fase 2: meer onderdelen

| Onderdeel | Aansluitingen | In je code | In 3D |
|---|---|---|---|
| Dimbare led | signaal | `PWMLED(18)`, `.value` 0–1, `.pulse()`, `.blink(fade_in_time=…)` | gloed en licht volgen de helderheid |
| RGB-led | R, G, B, GND | `RGBLED(17, 27, 22)`, `.color = (r, g, b)` | de koepel krijgt de mengkleur |
| Servo | signaal, 5V, GND | `Servo(18)` (−1…1) en `AngularServo(18, min_angle=0, max_angle=180)` | de arm draait over 180° mee |
| Afstandssensor HC-SR04 | trigger, echo, 5V, GND | `DistanceSensor(echo=24, trigger=23, max_distance=4)` | schuifje 2–400 cm; een voorwerp schuift mee (logaritmisch, want 4 m past niet op de tafel) |
| OLED 128×64 (SSD1306, I²C) | SDA, SCL, 3V3, GND | `ssd1306(i2c(port=1, address=0x3C))`, `with canvas(device) as draw:` | het beeld staat als textuur op het scherm |

- **Meerdere aansluitingen:** een onderdeel heeft nu `connections` (per aansluiting een pin of kanaal) in plaats van één `connection`.
  De tabel met aansluitingen staat in `src/bench/terminals.ts`: per aansluiting het soort (GPIO, 5V, 3V3, GND), de geschikte pinnen,
  een voorstel en de uitleg waarom. Het pinmenu toont per aansluiting wat past, markeert het voorstel (OLED → GPIO 2/SDA en GPIO 3/SCL)
  en heeft een knop "Sluit alles voorgesteld aan". Bij de oude onderdelen blijft het soepele gedrag van fase 1.
- **Meldingen:** een ongeschikte pin wordt geweigerd met uitleg wat er nodig is en waarom; een servo zonder 5V krijgt een waarschuwing;
  een onderdeel waar nog iets aan mist krijgt een oranje rand en een regel eronder. Onderdelen met eigen voeding doen pas mee als alles
  goed is aangesloten (servo blijft stil, OLED is zwart, de afstandssensor hoort niets).
- **Projectbestand versie 2:** projecten en deellinks uit fase 1 worden bij het openen automatisch omgezet (`src/project/parse.ts`,
  `migrations[1]`); bewaren schrijft altijd versie 2. De tests gebruiken een echte fase-1-deellink (`src/project/fase1Fixtures.ts`).
- **Pillow:** de wheel voor Pyodide (`vendor/pyodide`, 1 MB, uit de officiële Pyodide-release) wordt door `npm install` naast Pyodide
  in `public/pyodide` gezet en bij het opstarten van de worker geladen.
- **Voorbeelden:** stoplicht, dimmer, kleurenmixer, servo-wijzer, parkeersensor en weerstation, naast de drie uit fase 1. Ze draaien allemaal
  automatisch in de tests (op een virtuele klok) zonder fouten of waarschuwingen.

### Beperkingen van fase 2

- Eén OLED per project, alleen `ssd1306` op I²C-adres 0x3C (ook 128×32, 96×16, 64×48 en 64×32 mogen in je code; ze tekenen linksboven op het
  128×64-scherm). Andere chips (`sh1106`, …) geven een `ImportError`.
- Anders dan op een echte Pi (die het scherm bij het einde van het programma wist) blijft het laatste beeld staan tot je op Start of Stop drukt.
- De pulsbreedtes van een servo worden alleen gecontroleerd; de arm draait altijd over 180° (`value` −1…1 of `angle` min…max).
- Geen spanningsdeler op de echo-pin van de afstandssensor (op een echte Pi heb je die wel nodig); de sensor meldt altijd maximale afstand als hij
  geen stroom heeft.
- Een `LED`-programma mag op een dimbare led; een `PWMLED`-programma op een gewone led geeft een waarschuwing.

## Later (nog niet gebouwd)

Mooiere glTF-modellen (bijv. omgezet uit de KiCad 3D-bibliotheek), een rookwolkje in 3D voor de pro-modus, breadboard-modus met losse draden en weerstanden,
meer I²C-onderdelen en meerdere adressen, opdrachten, RPi.GPIO.
Het ontwerp houdt hier al rekening mee: draden zijn eigen objecten (`src/bench/wires.ts`), het projectbestand heeft een
versienummer met migraties, en uitgangen zijn waarden tussen 0 en 1.
