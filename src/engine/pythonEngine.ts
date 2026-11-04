import type { HardwareState } from './hardwareState'
import type { PythonErrorInfo } from './explainError'
import type { EngineStatus, FromWorker, ToWorker, WarnMessage } from './protocol'

export interface WorkerLike {
  postMessage(m: ToWorker): void
  terminate(): void
  onmessage: ((e: { data: FromWorker }) => void) | null
}

export interface EngineOptions {
  state: HardwareState
  createWorker: () => WorkerLike
  onStatus(s: EngineStatus): void
  onOutput(l: { stream: 'stdout' | 'stderr'; text: string }): void
  onWarn(w: WarnMessage): void
  onDone(e: PythonErrorInfo | null): void
}

/**
 * Beheert de Python-worker. Er staat altijd een "warme" worker klaar; Stop beëindigt de
 * worker (werkt ook bij een oneindige lus) en start meteen een nieuwe.
 */
export class PythonEngine {
  status: EngineStatus = 'laden'
  private worker: WorkerLike | null = null

  constructor(private readonly o: EngineOptions) {
    this.spawn()
  }

  start(code: string): void {
    if (this.status !== 'klaar' || !this.worker) return
    this.o.state.resetOutputs()
    this.setStatus('draait')
    this.worker.postMessage({ type: 'run', code })
  }

  stop(): void {
    this.worker?.terminate()
    this.o.state.resetOutputs()
    this.spawn()
  }

  /** Ruim alles op (bij het sluiten van de pagina): geen nieuwe worker meer. */
  dispose(): void {
    this.worker?.terminate()
    this.worker = null
  }

  retry(): void {
    if (this.status !== 'laadfout') return
    this.worker?.terminate()
    this.spawn()
  }

  private spawn(): void {
    this.setStatus('laden')
    const w = this.o.createWorker()
    this.worker = w
    w.onmessage = (e) => { if (this.worker === w) this.handle(e.data) }
    w.postMessage({ type: 'init', buffer: this.o.state.buffer as SharedArrayBuffer })
  }

  private handle(m: FromWorker): void {
    switch (m.type) {
      case 'ready': this.o.state.resetOutputs(); this.setStatus('klaar'); break
      case 'load-error': this.setStatus('laadfout'); break
      case 'stdout':
      case 'stderr': this.o.onOutput({ stream: m.type, text: m.text }); break
      case 'warn': this.o.onWarn(m); break
      case 'done': this.setStatus('klaar'); this.o.onDone(m.error); break
    }
  }

  private setStatus(s: EngineStatus): void {
    this.status = s
    this.o.onStatus(s)
  }
}
