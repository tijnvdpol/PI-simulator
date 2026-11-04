/// <reference lib="webworker" />
import { loadPyodide, type PyodideInterface } from 'pyodide'
import { bootPython } from './boot'
import { HardwareState, bridgeFromState } from './hardwareState'
import type { FromWorker, ToWorker } from './protocol'
import type { PythonErrorInfo } from './explainError'

const ctx = self as unknown as DedicatedWorkerGlobalScope
const post = (m: FromWorker) => ctx.postMessage(m)

let pyodide: PyodideInterface | null = null

async function init(buffer: SharedArrayBuffer) {
  try {
    const state = new HardwareState(buffer)
    const py = await loadPyodide({ indexURL: `${import.meta.env.BASE_URL}pyodide/` })
    py.setStdout({ batched: (text) => post({ type: 'stdout', text }) })
    py.setStderr({ batched: (text) => post({ type: 'stderr', text }) })
    bootPython(py, bridgeFromState(state, (code, info) => post({ type: 'warn', code, pin: info.pin, device: info.device, found: info.found })))
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
  post({ type: 'done', error })
}

ctx.onmessage = (e: MessageEvent<ToWorker>) => {
  if (e.data.type === 'init') void init(e.data.buffer)
  else if (e.data.type === 'run') run(e.data.code)
}
