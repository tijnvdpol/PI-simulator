# Pi-simulator fase 2 — ontwerp

Goedgekeurd door de gebruiker op 2026-11-04. Uitbreiding van fase 1; architectuur blijft gelijk.

## Datamodel (projectversie 2)
- `Part.connection` → `Part.connections: Record<terminalId, Connection>`; terminals per soort in `src/bench/terminals.ts`
  (`signal` voor de oude soorten; rgbled `r,g,b,gnd`; servo `signal,v5,gnd`; distance `trigger,echo,v5,gnd`; oled `sda,scl,v33,gnd`).
- Een terminal kent type (gpio/5V/3V3/GND), geschikte pinnen, een voorgestelde pin en een uitleg waarom.
- Migratie 1→2 in `parse.ts`: `connection` → `connections.signal`. Geldt voor opslag, bestand en deellink.
- `PART_KINDS` krijgt onderaan `pwmled, rgbled, servo, distance, oled` (kindcodes in het gedeelde geheugen blijven geldig).
- Gedeeld geheugen: extra gebieden voor afstand (cm per echo-pin), servo (stand + ontkoppeld) en een 128×64-framebuffer met versieteller.

## Werkbank
- Oude soorten: soepel gedrag (ook voeding/GND kiesbaar, met waarschuwing). Nieuwe terminals: ongeschikte pinnen niet kiesbaar, met reden;
  uit een bestand geladen ongeschikte pinnen geven een melding.
- Nieuwe onderdelen werken pas bij complete aansluiting (alle terminals); anders oranje rand + uitleg en geen live gedrag.
- Pinmenu per aansluiting met voorstel en "Sluit alles voorgesteld aan".
- Beperkingen: één OLED (adres 0x3C, alleen ssd1306), geen spanningsdeler op echo, servo altijd over 180° getoond.

## Nep-bibliotheken
- gpiozero: PWMLED, RGBLED, Servo, AngularServo, DistanceSensor. luma.core/luma.oled: i2c, canvas, ssd1306.
- Pillow 12.2.0 (pyemscripten-wheel uit de Pyodide-release, 1 MB) staat in `vendor/pyodide` en wordt zelf gehost.

## Testen
Unit tests per klasse (rood eerst), migratietest met een echte fase-1-link, alle voorbeelden draaien op de virtuele klok.
