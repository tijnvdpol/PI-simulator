import { CanvasTexture, Color, SRGBColorSpace } from 'three'
import { PINS } from '../../pinout/pinout'
import { pinBoardMm } from '../geometry'

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
const mix = (a: Color, b: Color, t: number) => css(a.clone().lerp(b, t))

/** Vaste "willekeurige" getallen, zodat de printplaat er bij elke start hetzelfde uitziet. */
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const PCB_PX = 14

export interface SilkItem { u: number; v: number; text: string; size?: number; rot?: number; box?: { w: number; d: number } }

export interface PcbOptions {
  /** Kleur van het soldeermasker. */
  mask: Color
  /** Kleur van de silkscreen (wit) en van de gouden pads. */
  silk: Color
  pad: Color
  silkItems?: SilkItem[]
  /** Pads van de 2×20-header (alleen de Pi). */
  header?: boolean
  seed?: number
  /** Standaard niet gespiegeld (zie hieronder); `true` voor een vlak dat met `flipY` wordt gelezen. */
  flipY?: boolean
}

/**
 * Printplaat-textuur in mm (14 px per mm): matgroen soldeermasker met koperbanen (iets lichter door het masker heen),
 * soldeerpunten, vias en witte silkscreen-tekst. Bewust zonder logo of merknaam. De textuur is niet gespiegeld
 * (`flipY = false`): bovenaan de afbeelding is de rand waar v = 0.
 */
export function pcbTexture(widthMm: number, depthMm: number, o: PcbOptions): CanvasTexture | null {
  const k = makeCanvas(Math.round(widthMm * PCB_PX), Math.round(depthMm * PCB_PX))
  if (!k) return null
  const { c, g } = k
  const rand = rng(o.seed ?? 7)
  const mm = (v: number) => v * PCB_PX
  g.fillStyle = css(o.mask); g.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i < widthMm * depthMm * 3; i++) {
    g.fillStyle = `rgba(255,255,255,${rand() * 0.04})`
    g.fillRect(rand() * c.width, rand() * c.height, 2, 2)
  }
  // koperbanen: rechte stukken met knikken van 45°, iets lichter dan het masker
  g.strokeStyle = mix(o.mask, o.silk, 0.14); g.lineCap = 'round'; g.lineJoin = 'round'
  for (let i = 0; i < widthMm * depthMm / 14; i++) {
    let x = rand() * widthMm
    let y = rand() * depthMm
    g.lineWidth = mm(0.18 + rand() * 0.14)
    g.beginPath(); g.moveTo(mm(x), mm(y))
    for (let s = 0; s < 3; s++) {
      const dir = Math.floor(rand() * 4) * (Math.PI / 4) + (rand() < 0.5 ? 0 : Math.PI / 2)
      const len = 2 + rand() * 7
      x += Math.cos(dir) * len; y += Math.sin(dir) * len
      g.lineTo(mm(x), mm(y))
    }
    g.stroke()
  }
  // vias en soldeerpunten
  for (let i = 0; i < widthMm * depthMm / 9; i++) {
    const x = rand() * widthMm
    const y = rand() * depthMm
    g.fillStyle = mix(o.mask, o.pad, 0.5); g.beginPath(); g.arc(mm(x), mm(y), mm(0.28), 0, Math.PI * 2); g.fill()
    g.fillStyle = css(o.mask); g.beginPath(); g.arc(mm(x), mm(y), mm(0.1), 0, Math.PI * 2); g.fill()
  }
  if (o.header) {
    for (const pin of PINS) {
      const { u, v } = pinBoardMm(pin.physical)
      g.fillStyle = css(o.pad)
      if (pin.physical === 1) g.fillRect(mm(u - 0.85), mm(v - 0.85), mm(1.7), mm(1.7))
      else { g.beginPath(); g.arc(mm(u), mm(v), mm(0.85), 0, Math.PI * 2); g.fill() }
    }
  }
  // silkscreen
  g.fillStyle = css(o.silk); g.strokeStyle = css(o.silk); g.lineWidth = mm(0.18)
  for (const it of o.silkItems ?? []) {
    if (it.box) g.strokeRect(mm(it.u - it.box.w / 2), mm(it.v - it.box.d / 2), mm(it.box.w), mm(it.box.d))
    if (it.text) {
      g.save(); g.translate(mm(it.u), mm(it.v)); g.rotate(((it.rot ?? 0) * Math.PI) / 180)
      g.font = `600 ${mm(it.size ?? 1.5)}px ui-monospace, "DejaVu Sans Mono", monospace`
      g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(it.text, 0, 0)
      g.restore()
    }
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.flipY = o.flipY ?? false
  t.anisotropy = 8
  return t
}
