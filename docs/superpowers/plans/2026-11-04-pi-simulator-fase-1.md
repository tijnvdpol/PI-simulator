# Pi-simulator fase 1 — Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een statische website waarin beginners in de browser een virtuele Raspberry Pi samenstellen (led, knop, buzzer, temperatuursensor, potmeter) en in Python programmeren, zonder hardware.

**Architecture:** Vier losse modules: (1) werkbank in React, (2) Python-motor in een Pyodide-Web Worker, (3) een nep-`gpiozero` in Python, (4) een versie-gebonden JSON-projectbestand. Hoofdthread en worker delen een `SharedArrayBuffer` (`HardwareState`) zodat knoppen/sensoren leesbaar zijn terwijl Python in `while True` + `sleep` zit. Stop = worker `terminate()` + nieuwe worker (alvast "warm" voorgestart).

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS (v4, `@theme`-tokens), Pyodide (zelf gehost), CodeMirror 6 (`@codemirror/lang-python`), lz-string, Vitest (+ Testing Library/jsdom voor een paar UI-tests), Vercel (statisch).

**Spec:** De opdracht van de gebruiker uit de sessie van 2026-11-04 (niet als bestand opgeslagen). De eisen staan hieronder in *Global Constraints*.

## Global Constraints

- Alle teksten in de interface zijn **Nederlands**; doelgroep beginners; alleen laptop/desktop.
- Vite + React + TypeScript + Tailwind CSS; tests met **Vitest**. Geen backend, geen accounts; statische hosting op **Vercel**.
- Python via **Pyodide in een Web Worker**; code-editor **CodeMirror 6** met Python-ondersteuning.
- `SharedArrayBuffer` tussen hoofdthread en worker; **COOP/COEP-headers** voor zowel de Vite-devserver (dev + preview) als Vercel (`vercel.json`).
- **Stop = worker beëindigen en opnieuw opstarten**; daarna zijn alle onderdelen uit. Stop werkt ook bij een oneindige lus.
- Kleuren uitsluitend als **Tailwind-thema-tokens**, nooit hardcoded: achtergrond `#1e1f22`, panelen `#2b2d31`, randen `#3a3c42`, tekst `#e8e6df` / `#a3a29b`, Pi-printplaat `#1d6b3a`, pinnen `#ef9f27`, accent (Start, selectie) `#5dcaa5`, fout `#e24b4a`, waarschuwing `#ef9f27`.
- Lettertypes: Inter (interface), JetBrains Mono (code). Afgeronde hoeken **8px**, ruime knoppen, animaties **150–200ms**.
- Draadkleuren: rood = stroom, zwart = GND, andere kleuren = signaal.
- Pi 4/5 als SVG met alle **40 pinnen** (correcte pinout); hover toont pinnummer + GPIO-nummer + functie.
- Nep-`gpiozero` bootst de echte API na (LED, Button, Buzzer, MCP3008) zodat code later op een echte Pi werkt.
- Projectbestand: één JSON-formaat **met versienummer**; localStorage, download/import, deellink via lz-string in de URL-hash.
- Foutafhandeling: originele melding + Nederlandse uitleg met regelnummer; minimaal NameError, SyntaxError, IndentationError, TypeError. Technische melding inklapbaar onder het kaartje met icoon.
- Pin gebruikt in code zonder onderdeel → melding op de werkbank. Onderdeel op 5V/3V3/GND → waarschuwing met uitleg.
- Leeg project toont: "Sleep een led naar je Pi om te beginnen" + knop "Open een voorbeeld".
- **Niet bouwen:** RGB-led, servo, OLED, afstandssensor, breadboard/weerstanden/doorbranden, accounts, RPi.GPIO. Wel rekening mee houden (zie Task 13: draden zijn expliciete `Wire`-objecten).

## Besluiten die ik zelf heb genomen (graag bevestigen)

1. **Temperatuursensor = analoge sensor (TMP36-achtig) via de MCP3008**, net als de potmeter. Python: `MCP3008(channel=0).voltage` → `(voltage - 0.5) * 100` = °C. Het schuifje zet °C (−10…50).
2. **Pyodide en lettertypes worden zelf gehost** (`public/pyodide/` via postinstall-kopie, `@fontsource`), omdat `COEP: require-corp` externe CDN's anders blokkeert.
3. **Geen threads in Pyodide** → `blink()`, `beep()`, `when_pressed` en `pause()` draaien op een coöperatieve scheduler in de nep-gpiozero. `time.sleep` en `signal.pause` worden gepatcht om die scheduler te laten lopen.
4. **Werkbank is vergrendeld tijdens het draaien** (geen onderdelen plaatsen/verbinden); knoppen en schuifjes blijven bruikbaar.
5. Een onderdeel kiest een pin; de **GND-draad (en voor sensoren de 3V3-draad) wordt automatisch getekend**. Sensoren kiezen een MCP3008-kanaal (CH0–CH7); de MCP3008-chip verschijnt vanzelf met SPI-draden.
6. Python-tests draaien **in Vitest met Pyodide in Node** (geen pytest nodig).

## Review Focus

Invoer/omstandigheden die de opdracht impliceert maar geen taak vanzelf test, meest waarschijnlijk eerst:

1. **`print()` in een oneindige lus** vult de console met duizenden regels → console is begrensd (laatste 500 regels) en UI blijft bruikbaar. (Test in Task 18.)
2. **Pagina niet `crossOriginIsolated`** (geen headers, `file://`, oude browser) → vriendelijke melding in plaats van witte pagina. (Test in Task 12.)
3. **Kapotte, te nieuwe of lege deellink/importbestand** → duidelijke melding en het bestaande project in localStorage blijft onaangetast. (Test in Task 4.)
4. **Pin als `"GPIO17"`/`"BOARD11"`-tekst, buiten bereik (`LED(40)`), of twee keer gebruikt** → werkt resp. `GPIOPinInUse`/`PinInvalidPin` zoals echte gpiozero. (Tests in Task 7.)
5. **Pyodide laadt niet (offline/mislukt)** → foutmelding met knop "Opnieuw proberen"; Start blijft uitgeschakeld. (Test in Task 12.)

---

## Bestandsstructuur

