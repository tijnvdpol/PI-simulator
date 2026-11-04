import { useCallback, useMemo, useReducer, useState } from 'react'
import { benchReducer, initialBench } from '../bench/benchState'
import type { BenchAction } from '../bench/benchState'
import { initialPro, proReducer } from '../circuit/proState'
import type { Project, ProjectMode } from '../project/types'

export const STARTER_CODE = `from gpiozero import LED
from time import sleep

# Sleep een led naar de werkbank en verbind hem met pin 11 (GPIO17).
# Druk daarna op Start om hem te laten knipperen.
led = LED(17)

while True:
    led.on()
    sleep(1)
    led.off()
    sleep(1)
`

export const PRO_STARTER_CODE = `from gpiozero import LED
from time import sleep

# Bouw op het breadboard: pin 11 (GPIO17) -> weerstand -> led -> GND.
# Druk daarna op Start om de led te laten knipperen.
led = LED(17)

while True:
    led.on()
    sleep(1)
    led.off()
    sleep(1)
`

/** Houdt het hele project (modus + onderdelen/schakeling + code + naam) bij; één bron van waarheid voor de UI. */
export function useProject(initial?: Project) {
  const [mode, setMode] = useState<ProjectMode>(initial?.mode ?? 'simple')
  const [bench, dispatch] = useReducer(benchReducer, initial ? { ...initialBench, parts: initial.parts } : initialBench)
  const [pro, dispatchPro] = useReducer(proReducer, initial?.pro ? { ...initialPro, present: initial.pro } : initialPro)
  const [code, setCode] = useState(initial?.code ?? STARTER_CODE)
  const [name, setName] = useState(initial?.name ?? 'Mijn project')

  const project: Project = useMemo(
    () => (mode === 'pro'
      ? { version: 2, mode, name, parts: [], pro: pro.present, code }
      : { version: 2, mode, name, parts: bench.parts, code }),
    [mode, name, bench.parts, pro.present, code],
  )

  const load = useCallback((p: Project) => {
    setMode(p.mode)
    dispatch({ type: 'load', parts: p.parts })
    dispatchPro({ type: 'load', circuit: p.pro ?? { parts: [], wires: [] } })
    setCode(p.code)
    setName(p.name)
  }, [])

  const dispatchBench = useCallback((a: BenchAction) => dispatch(a), [])

  return { project, mode, bench, pro, dispatchPro, code, setCode, name, setName, dispatchBench, load }
}
