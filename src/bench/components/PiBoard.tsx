import { useState } from 'react'
import { PINS, pinByPhysical } from '../../pinout/pinout'

export const BOARD_W = 680
export const BOARD_H = 440
const PITCH = 20.32            // 2,54 mm × 8
const HEADER_X = 70            // midden van de eerste kolom
const TOP_Y = 36               // buitenste rij (even pinnen)
const PIN = 13                 // zijde van het goudkleurige pinnetje

/** Midden van een pin in de coördinaten van het bord (voor draden). Even pinnen = buitenste rij. */
export function pinPosition(physical: number): { x: number; y: number } {
  const col = Math.floor((physical - 1) / 2)
  const outer = physical % 2 === 0
  return { x: HEADER_X + col * PITCH, y: TOP_Y + (outer ? 0 : PITCH) }
}

export interface PiBoardProps {
  /** Fysieke pinnen die nu gekozen mogen worden. Als dit is gezet, worden de andere pinnen gedimd. */
  selectable?: number[]
  onPinClick?: (physical: number) => void
  /** Pinnen waar iets mis mee is (pulserend rood). */
  issuePins?: number[]
}

export function PiBoard({ selectable, onPinClick, issuePins = [] }: PiBoardProps) {
  const [hover, setHover] = useState<number | null>(null)
  const selecting = selectable !== undefined

  return (
    <g data-testid="pi-board">
      {/* printplaat */}
      <rect x="0" y="0" width={BOARD_W} height={BOARD_H} rx="14" className="fill-board stroke-ink" strokeWidth="2" />
      {[[22, 22], [BOARD_W - 22, 22], [22, BOARD_H - 22], [BOARD_W - 22, BOARD_H - 22]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" className="fill-bg stroke-gold" strokeWidth="2" />
      ))}
      {/* onderdelen van de Pi */}
      <rect x="260" y="150" width="90" height="90" rx="6" className="fill-metal-dark stroke-ink" />
      <text x="305" y="200" textAnchor="middle" fontSize="11" className="fill-metal">Pi</text>
      <rect x="560" y="120" width="106" height="84" rx="4" className="fill-metal stroke-metal-dark" />
      <rect x="560" y="214" width="106" height="84" rx="4" className="fill-metal stroke-metal-dark" />
      <rect x="590" y="312" width="76" height="90" rx="4" className="fill-metal stroke-metal-dark" />
      <rect x="60" y="400" width="52" height="30" rx="4" className="fill-metal stroke-metal-dark" />
      <rect x="150" y="410" width="36" height="22" rx="3" className="fill-ink" />
      <rect x="200" y="410" width="36" height="22" rx="3" className="fill-ink" />
      <text x="70" y="388" fontSize="9" className="fill-fg-muted" opacity="0.8">USB-C</text>

      {/* GPIO-header */}
      <rect x={HEADER_X - 12} y={TOP_Y - 14} width={19 * PITCH + 24} height={PITCH + 28} rx="3" className="fill-ink" />
      <text x={HEADER_X - 12} y={TOP_Y - 20} fontSize="10" className="fill-fg-muted">GPIO</text>
      {PINS.map((pin) => {
        const { x, y } = pinPosition(pin.physical)
        const isSelectable = selecting && selectable!.includes(pin.physical)
        const dim = selecting && !isSelectable
        const issue = issuePins.includes(pin.physical)
        return (
          <g
            key={pin.physical}
            data-physical={pin.physical}
            data-selectable={isSelectable ? 'true' : 'false'}
            data-issue={issue ? 'true' : 'false'}
            role={isSelectable ? 'button' : undefined}
            tabIndex={isSelectable ? 0 : undefined}
            aria-label={`Pin ${pin.physical}, ${pin.naam}`}
            onMouseEnter={() => setHover(pin.physical)}
            onMouseLeave={() => setHover((h) => (h === pin.physical ? null : h))}
            onClick={() => { if (isSelectable) onPinClick?.(pin.physical) }}
            onKeyDown={(e) => { if (isSelectable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPinClick?.(pin.physical) } }}
            style={{ cursor: isSelectable ? 'pointer' : 'default', transition: 'opacity var(--dur)' }}
            opacity={dim ? 0.3 : 1}
          >
            <rect x={x - 10} y={y - 10} width="20" height="20" fill="transparent" />
            <rect
              x={x - PIN / 2} y={y - PIN / 2} width={PIN} height={PIN} rx={pin.physical === 1 ? 1 : 3}
              className={issue ? 'fill-danger animate-pulse' : 'fill-gold'}
            />
            {isSelectable && (
              <rect x={x - PIN / 2 - 3} y={y - PIN / 2 - 3} width={PIN + 6} height={PIN + 6} rx="5" fill="none" className="stroke-accent" strokeWidth="2.5" />
            )}
            {hover === pin.physical && !isSelectable && <rect x={x - PIN / 2 - 2} y={y - PIN / 2 - 2} width={PIN + 4} height={PIN + 4} rx="4" fill="none" className="stroke-fg" strokeWidth="1.5" />}
          </g>
        )
      })}

      {hover !== null && <PinTooltip physical={hover} />}
    </g>
  )
}

function PinTooltip({ physical }: { physical: number }) {
  const pin = pinByPhysical(physical)
  const text = `Pin ${pin.physical} · ${pin.naam} · ${pin.functie}`
  const w = Math.min(Math.max(text.length * 6.1 + 16, 90), 420)
  const { x, y } = pinPosition(physical)
  const tx = Math.min(Math.max(x - w / 2, 4), BOARD_W - w - 4)
  const ty = y + 24
  return (
    <g role="tooltip" pointerEvents="none">
      <rect x={tx} y={ty} width={w} height="26" rx="6" className="fill-ink stroke-line" />
      <text x={tx + 8} y={ty + 17} fontSize="11" className="fill-fg">{text}</text>
    </g>
  )
}
