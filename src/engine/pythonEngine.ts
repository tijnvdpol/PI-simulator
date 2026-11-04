import type { HardwareState } from './hardwareState'
import type { PythonErrorInfo } from './explainError'
import type { EngineStatus, FromWorker, ToWorker, WarnMessage } from './protocol'

export interface WorkerLike {
  postMessage(m: ToWorker): void
  terminate(): void
  onmessage: ((e: { data: FromWorker }) => void) | null
  onerror: ((e: unknown) => void) | null
}

export interface EngineOptions {
  state: HardwareState
  createWorker: () => WorkerLike
  onStatus(s: EngineStatus): void
  onOutput(l: { stream: 'stdout' | 'stderr'; text: string }): void
  onWarn(w: WarnMessage): void
  onDone(e: PythonErrorInfo | null): void
  /** Na zoveel milliseconden zonder 'ready' geldt het laden als mislukt (standaard 60 s). */
  loadTimeoutMs?: number
}

/**
 * Beheert de Python-worker. Er staat altijd een "warme" worker klaar; Stop beëindigt de
 * worker (werkt ook bij een oneindige lus) en start meteen een nieuwe.
 */
export class PythonEngine {
  status: EngineStatus = 'laden'
  private worker: WorkerLike | null = null
  private loadTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly o: EngineOptions) {
    this.spawn()
  }

  start(code: string): void {
    if (this.status !== 'klaar' || !this.worker) return
    this.o.state.resetOutputs()
    this.o.state.resetButtons()
    this.o.state.resetDisplay()
    this.setStatus('draait')
    this.worker.postMessage({ type: 'run', code })
  }

  stop(): void {
    this.worker?.terminate()
    this.o.state.resetOutputs()
    this.o.state.resetButtons()
    this.o.state.resetDisplay()
    this.spawn()
  }

  /** Ruim alles op (bij het sluiten van de pagina): geen nieuwe worker meer. */
  dispose(): void {
    this.clearLoadTimer()
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
    // Een worker die niet eens opstart (bundel mislukt, geen module-workers) meldt zich nooit; dan wordt het een laadfout.
    w.onerror = () => { if (this.worker === w) this.loadFailed() }
    this.clearLoadTimer()
    this.loadTimer = setTimeout(() => { if (this.worker === w && this.status === 'laden') this.loadFailed() }, this.o.loadTimeoutMs ?? 60_000)
    w.postMessage({ type: 'init', buffer: this.o.state.buffer as SharedArrayBuffer })
  }

  private handle(m: FromWorker): void {
    switch (m.type) {
      case 'ready': this.clearLoadTimer(); this.o.state.resetOutputs(); this.setStatus('klaar'); break
      case 'load-error': this.loadFailed(); break
      case 'lines': for (const l of m.lines) this.o.onOutput(l); break
      case 'warn': this.o.onWarn(m); break
      case 'done': this.setStatus('klaar'); this.o.onDone(m.error); break
    }
  }

  private loadFailed(): void {
    this.clearLoadTimer()
    this.setStatus('laadfout')
  }

  private clearLoadTimer(): void {
    if (this.loadTimer !== null) { clearTimeout(this.loadTimer); this.loadTimer = null }
  }

  private setStatus(s: EngineStatus): void {
    this.status = s
    this.o.onStatus(s)
  }
}
