// Rooktest in een echte browser (Chromium via Playwright), tegen de productiebuild.
//   npm run build && node scripts/smoke.mjs
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const PORT = 4173
const BASE = process.env.BASE_URL ?? `http://localhost:${PORT}`
let server
if (!process.env.BASE_URL) {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE); break } catch { await new Promise((r) => setTimeout(r, 200)) }
  }
}

const results = []
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FOUT'} ${name}${extra ? ` — ${extra}` : ''}`) }

// Software-WebGL (SwiftShader) zodat de 3D-werkbank ook zonder grafische kaart in headless Chromium tekent.
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const SHOTS = process.env.SMOKE_SHOTS
const browser = await chromium.launch({ args: GL_ARGS })
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } })
const requests = []
page.on('request', (r) => requests.push({ url: r.url(), start: Date.now(), end: 0 }))
page.on('requestfinished', (r) => { const q = requests.find((x) => x.url === r.url() && !x.end); if (q) q.end = Date.now() })
const shot = (name) => SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve()
const pageErrors = []
const dialogs = []
page.on('dialog', (d) => { dialogs.push(d.message()); void d.accept() })
page.on('pageerror', (e) => pageErrors.push(e.message))
page.on('console', (m) => { if (/webgl|three|context/i.test(m.text()) && m.type() !== 'log') console.log('CONSOLE', m.type(), m.text().slice(0, 200)) })

const starting = () => page.getByText('Python wordt gestart…')
const ready = () => starting().waitFor({ state: 'detached', timeout: 90000 })
const startBtn = () => page.getByRole('button', { name: 'Start' })
const stopBtn = () => page.getByRole('button', { name: 'Stop' })
const partBtn = (kind) => page.locator(`ul[aria-label="Onderdelen op de werkbank"] button[data-kind="${kind}"]`)
const glow = () => partBtn('led').first().getAttribute('data-glow')
const frames = () => page.evaluate(() => window.__pisimGl.info.render.frame)
const menu = () => page.getByRole('complementary', { name: /Aansluiten/ })
const card = () => page.getByRole('alert').filter({ hasText: 'Regel' })

async function typeCode(lines) {
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+A'); await page.keyboard.press('Delete')
  for (const l of lines) { await page.keyboard.type(l); await page.keyboard.press('Enter') }
}
async function dropPart(label, x, y) {
  const dt = await page.evaluateHandle(() => new DataTransfer())
  await page.locator(`[draggable="true"][aria-label^="${label} "]`).dispatchEvent('dragstart', { dataTransfer: dt })
  await page.locator('[data-testid="bench"]').dispatchEvent('drop', { dataTransfer: dt, clientX: x, clientY: y })
}
async function openExample(titel) {
  await page.getByRole('button', { name: 'Voorbeelden' }).click()
  await page.getByRole('button', { name: new RegExp(titel) }).click()
}
async function sawGlow(ms = 3000) {
  const seen = new Set(); const end = Date.now() + ms
  while (Date.now() < end) { seen.add(await glow()); await page.waitForTimeout(80) }
  return seen
}

