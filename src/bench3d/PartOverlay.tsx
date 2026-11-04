import { sliderFor } from '../bench/liveControls'
import type { Part } from '../project/types'
import { partLabel } from './labels'

function SensorSlider({ part, value, onChange }: { part: Part; value: number | undefined; onChange: (v: number) => void }) {
  const spec = sliderFor(part.kind)
  if (!spec) return null
  const v = value ?? spec.initial
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-0.5 text-[11px] text-fg">
      <input
        type="range"
        aria-label={spec.label}
        className="w-24 accent-accent"
        min={spec.min * spec.scale}
        max={spec.max * spec.scale}
        step={spec.step * spec.scale}
        value={Math.round(v * spec.scale * 100) / 100}
        onChange={(e) => onChange(Number(e.target.value) / spec.scale)}
      />
      <span>{spec.format(v)}</span>
    </div>
  )
}

/** Label onder het onderdeel ("led · GPIO 17"), voor sensoren met een schuifje, en bij een aansluitingsprobleem een oranje regel. */
export function PartOverlay({ part, slider, issue }: { part: Part; slider?: { value: number | undefined; onChange: (v: number) => void }; issue?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="whitespace-nowrap text-[11px] text-fg-muted">{partLabel(part)}</div>
      {issue && <div className="whitespace-nowrap text-[11px] text-warning">⚠ {issue}</div>}
      {slider && sliderFor(part.kind) && <SensorSlider part={part} value={slider.value} onChange={slider.onChange} />}
    </div>
  )
}