```
index.html, vite.config.ts, vercel.json, package.json, tsconfig*.json
scripts/copy-pyodide.mjs            kopieert pyodide-bestanden naar public/pyodide (postinstall)
scripts/smoke.mjs                   Playwright-rooktest (alleen handmatige eindcontrole)
src/styles/theme.css                Tailwind @theme-tokens + fonts
src/pinout/pinout.ts                40 pinnen, GPIO-mapping, functies (NL)
src/project/{types,parse,share,storage}.ts   projectbestand (versie 1)
src/engine/hardwareState.ts         SharedArrayBuffer-indeling + HardwareBridge
src/engine/{boot,pythonFiles}.ts    Pyodide opstarten + .py-bestanden installeren (gedeeld door worker en tests)
src/engine/{worker,pythonEngine,protocol,environment}.ts
src/engine/explainError.ts          Nederlandse uitleg bij Python-fouten en pin-meldingen
src/engine/testing/pythonHarness.ts Pyodide-in-Node + FakeBridge (alleen tests)
src/python/gpiozero/*.py            nep-gpiozero
src/python/pisim/{patch,runner}.py  time.sleep/pause-patch + codeloper met gestructureerde fout
src/bench/{benchState,wires,warnings}.ts   puur logica (reducer, draden, waarschuwingen)
src/bench/components/*.tsx          Pi-SVG, onderdelen-SVG, draden, werkbank
src/ui/*.tsx                        App-shell, panelen, topbalk, console, foutkaartje, editor
src/examples/*.ts                   3 voorbeeldprojecten
src/audio/buzzer.ts                 Web Audio
```

---

### Task 1: Scaffolding, thema en headers

**Files:**
- Create: `package.json`, `vite.config.ts`, `vercel.json`, `index.html`, `src/main.tsx`, `src/styles/theme.css`, `scripts/copy-pyodide.mjs`, `.gitignore`, `src/headers.test.ts`, `src/no-hardcoded-colors.test.ts`

**Interfaces:**
- Produces: Tailwind-tokens `bg-bg`, `bg-panel`, `border-line`, `text-fg`, `text-fg-muted`, `bg-board`, `bg-gold`, `text-accent`/`bg-accent`, `text-danger`, `text-warning`, plus led-kleuren `led-red|green|yellow|blue|white`, draadkleuren `wire-red|black|blue|green|yellow|orange|purple`, neutrale metaaltinten `metal`, `metal-dark`; `--radius: 8px`; transitieduur `--dur: 180ms`.

- [ ] **Step 1: Schrijf falende tests**
  - `headers.test.ts`: `vercel.json` bevat voor `source: "/(.*)"` de headers `Cross-Origin-Opener-Policy: same-origin` en `Cross-Origin-Embedder-Policy: require-corp`; `vite.config.ts` zet dezelfde headers in `server.headers` én `preview.headers`.
  - `no-hardcoded-colors.test.ts`: geen enkel bestand onder `src/` behalve `src/styles/theme.css` bevat een `#rrggbb`-kleur.
- [ ] **Step 2: Draai `npx vitest run`** — verwacht FAIL (bestanden bestaan niet).
- [ ] **Step 3: Scaffold** Vite+React+TS, Tailwind v4, Vitest (jsdom + Testing Library), `lz-string`, CodeMirror-pakketten, `pyodide` (versie vastpinnen), `@fontsource-variable/inter`, `@fontsource/jetbrains-mono`. `scripts/copy-pyodide.mjs` kopieert `pyodide.asm.js/wasm`, `python_stdlib.zip`, `pyodide-lock.json`, `pyodide.mjs` naar `public/pyodide/` (in `.gitignore`, aangeroepen via `postinstall`). Zet de tokens uit *Global Constraints* in `theme.css`.
- [ ] **Step 4: Draai `npx vitest run && npm run build`** — verwacht PASS.
- [ ] **Step 5: Commit** `chore: scaffold vite/react/tailwind/vitest met thema en COOP/COEP-headers`

### Task 2: Pinout (40 pinnen)

**Files:** Create `src/pinout/pinout.ts`; Test `src/pinout/pinout.test.ts`

**Interfaces:**
- Produces:
  `type PinKind = 'gpio'|'5v'|'3v3'|'gnd'|'id'`
  `interface PiPin { physical: number; kind: PinKind; gpio: number|null; naam: string; functie: string }` (`functie` is Nederlandse uitleg, bv. "Voeding 5V — levert altijd stroom")
  `PINS: readonly PiPin[]` (40, index = physical−1), `pinByPhysical(n): PiPin`, `pinByGpio(g): PiPin|undefined`, `nearestGnd(physical: number): number`, `SPI_PINS = { mosi: 19, miso: 21, sclk: 23, ce0: 24 }` (fysieke nummers).

- [ ] **Step 1: Falende tests** — 40 pinnen; 2× `5v` (2, 4), 2× `3v3` (1, 17), 8× `gnd` (6, 9, 14, 20, 25, 30, 34, 39), 26× `gpio`, 2× `id` (27, 28); mapping `pinByPhysical(11).gpio === 17`, `(3)→2`, `(8)→14`, `(12)→18`, `(40)→21`, `(24)→8`; `pinByGpio(17).physical === 11`; elke `gpio` komt precies één keer voor; `nearestGnd(11) === 9`, `nearestGnd(40) === 39`; elke pin heeft een niet-lege `functie`.
- [ ] **Step 2: Draai** `npx vitest run src/pinout` — FAIL.
- [ ] **Step 3: Implementeer** de tabel (Pi 4/5 header) met NL-functies (I²C, SPI, UART, PWM waar van toepassing).
- [ ] **Step 4: Draai** de tests — PASS.
- [ ] **Step 5: Commit** `feat: pinout van de 40-pins header`

### Task 3: Projectmodel en validatie

**Files:** Create `src/project/types.ts`, `src/project/parse.ts`; Test `src/project/parse.test.ts`

**Interfaces:**
- Produces:
  `type PartKind = 'led'|'button'|'buzzer'|'temperature'|'potentiometer'`
  `type LedColor = 'red'|'green'|'yellow'|'blue'|'white'`
  `type Connection = { type:'pin'; physical:number } | { type:'adc'; channel:number }` (pin opgeslagen als **fysiek** nummer zodat ook voedingspinnen kunnen)
  `interface Part { id:string; kind:PartKind; x:number; y:number; color?:LedColor; connection:Connection|null }`
  `interface Project { version:1; name:string; parts:Part[]; code:string }`
  `type Result<T> = {ok:true; value:T} | {ok:false; error:string}` (error is Nederlands)
  `CURRENT_VERSION = 1`, `emptyProject(): Project`, `parseProject(raw: unknown): Result<Project>`, `serializeProject(p: Project): string`.

- [ ] **Step 1: Falende tests** — roundtrip `parseProject(JSON.parse(serializeProject(p)))` geeft gelijk project; ontbrekend `version` → `ok:false`; `version: 2` → error bevat "nieuwere versie"; onbekende `kind` → error; `connection.channel: 9` → error; `parts` geen array → error; extra onbekende velden worden genegeerd; `code` ontbreekt → `ok:false`.
- [ ] **Step 2: Draai** `npx vitest run src/project/parse` — FAIL.
- [ ] **Step 3: Implementeer** met handgeschreven validatie (geen zod; YAGNI). Houd een `migrations`-lijst klaar (leeg voor v1) zodat versie 2 later kan worden toegevoegd.
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: projectbestand v1 met validatie`

### Task 4: Opslag, bestand en deellink

**Files:** Create `src/project/share.ts`, `src/project/storage.ts`; Test `src/project/share.test.ts`, `src/project/storage.test.ts`

**Interfaces:**
- Consumes: `Project`, `parseProject`, `Result` (Task 3).
- Produces:
  `encodeShare(p: Project): string` (lz-string `compressToEncodedURIComponent`), `decodeShare(hash: string): Result<Project>` (accepteert `#p=…` en `p=…`), `buildShareUrl(p: Project, base: string): string`,
  `saveLocal(p: Project, store?: Storage): void`, `loadLocal(store?: Storage): Result<Project>|null`,
  `projectToBlob(p: Project): Blob`, `readProjectFile(file: File): Promise<Result<Project>>`.

