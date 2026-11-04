import type { LedColor } from '../../project/types'

const FILL: Record<LedColor, string> = {
  red: 'fill-led-red', green: 'fill-led-green', yellow: 'fill-led-yellow', blue: 'fill-led-blue', white: 'fill-led-white',
}
const STOP: Record<LedColor, string> = {
  red: 'var(--color-led-red)', green: 'var(--color-led-green)', yellow: 'var(--color-led-yellow)', blue: 'var(--color-led-blue)', white: 'var(--color-led-white)',
}

/** Led met pootjes (lang pootje = plus). `level` 0..1 bepaalt de gloed. */
export function LedArt({ color = 'red', level = 0 }: { color?: LedColor; level?: number }) {
  const on = level > 0
  return (
    <g data-glow={on ? 'on' : 'off'}>
      <defs>
        <radialGradient id={`glow-${color}`}>
          <stop offset="0%" stopColor={STOP[color]} stopOpacity="0.9" />
          <stop offset="100%" stopColor={STOP[color]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="-2" r="44" fill={`url(#glow-${color})`} opacity={level} style={{ transition: 'opacity var(--dur)' }} />
      <rect x="-6.8" y="22" width="2.4" height="24" className="fill-metal" />
      <rect x="4.8" y="22" width="2.4" height="16" className="fill-metal" />
      <path d="M-13 0a13 13 0 0 1 26 0v22h-26z" className={FILL[color]} opacity={on ? 1 : 0.55} style={{ transition: 'opacity var(--dur)' }} />
      <rect x="-16" y="22" width="32" height="4" rx="1.5" className={FILL[color]} opacity={on ? 1 : 0.4} />
      <ellipse cx="-4" cy="-8" rx="3" ry="5" fill="white" opacity="0.35" />
    </g>
  )
}
