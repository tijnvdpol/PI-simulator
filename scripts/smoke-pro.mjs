// Rooktest van de pro-modus in een echte browser (Chromium via Playwright), tegen de productiebuild.
//   npm run build && node scripts/smoke-pro.mjs        (SMOKE_SHOTS=map voor schermafbeeldingen)
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const PORT = 4174
const BASE = process.env.BASE_URL ?? `http://localhost:${PORT}`
let server
if (!process.env.BASE_URL) {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
  for (let i = 0; i < 50; i++) { try { await fetch(BASE); break } catch { await new Promise((r) => setTimeout(r, 200)) } }
}
const results = []
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FOUT'} ${name}${extra ? ` — ${extra}` : ''}`) }
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const SHOTS = process.env.SMOKE_SHOTS
const browser = await chromium.launch({ args: GL_ARGS })
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } })
// Software-WebGL (SwiftShader) is te traag voor de zware nabewerking; de rooktest test gedrag, dus start in de stand Laag.
await page.addInitScript(() => { try { localStorage.setItem('pisim.quality', 'low') } catch { /* geen opslag */ } })
const shot = (name) => SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
page.on('dialog', (d) => void d.accept())

const ready = () => page.getByText('Python wordt gestart…').waitFor({ state: 'detached', timeout: 90000 })
const startBtn = () => page.getByRole('button', { name: 'Start' })
const stopBtn = () => page.getByRole('button', { name: 'Stop' })
const part = (id) => page.locator(`[data-part-id="${id}"]`)
const status = (id) => part(id).getAttribute('data-status')
const screenOf = (id) => page.evaluate((t) => window.__pisimPro.screenOf(t), id)
const frames = () => page.evaluate(() => window.__pisimGl.info.render.frame)
async function clickTerminal(id) {
  const p = await screenOf(id)
  if (!p) throw new Error(`geen schermplek voor ${id}`)
  await page.mouse.click(p.x, p.y)
}
async function dropPart(label, ...terminals) {
  // Het midden van de poten: een onderdeel klikt vast op de plek waar zijn poten het dichtst bij de muis zitten.
  const pts = await Promise.all(terminals.map(screenOf))
  const p = { x: pts.reduce((a, q) => a + q.x, 0) / pts.length, y: pts.reduce((a, q) => a + q.y, 0) / pts.length }
  const dt = await page.evaluateHandle(() => new DataTransfer())
  await page.locator(`[draggable="true"][aria-label^="${label} "]`).dispatchEvent('dragstart', { dataTransfer: dt })
  await page.locator('[data-testid="bench"]').dispatchEvent('dragover', { dataTransfer: dt, clientX: p.x, clientY: p.y })
  await page.locator('[data-testid="bench"]').dispatchEvent('drop', { dataTransfer: dt, clientX: p.x, clientY: p.y })
}
async function waitStatus(id, wanted, ms = 6000) {
  const end = Date.now() + ms
  while (Date.now() < end) { if ((await status(id)) === wanted) return true; await page.waitForTimeout(100) }
  return false
}

