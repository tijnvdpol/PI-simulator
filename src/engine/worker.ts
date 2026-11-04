/// <reference lib="webworker" />
import { loadPyodide, type PyodideInterface } from 'pyodide'
import { bootPython } from './boot'
import { HardwareState, bridgeFromState } from './hardwareState'
import type { FromWorker, ToWorker } from './protocol'
import type { PythonErrorInfo } from './explainError'
import { OutputBuffer } from './outputBuffer'
import { PILLOW_WHEEL } from './pillow'

const ctx = self as unknown as DedicatedWorkerGlobalScope
const post = (m: FromWorker) => ctx.postMessage(m)

let pyodide: PyodideInterface | null = null

// print() wordt gebundeld (max ~20 berichten/s, laatste 500 regels): een print()-lus mag de pagina niet vastzetten.
const out = new OutputBuffer((lines) => post({ type: 'lines', lines }), { intervalMs: 50, max: 500, now: () => performance.now() })

async function init(buffer: SharedArrayBuffer) {
  try {
    const state = new HardwareState(buffer)
    const py = await loadPyodide({ indexURL: `${import.meta.env.BASE_URL}pyodide/` })
    await py.loadPackage(`${import.meta.env.BASE_URL}pyodide/${PILLOW_WHEEL}`) // Pillow voor ImageDraw (OLED)
    py.setStdout({ batched: (text) => out.push('stdout', text) })
    py.setStderr({ batched: (text) => out.push('stderr', text) })
    const bridge = bridgeFromState(state, (code, info) => post({ type: 'warn', code, pin: info.pin, device: info.device, found: info.found }))
    // Voor een wachttijd eerst de uitvoer doorsturen, zodat je print() tijdens sleep() direct ziet.
    bootPython(py, { ...bridge, sleep: (s) => { out.flush(); bridge.sleep(s) } })
    pyodide = py
    post({ type: 'ready' })
  } catch (e) {
    post({ type: 'load-error', message: String((e as Error)?.message ?? e) })
  }
}

function run(code: string) {
  if (!pyodide) return
  const runner = pyodide.pyimport('pisim.runner')
  const res = runner.run(code)
  runner.destroy()
  let error: PythonErrorInfo | null = null
  if (res) {
    error = res.toJs({ dict_converter: Object.fromEntries }) as PythonErrorInfo
    res.destroy()
  }
  out.flush()
  post({ type: 'done', error })
}

ctx.onmessage = (e: MessageEvent<ToWorker>) => {
  if (e.data.type === 'init') void init(e.data.buffer)
  else if (e.data.type === 'run') run(e.data.code)
}