- [ ] **Step 1: Falende tests** — share-roundtrip; `buildShareUrl` eindigt op `#p=…`; `decodeShare("#p=@@kapot")` → `ok:false` met NL-melding; lege hash → `ok:false`; `saveLocal`/`loadLocal` roundtrip met een in-memory `Storage`; `loadLocal` bij kapotte JSON → `ok:false` en **overschrijft niets**; `readProjectFile` met niet-JSON-bestand → `ok:false`; **Review Focus 3:** import van `version: 99` laat een eerder opgeslagen localStorage-project ongemoeid.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.** Sleutel in localStorage: `pi-simulator:project`. Geen automatisch overschrijven bij mislukte import.
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: opslaan, importeren en delen van projecten`

### Task 5: HardwareState (SharedArrayBuffer)

**Files:** Create `src/engine/hardwareState.ts`; Test `src/engine/hardwareState.test.ts`

**Interfaces:**
- Consumes: `Part`, `PartKind` (Task 3), `PINS` (Task 2).
- Produces:
  ```ts
  export const GPIO_COUNT = 28, ADC_CHANNELS = 8
  export class HardwareState {
    constructor(buffer?: SharedArrayBuffer | ArrayBuffer)   // standaard nieuwe SharedArrayBuffer
    readonly buffer: SharedArrayBuffer | ArrayBuffer
    setParts(parts: Part[]): void              // schrijft per GPIO/kanaal welk onderdeelsoort er zit
    partKindAtGpio(g: number): PartKind | null
    partKindAtChannel(c: number): PartKind | null
    setButtonPressed(g: number, pressed: boolean): void; isButtonPressed(g: number): boolean
    setOutput(g: number, level: number): void; getOutput(g: number): number   // 0..1
    setAdcRaw(c: number, raw: number): void; getAdcRaw(c: number): number    // 0..1023, afgekapt
    resetOutputs(): void
  }
  export interface HardwareBridge {
    now(): number; sleep(seconds: number): void
    partKindAtGpio(g: number): PartKind | null; partKindAtChannel(c: number): PartKind | null
    readButton(g: number): boolean; writeOutput(g: number, level: number): void; readAdc(c: number): number
    warn(code: 'pin-unconnected' | 'pin-wrong-kind', info: { pin: string; device: string; found?: string }): void
  }
  export function bridgeFromState(state: HardwareState, warn: HardwareBridge['warn']): HardwareBridge
  ```
  `sleep` in `bridgeFromState` gebruikt `Atomics.wait` op een eigen cel (alleen in worker aanroepbaar) en retourneert eerder niet; `now()` = `performance.now()/1000`. Een onderdeel op een voedingspin (`gpio === null`) wordt **niet** in de GPIO-tabel gezet.

- [ ] **Step 1: Falende tests** — twee `HardwareState`-views op dezelfde buffer zien elkaars writes; `setParts` met led op fysieke pin 11 → `partKindAtGpio(17) === 'led'`, en `partKindAtGpio(18) === null`; potmeter op kanaal 3 → `partKindAtChannel(3) === 'potentiometer'`; onderdeel op pin 2 (5V) verschijnt nergens; `setAdcRaw(0, 5000)` → `getAdcRaw(0) === 1023`; `resetOutputs` zet alle outputs op 0 maar laat ingangen staan; `bridgeFromState(...).sleep(0.05)` duurt ≥ 45 ms (echte `Atomics.wait` in Node).
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer** met één `Int32Array` over de buffer (secties: onderdeelsoorten, ingangen, uitgangen ×1000, ADC, sleep-cel).
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: gedeelde hardwarestatus via SharedArrayBuffer`

### Task 6: Python-testharnas (Pyodide in Node)

**Files:** Create `src/engine/boot.ts`, `src/engine/pythonFiles.ts`, `src/engine/testing/pythonHarness.ts`, `src/python/gpiozero/__init__.py` (leeg), `src/python/pisim/__init__.py` (leeg); Test `src/engine/pythonHarness.test.ts`

**Interfaces:**
- Consumes: `HardwareBridge` (Task 5).
- Produces:
  `installPythonFiles(pyodide): void` (schrijft alle `src/python/**/*.py` via `import.meta.glob('?raw')` naar `/home/pyodide/` en zet het op `sys.path`),
  `bootPython(pyodide, bridge: HardwareBridge): void` (registreert `_hw` via `pyodide.registerJsModule('_hw', bridge)`, installeert bestanden; **gedeeld door worker en tests**),
  Testharnas: `createHarness(opts?: { t0?: number }): Promise<Harness>` met
  `Harness { run(code: string): Promise<RunOutcome>; bridge: FakeBridge; stdout: string[] }`, en
  `FakeBridge` = `HardwareBridge` met virtuele klok (`sleep` verhoogt `now()` en roept `onTick(t)` aan, zodat tests knoppen/ADC op tijdstippen kunnen zetten), `outputs: Map<number,number[]>` (historie met tijdstempels), `warnings[]`, instelbare `parts`/`buttons`/`adc`, en `stopAfter(seconds)` (laat `sleep` een `TestTimeLimit`-fout gooien).
  `RunOutcome = { error: null } | { error: { type: string; message: string; line: number|null; traceback: string } }`.
  Laadt Pyodide **één keer per testbestand** (`beforeAll`).

- [ ] **Step 1: Falende test** — `await h.run("import gpiozero")` geeft `error: null`; `await h.run("print('hoi')")` zet `'hoi'` in `h.stdout`.
- [ ] **Step 2: Draai** `npx vitest run src/engine/pythonHarness` — FAIL.
- [ ] **Step 3: Implementeer** harnas en boot. Voorlopige `run` doet `pyodide.runPythonAsync` en vangt `PythonError` (wordt in Task 11 vervangen door `pisim.runner`).
- [ ] **Step 4: Draai** — PASS (eerste run mag enkele seconden duren).
- [ ] **Step 5: Commit** `test: pyodide-in-node harnas met nep-hardwarebrug`

### Task 7: Nep-gpiozero kern (scheduler, pinnen, patches)

**Files:** Create `src/python/gpiozero/{exc,_pins,_scheduler,devices}.py`, `src/python/pisim/patch.py`; Modify `src/python/gpiozero/__init__.py`, `src/engine/boot.ts` (roept `pisim.patch.install()` aan); Test `src/engine/gpiozero/core.test.ts`

