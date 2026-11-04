// @vitest-environment jsdom
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it } from 'vitest'
import { DataTexture, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, type Object3D } from 'three'
import type { Part, PartKind } from '../../project/types'
import { PART_ANCHORS } from '../anchors'
import { DistanceModel, targetOffset } from './DistanceModel'
import { OledModel, SCREEN_PX } from './OledModel'
import { PartModel } from './PartModel'
import { PwmLedModel } from './PwmLedModel'
import { RgbLedModel } from './RgbLedModel'
import { ServoModel, servoAngle } from './ServoModel'

const part = (kind: PartKind, extra: Partial<Part> = {}): Part => ({ id: 'p1', kind, x: 0, y: 0, connections: {}, ...extra })
const find = (root: Object3D, name: string) => root.getObjectByName(name)!
const meshes = (root: Object3D) => { const out: Mesh[] = []; root.traverse((o) => { if ((o as Mesh).isMesh) out.push(o as Mesh) }); return out }
const std = (o: Object3D) => (o as Mesh).material as MeshStandardMaterial

describe('PwmLedModel', () => {
  it('helderheid is zichtbaar: lichtsterkte en gloed volgen het niveau', async () => {
    const dim = await ReactThreeTestRenderer.create(<PwmLedModel part={part('pwmled', { color: 'green' })} live={{ level: 0.25 }} />)
    const full = await ReactThreeTestRenderer.create(<PwmLedModel part={part('pwmled', { color: 'green' })} live={{ level: 1 }} />)
    const off = await ReactThreeTestRenderer.create(<PwmLedModel part={part('pwmled', { color: 'green' })} live={{ level: 0 }} />)
    const light = (r: typeof dim) => (find(r.scene.instance, 'led-light') as PointLight).intensity
    const glow = (r: typeof dim) => std(find(r.scene.instance, 'led-dome')).emissiveIntensity
    expect(light(off)).toBe(0)
    expect(light(dim)).toBeCloseTo(light(full) * 0.25, 5)
    expect(glow(off)).toBe(0)
    expect(glow(dim)).toBeGreaterThan(0)
    expect(glow(dim)).toBeLessThan(glow(full) * 0.5)
    expect(find(dim.scene.instance, 'pwmled').userData.brightness).toBe(0.25)
  })
  it('heeft dezelfde pootjes als een gewone led (aansluitpunten kloppen)', async () => {
    const r = await ReactThreeTestRenderer.create(<PwmLedModel part={part('pwmled')} live={{ level: 0 }} />)
    expect(find(r.scene.instance, 'pwmled')).toBeTruthy()
    expect(PART_ANCHORS.pwmled.signal).toEqual(PART_ANCHORS.led.signal)
  })
})

describe('RgbLedModel', () => {
  const hex = (o: Object3D) => std(o).emissive.getHex()
  it('de mengkleur is zichtbaar: (1, 0,5, 0) is oranje', async () => {
    const r = await ReactThreeTestRenderer.create(<RgbLedModel part={part('rgbled')} live={{ rgb: [1, 0.5, 0] }} />)
    const c = std(find(r.scene.instance, 'rgb-dome')).emissive
    expect(c.r).toBeCloseTo(1, 2)
    expect(Math.round(c.getHex() >> 8 & 255)).toBeGreaterThan(110)
    expect(Math.round(c.getHex() >> 8 & 255)).toBeLessThan(145)
    expect(c.getHex() & 255).toBe(0)
    const light = find(r.scene.instance, 'rgb-light') as PointLight
    expect(light.color.getHex()).toBe(c.getHex())
    expect(light.intensity).toBeGreaterThan(0)
  })
  it('rood, groen en blauw los', async () => {
    for (const [rgb, want] of [[[1, 0, 0], 0xff0000], [[0, 1, 0], 0x00ff00], [[0, 0, 1], 0x0000ff], [[1, 1, 1], 0xffffff]] as const) {
      const r = await ReactThreeTestRenderer.create(<RgbLedModel part={part('rgbled')} live={{ rgb: [...rgb] }} />)
      expect(hex(find(r.scene.instance, 'rgb-dome'))).toBe(want)
    }
  })
  it('uit: geen gloed, geen licht', async () => {
    const r = await ReactThreeTestRenderer.create(<RgbLedModel part={part('rgbled')} live={{ rgb: [0, 0, 0] }} />)
    expect(std(find(r.scene.instance, 'rgb-dome')).emissiveIntensity).toBe(0)
    expect((find(r.scene.instance, 'rgb-light') as PointLight).intensity).toBe(0)
  })
  it('vier pootjes op de aansluitpunten R, GND, G, B', async () => {
    const r = await ReactThreeTestRenderer.create(<RgbLedModel part={part('rgbled')} live={{}} />)
    for (const t of ['r', 'gnd', 'g', 'b']) expect(find(r.scene.instance, `leg-${t}`).position.x).toBeCloseTo(PART_ANCHORS.rgbled.terminals![t][0], 6)
  })
})

