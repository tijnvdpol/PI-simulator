// @vitest-environment jsdom
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { beforeAll, describe, expect, it } from 'vitest'
import { InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, PointLight, Vector3, type Object3D } from 'three'
import type { Part, PartKind } from '../../project/types'
import { CHIP_DIM, chipChannelLocal, chipLabelLocal, chipPinLocal } from '../anchors'
import { PART_ANCHORS } from '../anchors'
import { HEADER, PI_BOARD, PI_ORIGIN, pinWorld } from '../geometry'
import { ButtonModel, BUTTON_TRAVEL } from './ButtonModel'
import { BuzzerModel } from './BuzzerModel'
import { LedModel } from './LedModel'
import { Mcp3008Model } from './Mcp3008Model'
import { PartModel } from './PartModel'
import { PiBoardModel } from './PiBoardModel'
import { PotentiometerModel, knobAngle } from './PotentiometerModel'
import { pinColor } from './PinHeader'
import { TemperatureModel } from './TemperatureModel'
import { readPalette } from '../palette'

beforeAll(() => { document.documentElement.style.setProperty('--color-led-green', 'lime') })

const part = (kind: PartKind, extra: Partial<Part> = {}): Part => ({ id: 'p1', kind, x: 0, y: 0, connections: {}, ...extra })

const find = (root: Object3D, name: string) => root.getObjectByName(name)!
const meshes = (root: Object3D) => { const out: Mesh[] = []; root.traverse((o) => { if ((o as Mesh).isMesh) out.push(o as Mesh) }); return out }

describe('Pi-printplaat', () => {
  it('heeft de ware afmetingen 85 × 56 mm en geen logo', async () => {
    const r = await ReactThreeTestRenderer.create(<PiBoardModel />)
    const plate = meshes(r.scene.instance).find((m) => m.geometry.type === 'ExtrudeGeometry')!
    plate.geometry.computeBoundingBox()
    const b = plate.geometry.boundingBox!
    expect(b.max.x - b.min.x).toBeCloseTo(PI_BOARD.width, 6)
    expect(b.max.y - b.min.y).toBeCloseTo(PI_BOARD.depth, 6)
    expect(b.max.z - b.min.z).toBeCloseTo(PI_BOARD.thickness, 6)
    const names = meshes(r.scene.instance).map((m) => m.name.toLowerCase())
    expect(names.some((n) => /logo|raspberry|brand/.test(n))).toBe(false)
  })

  it('heeft chips en USB-, ethernet- en HDMI-poorten als blokken', async () => {
    const r = await ReactThreeTestRenderer.create(<PiBoardModel />)
    for (const n of ['soc', 'usb-a-1', 'usb-a-2', 'ethernet', 'hdmi-1', 'hdmi-2', 'usb-c', 'header-body']) {
      expect(r.scene.instance.getObjectByName(n), n).toBeTruthy()
    }
  })

  it('de 40 pinnen zijn één InstancedMesh en liggen precies op pinWorld', async () => {
    const r = await ReactThreeTestRenderer.create(<PiBoardModel />)
    const root = r.scene.instance
    root.updateMatrixWorld(true)
    const pins = find(root, 'pins') as InstancedMesh
    expect(pins.count).toBe(40)
    const m = new Matrix4()
    for (let n = 1; n <= 40; n++) {
      pins.getMatrixAt(n - 1, m)
      const local = new Vector3().setFromMatrixPosition(m)
      const world = local.add(new Vector3(PI_ORIGIN.x, 0, PI_ORIGIN.z))
      const want = pinWorld(n)
      expect(world.x).toBeCloseTo(want.x, 4)
      expect(world.z).toBeCloseTo(want.z, 4)
      expect(world.y + HEADER.pinTop / 2).toBeCloseTo(want.y, 4)
    }
  })

  it('pinkleur: goud, accent als kiesbaar, gedimd als niet kiesbaar, rood bij probleem', () => {
    const p = readPalette()
    const c = { gold: p.gold, accent: p.accent, danger: p.danger, dim: p['metal-dark'] }
    expect(pinColor(5, c)).toBe(p.gold)
    expect(pinColor(5, c, [5, 7])).toBe(p.accent)
    expect(pinColor(6, c, [5, 7])).toBe(p['metal-dark'])
    expect(pinColor(6, c, [5, 7], [6])).toBe(p.danger)
  })
})

