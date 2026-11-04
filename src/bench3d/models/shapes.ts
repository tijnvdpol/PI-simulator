/**
 * Zelf gemaakte, laag-poly vormen voor de onderdelen (mm). Zuivere geometrie-functies, zodat ze los te testen zijn.
 * Alles wat een onderdeel nodig heeft staat hier één keer, en wordt door de simpele en de pro-werkbank gedeeld.
 */
import {
  BufferGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, LatheGeometry, Shape, TubeGeometry, Vector2, Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Een 5 mm-led: cilinder met koepel. y = 0 is de onderkant van het epoxy; de top ligt op `LED.height`. */
export const LED = { radius: 2.5, flange: 2.9, body: 5.8, flangeThick: 1, height: 5.8 + 2.5 } as const

/** Epoxy van de led: een draaivorm (cilinder met halve bol erboven), met een lichte afronding aan de onderrand. */
export function ledEpoxyGeometry(segments = 20): BufferGeometry {
  const r = LED.radius
  const pts: Vector2[] = [new Vector2(0, 0), new Vector2(r - 0.2, 0), new Vector2(r, 0.2), new Vector2(r, LED.body)]
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2)
    pts.push(new Vector2(Math.cos(a) * r, LED.body + Math.sin(a) * r))
  }
  return new LatheGeometry(pts, segments)
}

/**
 * Het randje onderaan de led: een schijf van 5,8 mm met een vlakke kant aan de kathodezijde (+x, de kortere poot).
 * `flat` is de afstand van het midden tot de vlakke kant.
 */
export function ledFlangeGeometry(flat = 2.35): BufferGeometry {
  const R = LED.flange
  const a = Math.acos(flat / R)
  const s = new Shape()
  s.absarc(0, 0, R, a, Math.PI * 2 - a, false)
  s.lineTo(flat, Math.sin(a) * R)
  const g = new ExtrudeGeometry(s, { depth: LED.flangeThick, bevelEnabled: false, curveSegments: 14 })
  g.rotateX(-Math.PI / 2) // het vlak ligt in xy, rechtop zetten: dikte langs y
  g.translate(0, 0, 0)
  return g
}

/** Een pootje als buisje langs een reeks punten. Rondt de hoeken af, zodat een knik er netjes uitziet. */
export function legGeometry(points: ReadonlyArray<readonly [number, number, number]>, radius = 0.28, tubular = 12): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'catmullrom', 0.05)
  return new TubeGeometry(curve, Math.max(2, tubular), radius, 5, false)
}

/** Weerstandslichaam: een "hondenbot" met dikkere uiteinden, als draaivorm om de x-as (liggend, y = as). */
export function resistorBodyGeometry(length = 6.3, radius = 1.25): BufferGeometry {
  const h = length / 2
  const end = radius * 1.18
  const pts = [
    new Vector2(0, -h), new Vector2(end * 0.8, -h), new Vector2(end, -h + 0.25), new Vector2(end, -h + 1),
    new Vector2(radius, -h + 1.5), new Vector2(radius, h - 1.5), new Vector2(end, h - 1), new Vector2(end, h - 0.25),
    new Vector2(end * 0.8, h), new Vector2(0, h),
  ]
  const g = new LatheGeometry(pts, 16)
  g.rotateZ(Math.PI / 2)
  return g
}

/** Draaiknop met een geribbelde rand: een cilinder waarvan de straal op en neer gaat, `ribs` keer rondom. */
export function ribbedKnobGeometry(radius = 5.5, height = 4, ribs = 18): BufferGeometry {
  const g = new CylinderGeometry(radius, radius, height, ribs * 4, 1)
  const pos = g.attributes.position
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const r = Math.hypot(v.x, v.z)
    if (r < 1e-6) continue
    const a = Math.atan2(v.z, v.x)
    const k = 1 - 0.07 * (0.5 - 0.5 * Math.cos(a * ribs))
    pos.setXYZ(i, v.x * k, v.y, v.z * k)
  }
  g.computeVertexNormals()
  return g
}

/** TO-92: een D-vormig huisje (halve cilinder met vlakke voorkant naar +z), bovenkant licht afgerond. */
export function to92Geometry(radius = 2.5, height = 4.5): BufferGeometry {
  const s = new Shape()
  s.absarc(0, 0, radius, 0, Math.PI, true) // halve schijf aan de +z-kant (y in het shape-vlak wordt z)
  s.lineTo(radius, 0)
  const g = new ExtrudeGeometry(s, { depth: height, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.5, bevelSegments: 2, curveSegments: 10 })
  g.rotateX(-Math.PI / 2)
  g.rotateY(Math.PI)
  return g
}

/** Voegt geometrieën samen tot één (alle attributen moeten overeenkomen). */
export function merge(parts: BufferGeometry[]): BufferGeometry {
  const prepared = parts.map((g) => (g.index ? g.toNonIndexed() : g))
  return mergeGeometries(prepared, false) ?? prepared[0]
}
