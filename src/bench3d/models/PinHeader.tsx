import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import { PINS, pinByPhysical } from '../../pinout/pinout'
import { HEADER, PI_BOARD, pinBoardMm } from '../geometry'
import { usePalette } from '../palette'

export interface PinHeaderProps {
  /** Pinnen die nu gekozen mogen worden; de rest wordt gedimd. */
  selectable?: number[]
  /** Pinnen waar iets mis mee is (code wil iets, maar er zit niets op). */
  issuePins?: number[]
  onPinClick?: (physical: number) => void
}

/** Kleur van pin `physical` in de huidige toestand. */
export function pinColor(
  physical: number,
  p: { gold: Color; accent: Color; danger: Color; dim: Color },
  selectable?: number[],
  issuePins: number[] = [],
): Color {
  if (issuePins.includes(physical)) return p.danger
  if (selectable) return selectable.includes(physical) ? p.accent : p.dim
  return p.gold
}

/** De 40 pinnen van de GPIO-header als één InstancedMesh, met een onzichtbare grotere doelmesh voor hover en klik. */
export function PinHeader({ selectable, issuePins, onPinClick }: PinHeaderProps) {
  const p = usePalette()
  const invalidate = useThree((s) => s.invalidate)
  const pins = useRef<InstancedMesh>(null)
  const hits = useRef<InstancedMesh>(null)
  const [hover, setHover] = useState<number | null>(null)

  const colors = useMemo(() => ({ gold: p.gold, accent: p.accent, danger: p.danger, dim: p['metal-dark'] }), [p])

  useLayoutEffect(() => {
    const o = new Object3D()
    for (const m of [pins.current, hits.current]) {
      if (!m) continue
      for (const pin of PINS) {
        const { u, v } = pinBoardMm(pin.physical)
        o.position.set(u, PI_BOARD.thickness + HEADER.pinTop / 2, v)
        o.updateMatrix()
        m.setMatrixAt(pin.physical - 1, o.matrix)
      }
      m.instanceMatrix.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [])

  useLayoutEffect(() => {
    const m = pins.current
    if (!m) return
    for (const pin of PINS) m.setColorAt(pin.physical - 1, pinColor(pin.physical, colors, selectable, issuePins))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  }, [colors, selectable, issuePins, invalidate])

  const info = hover === null ? null : pinByPhysical(hover)
  const at = hover === null ? null : pinBoardMm(hover)

  return (
    <group name="pin-header">
      <instancedMesh ref={pins} args={[undefined, undefined, 40]} name="pins">
        <boxGeometry args={[HEADER.pinSize, HEADER.pinTop, HEADER.pinSize]} />
        <meshStandardMaterial roughness={0.4} metalness={0.3} />
      </instancedMesh>
      <instancedMesh
        ref={hits}
        args={[undefined, undefined, 40]}
        name="pin-hits"
        onPointerMove={(e) => {
          e.stopPropagation()
          if (e.instanceId !== undefined) setHover(e.instanceId + 1)
        }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => {
          if (e.instanceId === undefined) return
          const physical = e.instanceId + 1
          if (selectable?.includes(physical)) { e.stopPropagation(); onPinClick?.(physical) }
        }}
      >
        <boxGeometry args={[2.2, HEADER.pinTop, 2.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>
      {info && at && (
        <Html position={[at.u, PI_BOARD.thickness + HEADER.pinTop + 2, at.v]} center style={{ pointerEvents: 'none' }}>
          <div role="tooltip" className="whitespace-nowrap rounded-ui border border-line bg-ink px-2 py-1 text-xs text-fg">
            <strong>Pin {info.physical} · {info.naam}</strong>
            <span className="text-fg-muted"> · {info.functie}</span>
          </div>
        </Html>
      )}
    </group>
  )
}
