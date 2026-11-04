import type { PythonErrorInfo } from './explainError'
import type { OutLine } from './outputBuffer'

export type ToWorker =
  | { type: 'init'; buffer: SharedArrayBuffer }
  | { type: 'run'; code: string }

export type WarnMessage = { type: 'warn'; code: 'pin-unconnected' | 'pin-wrong-kind'; pin: string; device: string; found?: string }

export type FromWorker =
  | { type: 'ready' }
  | { type: 'load-error'; message: string }
  | { type: 'lines'; lines: OutLine[] }
  | WarnMessage
  | { type: 'done'; error: PythonErrorInfo | null }

export type EngineStatus = 'laden' | 'klaar' | 'draait' | 'laadfout'
