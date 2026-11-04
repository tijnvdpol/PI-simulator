/** Buzzergeluid via Web Audio: een zachte blokgolf van ~2 kHz. */
export class BuzzerSound {
  private osc: OscillatorNode | null = null
  private gain: GainNode | null = null

  constructor(private ctx?: AudioContext) {}

  /** Moet vanuit een klik worden aangeroepen (browsers eisen een gebruikersgebaar voor geluid). */
  async unlock(): Promise<void> {
    this.ctx ??= new AudioContext()
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  setActive(on: boolean): void {
    const ctx = this.ctx
    if (!ctx) return
    if (on && !this.osc) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 2000
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01)
      this.osc = osc
      this.gain = gain
    } else if (!on && this.osc) {
      const { osc, gain } = { osc: this.osc, gain: this.gain }
      gain?.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01)
      osc.stop(ctx.currentTime + 0.02)
      this.osc = null
      this.gain = null
    }
  }

  dispose(): void {
    this.setActive(false)
  }
}
