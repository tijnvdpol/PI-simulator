import { CHIP, CHIP_RIGHT, chipChannelPin, chipRightPin } from '../partGeometry'

export interface Mcp3008Props {
  /** Kanalen die nu gekozen mogen worden. */
  selectable?: number[]
  onChannelClick?: (channel: number) => void
  usedChannels?: number[]
}

/** De MCP3008: de chip die analoge sensoren voor de Pi leesbaar maakt. */
export function Mcp3008({ selectable, onChannelClick, usedChannels = [] }: Mcp3008Props) {
  const selecting = selectable !== undefined
  return (
    <g data-testid="mcp3008">
      <rect x={CHIP.x} y={CHIP.y} width={CHIP.w} height={CHIP.h} rx="4" className="fill-ink stroke-line" strokeWidth="2" />
      <path d={`M${CHIP.x + CHIP.w / 2 - 8} ${CHIP.y}a8 8 0 0 0 16 0`} className="fill-bg" />
      <text x={CHIP.x + CHIP.w / 2} y={CHIP.y + CHIP.h / 2 + 4} textAnchor="middle" fontSize="12" className="fill-fg-muted">MCP3008</text>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
        const { x, y } = chipChannelPin(c)
        const ok = selecting && selectable!.includes(c)
        return (
          <g
            key={c}
            data-channel={c}
            data-selectable={ok ? 'true' : 'false'}
            role={ok ? 'button' : undefined}
            tabIndex={ok ? 0 : undefined}
            aria-label={`Kanaal CH${c}`}
            onClick={(e) => { e.stopPropagation(); if (ok) onChannelClick?.(c) }}
            onKeyDown={(e) => { if (ok && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onChannelClick?.(c) } }}
            style={{ cursor: ok ? 'pointer' : 'default' }}
            opacity={selecting && !ok && !usedChannels.includes(c) ? 0.5 : 1}
          >
            <rect x={x - 10} y={y - 7} width="12" height="14" fill="transparent" />
            <rect x={x - 8} y={y - 2.5} width="10" height="5" rx="1" className="fill-metal" />
            {ok && <rect x={x - 11} y={y - 7} width="16" height="14" rx="3" fill="none" className="stroke-accent" strokeWidth="2.5" />}
            <text x={x + 8} y={y + 3.5} fontSize="9" className="fill-fg-muted">CH{c}</text>
          </g>
        )
      })}
      {CHIP_RIGHT.map((name, i) => {
        const { x, y } = chipRightPin(i)
        return (
          <g key={name}>
            <rect x={x - 2} y={y - 2.5} width="10" height="5" rx="1" className="fill-metal" />
            <text x={x - 8} y={y + 3.5} textAnchor="end" fontSize="9" className="fill-fg-muted">{name}</text>
          </g>
        )
      })}
    </g>
  )
}
