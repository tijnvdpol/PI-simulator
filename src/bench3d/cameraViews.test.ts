import { describe, expect, it } from 'vitest'
import { LIMITS, VIEWS, VIEW_LABELS, VIEW_ORDER, clampTarget, polarAngle } from './cameraViews'

describe('camerastanden', () => {
  it('heten Bovenaanzicht, Schuin, Pinnen dichtbij en Reset, in die volgorde', () => {
    expect(VIEW_ORDER.map((v) => VIEW_LABELS[v])).toEqual(['Bovenaanzicht', 'Schuin', 'Pinnen dichtbij', 'Reset'])
  })

  it('elke stand valt binnen de grenzen (niet onder de tafel, afstand, kijkpunt)', () => {
    for (const name of VIEW_ORDER) {
      const v = VIEWS[name]
      const dist = Math.hypot(...v.position.map((p, i) => p - v.target[i]))
      expect(dist, name).toBeGreaterThanOrEqual(LIMITS.minDistance)
      expect(dist, name).toBeLessThanOrEqual(LIMITS.maxDistance)
      expect(polarAngle(v), name).toBeLessThanOrEqual(LIMITS.maxPolarAngle)
      expect(v.position[1], name).toBeGreaterThan(0)
      const t = { x: v.target[0], y: v.target[1], z: v.target[2] }
      expect(clampTarget({ ...t }), name).toEqual(t)
    }
  })

  it('je kunt niet onder de tafel kijken: maximale hoek is minder dan horizontaal', () => {
    expect(LIMITS.maxPolarAngle).toBeLessThan(Math.PI / 2)
  })

  it('"Pinnen dichtbij" kijkt naar het midden van de header', () => {
    const v = VIEWS.pins
    expect(v.target[0]).toBeCloseTo(-10, 6)
    expect(Math.hypot(...v.position.map((p, i) => p - v.target[i]))).toBeLessThan(VIEWS.reset.position[1])
  })

  it('clampTarget houdt het kijkpunt boven de tafel', () => {
    expect(clampTarget({ x: 500, y: -5, z: -500 })).toEqual({ x: 60, y: 0, z: -50 })
  })
})