**Interfaces:**
- Consumes: `Harness`, `FakeBridge` (Task 6).
- Produces (Python):
  `gpiozero.exc`: `GPIOZeroError`, `GPIODeviceError`, `GPIOPinInUse`, `PinInvalidPin`, `BadPinFactory`.
  `_pins.parse_pin(spec) -> int` (BCM) — accepteert `17`, `"GPIO17"`, `"17"`, `"BOARD11"`; anders `PinInvalidPin`; claimt pinnen (`claim(pin, device)` → `GPIOPinInUse` bij dubbel gebruik; `release(pin)`).
  `_scheduler`: `after(delay, fn) -> Handle`, `cancel(handle)`, `add_watcher(fn) -> Handle`, `wait(seconds)`, `wait_until(pred, timeout=None) -> bool`, `run_forever()`. De scheduler slaapt via `_hw.sleep` in stukjes van ≤ 10 ms, draait tussendoor verlopen timers en watchers, en laat fouten in callbacks doorlopen naar de gebruikerscode.
  `devices.Device` basisklasse: `__init__` claimt pin en roept `_hw.partKindAtGpio` aan; `close()`, `closed`, contextmanager-gedrag.
  `pisim.patch.install()`: vervangt `time.sleep` door `_scheduler.wait` (negatieve waarde → `ValueError` zoals echt) en zet `signal.pause = _scheduler.run_forever`.

- [ ] **Step 1: Falende tests** — `time.sleep(2)` verhoogt de virtuele klok met 2 s (±0,02); `from signal import pause` werkt; een `_scheduler.after(1.5, …)`-callback draait tijdens `sleep(2)` op t≈1.5; `parse_pin("GPIO17")==17`, `parse_pin("BOARD11")==17`, `parse_pin(40)` en `parse_pin("GPIO99")` → `PinInvalidPin`; dubbel claimen → `GPIOPinInUse` met tekst "already in use"; `close()` geeft de pin vrij; `stopAfter(1)` + `while True: sleep(0.1)` eindigt met `TestTimeLimit` (bewijst dat een lus de scheduler niet blokkeert). **Review Focus 4.**
- [ ] **Step 2: Draai** `npx vitest run src/engine/gpiozero/core` — FAIL.
- [ ] **Step 3: Implementeer** de modules.
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: nep-gpiozero kern met coöperatieve scheduler`

### Task 8: LED en Buzzer

**Files:** Create `src/python/gpiozero/output.py`; Modify `src/python/gpiozero/__init__.py` (export `LED`, `Buzzer`); Test `src/engine/gpiozero/output.test.ts`

**Interfaces:**
- Consumes: `Device`, `_scheduler`, `_pins` (Task 7), `bridge.warn`/`partKindAtGpio` (Task 5).
- Produces (Python), echte gpiozero-API: `LED(pin, *, active_high=True, initial_value=False)` en `Buzzer(pin, *, active_high=True, initial_value=False)` met `on()`, `off()`, `toggle()`, `blink(on_time=1, off_time=1, n=None, background=True)` (LED) / `beep(...)` (Buzzer, zelfde signatuur), `is_lit` (LED) / `is_active` (Buzzer), `value` (lees/schrijf), `close()`. Elke wijziging roept `_hw.writeOutput(gpio, 0|1)` aan. Bij constructie: ontbreekt een onderdeel op de pin → `_hw.warn('pin-unconnected', …)`; ander soort onderdeel → `'pin-wrong-kind'`. Nooit een exception (echte gpiozero faalt hier ook niet).

- [ ] **Step 1: Falende tests** — `LED(17).on()` → outputhistorie van pin 17 eindigt op 1; `off()` → 0; `toggle()` wisselt; `is_lit` klopt; `blink(0.5,0.5)` + `sleep(2)` geeft schakelmomenten 0, 0.5, 1.0, 1.5 (±0,02) en keert direct terug; `blink(n=2)` stopt na 2 keer; `blink(background=False, n=1)` blokkeert 1+1 s; nieuw `on()` na `blink()` stopt het knipperen; `close()` zet output op 0; `LED(17)` zonder onderdeel → exact één `pin-unconnected`-melding met `pin: "17"`, `device: "LED"`; onderdeel van soort `button` op die pin → `pin-wrong-kind` met `found: "button"`; `initial_value=True` zet direct hoog; Buzzer: `on/off/beep(0.2,0.2)` idem.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.** `blink` plant via `_scheduler.after` een wisselketen; `background=False` gebruikt `_scheduler.wait`.
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: nep-gpiozero LED en Buzzer`

### Task 9: Button

**Files:** Create `src/python/gpiozero/input.py`; Modify `__init__.py` (export `Button`); Test `src/engine/gpiozero/button.test.ts`

**Interfaces:**
- Consumes: `Device`, `_scheduler` (Task 7), `bridge.readButton`.
- Produces: `Button(pin, *, pull_up=True, bounce_time=None, hold_time=1)` met `is_pressed`, `value` (1/0), `wait_for_press(timeout=None) -> bool`, `wait_for_release(timeout=None) -> bool`, `when_pressed`, `when_released` (instelbare callbacks, nul-argument of één argument = het Button-object, zoals echt). Callbacks worden door een `_scheduler`-watcher aangeroepen zodra de toestand verandert (elke ≤10 ms poll). Waarschuwingen zoals Task 8.

- [ ] **Step 1: Falende tests** (de harnas-`onTick` zet de knop op t=2 in en t=2.5 uit) — `is_pressed` is False bij t=1 en True bij t=2.2; `wait_for_press()` keert terug op t≈2; `wait_for_press(timeout=1)` zonder druk geeft `False` na ≈1 s; `when_pressed = led.toggle` + `pause()` (met `stopAfter(5)`) toggelt de led precies één keer per indrukken; `when_released` idem; callback met één parameter krijgt het Button-object; fout in een callback bereikt de gebruiker als exception; `Button(2)` zonder onderdeel → `pin-unconnected`.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.**
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: nep-gpiozero Button met callbacks`

### Task 10: MCP3008

**Files:** Create `src/python/gpiozero/analog.py`; Modify `__init__.py` (export `MCP3008`); Test `src/engine/gpiozero/mcp3008.test.ts`

**Interfaces:**
- Consumes: `bridge.readAdc`, `bridge.partKindAtChannel`.
- Produces: `MCP3008(channel=0, differential=False, max_voltage=3.3, device=0)` met `raw_value` (0–1023), `value` (0.0–1.0), `voltage` (`value * max_voltage`), `channel`, `close()`. `channel` buiten 0–7 → `exc.SPIBadChannel` (subklasse van `GPIOZeroError`). Geen onderdeel op het kanaal → `pin-unconnected` (info `pin: "CH0"`, `device: "MCP3008"`). `differential=True` → `NotImplementedError` met uitleg (YAGNI).

- [ ] **Step 1: Falende tests** — adc 512 → `value ≈ 0.5005`, `raw_value == 512`, `voltage ≈ 1.652`; verandering van adc tijdens `sleep` wordt gelezen (harnas-`onTick`); `MCP3008(channel=8)` → `SPIBadChannel`; geen onderdeel → waarschuwing; **temperatuurvoorbeeld:** adc voor 25 °C (0,75 V → raw 931) geeft `(voltage - 0.5) * 100 ≈ 25` (±0,5).
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.**
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: nep-gpiozero MCP3008`

