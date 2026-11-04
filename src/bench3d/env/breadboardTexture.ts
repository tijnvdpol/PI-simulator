import { CanvasTexture, Color, SRGBColorSpace } from 'three'
import { COLS, RAIL_LEN, ROWS, ROW_LETTERS, type RailName } from '../../circuit/breadboard'
import { BB_CENTER, BB_SIZE, holeXZ, railXZ } from '../pro/layout'

export const BB_PX = 20

function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined' || /jsdom/i.test(navigator.userAgent)) return null
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  let g: CanvasRenderingContext2D | null = null
  try { g = c.getContext('2d') } catch { g = null }
  return g ? { c, g } : null
}

const css = (c: Color) => `#${c.getHexString()}`
const RAILS: RailName[] = ['t+', 't-', 'b-', 'b+']

export interface BreadboardColors { body: Color; hole: Color; ink: Color; plus: Color; minus: Color }

/**
 * Bovenkant van het breadboard als twee afbeeldingen: kleur (gaatjes met een rand, middengroef, rode en blauwe lijnen bij
 * de rails, letters a–j en de kolomnummers) en een hoogtekaart (gaatjes en groef liggen dieper), voor echt verzonken gaatjes.
 * Afbeelding = bovenaanzicht, bovenaan is de achterkant van het bord.
 */
export function breadboardTextures(c: BreadboardColors): { map: CanvasTexture; bump: CanvasTexture } | null {
  const W = Math.round(BB_SIZE.w * BB_PX)
  const H = Math.round(BB_SIZE.d * BB_PX)
  const a = makeCanvas(W, H)
  const b = makeCanvas(W, H)
  if (!a || !b) return null
  const X = (x: number) => (x + BB_SIZE.w / 2) * BB_PX
  const Z = (z: number) => (z + BB_SIZE.d / 2) * BB_PX
  const mm = (v: number) => v * BB_PX
  const g = a.g
  const h = b.g
  g.fillStyle = css(c.body); g.fillRect(0, 0, W, H)
  h.fillStyle = '#ffffff'; h.fillRect(0, 0, W, H)
  // zachte korrel in het kunststof
  for (let i = 0; i < 14000; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.025})`
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2)
  }
  // middengroef (onder de rijen e en f)
  g.fillStyle = css(c.hole.clone().lerp(c.body, 0.35)); g.fillRect(mm(2), Z(-1.5), W - mm(4), mm(3))
  h.fillStyle = '#1a1a1a'; h.fillRect(mm(2), Z(-1.5), W - mm(4), mm(3))
  g.fillStyle = css(c.hole); g.fillRect(mm(2), Z(-0.4), W - mm(4), mm(0.8))

  const hole = (x: number, z: number) => {
    // afgeschuinde rand, dan de donkere opening
    g.fillStyle = css(c.body.clone().lerp(c.hole, 0.28)); g.fillRect(X(x) - mm(0.95), Z(z) - mm(0.95), mm(1.9), mm(1.9))
    g.fillStyle = css(c.hole); g.fillRect(X(x) - mm(0.55), Z(z) - mm(0.55), mm(1.1), mm(1.1))
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(X(x) - mm(0.55), Z(z) - mm(0.55), mm(1.1), mm(0.14))
    h.fillStyle = '#666666'; h.fillRect(X(x) - mm(0.95), Z(z) - mm(0.95), mm(1.9), mm(1.9))
    h.fillStyle = '#000000'; h.fillRect(X(x) - mm(0.55), Z(z) - mm(0.55), mm(1.1), mm(1.1))
  }
  for (let col = 1; col <= COLS; col++) for (let row = 0; row < ROWS; row++) {
    const p = holeXZ(col, row)
    hole(p.x - BB_CENTER.x, p.z - BB_CENTER.z)
  }
  for (const rail of RAILS) for (let i = 1; i <= RAIL_LEN; i++) {
    const p = railXZ(rail, i)
    hole(p.x - BB_CENTER.x, p.z - BB_CENTER.z)
  }

  // rode (+) en blauwe (−) lijnen langs de rails, met een teken aan het begin
  const line = (z: number, color: Color, sign: string) => {
    const x0 = railXZ('t+', 1).x - BB_CENTER.x - 3.2
    const x1 = railXZ('t+', RAIL_LEN).x - BB_CENTER.x + 3.2
    g.fillStyle = css(color); g.fillRect(X(x0), Z(z) - mm(0.17), mm(x1 - x0), mm(0.34))
    g.font = `700 ${mm(2.2)}px ui-monospace, "DejaVu Sans Mono", monospace`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(sign, X(x0 - 1.7), Z(z)); g.fillText(sign, X(x1 + 1.7), Z(z))
  }
  const zOf = (rail: RailName) => railXZ(rail, 1).z - BB_CENTER.z
  g.fillStyle = css(c.plus)
  line(zOf('t+') - 1.5, c.plus, '+'); line(zOf('t-') + 1.5, c.minus, '−')
  line(zOf('b-') - 1.5, c.minus, '−'); line(zOf('b+') + 1.5, c.plus, '+')

  // letters a–j links en rechts, kolomnummers boven en onder
  g.fillStyle = css(c.ink); g.globalAlpha = 0.85
  g.font = `600 ${mm(1.7)}px ui-monospace, "DejaVu Sans Mono", monospace`
  g.textAlign = 'center'; g.textBaseline = 'middle'
  const x1 = holeXZ(1, 0).x - BB_CENTER.x - 3.4
  const x30 = holeXZ(COLS, 0).x - BB_CENTER.x + 3.4
  for (let row = 0; row < ROWS; row++) {
    const z = holeXZ(1, row).z - BB_CENTER.z
    g.fillText(ROW_LETTERS[row], X(x1), Z(z)); g.fillText(ROW_LETTERS[row], X(x30), Z(z))
  }
  g.font = `600 ${mm(1.5)}px ui-monospace, "DejaVu Sans Mono", monospace`
  const zTop = holeXZ(1, 0).z - BB_CENTER.z - 3.3
  const zBot = holeXZ(1, 9).z - BB_CENTER.z + 3.3
  for (let col = 1; col <= COLS; col++) {
    const x = holeXZ(col, 0).x - BB_CENTER.x
    g.fillText(String(col), X(x), Z(zTop)); g.fillText(String(col), X(x), Z(zBot))
  }
  g.globalAlpha = 1

  const map = new CanvasTexture(a.c); map.colorSpace = SRGBColorSpace; map.anisotropy = 8
  const bump = new CanvasTexture(b.c); bump.anisotropy = 4
  return { map, bump }
}
