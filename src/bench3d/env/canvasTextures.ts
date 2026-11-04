import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from 'three'

/** Een canvas, of null als de omgeving er geen heeft (tests). */
function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined' || /jsdom/i.test(navigator.userAgent)) return null
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  let g: CanvasRenderingContext2D | null = null
  try { g = c.getContext('2d') } catch { g = null }
  return g ? { c, g } : null
}

const css = (c: Color) => `#${c.getHexString()}`

/**
 * Snijmat met een fijn raster: een lijn per mm, dikker per cm en nog dikker per 5 cm, met cm-getallen langs de rand.
 * `widthMm` × `depthMm` is de hele mat; 6 pixels per mm.
 */
export function matTexture(widthMm: number, depthMm: number, base: Color, line: Color): CanvasTexture | null {
  const PX = 6
  const k = makeCanvas(Math.round(widthMm * PX), Math.round(depthMm * PX))
  if (!k) return null
  const { c, g } = k
  g.fillStyle = css(base); g.fillRect(0, 0, c.width, c.height)
  // fijne structuur, zodat de mat niet kunstmatig vlak oogt
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2)
  }
  const mm = (v: number) => v * PX
  const grid = (step: number, alpha: number, width: number) => {
    g.strokeStyle = css(line); g.globalAlpha = alpha; g.lineWidth = width
    g.beginPath()
    for (let x = 0; x <= widthMm; x += step) { g.moveTo(mm(x), 0); g.lineTo(mm(x), c.height) }
    for (let y = 0; y <= depthMm; y += step) { g.moveTo(0, mm(y)); g.lineTo(c.width, mm(y)) }
    g.stroke(); g.globalAlpha = 1
  }
  grid(1, 0.07, 1)
  grid(10, 0.28, 1.5)
  grid(50, 0.55, 2.5)
  // cm-getallen langs de randen, vanuit het midden van de mat geteld
  g.fillStyle = css(line); g.globalAlpha = 0.8
  g.font = `${PX * 3.2}px ui-monospace, monospace`
  g.textAlign = 'center'; g.textBaseline = 'top'
  for (let x = 50; x < widthMm; x += 50) g.fillText(String(Math.round((x - widthMm / 2) / 10)), mm(x), mm(2))
  g.textAlign = 'left'; g.textBaseline = 'middle'
  for (let y = 50; y < depthMm; y += 50) g.fillText(String(Math.round((y - depthMm / 2) / 10)), mm(2), mm(y))
  g.globalAlpha = 1
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Pegboard: een raster van gaatjes (25 mm steek) op hardboard. Eén tegel is `tileMm` breed en herhaalt zich. */
export function pegboardTexture(base: Color, hole: Color, tileMm = 100): CanvasTexture | null {
  const PX = 5
  const size = tileMm * PX
  const k = makeCanvas(size, size)
  if (!k) return null
  const { c, g } = k
  g.fillStyle = css(base); g.fillRect(0, 0, size, size)
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`
    g.fillRect(Math.random() * size, Math.random() * size, 2, 1)
  }
  const step = 25 * PX
  for (let x = step / 2; x < size; x += step) for (let y = step / 2; y < size; y += step) {
    const r = 2.6 * PX
    g.fillStyle = css(hole)
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 8
  return t
}
