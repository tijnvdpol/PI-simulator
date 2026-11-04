import type { PythonErrorInfo } from './explainError'

export type ToWorker =
  | { type: 'init'; buffer: SharedArrayBuffer }
  | { type: 'run'; code: string }

export type WarnMessage = { type: 'warn'; code: 'pin-unconnected' | 'pin-wrong-kind'; pin: string; device: string; found?: string }

export type FromWorker =
  | { type: 'ready' }
  | { type: 'load-error'; message: string }
  | { type: 'stdout' | 'stderr'; text: string }
  | WarnMessage
  | { type: 'done'; error: PythonErrorInfo | null }

export type EngineStatus = 'laden' | 'klaar' | 'draait' | 'laadfout'
