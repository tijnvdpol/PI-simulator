import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, type RefObject } from 'react'
import type { V3 } from './anchors'
import { projectToScreen } from './overlayProjection'

/**
 * Zet gewone HTML-elementen (labels, schuifjes, tooltip) op de plek van een 3D-punt. Draait alleen mee met getekende frames,
 * schrijft rechtstreeks in de stijl van het element en veroorzaakt dus geen extra React-renders.
 */
export function OverlayProjector({ items, anchors }: { items: RefObject<Map<string, HTMLElement>>; anchors: Record<string, V3> }) {
  const invalidate = useThree((s) => s.invalidate)
  useFrame(({ camera, size }) => {
    for (const [id, el] of items.current) {
      const a = anchors[id]
      const p = a ? projectToScreen(a, camera, size.width, size.height) : null
      if (!p) { el.style.visibility = 'hidden'; continue }
      el.style.visibility = 'visible'
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, 0)`
    }
  })
  // Nieuwe of verplaatste elementen moeten meteen op hun plek komen.
  useEffect(() => { invalidate() }, [anchors, invalidate])
  return null
}
