# Pi-simulator fase 3 — pro-modus met breadboard

Opdracht en akkoord: sessie van 2026-11-04. Dit bestand legt vast wat er is gebouwd en welke keuzes zijn gemaakt (zie ook de README, sectie *Pro-modus*).

## Afgesproken keuzes (door de gebruiker goedgekeurd)
1. **`pull_up` kennen:** `Button` en `LED` melden hun pin-modus aan de brug (`_hw.setMode`, één extra slot per GPIO in `HardwareState`). Geen gedragswijziging in Python.
2. **Kortsluiting "pauzeert":** het programma wordt gestopt met een melding; Start is geblokkeerd zolang de kortsluiting er is.
3. **Drempels:** waarschuwing boven 16 mA per GPIO, led brandt door boven 30 mA; led-drempelspanning 2,0 V voor alle kleuren.
4. **Analoge sensoren:** de MCP3008 blijft een ingebouwde module met acht kanaalaansluitingen (`adc:0–7`).
5. **Eén vast breadboard** (halve maat, 30 kolommen).
6. **Doorgebrande leds** worden niet opgeslagen.

## Opbouw
| Stap | Inhoud |
|---|---|
| 1–3 | `src/circuit`: terminals/breadboard, onderdeelpoten, netlijst (union-find), oplosser, `analyze` — testgedreven |
| 4–5 | weerstandskleuren, `proState` met undo/redo, projectformaat v2 (migratie, compacte deellink) |
| 6 | koppeling met Python: pin-modus, knoppen, sensoren, integratietests met de echte nep-gpiozero in Pyodide |
| 7–9 | 3D pro-werkbank (`src/bench3d/pro`), nieuw-project-keuze, uitleg-pop-up, melding- en eigenschappenpanelen |
| 10 | drie pro-voorbeelden, rooktest `scripts/smoke-pro.mjs` |

## Tests
Unit tests voor de analyse (complete kring, open kring, led verkeerd om, geen weerstand, te lage weerstand, kortsluiting, pull-up/pull-down, analoge sensoren), reducer, projectformaat, scène en werkbank;
integratietests met Python (`circuit/live.test.ts`, pro-voorbeelden in `examples/examples.test.ts`); rooktesten in Chromium voor beide modi.
