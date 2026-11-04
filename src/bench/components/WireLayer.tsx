import type { Part } from '../../project/types'
import type { Wire, WireColor } from '../wires'
import { boardPin, chipChannelPin, chipLabelPin, partAnchor } from '../partGeometry'

const STROKE: Record<WireColor, string> = {
  red: 'stroke-wire-red', black: 'stroke-wire-black', blue: 'stroke-wire-blue', green: 'stroke-wire-green',
  yellow: 'stroke-wire-yellow', orange: 'stroke-wire-orange', purple: 'stroke-wire-purple',
}

function endpoints(w: Wire, parts: Part[]) {
  let a: { x: number; y: number }
  if ('part' in w.from) {
    const part = parts.find((p) => p.id === (w.from as { part: string }).part)
    if (!part) return null
    a = partAnchor(part, w.kind === 'ground' ? 'ground' : 'signal')
  } else {
    a = chipLabelPin(w.label ?? 'VDD')
  }
  const b = 'physical' in w.to ? boardPin(w.to.physical) : chipChannelPin(w.to.channel)
  return { a, b }
}

export function WireLayer({ wires, parts }: { wires: Wire[]; parts: Part[] }) {
  return (
    <g fill="none" strokeLinecap="round" pointerEvents="none">
      {wires.map((w) => {
        const e = endpoints(w, parts)
        if (!e) return null
        const { a, b } = e
        const dy = Math.max(40, Math.abs(b.y - a.y) * 0.5)
        const d = `M${a.x} ${a.y} C${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`
        return (
          <g key={w.id} data-wire-id={w.id} data-wire-color={w.color}>
            <path d={d} className="stroke-ink" strokeWidth="6" opacity="0.5" />
            <path d={d} className={STROKE[w.color]} strokeWidth="3.5" />
            <circle cx={b.x} cy={b.y} r="3" className={`${STROKE[w.color]} fill-ink`} strokeWidth="1.5" />
          </g>
        )
      })}
    </g>
  )
}
