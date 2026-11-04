import { beforeEach, describe, expect, it } from 'vitest'
import { HardwareState } from './hardwareState'
import { PythonEngine, type WorkerLike } from './pythonEngine'
import type { EngineStatus, FromWorker, ToWorker } from './protocol'

class FakeWorker implements WorkerLike {
  posted: ToWorker[] = []
  terminated = false
  onmessage: ((e: { data: FromWorker }) => void) | null = null
  postMessage(m: ToWorker) { this.posted.push(m) }
  terminate() { this.terminated = true }
  emit(data: FromWorker) { this.onmessage?.({ data }) }
}

describe('PythonEngine', () => {
  let workers: FakeWorker[]
  let statuses: EngineStatus[]
  let outputs: string[]
  let dones: unknown[]
  let warns: unknown[]
  let state: HardwareState
  let engine: PythonEngine
  const cur = () => workers[workers.length - 1]

  beforeEach(() => {
    workers = []; statuses = []; outputs = []; dones = []; warns = []
    state = new HardwareState()
    engine = new PythonEngine({
      state,
      createWorker: () => { const w = new FakeWorker(); workers.push(w); return w },
      onStatus: (s) => statuses.push(s),
      onOutput: (l) => outputs.push(`${l.stream}:${l.text}`),
      onWarn: (w) => warns.push(w),
      onDone: (e) => dones.push(e),
    })
  })

  it('start in laden, na ready klaar; stuurt de gedeelde buffer mee', () => {
    expect(engine.status).toBe('laden')
    expect(cur().posted[0]).toEqual({ type: 'init', buffer: state.buffer })
    cur().emit({ type: 'ready' })
    expect(engine.status).toBe('klaar')
    expect(statuses).toEqual(['laden', 'klaar'])
  })
  it('start(code) stuurt run en zet draait; done → klaar', () => {
    cur().emit({ type: 'ready' })
    engine.start('print(1)')
    expect(cur().posted.at(-1)).toEqual({ type: 'run', code: 'print(1)' })
    expect(engine.status).toBe('draait')
    cur().emit({ type: 'stdout', text: '1' })
    cur().emit({ type: 'done', error: null })
    expect(engine.status).toBe('klaar')
    expect(outputs).toEqual(['stdout:1'])
    expect(dones).toEqual([null])
  })
  it('start tijdens laden doet niets', () => {
    engine.start('x')
    expect(cur().posted).toHaveLength(1)
    expect(engine.status).toBe('laden')
  })
  it('start wist de uitgangen van de vorige run', () => {
    cur().emit({ type: 'ready' })
    state.setOutput(17, 1)
    engine.start('x')
    expect(state.getOutput(17)).toBe(0)
  })
  it('stop tijdens draaien: terminate, uitgangen uit, nieuwe warme worker', () => {
    cur().emit({ type: 'ready' })
    const first = cur()
    engine.start('while True: pass')
    state.setOutput(17, 1)
    engine.stop()
    expect(first.terminated).toBe(true)
    expect(state.getOutput(17)).toBe(0)
    expect(workers).toHaveLength(2)
    expect(engine.status).toBe('laden')
    cur().emit({ type: 'ready' })
    expect(engine.status).toBe('klaar')
  })
  it('stop werkt als de worker nooit done stuurt, en berichten van de oude worker worden genegeerd', () => {
    cur().emit({ type: 'ready' })
    const first = cur()
    engine.start('while True: pass')
    engine.stop()
    first.emit({ type: 'done', error: null })
    first.emit({ type: 'stdout', text: 'laat' })
    expect(engine.status).toBe('laden')
    expect(outputs).toEqual([])
    expect(dones).toEqual([])
  })
  it('Review Focus 5: load-error → laadfout; retry maakt een nieuwe worker', () => {
    cur().emit({ type: 'load-error', message: 'offline' })
    expect(engine.status).toBe('laadfout')
    engine.start('x')
    expect(cur().posted).toHaveLength(1)
    engine.retry()
    expect(workers).toHaveLength(2)
    expect(workers[0].terminated).toBe(true)
    expect(engine.status).toBe('laden')
    cur().emit({ type: 'ready' })
    expect(engine.status).toBe('klaar')
  })
  it('warn-berichten worden doorgegeven', () => {
    cur().emit({ type: 'warn', code: 'pin-unconnected', pin: '17', device: 'LED' })
    expect(warns).toEqual([{ type: 'warn', code: 'pin-unconnected', pin: '17', device: 'LED' }])
  })
  it('done met fout geeft de fout door', () => {
    cur().emit({ type: 'ready' })
    engine.start('x')
    const error = { type: 'NameError', message: 'm', line: 1, traceback: '' }
    cur().emit({ type: 'done', error })
    expect(dones).toEqual([error])
  })
  it('dispose beëindigt de worker zonder een nieuwe te starten en negeert late berichten', () => {
    cur().emit({ type: 'ready' })
    const first = cur()
    engine.dispose()
    expect(first.terminated).toBe(true)
    expect(workers).toHaveLength(1)
    first.emit({ type: 'stdout', text: 'laat' })
    expect(outputs).toEqual([])
  })
  it('een late schrijfactie van de gestopte worker wordt weggeveegd zodra de nieuwe worker klaar is', () => {
    cur().emit({ type: 'ready' })
    engine.start('while True: pass')
    engine.stop()
    state.setOutput(17, 1) // de oude worker was nog net aan het schrijven
    cur().emit({ type: 'ready' })
    expect(state.getOutput(17)).toBe(0)
  })
})