### Task 11: Codeloper en Nederlandse foutuitleg

**Files:** Create `src/python/pisim/runner.py`, `src/engine/explainError.ts`; Modify `src/engine/testing/pythonHarness.ts` (gebruikt `pisim.runner.run`); Test `src/engine/runner.test.ts`, `src/engine/explainError.test.ts`

**Interfaces:**
- Produces (Python): `pisim.runner.run(code: str) -> dict | None` — compileert als `"main.py"`, voert uit in een verse namespace; bij fout `{type, message, line, traceback}` (`line` = laatste frame in `main.py`, of `SyntaxError.lineno`; `None` als onbekend). `KeyboardInterrupt`/`SystemExit` worden niet als fout gemeld.
- Produces (TS):
  ```ts
  interface PythonErrorInfo { type: string; message: string; line: number|null; traceback: string }
  interface ErrorExplanation { titel: string; uitleg: string; regel: number|null; technisch: string }
  explainError(e: PythonErrorInfo): ErrorExplanation
  interface PinIssue { id: string; pin: string; message: string }
  explainPinWarning(w: { code: 'pin-unconnected'|'pin-wrong-kind'; pin: string; device: string; found?: string }): PinIssue
  explainPowerPin(part: { kind: PartKind }, pin: PiPin): string   // 5V/3V3/GND-uitleg
  ```

- [ ] **Step 1: Falende tests** — runner (echte Pyodide): `led.on()` zonder definitie → `{type:'NameError', line:1}`; code met ontbrekende dubbele punt (`if True\n  pass`) → `SyntaxError` met juiste `line`; `if True:\npass` → `IndentationError`; `len(5)` → `TypeError`; fout in diepe functie rapporteert de regel **in main.py**; succesvolle code → `None`.
  explainError: de **echte** meldingen uit de runner voeden `explainError`. Exacte verwachting: NameError op regel 4 met `led` → `uitleg` is "Regel 4: je gebruikt `led`, maar die heb je nog niet aangemaakt."; `regel === 4`; `technisch` bevat het originele `NameError: name 'led' is not defined`; IndentationError ("expected an indented block" en "unexpected indent") elk eigen uitleg; SyntaxError met "expected ':'" → uitleg noemt de dubbele punt; "was never closed" → noemt ontbrekend haakje; TypeError "not callable", "positional argument(s)" en "unsupported operand" elk eigen uitleg; onbekende fouttypes (bv. ZeroDivisionError, `GPIOPinInUse`) vallen terug op "Er ging iets mis" + het regelnummer + de technische tekst. `explainPowerPin` noemt bij pin 2 "5V" en dat Python die pin niet kan aansturen; `explainPinWarning` voor `pin-unconnected` noemt `GPIO17` en zegt dat er niets op zit.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer** runner en `explainError` (patronen op `message`, per fouttype; één lijst `[regex, (match, line) => uitleg]` per type).
- [ ] **Step 4: Draai** `npx vitest run src/engine` — PASS (inclusief alle eerdere gpiozero-tests).
- [ ] **Step 5: Commit** `feat: codeloper en Nederlandse foutuitleg`

### Task 12: PythonEngine, worker en omgevingscheck

**Files:** Create `src/engine/protocol.ts`, `src/engine/worker.ts`, `src/engine/pythonEngine.ts`, `src/engine/environment.ts`; Test `src/engine/pythonEngine.test.ts`, `src/engine/environment.test.ts`

**Interfaces:**
- Consumes: `HardwareState`, `bridgeFromState`, `bootPython` (Task 5/6), `PythonErrorInfo` (Task 11).
- Produces:
  ```ts
  type ToWorker = { type:'init'; buffer: SharedArrayBuffer } | { type:'run'; code: string }
  type FromWorker = { type:'ready' } | { type:'load-error'; message:string }
    | { type:'stdout'|'stderr'; text:string }
    | { type:'warn'; code:'pin-unconnected'|'pin-wrong-kind'; pin:string; device:string; found?:string }
    | { type:'done'; error: PythonErrorInfo|null }
  type EngineStatus = 'laden'|'klaar'|'draait'|'laadfout'
  interface WorkerLike { postMessage(m: ToWorker): void; terminate(): void; onmessage: ((e:{data:FromWorker})=>void)|null }
  class PythonEngine {
    constructor(o:{ state: HardwareState; createWorker: ()=>WorkerLike;
      onStatus(s:EngineStatus):void; onOutput(l:{stream:'stdout'|'stderr';text:string}):void;
      onWarn(w:Extract<FromWorker,{type:'warn'}>):void; onDone(e:PythonErrorInfo|null):void })
    start(code: string): void      // alleen bij status 'klaar'
    stop(): void                   // terminate, state.resetOutputs(), nieuwe worker (warm), status 'laden'→'klaar'
    retry(): void                  // na 'laadfout'
    readonly status: EngineStatus
  }
  checkEnvironment(g?: {crossOriginIsolated:boolean; SharedArrayBuffer?: unknown}): { ok:true } | { ok:false; melding:string }
  ```
  `worker.ts`: na `init` laadt Pyodide (`indexURL: '/pyodide/'`), `bootPython`, zet stdout/stderr door als `stdout`/`stderr`-berichten, stuurt `ready`; bij `run` roept het `pisim.runner.run` aan en stuurt `done`. De engine maakt direct bij constructie een worker ("warm") en bij elke `stop()` meteen een nieuwe.

- [ ] **Step 1: Falende tests** (fake `WorkerLike`) — start in status `laden`, na `ready` → `klaar`; `start(code)` stuurt `run` en zet `draait`; `done` → `klaar`; `stop()` tijdens draaien roept `terminate()` aan, roept `state.resetOutputs()` aan, maakt een nieuwe worker en gaat via `laden` terug naar `klaar` na `ready`; `start()` tijdens `laden` doet niets; `load-error` → `laadfout`, `retry()` maakt een nieuwe worker; `stop()` werkt ook als de worker nooit `done` stuurt (oneindige lus). `checkEnvironment({crossOriginIsolated:false})` → `ok:false` met melding die uitlegt dat de pagina via de juiste server moet draaien. **Review Focus 2 en 5.**
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.** `createWorker` in de app: `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: python-engine met warme worker en stop via terminate`

### Task 13: Werkbank-logica (puur, geen UI)

**Files:** Create `src/bench/benchState.ts`, `src/bench/wires.ts`, `src/bench/warnings.ts`; Test `src/bench/benchState.test.ts`, `src/bench/wires.test.ts`, `src/bench/warnings.test.ts`

