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
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
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
// Software-WebGL (SwiftShader) is te traag voor de zware nabewerking; de rooktest test gedrag, dus start in de stand Laag.
await page.addInitScript(() => { try { localStorage.setItem('pisim.quality', 'low') } catch { /* geen opslag */ } })
const requests = []
page.on('request', (r) => requests.push({ url: r.url(), start: Date.now(), end: 0 }))
page.on('requestfinished', (r) => { const q = requests.find((x) => x.url === r.url() && !x.end); if (q) q.end = Date.now() })
const shot = (name) => SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve()
const pageErrors = []
const dialogs = []
page.on('dialog', (d) => { dialogs.push(d.message()); void d.accept() })
page.on('pageerror', (e) => pageErrors.push(e.message))

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

  // Camerastanden en prestaties (met alle onderdelen van het laatste voorbeeld in beeld).
  await openExample('Temperatuuralarm')
  for (const [label, name] of [['Bovenaanzicht', 'boven'], ['Schuin', 'schuin'], ['Pinnen dichtbij', 'pinnen'], ['Reset', 'reset']]) {
    await page.getByRole('button', { name: label }).click(); await page.waitForTimeout(1600); await shot(`camera-${name}`)
  }
  check('de vier camerastanden zijn te kiezen zonder fouten', pageErrors.length === 0)
  const info = await page.evaluate(() => { const i = window.__pisimGl.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures } })
  check('scène is licht: weinig tekenaanroepen en driehoeken', info.calls < 150 && info.triangles < 60000, `${info.calls} tekenaanroepen, ${info.triangles} driehoeken, ${info.geometries} geometrieën`)
  const box = await page.locator('canvas').boundingBox()
  // Software-WebGL is grillig; de beste van drie pogingen telt.
  let fps = 0
  for (let attempt = 0; attempt < 3 && fps < 2; attempt++) {
    const fa = await frames(); const tA = Date.now()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down()
    for (let i = 0; i < 60; i++) { await page.mouse.move(box.x + box.width / 2 + Math.sin(i / 6) * 150, box.y + box.height / 2 + Math.cos(i / 6) * 60); await page.waitForTimeout(16) }
    await page.mouse.up()
    fps = Math.max(fps, ((await frames()) - fa) / ((Date.now() - tA) / 1000))
  }
  console.log(`INFO draaien met de muis: ${fps.toFixed(0)} frames/s (software-WebGL zonder grafische kaart; op een echte laptop-gpu veel hoger)`)
  check('de camera reageert op draaien met de muis', fps >= 2, `${fps.toFixed(0)} frames/s`)

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
  check('rooktest zonder uitzondering', false, String(e?.message ?? e).split('\n')[0])
} finally {
  await browser.close()
  // `npx` start vite als kind: de hele processgroep stoppen, anders blijft de preview-server achter op de poort.
  if (server?.pid) { try { process.kill(-server.pid) } catch { /* al gestopt */ } }
}
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} controles geslaagd`)
process.exit(failed ? 1 : 0)
