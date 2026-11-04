import { LedModel } from './LedModel'
import type { PartModelProps } from './types'

/** Dimbare led: dezelfde led, maar de gloed en het licht volgen de helderheid (0–1) in plaats van alleen aan of uit. */
export function PwmLedModel({ part, live }: PartModelProps) {
  const brightness = Math.min(1, Math.max(0, live.level ?? 0))
  return (
    <group name="pwmled" userData={{ brightness }}>
      <LedModel part={part} live={live} linear />
    </group>
  )
}