describe('onderdelen', () => {
  it('led: uit = geen gloed en geen licht; aan = emissive en lichtpuntje in zijn kleur', async () => {
    const off = await ReactThreeTestRenderer.create(<LedModel part={part('led', { color: 'green' })} live={{ level: 0 }} />)
    const on = await ReactThreeTestRenderer.create(<LedModel part={part('led', { color: 'green' })} live={{ level: 1 }} />)
    const emissive = (root: Object3D) => Math.max(...meshes(root).map((m) => { const mat = m.material as MeshStandardMaterial; return Math.max(mat.emissive.r, mat.emissive.g, mat.emissive.b) * mat.emissiveIntensity }))
    expect(emissive(off.scene.instance)).toBe(0)
    expect(emissive(on.scene.instance)).toBeGreaterThan(0.5)
    expect((find(off.scene.instance, 'led-light') as PointLight).intensity).toBe(0)
    const light = find(on.scene.instance, 'led-light') as PointLight
    expect(light.intensity).toBeGreaterThan(0)
    expect(light.color.g).toBeGreaterThan(light.color.r) // groen
    expect(find(on.scene.instance, 'led').userData.glow).toBe('on')
    expect(find(off.scene.instance, 'led').userData.glow).toBe('off')
  })

  it('led: halve helderheid geeft een zwakker licht dan vol', async () => {
    const half = await ReactThreeTestRenderer.create(<LedModel part={part('led')} live={{ level: 0.5 }} />)
    const full = await ReactThreeTestRenderer.create(<LedModel part={part('led')} live={{ level: 1 }} />)
    const i = (r: typeof half) => (find(r.scene.instance, 'led-light') as PointLight).intensity
    expect(i(half)).toBeLessThan(i(full))
  })

  it('knop: de dop staat lager als hij ingedrukt is', async () => {
    const up = await ReactThreeTestRenderer.create(<ButtonModel part={part('button')} live={{ pressed: false }} />)
    const down = await ReactThreeTestRenderer.create(<ButtonModel part={part('button')} live={{ pressed: true }} />)
    const y = (r: typeof up) => find(r.scene.instance, 'button-cap').position.y
    expect(y(up) - y(down)).toBeCloseTo(BUTTON_TRAVEL, 6)
  })

  it('potmeter: de knop draait mee met de stand en blijft binnen 270°', async () => {
    const at = async (position: number) => {
      const r = await ReactThreeTestRenderer.create(<PotentiometerModel part={part('potentiometer')} live={{ position }} />)
      return find(r.scene.instance, 'knob').rotation.y
    }
    expect(await at(0.5)).toBeCloseTo(0, 6)
    expect(await at(0)).toBeCloseTo(knobAngle(0), 6)
    expect(Math.abs(knobAngle(0) - knobAngle(1))).toBeCloseTo((270 * Math.PI) / 180, 6)
    expect(await at(0.25)).not.toBeCloseTo(await at(0.75), 3)
    expect(knobAngle(-3)).toBe(knobAngle(0))
  })

  it('buzzer en temperatuursensor worden gebouwd', async () => {
    const b = await ReactThreeTestRenderer.create(<BuzzerModel part={part('buzzer')} live={{ level: 1 }} />)
    expect(find(b.scene.instance, 'buzzer').userData.active).toBe(true)
    const t = await ReactThreeTestRenderer.create(<TemperatureModel part={part('temperature')} live={{ celsius: 20 }} />)
    expect(meshes(t.scene.instance).length).toBeGreaterThanOrEqual(5)
  })

  it('PartModel kiest het juiste model voor elk soort', async () => {
    const names: Partial<Record<PartKind, string>> = { led: 'led', button: 'button', buzzer: 'buzzer', temperature: 'temperature', potentiometer: 'potentiometer' }
    for (const kind of Object.keys(names) as PartKind[]) {
      const r = await ReactThreeTestRenderer.create(<PartModel part={part(kind)} live={{}} />)
      expect(r.scene.instance.getObjectByName(names[kind]!), kind).toBeTruthy()
    }
  })

  it('modellen blijven licht: weinig meshes per onderdeel', async () => {
    for (const kind of ['led', 'button', 'buzzer', 'temperature', 'potentiometer'] as PartKind[]) {
      const r = await ReactThreeTestRenderer.create(<PartModel part={part(kind)} live={{}} />)
      expect(meshes(r.scene.instance).length, kind).toBeLessThan(15)
    }
  })

  it('draadankers: de pootjes staan op de ankerpunten', () => {
    expect(PART_ANCHORS.led.signal[0]).toBe(-1.27)
    expect(PART_ANCHORS.led.ground![0]).toBe(1.27)
    for (const a of Object.values(PART_ANCHORS)) expect(a.signal[1]).toBeGreaterThan(0)
  })
})

describe('MCP3008', () => {
  it('heeft 16 pootjes in één InstancedMesh en pin 1 linksboven', async () => {
    const r = await ReactThreeTestRenderer.create(<Mcp3008Model />)
    const legs = meshes(r.scene.instance).find((m) => (m as InstancedMesh).isInstancedMesh) as InstancedMesh
    expect(legs.count).toBe(16)
    const m = new Matrix4()
    legs.getMatrixAt(0, m)
    const p1 = new Vector3().setFromMatrixPosition(m)
    const [x, , z] = chipPinLocal(1)
    expect(p1.x).toBeCloseTo(x, 6); expect(p1.z).toBeCloseTo(z, 6)
  })
  it('pinnen: 8 links (CH0..CH7 van boven naar beneden), 8 rechts van onder naar boven; alle posities uniek', () => {
    const keys = new Set<string>()
    for (let n = 1; n <= 16; n++) keys.add(chipPinLocal(n).join(','))
    expect(keys.size).toBe(16)
    expect(chipChannelLocal(0)[2]).toBeLessThan(chipChannelLocal(7)[2])
    expect(chipChannelLocal(0)[0]).toBe(-CHIP_DIM.rowOffset)
    expect(chipPinLocal(9)[2]).toBeGreaterThan(chipPinLocal(16)[2])
    expect(chipPinLocal(16)[2]).toBe(chipPinLocal(1)[2]) // VDD tegenover CH0
    expect(chipLabelLocal('VDD')).toEqual(chipPinLocal(16))
    expect(() => chipPinLocal(17)).toThrow(RangeError)
  })
})