describe('ServoModel', () => {
  it('servoAngle: 0 = links, 0,5 = midden, 1 = rechts', () => {
    expect(servoAngle(0)).toBeCloseTo(-Math.PI / 2, 6)
    expect(servoAngle(0.5)).toBeCloseTo(0, 6)
    expect(servoAngle(1)).toBeCloseTo(Math.PI / 2, 6)
    expect(servoAngle(5)).toBeCloseTo(Math.PI / 2, 6)
  })
  it('de arm draait mee met de stand', async () => {
    for (const p of [0, 0.25, 0.5, 1]) {
      const r = await ReactThreeTestRenderer.create(<ServoModel part={part('servo')} live={{ servo: p }} />)
      expect(find(r.scene.instance, 'servo-arm').rotation.y).toBeCloseTo(servoAngle(p), 6)
      expect(find(r.scene.instance, 'servo').userData).toMatchObject({ attached: true, position: p })
    }
  })
  it('ontkoppeld (of zonder stroom): arm in het midden en gemarkeerd', async () => {
    const r = await ReactThreeTestRenderer.create(<ServoModel part={part('servo')} live={{ servo: null }} />)
    expect(find(r.scene.instance, 'servo-arm').rotation.y).toBe(0)
    expect(find(r.scene.instance, 'servo').userData.attached).toBe(false)
    const none = await ReactThreeTestRenderer.create(<ServoModel part={part('servo')} live={{}} />)
    expect(find(none.scene.instance, 'servo').userData.attached).toBe(false)
  })
  it('drie kabeltjes op de aansluitpunten (signaal, 5V, GND)', async () => {
    const r = await ReactThreeTestRenderer.create(<ServoModel part={part('servo')} live={{}} />)
    for (const t of ['signal', 'v5', 'gnd']) {
      const cable = find(r.scene.instance, `cable-${t}`)
      expect(cable.position.z).toBeCloseTo(PART_ANCHORS.servo.terminals![t][2], 6)
      expect(cable.position.y).toBeCloseTo(PART_ANCHORS.servo.terminals![t][1], 6)
    }
  })
})

describe('DistanceModel', () => {
  it('targetOffset: dichterbij = korter, verder = langer, binnen de tafel', () => {
    expect(targetOffset(2)).toBeLessThan(targetOffset(50))
    expect(targetOffset(50)).toBeLessThan(targetOffset(400))
    expect(targetOffset(400)).toBeLessThanOrEqual(45)
    expect(targetOffset(2)).toBeGreaterThanOrEqual(5)
    expect(targetOffset(1)).toBe(targetOffset(2))
    expect(targetOffset(900)).toBe(targetOffset(400))
  })
  it('het voorwerp schuift mee met de afstand', async () => {
    const near = await ReactThreeTestRenderer.create(<DistanceModel part={part('distance')} live={{ distanceCm: 10 }} />)
    const far = await ReactThreeTestRenderer.create(<DistanceModel part={part('distance')} live={{ distanceCm: 300 }} />)
    const z = (r: typeof near) => find(r.scene.instance, 'distance-target').position.z
    expect(z(far)).toBeGreaterThan(z(near))
    expect(z(near)).toBeGreaterThan(0)
    expect(find(far.scene.instance, 'distance').userData.distanceCm).toBe(300)
  })
  it('twee ‘ogen’ en vier pinnen op de aansluitpunten', async () => {
    const r = await ReactThreeTestRenderer.create(<DistanceModel part={part('distance')} live={{ distanceCm: 100 }} />)
    expect(find(r.scene.instance, 'eye-left')).toBeTruthy()
    expect(find(r.scene.instance, 'eye-right')).toBeTruthy()
    for (const t of ['v5', 'trigger', 'echo', 'gnd']) expect(find(r.scene.instance, `pin-${t}`).position.x).toBeCloseTo(PART_ANCHORS.distance.terminals![t][0], 6)
  })
})

