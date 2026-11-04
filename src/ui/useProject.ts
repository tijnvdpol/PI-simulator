import { useCallback, useMemo, useReducer, useState } from 'react'
import { benchReducer, initialBench } from '../bench/benchState'
import type { BenchAction } from '../bench/benchState'
import type { Project } from '../project/types'

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

/** Houdt het hele project (onderdelen + code + naam) bij; één bron van waarheid voor de UI. */
export function useProject(initial?: Project) {
  const [bench, dispatch] = useReducer(benchReducer, initial ? { ...initialBench, parts: initial.parts } : initialBench)
  const [code, setCode] = useState(initial?.code ?? STARTER_CODE)
  const [name, setName] = useState(initial?.name ?? 'Mijn project')

  const project: Project = useMemo(() => ({ version: 2, mode: 'simple', name, parts: bench.parts, code }), [name, bench.parts, code])

  const load = useCallback((p: Project) => {
    dispatch({ type: 'load', parts: p.parts })
    setCode(p.code)
    setName(p.name)
  }, [])

  const dispatchBench = useCallback((a: BenchAction) => dispatch(a), [])

  return { project, bench, code, setCode, name, setName, dispatchBench, load }
}
