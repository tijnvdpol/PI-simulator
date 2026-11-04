import { isAnalog } from '../bench/benchState'
import type { Part } from '../project/types'
import { partLabel } from './labels'

function SensorSlider({ part, value, onChange }: { part: Part; value: number | undefined; onChange: (v: number) => void }) {
  const isTemp = part.kind === 'temperature'
  const v = value ?? (isTemp ? 20 : 0.5)
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-0.5 text-[11px] text-fg">
      <input
        type="range"
        aria-label={isTemp ? 'Temperatuur' : 'Stand van de potmeter'}
        className="w-24 accent-accent"
        min={isTemp ? -10 : 0}
        max={isTemp ? 50 : 100}
        step={isTemp ? 0.5 : 1}
        value={isTemp ? v : Math.round(v * 100)}
        onChange={(e) => onChange(isTemp ? Number(e.target.value) : Number(e.target.value) / 100)}
      />
      <span>{isTemp ? `${v} °C` : `${Math.round(v * 100)}%`}</span>
    </div>
  )
}

/** Label onder het onderdeel ("led · GPIO 17"), voor sensoren met een schuifje. Wordt door `OverlayProjector` op zijn plek gezet. */
export function PartOverlay({ part, slider }: { part: Part; slider?: { value: number | undefined; onChange: (v: number) => void } }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="whitespace-nowrap text-[11px] text-fg-muted">{partLabel(part)}</div>
      {slider && isAnalog(part.kind) && <SensorSlider part={part} value={slider.value} onChange={slider.onChange} />}
    </div>
  )
}
