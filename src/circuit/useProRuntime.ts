import { useEffect, useRef, useState } from 'react'
import type { HardwareState } from '../engine/hardwareState'
import { analyze, type AnalysisResult } from './analyze'
import { effectiveParts, inputsFromHardware, syncHardware } from './live'
import type { ProAction } from './proState'
import type { Circuit } from './types'

const IDLE: AnalysisResult = { parts: {}, issues: [], short: false, gpioLevel: {}, attached: {}, analog: {}, newlyBurnt: [] }

export interface ProRuntimeDeps {
  active: boolean
  circuit: Circuit
  hw: HardwareState
  pressed: Record<string, boolean>
  sensors: Record<string, number>
  burnt: string[]
  dispatch: (a: ProAction) => void
}

/**
 * Rekent de schakeling door bij elke wijziging (circuit, knoppen, sensoren) en bij elke verandering in wat Python met de pinnen doet,
 * en zet de uitkomst (welk onderdeel op welke GPIO, knopstanden, sensorwaarden) in het gedeelde geheugen.
 */
export function useProRuntime(d: ProRuntimeDeps): AnalysisResult {
  const [result, setResult] = useState<AnalysisResult>(IDLE)
  const latest = useRef(d)
  latest.current = d
  const active = d.active

  useEffect(() => {
    if (!active) { setResult(IDLE); return }
    let id = 0
    let lastKey = ''
    let lastParts = ''
    const tick = () => {
      const { circuit, hw, pressed, sensors, burnt, dispatch } = latest.current
      const inputs = inputsFromHardware(hw, { pressed, sensors, burnt: new Set(burnt) })
      const key = JSON.stringify([circuit, inputs.gpio, pressed, sensors, burnt])
      if (key !== lastKey) {
        lastKey = key
        const r = analyze(circuit, inputs)
        const parts = effectiveParts(r)
        const partsKey = JSON.stringify(parts)
        if (partsKey !== lastParts) { lastParts = partsKey; hw.setParts(parts) }
        syncHardware(hw, r, inputs)
        setResult(r)
        if (r.newlyBurnt.length) dispatch({ type: 'burn', ids: r.newlyBurnt })
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [active])

  return result
}