**Interfaces:**
- Consumes: `Part`, `Connection`, `PartKind` (Task 3), `PINS`, `nearestGnd`, `SPI_PINS` (Task 2), `explainPowerPin` (Task 11).
- Produces:
  ```ts
  type BenchAction =
    | { type:'add'; kind: PartKind; x:number; y:number }
    | { type:'move'; id:string; x:number; y:number }
    | { type:'remove'; id:string }
    | { type:'beginConnect'; id:string } | { type:'cancelConnect' }
    | { type:'connect'; id:string; target: Connection }
    | { type:'setColor'; id:string; color: LedColor }
    | { type:'load'; parts: Part[] }
  interface BenchState { parts: Part[]; connecting: string|null; error: string|null }
  benchReducer(s: BenchState, a: BenchAction): BenchState
  selectableTargets(s: BenchState, id: string): { pins: number[]; channels: number[] }   // fysieke pinnummers / ADC-kanalen
  interface Wire { id:string; from: {part:string}|{chip:'mcp3008'}; to:{physical:number}|{chip:'mcp3008'; channel:number}; kind:'power'|'ground'|'signal'; color: WireColor }
  computeWires(parts: Part[]): Wire[]
  interface BenchWarning { partId:string; physical:number; message:string }
  benchWarnings(parts: Part[]): BenchWarning[]
  ```
  `computeWires` is een **zuivere functie van de onderdelen**: signaaldraad (kleur uit een rotatie van `wire-*` zonder rood/zwart), GND-draad (zwart) naar `nearestGnd`, voor sensoren/MCP3008 3V3-draad (rood) en SPI-draden (MOSI/MISO/SCLK/CE0); `Wire` is al een eigen object zodat fase 3 losse draden kan toevoegen.

- [ ] **Step 1: Falende tests** — `add led` geeft led met `connection: null`, led-kleur standaard `red`; `beginConnect` + `connect` met `{type:'pin',physical:11}` zet verbinding en wist `connecting`; verbinden met een pin die al bezet is → `error` met "al in gebruik" en géén wijziging; `id`-pinnen (27, 28) zijn niet in `selectableTargets`; `led` krijgt alleen pinnen, `potentiometer` alleen kanalen; `remove` maakt pin vrij; ongeldig `connect` (kanaal 9) wordt genegeerd; wires: led op pin 11 → 1 signaaldraad naar 11 en 1 zwarte draad naar 9, geen rode; led zonder verbinding → geen draden; potmeter op CH0 → draden naar CH0 + 3V3 (rood, pin 1) + 4 SPI-draden, MCP3008 maar één keer als er twee analoge onderdelen zijn; `benchWarnings`: led op pin 2 → waarschuwing met "5V"; led op pin 6 → "GND"; led op pin 1 → "3V3"; led op pin 11 → geen waarschuwing.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.**
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: werkbank-reducer, draden en pinwaarschuwingen`

### Task 14: App-shell, onderdelenbak en lege staat

**Files:** Create `src/ui/App.tsx`, `src/ui/TopBar.tsx`, `src/ui/PartsTray.tsx`, `src/ui/EmptyState.tsx`, `src/ui/useProject.ts`; Modify `src/main.tsx`; Test `src/ui/EmptyState.test.tsx`

**Interfaces:**
- Consumes: `benchReducer`, `emptyProject` (Task 3/13), `checkEnvironment` (Task 12).
- Produces: drie panelen (links bak `w-64`, midden werkbank flexibel, rechts editor), `useProject(): { project, setCode, dispatchBench, load }` (houdt `Project` als enige bron van waarheid, `bench.parts` ↔ `project.parts`), `PartsTray` met sleepbare kaartjes (`draggable`, `dataTransfer` type `application/x-pisim-part` met de `PartKind`), `EmptyState` met tekst "Sleep een led naar je Pi om te beginnen" en knop **"Open een voorbeeld"** (prop `onOpenExamples`). Bovenbalk-knoppen (nog zonder werking): **Voorbeelden, Opslaan, Openen, Delen**. Toont `checkEnvironment`-melding als de omgeving niet geschikt is.

- [ ] **Step 1: Falende UI-tests** — `EmptyState` toont beide teksten en roept `onOpenExamples` aan bij klik; `PartsTray` toont 5 kaartjes met NL-namen (Led, Knop, Buzzer, Temperatuursensor, Potmeter).
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer** layout met tokens (geen hardcoded kleuren), minimumbreedte ~1100 px.
- [ ] **Step 4: Draai** `npx vitest run src/ui` — PASS; `npm run dev` en bekijk de drie panelen (screenshot met Playwright).
- [ ] **Step 5: Commit** `feat: app-shell met drie panelen en onderdelenbak`

### Task 15: Raspberry Pi als SVG

**Files:** Create `src/bench/components/PiBoard.tsx`, `src/bench/components/PinHeader.tsx`; Test `src/bench/components/PiBoard.test.tsx`

**Interfaces:**
- Consumes: `PINS` (Task 2).
- Produces: `<PiBoard selectable?: number[] (fysieke pinnen) onPinClick?(physical:number) issuePins?: number[] highlight?: number[] />` in een vaste SVG-coördinatenruimte (exporteert `pinPosition(physical): {x:number;y:number}` voor de draden). 40 pinnen in 2×20-raster met goudkleurige pinnen (`gold`-token), printplaat `board`, USB/ethernet/HDMI-contouren in `metal`. Hover-tooltip: "Pin 11 · GPIO 17 · {functie}". `selectable` pinnen krijgen accentrand; overige pinnen dimmen wanneer `selectable` is gezet; `issuePins` pulseren in `danger`.

- [ ] **Step 1: Falende tests** — rendert 40 pin-elementen met `data-physical`; hover op pin 11 toont tekst met "GPIO 17"; met `selectable=[11]` is alleen pin 11 klikbaar (`onPinClick(11)`); klik op andere pin roept niets aan; `pinPosition(1)` en `pinPosition(2)` liggen naast elkaar, `pinPosition(1)` en `(3)` boven elkaar.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.**
- [ ] **Step 4: Draai** — PASS; visuele controle via screenshot.
- [ ] **Step 5: Commit** `feat: pi-printplaat met 40 pinnen en hover-info`

### Task 16: Onderdelen, draden, slepen en klik-op-pin-modus

**Files:** Create `src/bench/components/{Led,Button,Buzzer,TemperatureSensor,Potentiometer,Mcp3008,WireLayer,Bench}.tsx`; Test `src/bench/components/Bench.test.tsx`

**Interfaces:**
- Consumes: `benchReducer`, `selectableTargets`, `computeWires`, `benchWarnings` (Task 13), `PiBoard`, `pinPosition` (Task 15), `PartsTray`-dragtype (Task 14).
- Produces: `<Bench parts connecting locked dispatch hardware?: HardwareState issues?: PinIssue[] />`. Onderdelen herkenbaar getekend (led met pootjes in kleur, drukknop met kap, buzzer-schijf, potmeter met draaiknop, temperatuursensor TO-92-vorm), elk met `data-part-id`. Drop van een tray-kaartje op de bench → `add` op de dropcoördinaten (SVG-coördinaten via `getScreenCTM`). Klik op onderdeel → `beginConnect`; Pi toont `selectable`; klik op pin/kanaal → `connect`; `Esc` of klik ernaast → `cancelConnect`. Verwijderen via kruisje/`Delete`. Led-kleurkeuze via klein menu. Draden als gebogen paden in `WireLayer`. Waarschuwingskaartje (icoon + uitleg) bij `benchWarnings`; pin-meldingen uit `issues` als kaartje + gepulseerde pin. Als `locked`: geen toevoegen/verbinden/verplaatsen, hint "Stop eerst om te bewerken".

- [ ] **Step 1: Falende tests** (jsdom, `getScreenCTM` gestubd) — drop van kind `led` voegt een onderdeel toe; klik op led toont selecteerbare pinnen (26 GPIO + 4 voeding + 8 GND; geen id); klik op pin 11 dispatcht `connect` met `{type:'pin',physical:11}` en er verschijnt een draad; led op pin 2 toont waarschuwingskaartje met "5V"; `locked` negeert drop; `Escape` annuleert; potmeter toont kanalen CH0–CH7 in plaats van pinnen.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.** Animaties 150–200 ms via `--dur`.
- [ ] **Step 4: Draai** — PASS; Playwright-screenshot van een bench met 1 led op GPIO17.
- [ ] **Step 5: Commit** `feat: werkbank met onderdelen, draden en klik-op-pin-modus`

### Task 17: Live koppeling: gloed, knop, schuifje, geluid

**Files:** Create `src/bench/useHardwareFrame.ts`, `src/audio/buzzer.ts`; Modify `Led.tsx`, `Button.tsx`, `Buzzer.tsx`, `TemperatureSensor.tsx`, `Potentiometer.tsx`; Test `src/audio/buzzer.test.ts`, `src/bench/liveControls.test.tsx`

**Interfaces:**
- Consumes: `HardwareState` (Task 5), onderdelen (Task 16).
- Produces:
  `useHardwareFrame<T>(read: (s: HardwareState) => T, state: HardwareState): T` (via `requestAnimationFrame`, alleen rerender bij wijziging),
  `class BuzzerSound { constructor(ctx?: AudioContext); unlock(): Promise<void>; setActive(on: boolean): void; dispose(): void }` (blokgolf ~2 kHz, lage gain, zachte aan/uit-ramp van ~10 ms),
  ingangen: knop schrijft `setButtonPressed(gpio, …)` bij `pointerdown`/`pointerup`/`pointerleave` (en `Space` als de knop focus heeft), schuifje schrijft `setAdcRaw(channel, …)`; temperatuurschuifje −10…50 °C → raw via `((tempC/100 + 0.5) / 3.3) * 1023`; potmeter 0–100 % → raw 0–1023.
  Visueel: led met `getOutput > 0` krijgt zachte gloed (radiale verloop + blur in de ledkleur), ingedrukte knop beweegt zichtbaar omlaag, buzzer toont geluidsgolven.

- [ ] **Step 1: Falende tests** — `BuzzerSound` met een nep-`AudioContext`: `setActive(true)` maakt één oscillator en start die, `setActive(true)` nogmaals maakt er geen tweede, `setActive(false)` stopt hem; `dispose()` ruimt op. Controls: `pointerdown` op knop met verbinding op pin 11 → `state.isButtonPressed(17)`; `pointerup` → false; temperatuurschuifje op 25 → `getAdcRaw(ch) ≈ 931`; led-component met `state.setOutput(17, 1)` toont een element met `data-glow="on"`, bij 0 `"off"`.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.** `unlock()` wordt aangeroepen in de Start-klik (gebruikersgebaar vereist voor audio).
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: live led-gloed, knoppen, schuifjes en buzzergeluid`

