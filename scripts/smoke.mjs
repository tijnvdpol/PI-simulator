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

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

const starting = () => page.getByText('Python wordt gestart…')
const ready = () => starting().waitFor({ state: 'detached', timeout: 90000 })
const startBtn = () => page.getByRole('button', { name: 'Start' })
const stopBtn = () => page.getByRole('button', { name: 'Stop' })
const glow = () => page.locator('[data-glow]').first().getAttribute('data-glow')
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
  const res = await page.goto(BASE)
  check('COOP/COEP-headers staan op de pagina', res.headers()['cross-origin-opener-policy'] === 'same-origin' && res.headers()['cross-origin-embedder-policy'] === 'require-corp')
  check('pagina is crossOriginIsolated', await page.evaluate(() => crossOriginIsolated))
  check('lege staat toont de uitnodiging', await page.getByText('Sleep een led naar je Pi om te beginnen').isVisible() && await page.getByRole('button', { name: 'Open een voorbeeld' }).isVisible())
  check('laadindicator zichtbaar tijdens opstarten', await starting().isVisible())
  const wasm = await page.request.get(`${BASE}/pyodide/pyodide.asm.wasm`)
  check('Pyodide wordt zelf gehost met COOP/COEP-headers', wasm.ok() && wasm.headers()['cross-origin-embedder-policy'] === 'require-corp')
  await ready()

  // Beginner-scenario: led slepen, op pin 11 verbinden en op Start drukken (de editor bevat al een knipperprogramma).
  const t0 = Date.now()
  await dropPart('Led', 420, 140)
  await page.locator('[data-kind="led"]').click()
  await page.locator('[data-physical="11"]').click()
  await startBtn().click() // de startcode in de editor laat de led al knipperen
  const seen = await sawGlow(4000)
  check('beginner: led slepen + pin kiezen + Start laat de led knipperen', seen.has('on') && seen.has('off'), `${((Date.now() - t0) / 1000).toFixed(1)} s na laden`)
  check('geen foutkaartje bij knipperen', (await card().count()) === 0)

  // Stop bij een oneindige lus zonder sleep.
  await stopBtn().click(); await ready()
  await typeCode(['while True:'])
  await page.keyboard.type('x = 1')
  await startBtn().click(); await stopBtn().waitFor({ state: 'visible' }); await page.waitForTimeout(500)
  const tStop = Date.now(); await stopBtn().click(); await ready()
  check('Stop werkt bij while True zonder sleep', Date.now() - tStop < 30000, `${Date.now() - tStop} ms`)
  check('led is uit na Stop', (await glow()) === 'off' || (await page.locator('[data-glow]').count()) === 0)

  // De drie voorbeelden.
  for (const titel of ['Knipperende led', 'Knop schakelt led', 'Temperatuuralarm']) {
    await openExample(titel); await startBtn().click(); await page.waitForTimeout(2500)
    check(`voorbeeld "${titel}" draait zonder fout`, (await card().count()) === 0 && await stopBtn().isEnabled())
    if (titel === 'Knop schakelt led') {
      const box = await page.locator('[data-kind="button"]').boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(250)
      check('knop indrukken schakelt de led aan', (await glow()) === 'on'); await page.mouse.up()
    }
    if (titel === 'Temperatuuralarm') {
      await page.getByRole('slider', { name: 'Temperatuur' }).fill('35'); await page.waitForTimeout(1500)
      check('buzzer gaat piepen bij 35 °C', (await page.locator('[data-active]').first().getAttribute('data-active')) === 'true')
    }
    await stopBtn().click(); await ready()
  }

  // Foutmelding in het Nederlands.
  await typeCode(['led.on()'])
  await startBtn().click()
  await card().waitFor({ timeout: 15000 })
  check('NameError → Nederlandse uitleg met regelnummer', (await card().innerText()).includes('Regel 1: je gebruikt `led`, maar die heb je nog niet aangemaakt.'))
  check('technische melding is ingeklapt', !(await page.locator('details').first().evaluate((d) => d.open)))
  check('geen onverwachte pagina-fouten', pageErrors.length === 0, pageErrors.join(' | '))
} catch (e) {
  check('rooktest zonder uitzondering', false, String(e?.message ?? e).split('\n')[0])
} finally {
  await browser.close()
  server?.kill()
}
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} controles geslaagd`)
process.exit(failed ? 1 : 0)