try {
  await page.goto(`${BASE}/?debug`)
  await ready()
  await page.getByRole('button', { name: 'Nieuw' }).click()
  await page.getByRole('button', { name: /Pro/ }).first().click()
  const intro = page.getByRole('dialog', { name: 'Wat is een breadboard?' })
  check('de eerste keer verschijnt de uitleg over het breadboard', await intro.isVisible())
  await shot('pro-intro')
  await intro.getByRole('button', { name: 'Begrepen' }).click()
  check('de uitleg sluit', (await intro.count()) === 0)
  check('modus-label toont Pro-modus', (await page.getByTestId('mode-badge').innerText()) === 'Pro-modus')
  await page.locator('canvas').waitFor({ timeout: 30000 })
  await page.waitForFunction(() => !!window.__pisimPro, null, { timeout: 30000 })
  await page.waitForTimeout(1500)
  await shot('pro-leeg')
  const f0 = await frames(); await page.waitForTimeout(2000)
  check('frameloop="demand": geen nieuwe frames bij stilstand', (await frames()) - f0 <= 1)

  // Hover: alle gaatjes van dezelfde rij van 5 lichten op en de tooltip legt het uit.
  const h = await screenOf('h:c12')
  await page.mouse.move(h.x, h.y); await page.waitForTimeout(400)
  const tip = page.getByRole('tooltip')
  check('hover op een gaatje toont tooltip met uitleg', (await tip.innerText()).includes('Rij c · kolom 12') && (await tip.innerText()).includes('a–e'))
  await shot('pro-hover')

  // Bouwen: weerstand (h:a5–h:a9) en led (h:b9 anode, h:b10 kathode), daarna draden.
  await dropPart('Weerstand', 'h:a5', 'h:a9')
  await dropPart('Led', 'h:b9', 'h:b10')
  const ids = await page.locator('ul[aria-label="Onderdelen op het breadboard"] [data-part-id]').evaluateAll((els) => els.map((e) => `${e.dataset.kind}:${e.dataset.partId}`))
  check('weerstand en led staan op het breadboard', ids.length === 2, ids.join(', '))
  await shot('pro-onderdelen')
  await clickTerminal('pin:11'); await clickTerminal('h:b5')
  await clickTerminal('h:c10'); await clickTerminal('pin:6')
  await page.waitForTimeout(500)
  await shot('pro-bedraad')
  check('led is uit voor Start (programma draait niet)', (await status('p2')) === 'off')
  await startBtn().click()
  check('met een weerstand brandt de led', await waitStatus('p2', 'on'))
  await shot('pro-led-aan')

  const tri = await page.evaluate(() => window.__pisimTriangles())
  check('pro-scène blijft ruim onder 200.000 driehoeken', tri < 200000, `${tri} driehoeken (basis, zonder extra schaduw-/nabewerkingsrondes)`)

  // Het paneel "Onderdelen" is inklapbaar, zodat het de werkbank niet afdekt.
  const toggle = page.getByRole('button', { name: /^Onderdelen/ })
  const partList = page.locator('ul[aria-label="Onderdelen op het breadboard"]')
  await toggle.click()
  check('paneel Onderdelen klapt in', !(await partList.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false')
  await toggle.click()
  check('paneel Onderdelen klapt weer uit', (await partList.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'true')

  // Undo/redo.
  await stopBtn().click(); await ready()
  await page.mouse.click(10, 500) // focus buiten invoer
  await page.keyboard.press('Control+z')
  check('Ctrl+Z haalt de laatste draad weg', (await page.evaluate(() => document.querySelectorAll('[data-testid="bench"]').length)) === 1)
  await page.keyboard.press('Control+y')
  await startBtn().click()
  check('Ctrl+Y zet de draad terug, led brandt weer', await waitStatus('p2', 'on'))
  await stopBtn().click(); await ready()

  // Zonder weerstand brandt de led door.
  await part('p1').click()
  await page.getByRole('button', { name: 'Verwijderen' }).click()
  await clickTerminal('pin:11'); await clickTerminal('h:e9') // zelfde rij van 5 als de anode (h:b9); die ligt achter de led
  await startBtn().click()
  check('zonder weerstand brandt de led door', await waitStatus('p2', 'burnt', 8000))
  await page.waitForTimeout(250)
  await shot('pro-rook')
  check('melding "doorgebrand" verschijnt', await page.getByText(/doorgebrand/).first().isVisible())
  await page.waitForTimeout(2500)
  check('de led blijft zwart (kapot) na de rook', (await status('p2')) === 'burnt')
  await shot('pro-kapot')
  await stopBtn().click(); await ready()
  check('na Stop blijft de led kapot', (await status('p2')) === 'burnt')
  await page.getByRole('alert').getByRole('button', { name: 'Vervang led' }).click()
  check('"Vervang led" geeft een nieuwe, werkende led', (await part('p2').getAttribute('data-burnt')) === 'false' && (await status('p2')) === 'off')

  // Kortsluiting: 3V3 op GND.
  await clickTerminal('pin:1'); await clickTerminal('pin:9')
  await page.waitForTimeout(500)
  check('3V3 op GND geeft een kortsluitmelding', await page.getByText(/Kortsluiting!/).first().isVisible())
  await shot('pro-kortsluiting')
  await startBtn().click()
  check('Start is geblokkeerd bij een kortsluiting', await stopBtn().isDisabled())

  // De drie voorbeelden.
  for (const [titel, id, want] of [['Led met weerstand', 'p2', 'on'], ['Knop op het breadboard', 'p3', 'off'], ['Stoplicht op het breadboard', 'p2', 'on']]) {
    await page.getByRole('button', { name: 'Voorbeelden' }).click()
    await page.getByRole('button', { name: new RegExp(titel) }).click()
    await page.waitForTimeout(800)
    await startBtn().click()
    check(`voorbeeld "${titel}" draait`, await waitStatus(id, want, 8000))
    if (titel.startsWith('Knop')) {
      await page.getByRole('button', { name: 'Druk op knop p1' }).dispatchEvent('pointerdown'); await page.waitForTimeout(500)
      check('knop met pull-up schakelt de led aan', await waitStatus('p3', 'on'))
      await page.getByRole('button', { name: 'Druk op knop p1' }).dispatchEvent('pointerup')
      await shot('pro-knop')
    }
    if (titel.startsWith('Stoplicht')) await shot('pro-stoplicht')
    await stopBtn().click(); await ready()
  }
  check('geen onverwachte pagina-fouten', pageErrors.length === 0, pageErrors.join(' | '))
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
