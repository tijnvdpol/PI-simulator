import { useThree } from '@react-three/fiber'
import { useEffect, type RefObject } from 'react'
import { ndcToTable } from './tablePlacement'

export type ClientToTable = (clientX: number, clientY: number) => { x: number; z: number } | null

/** Geeft de HTML-kant (slepen uit de onderdelenbak) een functie om muispositie om te zetten naar een plek op de tafel. */
export function TableProbe({ apiRef }: { apiRef: RefObject<ClientToTable | null> }) {
  const camera = useThree((s) => s.camera)
  const el = useThree((s) => s.gl.domElement)
  useEffect(() => {
    apiRef.current = (cx, cy) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return null
      return ndcToTable({ x: ((cx - r.left) / r.width) * 2 - 1, y: -(((cy - r.top) / r.height) * 2 - 1) }, camera)
    }
    return () => { apiRef.current = null }
  }, [apiRef, camera, el])
  return null
}
