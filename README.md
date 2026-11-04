# Pi-simulator

Een virtuele Raspberry Pi in je browser. Je sleept een led, knop, buzzer, temperatuursensor of potmeter naar de werkbank,
verbindt ze met de pinnen van de Pi en programmeert ze in Python — zonder echte hardware. Alle teksten zijn Nederlands.

Een project is **Simpel** (onderdelen direct op een pin) of **Pro** (breadboard, jumperdraden en weerstanden, zoals in het echt). Je kiest dat bij *Nieuw*.

## Starten

```bash
npm install        # kopieert ook Pyodide naar public/pyodide (postinstall)
npm run dev        # http://localhost:5173
npm test           # Vitest (inclusief de tests van de nep-gpiozero, die in Pyodide draaien)
npm run build      # productiebuild in dist/
```

Rooktests in een echte browser (Chromium via Playwright, tegen de productiebuild):

```bash
npm run build && node scripts/smoke.mjs        # simpele modus
npm run build && node scripts/smoke-pro.mjs    # pro-modus (SMOKE_SHOTS=map voor schermafbeeldingen)
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
| Pro-modus: schakelingsanalyse (netlijst, oplosser), breadboard, undo/redo | `src/circuit` |
| Pro-werkbank in 3D (breadboard, draden, onderdelen met pootjes) | `src/bench3d/pro` |

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

## Pro-modus

De pro-modus bouwt een echte schakeling. **Alleen de werkbank bepaalt of een stroomkring klopt**; de Python-kant (Pyodide, nep-gpiozero) is
daarvoor niet veranderd, op één kleine melding na (zie *Pin-modus*).

- **Breadboard** (`circuit/breadboard.ts`, `bench3d/pro/Breadboard.tsx`): 30 kolommen met gaatjes in rijen van 5 (a–e en f–j, gescheiden door de groef) en vier stroomrails
  (+ en − boven en onder). De 400 aansluitpunten zijn één `InstancedMesh`. Ga je met de muis over een gaatje, dan lichten de intern verbonden gaatjes op.
- **Aansluitpunten** hebben een tekst-id: `pin:11`, `h:e12` (rij e, kolom 12), `r:t+:7` (railgat), `adc:0` (kanaal van de MCP3008-module).
  Een **draad** verbindt er twee; een **onderdeel** staat met zijn poten in gaatjes (anker + draaiing, de poten worden afgeleid).
- **Schakelingsanalyse** (`circuit/`, puur TypeScript, los testbaar):
  `netlist.ts` bouwt met union-find de netten (alle GND-pinnen, 3V3-pinnen en 5V-pinnen van de Pi zijn onderling één net); `solver.ts` is een kleine
  gelijkstroom-oplosser (nodale analyse; een led is een diode met 2,0 V drempel en 0,1 Ω); `analyze.ts` maakt er per onderdeel een uitslag en Nederlandse meldingen van.
  - Led: stroom `I = (3,3 V − 2 V) / R`. Geen weerstand of > 30 mA: de led **brandt door** (rookwolkje en rood flitsje, daarna zwart tot je op *Vervang led* klikt; dit staat niet in het projectbestand).
  - > 16 mA uit één GPIO: waarschuwing dat dit een echte Pi kan beschadigen. Led verkeerd om, open kring en een losse poot krijgen een hint.
  - **Kortsluiting** (3V3, 5V of een hoge GPIO op GND, ook via rails of een ingedrukte knop): duidelijke melding. Een lopend programma wordt **gestopt** (er is geen echte pauze zonder Python te wijzigen); Start is geblokkeerd tot de kortsluiting weg is.
  - Knoppen met `pull_up=True` (naar GND) en `pull_up=False` (naar 3V3), via een pull-up/-down van 50 kΩ. Een verkeerde combinatie merkt nooit iets, net als in het echt.
  - Temperatuursensor en potmeter werken alleen als ze stroom hebben (VCC op 3V3, GND op GND); een omgedraaide potmeter geeft de omgekeerde stand. Hun uitgang gaat met een draad naar een kanaal (`adc:0–7`) van de ingebouwde MCP3008-module.
- **Pin-modus:** `Button` en `LED` melden via `_hw.setMode` hoe een GPIO gebruikt wordt (uitgang, pull-up, pull-down). Dat is de enige Python-wijziging; het gedrag van de nep-gpiozero is gelijk gebleven.
- **Koppeling met Python** (`circuit/live.ts`, `circuit/useProRuntime.ts`): elke frame leest de werkbank wat Python met de pinnen doet, rekent de schakeling door en zet het resultaat
  (welk onderdeel op welke GPIO zit, knopstanden, sensorwaarden) in het gedeelde geheugen. Zo blijven de bekende waarschuwingen ("pin zonder onderdeel") werken.
- **Ongedaan maken / opnieuw:** Ctrl+Z en Ctrl+Y (`circuit/proState.ts`, geschiedenis van maximaal 100 stappen; doorbranden hoort er niet bij).
- **Bedienen:** onderdelen slepen uit de bak (spookbeeld toont waar de poten in vallen, rood als het niet past) of Enter in de bak; `R` draait; klik op een onderdeel voor de eigenschappen
  (weerstandswaarde met kleurringen in 3D, ledkleur); klik op een pin of gaatje en dan op een tweede voor een draad (kleur te kiezen, standaard rood = stroom, zwart = GND).
- **Projectbestand versie 2:** `mode: 'simple' | 'pro'`; een pro-project bewaart `pro: { parts, wires }` (anker, draaiing, weerstandswaarde, kleur). Oude bestanden (versie 1) worden bij het openen simpele projecten.
  Deellinks gebruiken compacte JSON (zonder inspringing); een test bewaakt dat de URL van de pro-voorbeelden onder 2000 tekens blijft.
- Beperkingen: één vast breadboard (halve maat); de MCP3008 is een ingebouwde module (geen chip met 16 poten op het bord); bouwen met alleen het toetsenbord kan voor onderdelen (Enter in de bak, lijst met onderdelen) maar niet voor draden.
- `?debug` achter de url geeft in de pro-modus ook `window.__pisimPro.screenOf(terminal)` voor de rooktest.

## Kleuren

Alle kleuren staan als thema-tokens in `src/styles/theme.css`. Een test (`no-hardcoded-colors.test.ts`) zorgt dat er geen
`#rrggbb`-waarden buiten dat bestand terechtkomen. De 3D-scène leest haar kleuren uit die tokens (`bench3d/palette.ts`).

## Deployen (Vercel)

Importeer de repo in Vercel als statische Vite-site. `vercel.json` bevat de build-opdracht, de uitvoermap (`dist`) en de
COOP/COEP-headers. Er is geen backend.

## Later (nog niet gebouwd)

Mooiere glTF-modellen (bijv. omgezet uit de KiCad 3D-bibliotheek), RGB-led, servo, OLED-scherm, afstandssensor, de MCP3008 als chip op het breadboard, draden met het toetsenbord, een echte pauze bij kortsluiting, opdrachten, RPi.GPIO.
Het ontwerp houdt hier rekening mee: het projectbestand heeft een versienummer met migraties en uitgangen zijn waarden tussen 0 en 1.