### Task 18: Editor, console, foutkaartje en laadindicator

**Files:** Create `src/ui/CodeEditor.tsx`, `src/ui/editorTheme.ts`, `src/ui/Console.tsx`, `src/ui/ErrorCard.tsx`, `src/ui/RunControls.tsx`, `src/ui/consoleState.ts`; Test `src/ui/consoleState.test.ts`, `src/ui/ErrorCard.test.tsx`, `src/ui/RunControls.test.tsx`

**Interfaces:**
- Consumes: `PythonEngine`, `EngineStatus` (Task 12), `explainError`, `ErrorExplanation` (Task 11).
- Produces:
  `CodeEditor({ value, onChange, errorLine?: number|null })` — CodeMirror 6, `python()`, regelnummers, `editorTheme` uitsluitend met CSS-variabelen uit de thema-tokens; `errorLine` markeert de regel.
  `consoleReducer(lines: ConsoleLine[], a: {type:'out'|'err'|'clear'; text:string}): ConsoleLine[]` — **maximaal 500 regels**, oudste vallen af; meerdere `out` binnen één frame worden gebatcht (`Console` flusht per `requestAnimationFrame`).
  `ErrorCard({ explanation: ErrorExplanation, onGotoLine(n) })` — icoon, Nederlandse uitleg bovenaan, `<details>` "Technische melding" eronder (standaard dicht), regelnummer klikbaar.
  `RunControls({ status, onStart, onStop, onRetry })` — **▶ Start** (accent) / **■ Stop**; Start uitgeschakeld tijdens `laden`; toont laadindicator met tekst "Python wordt gestart…" (spinner) tijdens `laden`; bij `laadfout` melding "Python kon niet worden geladen" + knop **"Opnieuw proberen"**. Wissen van console en foutkaartje bij elke Start.

- [ ] **Step 1: Falende tests** — **Review Focus 1:** 5000 `out`-acties laten precies 500 regels over (de laatste); `clear` leegt; `ErrorCard` toont uitleg zichtbaar en `technisch` pas na openklappen; klik op "Regel 4" roept `onGotoLine(4)`; `RunControls`: bij `laden` is Start `disabled` en staat "Python wordt gestart…" in beeld; bij `draait` is Stop actief en Start verborgen/uitgeschakeld; bij `laadfout` staat "Opnieuw proberen" en klik roept `onRetry` aan.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.** Bedraad de engine in `App.tsx`: `onWarn` → `explainPinWarning` → `issues` voor de bench; `onDone(error)` → `explainError` → `ErrorCard`; `state.setParts(project.parts)` vóór elke Start; `BuzzerSound.unlock()` bij Start.
- [ ] **Step 4: Draai** — PASS; handmatig in `npm run dev`: led-knipperprogramma draait, `while True:` zonder sleep is te stoppen met Stop.
- [ ] **Step 5: Commit** `feat: editor, console, foutkaartje en start/stop met laadindicator`

