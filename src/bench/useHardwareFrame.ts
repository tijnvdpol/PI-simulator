import { useEffect, useRef, useState } from 'react'
import type { HardwareState } from '../engine/hardwareState'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Leest elke animatieframe uit het gedeelde geheugen; rendert alleen opnieuw als de waarde verandert. */
export function useHardwareFrame<T>(read: (s: HardwareState) => T, state: HardwareState): T {
  const [value, setValue] = useState<T>(() => read(state))
  const readRef = useRef(read)
  readRef.current = read
  useEffect(() => {
    let id = 0
    const tick = () => {
      const next = readRef.current(state)
      setValue((prev) => (same(prev, next) ? prev : next))
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [state])
  return value
}
