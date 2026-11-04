export interface OutLine { stream: 'stdout' | 'stderr'; text: string }

export interface OutputBufferOptions {
  /** Minimale tijd tussen twee berichten naar de hoofdthread. */
  intervalMs: number
  /** Maximaal aantal regels dat bewaard wordt; oudere regels vallen af. */
  max: number
  now: () => number
}

/**
 * Bundelt print()-uitvoer in de worker. Python blokkeert de worker, dus een timer kan niet draaien:
 * we kijken bij elke regel hoe laat het is, en de worker roept `flush()` aan bij sleep en einde.
 * Zo krijgt de hoofdthread hooguit ~20 berichten per seconde, hoeveel er ook geprint wordt.
 */
export class OutputBuffer {
  private lines: OutLine[] = []
  private last = -Infinity

  constructor(private readonly post: (lines: OutLine[]) => void, private readonly o: OutputBufferOptions) {}

  push(stream: OutLine['stream'], text: string): void {
    this.lines.push({ stream, text })
    if (this.lines.length > this.o.max) this.lines.splice(0, this.lines.length - this.o.max)
    if (this.o.now() - this.last >= this.o.intervalMs) this.flush()
  }

  flush(): void {
    if (this.lines.length === 0) return
    const batch = this.lines
    this.lines = []
    this.last = this.o.now()
    this.post(batch)
  }
}
