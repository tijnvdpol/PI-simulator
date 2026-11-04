import type { PartKind } from '../project/types'

/** Kleine herkenbare tekeningetjes voor de onderdelenbak. */
export function PartIcon({ kind, size = 40 }: { kind: PartKind; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 40 40', 'aria-hidden': true, className: 'shrink-0' } as const
  switch (kind) {
    case 'led':
      return (
        <svg {...common}>
          <path d="M12 20a8 8 0 0 1 16 0v8H12z" className="fill-led-red" />
          <rect x="10" y="28" width="20" height="3" rx="1" className="fill-led-red" opacity="0.7" />
          <rect x="15" y="31" width="2" height="7" className="fill-metal" />
          <rect x="23" y="31" width="2" height="5" className="fill-metal" />
        </svg>
      )
    case 'button':
      return (
        <svg {...common}>
          <rect x="6" y="10" width="28" height="22" rx="4" className="fill-ink stroke-line" />
          <circle cx="20" cy="21" r="8" className="fill-accent" />
        </svg>
      )
    case 'buzzer':
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="14" className="fill-ink stroke-line" />
          <circle cx="20" cy="20" r="3" className="fill-metal-dark" />
          <text x="20" y="9" textAnchor="middle" fontSize="7" className="fill-fg-muted">+</text>
        </svg>
      )
    case 'temperature':
      return (
        <svg {...common}>
          <path d="M10 22a10 10 0 0 1 20 0z" className="fill-ink stroke-line" />
          <rect x="13" y="22" width="2" height="14" className="fill-metal" />
          <rect x="19" y="22" width="2" height="14" className="fill-metal" />
          <rect x="25" y="22" width="2" height="14" className="fill-metal" />
        </svg>
      )
    case 'potentiometer':
      return (
        <svg {...common}>
          <rect x="6" y="14" width="28" height="16" rx="3" className="fill-accent" opacity="0.8" />
          <circle cx="20" cy="14" r="7" className="fill-metal" />
          <rect x="19" y="8" width="2" height="6" className="fill-ink" />
        </svg>
      )
  }
}