describe('OledModel', () => {
  const frame = (setPixels: [number, number][]) => {
    const d = new Uint8Array(1024)
    for (const [x, y] of setPixels) d[y * 16 + (x >> 3)] |= 0x80 >> (x & 7)
    return d
  }
  const texel = (r: { scene: { instance: Object3D } }, x: number, y: number) => {
    const t = ((find(r.scene.instance, 'oled-screen') as Mesh).material as MeshBasicMaterial).map as DataTexture
    const i = ((SCREEN_PX.h - 1 - y) * SCREEN_PX.w + x) * 4 // de textuur staat op zijn kop: rij 0 is onderaan
    const d = t.image.data as unknown as Uint8Array
    return d[i] + d[i + 1] + d[i + 2]
  }
  const live = (bytes: Uint8Array, over: { on?: boolean; version?: number } = {}) => ({ display: { version: over.version ?? 1, on: over.on ?? true, contrast: 255 }, readDisplay: () => bytes })

  it('het beeld staat als textuur op het scherm: aan-pixels licht, uit-pixels donker, goede kant boven', async () => {
    const r = await ReactThreeTestRenderer.create(<OledModel part={part('oled')} live={live(frame([[0, 0], [127, 63]]))} />)
    expect(texel(r, 0, 0)).toBeGreaterThan(300)
    expect(texel(r, 127, 63)).toBeGreaterThan(300)
    expect(texel(r, 1, 0)).toBeLessThan(60)
    expect(texel(r, 0, 63)).toBeLessThan(60)
  })
  it('een nieuw beeld (nieuwe versie) werkt de textuur bij', async () => {
    const r = await ReactThreeTestRenderer.create(<OledModel part={part('oled')} live={live(frame([[5, 5]]), { version: 1 })} />)
    expect(texel(r, 5, 5)).toBeGreaterThan(300)
    await r.update(<OledModel part={part('oled')} live={live(frame([[9, 9]]), { version: 2 })} />)
    expect(texel(r, 5, 5)).toBeLessThan(60)
    expect(texel(r, 9, 9)).toBeGreaterThan(300)
  })
  it('scherm uit of zonder stroom: zwart', async () => {
    const r = await ReactThreeTestRenderer.create(<OledModel part={part('oled')} live={live(frame([[0, 0]]), { on: false })} />)
    expect(find(r.scene.instance, 'oled').userData.on).toBe(false)
    expect(texel(r, 0, 0)).toBeLessThan(60)
  })
  it('zonder gegevens (nog niet gestart): leeg scherm', async () => {
    const r = await ReactThreeTestRenderer.create(<OledModel part={part('oled')} live={{}} />)
    expect(texel(r, 10, 10)).toBeLessThan(60)
  })
  it('vier pinnen op de aansluitpunten', async () => {
    const r = await ReactThreeTestRenderer.create(<OledModel part={part('oled')} live={{}} />)
    for (const t of ['gnd', 'v33', 'scl', 'sda']) expect(find(r.scene.instance, `pin-${t}`).position.x).toBeCloseTo(PART_ANCHORS.oled.terminals![t][0], 6)
  })
})

describe('PartModel voor de nieuwe soorten', () => {
  it('kiest het juiste model en blijft licht', async () => {
    for (const [kind, name] of [['pwmled', 'pwmled'], ['rgbled', 'rgbled'], ['servo', 'servo'], ['distance', 'distance'], ['oled', 'oled']] as const) {
      const r = await ReactThreeTestRenderer.create(<PartModel part={part(kind)} live={{}} />)
      expect(r.scene.instance.getObjectByName(name), kind).toBeTruthy()
      expect(meshes(r.scene.instance).length, kind).toBeLessThan(26)
    }
  })
})