try {
  const res = await page.goto(`${BASE}/?debug`)
  check('COOP/COEP-headers staan op de pagina', res.headers()['cross-origin-opener-policy'] === 'same-origin' && res.headers()['cross-origin-embedder-policy'] === 'require-corp')
  check('pagina is crossOriginIsolated', await page.evaluate(() => crossOriginIsolated))
  check('lege staat toont de uitnodiging', await page.getByText('Sleep een led naar je Pi om te beginnen').isVisible() && await page.getByRole('button', { name: 'Open een voorbeeld' }).isVisible())
  check('laadindicator zichtbaar tijdens opstarten', await starting().isVisible())
  const wasm = await page.request.get(`${BASE}/pyodide/pyodide.asm.wasm`)
  check('Pyodide wordt zelf gehost met COOP/COEP-headers', wasm.ok() && wasm.headers()['cross-origin-embedder-policy'] === 'require-corp')
  await ready()

  // 3D: canvas aanwezig, 3D-code laadt tegelijk met Pyodide, en er wordt niet doorgetekend als er niets verandert.
  await page.locator('canvas').waitFor({ timeout: 30000 })
  const wasmReq = requests.find((r) => r.url.endsWith('pyodide.asm.wasm'))
  const chunk = requests.find((r) => /Bench3D/.test(r.url))
  check('3D-werkbank staat in een eigen (lazy) bestand', !!chunk, chunk ? chunk.url.split('/').pop() : 'geen Bench3D-bestand gevonden')
  check('3D-code en Pyodide laden tegelijk (de 3D-aanvraag start vóór Pyodide klaar is)', !!chunk && !!wasmReq && chunk.start < wasmReq.end, chunk && wasmReq ? `3D start +${chunk.start - wasmReq.start} ms t.o.v. Pyodide, Pyodide klaar na ${wasmReq.end - wasmReq.start} ms` : '')
  await page.waitForTimeout(1500)
  const f0 = await frames(); await page.waitForTimeout(2000); const f1 = await frames()
  check('frameloop="demand": geen nieuwe frames bij stilstand', f1 - f0 <= 1, `${f1 - f0} frames in 2 s`)
  check('lege staat blijft zichtbaar over de 3D-werkbank', await page.getByText('Sleep een led naar je Pi om te beginnen').isVisible())

  // Beginner-scenario: led neerzetten, op pin 11 verbinden en op Start drukken (de editor bevat al een knipperprogramma).
  const t0 = Date.now()
  await page.getByRole('button', { name: 'Bovenaanzicht' }).click(); await page.waitForTimeout(1500)
  await dropPart('Led', 420, 220)
  await page.waitForTimeout(400)
  // Met de muis op de led klikken in 3D: boven het label van de led.
  // Het label staat 13 mm onder het midden van het onderdeel; in bovenaanzicht (camera op 125 mm, 40° beeldhoek) is dat zoveel pixels.
  const lbl = await page.locator('[data-overlay="part-1"]').boundingBox()
  const cv = await page.locator('canvas').boundingBox()
  const pxPerMm = cv.height / (2 * 125 * Math.tan((20 * Math.PI) / 180))
  await page.mouse.click(lbl.x + lbl.width / 2, lbl.y - 13 * pxPerMm)
  await menu().waitFor({ timeout: 5000 }).then(() => check('klik op de led in 3D opent het pinmenu', true)).catch(() => check('klik op de led in 3D opent het pinmenu', false))
  check('pinmenu toont de 40 pinnen', (await page.getByRole('group', { name: 'Pinnen van de Pi' }).getByRole('button').count()) === 40)
  await shot('pinmenu')
  await page.getByRole('button', { name: 'Pin 11, GPIO 17' }).click()
  check('GPIO 17 kiezen sluit het menu en zet het GPIO-nummer bij de led', (await menu().count()) === 0 && (await page.locator('[data-overlay="part-1"]').innerText()).includes('GPIO 17'))
  await startBtn().click() // de startcode in de editor laat de led al knipperen
  const seen = await sawGlow(4000)
  check('beginner: led slepen + pin kiezen + Start laat de led knipperen', seen.has('on') && seen.has('off'), `${((Date.now() - t0) / 1000).toFixed(1)} s na laden`)
  check('geen foutkaartje bij knipperen', (await card().count()) === 0)
  await shot('knipperen')

  // Stop bij een oneindige lus zonder sleep.
  await stopBtn().click(); await ready()
  await typeCode(['while True:'])
  await page.keyboard.type('x = 1')
  await startBtn().click(); await stopBtn().waitFor({ state: 'visible' }); await page.waitForTimeout(500)
  const tStop = Date.now(); await stopBtn().click(); await ready()
  check('Stop werkt bij while True zonder sleep', Date.now() - tStop < 30000, `${Date.now() - tStop} ms`)
  check('led is uit na Stop', (await glow()) === 'off' || (await page.locator('[data-glow]').count()) === 0)

  // Review Focus 1: een print()-lus mag de pagina niet vastzetten en Stop moet snel werken.
  await typeCode(['i = 0', 'while True:'])
  await page.keyboard.type('i += 1'); await page.keyboard.press('Enter'); await page.keyboard.type('print(i)')
  await startBtn().click(); await stopBtn().waitFor({ state: 'visible' }); await page.waitForTimeout(6000)
  const tPing = Date.now(); await page.evaluate(() => 1)
  check('pagina blijft bruikbaar tijdens een print()-lus', Date.now() - tPing < 1500, `${Date.now() - tPing} ms vertraging`)
  const tFlood = Date.now(); await stopBtn().click({ timeout: 20000 }); await ready()
  check('Stop werkt snel na een print()-lus', Date.now() - tFlood < 12000, `${Date.now() - tFlood} ms`)
  check('console toont hooguit 500 regels', (await page.locator('.font-mono > div').count()) <= 502)

  // Toetsenbord: een onderdeel toevoegen zonder slepen.
  await openExample('Knipperende led')
  const before = await page.locator('[data-part-id]').count()
  await page.locator('[draggable="true"][aria-label^="Buzzer "]').focus(); await page.keyboard.press('Enter')
  check('onderdeel toevoegen met het toetsenbord (Enter)', (await page.locator('[data-part-id]').count()) === before + 1)

  // Halve regel (print zonder newline) komt toch in de console.
  await typeCode(['print("zonder newline", end="")'])
  await startBtn().click()
  await page.getByText('zonder newline', { exact: true }).waitFor({ timeout: 10000 }).then(() => check('print(..., end="") verschijnt in de console', true)).catch(() => check('print(..., end="") verschijnt in de console', false))
  await ready()

  // De drie voorbeelden.
  for (const titel of ['Knipperende led', 'Knop schakelt led', 'Temperatuuralarm']) {
    await openExample(titel); await startBtn().click(); await page.waitForTimeout(2500)
    check(`voorbeeld "${titel}" draait zonder fout`, (await card().count()) === 0 && await stopBtn().isEnabled())
    if (titel === 'Knop schakelt led') {
      await partBtn('button').focus(); await page.keyboard.down('Space'); await page.waitForTimeout(300)
      check('knop indrukken (spatie op de knop in de onderdelenlijst) schakelt de led aan', (await glow()) === 'on' && (await partBtn('button').getAttribute('data-pressed')) === 'true')
      await page.keyboard.up('Space')
    }
    if (titel === 'Temperatuuralarm') {
      await page.getByRole('slider', { name: 'Temperatuur' }).fill('35'); await page.waitForTimeout(1500)
      check('buzzer gaat piepen bij 35 °C', (await partBtn('buzzer').getAttribute('data-active')) === 'true')
      await shot('temperatuuralarm')
    }
    await stopBtn().click(); await ready()
  }

  // ---- fase 2: de zes nieuwe voorbeelden ----
  const attr = (kind, name) => partBtn(kind).first().getAttribute(name)
  for (const titel of ['Stoplicht', 'Dimmer', 'Kleurenmixer', 'Servo-wijzer', 'Parkeersensor', 'Weerstation']) {
    await openExample(titel); await startBtn().click(); await page.waitForTimeout(3000)
    check(`voorbeeld "${titel}" draait zonder fout`, (await card().count()) === 0 && await stopBtn().isEnabled())
    if (titel === 'Dimmer') {
      await page.getByRole('slider', { name: 'Stand van de potmeter' }).fill('100'); await page.waitForTimeout(800)
      const full = Number(await attr('pwmled', 'data-brightness'))
      await page.getByRole('slider', { name: 'Stand van de potmeter' }).fill('20'); await page.waitForTimeout(800)
      const dim = Number(await attr('pwmled', 'data-brightness'))
      check('dimmer: potmeter bepaalt de helderheid', full > 0.9 && dim > 0.1 && dim < 0.3, `${full} → ${dim}`)
    }
    if (titel === 'Kleurenmixer') {
      const sliders = page.getByRole('slider', { name: 'Stand van de potmeter' })
      await sliders.nth(0).fill('100'); await sliders.nth(1).fill('0'); await sliders.nth(2).fill('0'); await page.waitForTimeout(800)
      check('kleurenmixer: potmeters op rood geeft een rode led', (await attr('rgbled', 'data-rgb')) === '1.0,0.0,0.0', String(await attr('rgbled', 'data-rgb')))
      await shot('kleurenmixer')
    }
    if (titel === 'Servo-wijzer') {
      const s = page.getByRole('slider', { name: 'Stand van de potmeter' })
      await s.fill('0'); await page.waitForTimeout(800); const left = await attr('servo', 'data-servo')
      await s.fill('100'); await page.waitForTimeout(800); const right = await attr('servo', 'data-servo')
      check('servo-wijzer: de arm draait van links naar rechts mee met de potmeter', left === '0.00' && right === '1.00', `${left} → ${right}`)
      await shot('servo')
    }
    if (titel === 'Parkeersensor') {
      const d = page.getByRole('slider', { name: 'Afstand' })
      await d.fill('400'); await page.waitForTimeout(600)
      check('afstandssensor-schuifje loopt tot 400 cm', (await attr('distance', 'data-distance')) === '400')
      await d.fill('2'); await page.waitForTimeout(600)
      check('afstandssensor-schuifje loopt tot 2 cm', (await attr('distance', 'data-distance')) === '2')
      await shot('afstand')
    }
    if (titel === 'Weerstation') {
      const lit = Number(await attr('oled', 'data-lit'))
      check('weerstation: het OLED-scherm toont tekst', lit > 100, `${lit} pixels aan`)
      await page.getByRole('slider', { name: 'Temperatuur' }).fill('30'); await page.waitForTimeout(1800)
      check('weerstation: de pagina blijft tekenen na een nieuw beeld', pageErrors.length === 0)
      await shot('weerstation')
    }
    await stopBtn().click(); await ready()
  }

  // Een nieuw OLED-scherm: pinmenu per aansluiting, voorstel op SDA/SCL, en melding bij ontbrekende aansluitingen.
  await typeCode(['pass'])
  await openExample('Stoplicht')
  await page.locator('[data-part-id]').first().focus(); await page.keyboard.press('Delete')
  await dropPart('OLED-scherm', 420, 300)
  await page.waitForTimeout(400)
  const oledOverlay = page.locator('[data-overlay]').last()
  check('een nieuw OLED-scherm krijgt een oranje melding "Mist: …"', (await oledOverlay.innerText()).includes('Mist'), (await oledOverlay.innerText()).replace(/\n/g, ' | '))
  await partBtn('oled').focus(); await page.keyboard.press('Enter')
  await menu().waitFor({ timeout: 5000 })
  check('pinmenu toont de vier aansluitingen van het OLED-scherm', (await page.getByRole('group', { name: 'Aansluitingen' }).getByRole('button').count()) === 4)
  check('SDA: alleen pin 3 is te kiezen, andere pinnen zijn uit met uitleg', (await page.getByRole('button', { name: 'Pin 11, GPIO 17' }).isDisabled()) && (await page.getByRole('button', { name: 'Pin 11, GPIO 17' }).getAttribute('title')).includes('GPIO 2'))
  await shot('pinmenu-oled')
  await page.getByRole('button', { name: 'Sluit alles voorgesteld aan' }).click(); await page.waitForTimeout(300)
  const label = await oledOverlay.innerText()
  check('"Sluit alles voorgesteld aan" zet SDA op GPIO 2 en SCL op GPIO 3', label.includes('SDA GPIO 2') && label.includes('SCL GPIO 3') && !label.includes('Mist'), label.replace(/\n/g, ' | '))
  await page.keyboard.press('Escape')
  await typeCode(['from luma.core.interface.serial import i2c', 'from luma.core.render import canvas', 'from luma.oled.device import ssd1306', 'oled = ssd1306(i2c(port=1, address=0x3C))', 'with canvas(oled) as draw:', 'draw.text((0, 0), "Hoi!", fill="white")'])
  await startBtn().click(); await page.waitForTimeout(3000)
  check('OLED-scherm op SDA/SCL met voeding: tekenen werkt', (await card().count()) === 0 && Number(await attr('oled', 'data-lit')) > 5, `${await attr('oled', 'data-lit')} pixels`)
  check('het beeld blijft staan nadat het programma klaar is (anders dan op een echte Pi, die het wist)', Number(await attr('oled', 'data-lit')) > 5)
  // Zonder OLED op de werkbank: Nederlandse uitleg bij DeviceNotFoundError.
  await partBtn('oled').focus(); await page.keyboard.press('Delete')
  await startBtn().click()
  await card().waitFor({ timeout: 15000 })
  check('geen OLED op de werkbank → uitleg over SDA op pin 3 en SCL op pin 5', (await card().innerText()).includes('pin 3 (GPIO 2)') && (await card().innerText()).includes('pin 5 (GPIO 3)'))
  await ready()

  console.log('INFO context lost?', await page.evaluate(() => window.__pisimGl.getContext().isContextLost()), 'frames', await frames())
  // Camerastanden en prestaties (met alle onderdelen van het laatste voorbeeld in beeld).
  await openExample('Temperatuuralarm')
  for (const [label, name] of [['Bovenaanzicht', 'boven'], ['Schuin', 'schuin'], ['Pinnen dichtbij', 'pinnen'], ['Reset', 'reset']]) {
    await page.getByRole('button', { name: label }).click(); await page.waitForTimeout(1600); await shot(`camera-${name}`)
  }
  check('de vier camerastanden zijn te kiezen zonder fouten', pageErrors.length === 0)
  const info = await page.evaluate(() => { const i = window.__pisimGl.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures } })
  check('scène is licht: weinig tekenaanroepen en driehoeken', info.calls < 150 && info.triangles < 60000, `${info.calls} tekenaanroepen, ${info.triangles} driehoeken, ${info.geometries} geometrieën`)
  const box = await page.locator('canvas').boundingBox()
  const fa = await frames(); const tA = Date.now()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down()
  for (let i = 0; i < 60; i++) { await page.mouse.move(box.x + box.width / 2 + Math.sin(i / 6) * 150, box.y + box.height / 2 + Math.cos(i / 6) * 60); await page.waitForTimeout(16) }
  await page.mouse.up()
  const fps = ((await frames()) - fa) / ((Date.now() - tA) / 1000)
  console.log(`INFO draaien met de muis: ${fps.toFixed(0)} frames/s (software-WebGL zonder grafische kaart; op een echte laptop-gpu veel hoger)`)
  check('de camera reageert op draaien met de muis', fps > 3, `${fps.toFixed(0)} frames/s`)

  // Foutmelding in het Nederlands.
  await typeCode(['led.on()'])
  await startBtn().click()
  await card().waitFor({ timeout: 15000 })
  check('NameError → Nederlandse uitleg met regelnummer', (await card().innerText()).includes('Regel 1: je gebruikt `led`, maar die heb je nog niet aangemaakt.'))
  check('technische melding is ingeklapt', !(await page.locator('details').first().evaluate((d) => d.open)))
  check('app vraagt bevestiging voordat niet-opgeslagen werk wordt vervangen', dialogs.some((m) => m.includes('nog niet hebt opgeslagen')))
  check('geen onverwachte pagina-fouten', pageErrors.length === 0, pageErrors.join(' | '))
  // Zonder WebGL: een nette Nederlandse melding.
  const noGl = await chromium.launch({ args: ['--disable-3d-apis', '--disable-gpu', '--disable-software-rasterizer'] })
  const noGlPage = await noGl.newPage({ viewport: { width: 1440, height: 860 } })
  await noGlPage.goto(BASE)
  const msg = noGlPage.getByRole('alert').filter({ hasText: '3D wordt niet ondersteund' })
  await msg.waitFor({ timeout: 30000 }).then(() => check('zonder WebGL: melding in het Nederlands', true)).catch(() => check('zonder WebGL: melding in het Nederlands', false))
  await noGl.close()
  // Als los bestand geopend: een Nederlandse uitleg in plaats van een lege pagina.
  const filePage = await browser.newPage()
  await filePage.goto(`file://${process.cwd()}/dist/index.html`)
  check('file:// toont een uitleg in plaats van een lege pagina', (await filePage.locator('#root').innerText()).includes('niet als los bestand'))
} catch (e) {
  await shot('fout')
  check('rooktest zonder uitzondering', false, String(e?.message ?? e).split('\n').slice(0, 6).join(' / '))
} finally {
  await browser.close()
  server?.kill()
}
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} controles geslaagd`)
process.exit(failed ? 1 : 0)