### Task 19: Voorbeeldprojecten

**Files:** Create `src/examples/{blink,buttonLed,tempAlarm,index}.ts`, `src/ui/ExamplesMenu.tsx`; Test `src/examples/examples.test.ts`

**Interfaces:**
- Consumes: `Project` (Task 3), `Harness` (Task 6), `ExamplesMenu` opent via de bovenbalk en de lege staat.
- Produces: `EXAMPLES: { id: string; titel: string; uitleg: string; project: Project }[]` (3 stuks); `ExamplesMenu({ onPick(project: Project) })`. Code heeft Nederlandse commentaarregels en gebruikt echte gpiozero-API:
  1. **Knipperende led** — led op pin 11 (GPIO17), `while True: led.on(); sleep(1); led.off(); sleep(1)`.
  2. **Knop schakelt led** — knop op pin 13 (GPIO27), led op pin 11; `button.when_pressed = led.toggle` + `pause()`.
  3. **Temperatuuralarm** — temperatuursensor op CH0, buzzer op pin 15 (GPIO22); elke 0,5 s `temp = (sensor.voltage - 0.5) * 100`, `print(f"{temp:.1f} °C")`, bij `temp > 30` `buzzer.on()` anders `buzzer.off()`.

- [ ] **Step 1: Falende tests** (harnas) — elk voorbeeld: zijn `parts` bevatten juiste verbindingen (alle `connection !== null`, `benchWarnings` leeg); knipper: `stopAfter(5)` geeft led-output-schakelmomenten op 0, 1, 2, 3, 4 s (±0,02) en **geen pin-waarschuwingen**; knop: knop in op t=1,5 → led gaat aan, tweede druk op t=3 → uit; temperatuur: adc voor 20 °C → buzzer blijft 0; adc voor 35 °C vanaf t=2 → buzzer 1 en `stdout` bevat regels als `35.0 °C`; **geen van de drie eindigt met een andere fout dan `TestTimeLimit`**.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.** Kiezen van een voorbeeld doet `load` op bench + `setCode` en wist console.
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: drie voorbeeldprojecten`

### Task 20: Opslaan, openen, downloaden, importeren, delen

**Files:** Modify `src/ui/TopBar.tsx`, `src/ui/App.tsx`, `src/ui/useProject.ts`; Create `src/ui/Toast.tsx`; Test `src/ui/useProject.test.tsx`

**Interfaces:**
- Consumes: `saveLocal`, `loadLocal`, `projectToBlob`, `readProjectFile`, `buildShareUrl`, `decodeShare` (Task 4).
- Produces: **Opslaan** → `saveLocal` + melding "Opgeslagen in je browser"; **Openen** → keuzemenu "Laatst opgeslagen" / "Bestand kiezen…"; **Downloaden** (menu bij Opslaan) → `pi-project.json`; **Delen** → kopieert link naar klembord, melding "Link gekopieerd" (fallback: tekstveld met link als klembord weigert). Bij het laden van de pagina met `#p=…` wordt het gedeelde project geladen (bij fout: melding en leeg project, localStorage blijft ongemoeid). Al opgeslagen project wordt bij een bezoek zonder hash **niet** automatisch overschreven. Alle meldingen als `Toast` (150–200 ms fade).

- [ ] **Step 1: Falende tests** — `useProject` met hash `#p=<geldig>` laadt het project; met `#p=@@` geeft het een foutmelding en blijft `loadLocal()` identiek; Opslaan schrijft naar localStorage; Delen produceert URL met `#p=` die via `decodeShare` hetzelfde project geeft; import van ongeldig bestand toont melding en wijzigt het huidige project niet.
- [ ] **Step 2: Draai** — FAIL.
- [ ] **Step 3: Implementeer.**
- [ ] **Step 4: Draai** — PASS.
- [ ] **Step 5: Commit** `feat: opslaan, openen, importeren en delen via link`

### Task 21: Deployment en eindcontrole

**Files:** Modify `vercel.json`, `README.md`; Create `scripts/smoke.mjs`

**Interfaces:**
- Consumes: alles. Produces: productiebuild die op Vercel als statische site werkt, rooktest als reproduceerbaar bewijs.

- [ ] **Step 1: Controle statische build** — `npm run build && npm run preview`; controleer met `curl -I` dat COOP/COEP op `/`, `/pyodide/pyodide.asm.wasm` en de worker-bundel staan; `vercel.json` bevat `buildCommand`, `outputDirectory: "dist"` en de headers (`headers.test.ts` blijft groen).
- [ ] **Step 2: Schrijf `scripts/smoke.mjs`** (vooraf geïnstalleerde Playwright/Chromium, tegen `vite preview`): (a) `crossOriginIsolated === true`; (b) leeg project toont uitnodiging; (c) sleep een led naar de bench, klik hem, klik pin 11, voer in de editor het knipperprogramma in, klik Start → de led krijgt `data-glow="on"` en daarna `"off"`; (d) `while True: pass` starten en Stop → binnen 3 s weer status "klaar" en led uit; (e) elk van de 3 voorbeelden starten: geen foutkaartje binnen 5 s; (f) de knop-voorbeeld: `pointerdown` op de knop → led wisselt; (g) `x = ` met `led.on()` zonder definitie toont kaartje met "Regel 1: je gebruikt `led`…".
- [ ] **Step 3: Draai** `npx vitest run` (alles groen) en `node scripts/smoke.mjs` (alles groen); sla de uitvoer op.
- [ ] **Step 4: Beginner-test** — laat de rooktest het scenario "led laten knipperen" volgen met alleen zichtbare UI-teksten (geen console/dev-kennis) en controleer dat het in < 5 minuten kan; noteer verwarrende teksten en pas ze aan.
- [ ] **Step 5: Commit** `chore: vercel-config, README en rooktest`

---

## Zelfcontrole

- **Dekking:** schermindeling (T14–18), werkbank/klik-op-pin (T15–16), 5 onderdelen incl. geluid (T16–17), 3 voorbeelden (T19), opslaan/openen/downloaden/importeren/delen (T4, T20), laadindicator (T18), COOP/COEP (T1, T21), Stop via terminate (T12), foutafhandeling NameError/SyntaxError/IndentationError/TypeError (T11), pin zonder onderdeel (T8–10, T16), 5V/3V3/GND-waarschuwing (T13, T16), lege staat (T14), thema-tokens (T1). *Klaar als*: gpiozero-tests (T7–10), voorbeelden (T19, T21), beginner-test (T21).
- **Fase-2/3-ruimte:** `PartKind` en `Connection` zijn uitbreidbaar; `Wire` is een eigen type; `HardwareState` heeft per GPIO een 0–1-uitgang (PWM-klaar voor servo/RGB); projectversie + `migrations`-lijst.
- **Typeconsistentie:** `HardwareBridge`, `Project`, `Part`, `Connection`, `PythonErrorInfo`, `EngineStatus` komen overal met dezelfde namen terug.
