// @vitest-environment jsdom
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { Part } from '../project/types'
import { Scene, type SceneProps } from './Scene'

const led: Part = { id: 'part-1', kind: 'led', x: 300, y: 130, color: 'red', connection: { type: 'pin', physical: 11 } }
const temp: Part = { id: 'part-2', kind: 'temperature', x: 600, y: 130, connection: { type: 'adc', channel: 0 } }

const base = (over: Partial<SceneProps> = {}): SceneProps => ({
  parts: [], live: () => ({}), selectedId: null, locked: false, usedChannels: [], view: null,
  overlayItems: { current: new Map() }, projectRef: { current: null }, hoverPin: null, ...over,
})

describe('Scene', () => {
  it('toont tafel, Pi en geen chip zonder analoge onderdelen', async () => {
    const r = await ReactThreeTestRenderer.create(<Scene {...base()} />)
    const root = r.scene.instance
    expect(root.getObjectByName('table')).toBeTruthy()
    expect(root.getObjectByName('pi-board')).toBeTruthy()
    expect(root.getObjectByName('mcp3008')).toBeUndefined()
  })

  it('heeft één hoofdlicht (met schaduw) en één omgevingslicht', async () => {
    const r = await ReactThreeTestRenderer.create(<Scene {...base()} />)
    const lights: string[] = []
    r.scene.instance.traverse((o) => { if ((o as { isLight?: boolean }).isLight) lights.push(o.type) })
    expect(lights.sort()).toEqual(['AmbientLight', 'DirectionalLight'])
  })

  it('toont de onderdelen, hun draden en de chip zodra er een analoog onderdeel is', async () => {
    const r = await ReactThreeTestRenderer.create(<Scene {...base({ parts: [led, temp], usedChannels: [0] })} />)
    const root = r.scene.instance
    expect(root.getObjectByName('part-part-1')).toBeTruthy()
    expect(root.getObjectByName('part-part-2')).toBeTruthy()
    expect(root.getObjectByName('mcp3008')).toBeTruthy()
    expect(root.getObjectByName('wire-part-1:signal')).toBeTruthy()
    expect(root.getObjectByName('wire-part-1:gnd')).toBeTruthy()
    expect(root.getObjectByName('wire-part-2:signal')).toBeTruthy()
  })

  it('geeft live-waarden door: led aan → gloed', async () => {
    const r = await ReactThreeTestRenderer.create(<Scene {...base({ parts: [led], live: () => ({ level: 1 }) })} />)
    expect(r.scene.instance.getObjectByName('led')!.userData.glow).toBe('on')
    await r.update(<Scene {...base({ parts: [led], live: () => ({ level: 0 }) })} />)
    expect(r.scene.instance.getObjectByName('led')!.userData.glow).toBe('off')
  })

  it('markeert het geselecteerde onderdeel met een ring', async () => {
    const r = await ReactThreeTestRenderer.create(<Scene {...base({ parts: [led], selectedId: 'part-1' })} />)
    expect(r.scene.instance.getObjectByName('selection')).toBeTruthy()
    await r.update(<Scene {...base({ parts: [led], selectedId: null })} />)
    expect(r.scene.instance.getObjectByName('selection')).toBeUndefined()
  })

  it('klik op een onderdeel geeft het onderdeel door', async () => {
    const onClick = vi.fn()
    const r = await ReactThreeTestRenderer.create(<Scene {...base({ parts: [led], onClick })} />)
    const hit = r.scene.findByProps({ name: 'hit' })
    await r.fireEvent(hit, 'click')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0][0]).toBe(led)
  })

  it('knop ingedrukt (alleen tijdens het draaien) wordt doorgegeven aan pointerdown/up', async () => {
    const down = vi.fn(), up = vi.fn()
    const r = await ReactThreeTestRenderer.create(<Scene {...base({ parts: [led], locked: true, onPointerDown: down, onPointerUp: up })} />)
    const hit = r.scene.findByProps({ name: 'hit' })
    await r.fireEvent(hit, 'pointerDown')
    await r.fireEvent(hit, 'pointerUp')
    expect(down).toHaveBeenCalledTimes(1)
    expect(up).toHaveBeenCalledTimes(1)
  })
})
