# Pi-simulator

Een virtuele Raspberry Pi in je browser. Je sleept een led, knop, buzzer, temperatuursensor of potmeter naar de werkbank,
verbindt ze met de pinnen van de Pi en programmeert ze in Python — zonder echte hardware. Alle teksten zijn Nederlands.

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
| Projectbestand (JSON, met versienummer) | `src/project` |

- De hoofdthread en de worker delen een `SharedArrayBuffer` (`HardwareState`). Zo zijn knoppen en sensoren leesbaar terwijl Python
  in een `while True:` met `sleep` zit. Daarvoor moet de pagina **cross-origin-isolated** zijn: de headers
  `Cross-Origin-Opener-Policy: same-origin` en `Cross-Origin-Embedder-Policy: require-corp` staan in `vite.config.ts` (dev + preview)
  en `vercel.json`. Pyodide en de lettertypes worden daarom zelf gehost.
- **Stop** beëindigt de worker (ook bij een oneindige lus) en start meteen een nieuwe; alle onderdelen gaan uit.
- Pyodide heeft geen threads. `blink()`, `beep()`, `when_pressed` en `pause()` draaien daarom op een eigen scheduler
  (`src/python/gpiozero/_scheduler.py`) terwijl je code wacht in `sleep()` of `pause()`.
- Beperking: omdat er geen threads zijn, lopen `blink()`/`beep()`/`when_pressed` alleen vooruit zolang je code wacht (`sleep`, `pause`, `wait_for_press`). Een lus zonder `sleep` laat ze stilstaan; zet er een korte `sleep(0.01)` in.
- De nep-gpiozero kent `LED`, `Button`, `Buzzer` en `MCP3008`. Temperatuursensor en potmeter zijn analoge onderdelen op een
  MCP3008-kanaal: `(MCP3008(channel=0).voltage - 0.5) * 100` geeft graden Celsius.
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

## Later (nog niet gebouwd)

Mooiere glTF-modellen (bijv. omgezet uit de KiCad 3D-bibliotheek), een rookwolkje in 3D voor de pro-modus, RGB-led, servo, OLED-scherm, afstandssensor, breadboard-modus met losse draden en weerstanden, opdrachten, RPi.GPIO.
Het ontwerp houdt hier al rekening mee: draden zijn eigen objecten (`src/bench/wires.ts`), het projectbestand heeft een
versienummer met een migratiepunt, en uitgangen zijn waarden tussen 0 en 1.
