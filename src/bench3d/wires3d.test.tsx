// @vitest-environment jsdom
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { beforeAll, describe, expect, it } from 'vitest'
import { Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three'
import { computeWires } from '../bench/wires'
import type { Part } from '../project/types'
import { PART_ANCHORS, chipChannelLocal, CHIP_CENTER } from './anchors'
import { pinWorld } from './geometry'
import { WireLayer3D } from './WireLayer3D'
import { partWorld, wireCurve, wireEnds, wireGeometry } from './wireGeometry'

beforeAll(() => {
  const s = document.documentElement.style
  s.setProperty('--color-wire-red', 'red')
  s.setProperty('--color-wire-black', 'black')
  s.setProperty('--color-wire-blue', 'blue')
})

const led = (x: number, y: number, physical: number | null, id = 'part-1'): Part => ({
  id, kind: 'led', x, y, color: 'red', connections: physical === null ? {} : { signal: { type: 'pin', physical } },
})

describe('draadeinden', () => {
  it('signaaldraad: van het lange pootje van de led naar de pin; GND-draad van het korte pootje naar de dichtstbijzijnde GND', () => {
    const parts = [led(300, 150, 11)]
    const wires = computeWires(parts)
    const sig = wireEnds(wires.find((w) => w.id === 'part-1:signal')!, parts)!
    const gnd = wireEnds(wires.find((w) => w.id === 'part-1:gnd')!, parts)!
    const o = partWorld(parts[0])
    expect(sig.a).toEqual([o[0] + PART_ANCHORS.led.signal[0], PART_ANCHORS.led.signal[1], o[2] + PART_ANCHORS.led.signal[2]])
    expect(gnd.a[0]).toBeCloseTo(o[0] + PART_ANCHORS.led.ground![0], 9)
    const pin = pinWorld(11)
    expect(sig.b).toEqual([pin.x, pin.y, pin.z])
    const gpin = pinWorld(9) // dichtstbijzijnde GND bij pin 11 is pin 9
    expect(gnd.b).toEqual([gpin.x, gpin.y, gpin.z])
  })

  it('servo: elke draad begint bij zijn eigen aansluitpunt en eindigt op de gekozen pin', () => {
    const parts: Part[] = [{ id: 's', kind: 'servo', x: 300, y: 150, connections: { signal: { type: 'pin', physical: 12 }, v5: { type: 'pin', physical: 2 }, gnd: { type: 'pin', physical: 6 } } }]
    const o = partWorld(parts[0])
    for (const w of computeWires(parts)) {
      const ends = wireEnds(w, parts)!
      const anchor = PART_ANCHORS.servo.terminals![w.terminal!]
      expect(ends.a).toEqual([o[0] + anchor[0], anchor[1], o[2] + anchor[2]])
      const pin = pinWorld((w.to as { physical: number }).physical)
      expect(ends.b).toEqual([pin.x, pin.y, pin.z])
    }
  })

  it('analoge onderdelen eindigen op het chipkanaal', () => {
    const parts: Part[] = [{ id: 'part-1', kind: 'temperature', x: 600, y: 150, connections: { signal: { type: 'adc', channel: 3 } } }]
    const w = computeWires(parts).find((x) => x.id === 'part-1:signal')!
    const e = wireEnds(w, parts)!
    const [dx, dy, dz] = chipChannelLocal(3)
    expect(e.b[0]).toBeCloseTo(CHIP_CENTER.x + dx, 9)
    expect(e.b[1]).toBe(dy)
    expect(e.b[2]).toBeCloseTo(CHIP_CENTER.z + dz, 9)
  })

  it('chipdraden (SPI) beginnen op de chip en eindigen op de juiste Pi-pin', () => {
    const parts: Part[] = [{ id: 'part-1', kind: 'temperature', x: 600, y: 150, connections: { signal: { type: 'adc', channel: 0 } } }]
    const mosi = computeWires(parts).find((w) => w.label === 'MOSI')!
    const e = wireEnds(mosi, parts)!
    const pin = pinWorld(19)
    expect(e.b).toEqual([pin.x, pin.y, pin.z])
  })

  it('geeft null als het onderdeel niet bestaat', () => {
    const parts = [led(300, 150, 11)]
    const wires = computeWires(parts)
    expect(wireEnds(wires[0], [])).toBeNull()
  })
})

describe('draadboog', () => {
  const ends = { a: [-30, 2, -20] as const, b: [-24, 9.9, 5] as const }

  it('begint en eindigt precies op de aansluitpunten', () => {
    const c = wireCurve(ends)
    const s = c.getPoint(0), e = c.getPoint(1)
    expect(s.distanceTo(new Vector3(...ends.a))).toBeLessThan(1e-9)
    expect(e.distanceTo(new Vector3(...ends.b))).toBeLessThan(1e-9)
  })

  it('maakt een boog boven beide eindpunten en komt nergens onder de tafel', () => {
    const c = wireCurve(ends)
    const ys = c.getSpacedPoints(60).map((p) => p.y)
    expect(Math.max(...ys)).toBeGreaterThan(Math.max(ends.a[1], ends.b[1]) + 5)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(ends.a[1] - 1e-6)
  })

  it('is vloeiend: de richting verandert nergens abrupt', () => {
    const c = wireCurve(ends)
    const t = Array.from({ length: 80 }, (_, i) => c.getTangent(i / 79))
    for (let i = 1; i < t.length; i++) expect(t[i].dot(t[i - 1])).toBeGreaterThan(0.8)
  })

  it('lane tilt de boog hoger, zodat naast elkaar lopende draden niet samenvallen', () => {
    const top = (lane: number) => Math.max(...wireCurve(ends, lane).getSpacedPoints(60).map((p) => p.y))
    expect(top(1)).toBeGreaterThan(top(0))
  })

  it('geeft een TubeGeometry met de draaddikte als straal', () => {
    const g = wireGeometry(ends)
    expect(g).toBeInstanceOf(TubeGeometry)
    g.computeBoundingBox()
    expect(g.boundingBox!.min.y).toBeGreaterThan(ends.a[1] - 1)
  })
})

describe('WireLayer3D', () => {
  it('maakt één buis per draad met de kleurregels: rood = stroom, zwart = GND, andere = signaal', async () => {
    const parts: Part[] = [
      led(300, 150, 11, 'part-1'),
      led(400, 150, 1, 'part-2'),   // 3V3 → rode stroomdraad
      led(500, 150, 6, 'part-3'),   // GND → zwarte draad
    ]
    const wires = computeWires(parts)
    const r = await ReactThreeTestRenderer.create(<WireLayer3D wires={wires} parts={parts} />)
    const root = r.scene.instance
    for (const w of wires) expect(root.getObjectByName(`wire-${w.id}`), w.id).toBeTruthy()
    const colorOf = (id: string) => {
      const g = root.getObjectByName(`wire-${id}`)!
      const m = g.children.find((c) => (c as Mesh).geometry instanceof TubeGeometry) as Mesh
      return (m.material as MeshStandardMaterial).color
    }
    const power = wires.find((w) => w.kind === 'power')!
    const ground = wires.find((w) => w.id === 'part-3:signal')!
    expect(ground.kind).toBe('ground')
    expect(colorOf(power.id).r).toBeGreaterThan(0.9)           // rood
    expect(colorOf(ground.id).getHex()).toBe(0)                  // zwart
    expect(root.getObjectByName('wire-part-1:signal')!.userData.kind).toBe('signal')
  })

  it('verwijdert de geometrie van verdwenen draden en toont niets zonder draden', async () => {
    const r = await ReactThreeTestRenderer.create(<WireLayer3D wires={[]} parts={[]} />)
    expect(r.scene.instance.getObjectByName('wires')!.children).toHaveLength(0)
  })
})
