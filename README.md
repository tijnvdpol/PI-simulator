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
| Werkbank (React, SVG) | `src/bench`, `src/ui` |
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

## Kleuren

Alle kleuren staan als thema-tokens in `src/styles/theme.css`. Een test (`no-hardcoded-colors.test.ts`) zorgt dat er geen
`#rrggbb`-waarden buiten dat bestand terechtkomen.

## Deployen (Vercel)

Importeer de repo in Vercel als statische Vite-site. `vercel.json` bevat de build-opdracht, de uitvoermap (`dist`) en de
COOP/COEP-headers. Er is geen backend.

## Later (nog niet gebouwd)

RGB-led, servo, OLED-scherm, afstandssensor, breadboard-modus met losse draden en weerstanden, opdrachten, RPi.GPIO.
Het ontwerp houdt hier al rekening mee: draden zijn eigen objecten (`src/bench/wires.ts`), het projectbestand heeft een
versienummer met een migratiepunt, en uitgangen zijn waarden tussen 0 en 1.
