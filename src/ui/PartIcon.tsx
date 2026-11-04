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
    case 'pwmled':
      return (
        <svg {...common}>
          <path d="M12 20a8 8 0 0 1 16 0v8H12z" className="fill-led-yellow" opacity="0.65" />
          <rect x="10" y="28" width="20" height="3" rx="1" className="fill-led-yellow" opacity="0.5" />
          <rect x="15" y="31" width="2" height="7" className="fill-metal" />
          <rect x="23" y="31" width="2" height="5" className="fill-metal" />
          <path d="M3 8l3 2M20 3v3M37 8l-3 2" className="stroke-led-yellow" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'rgbled':
      return (
        <svg {...common}>
          <path d="M12 20a8 8 0 0 1 16 0v8H12z" className="fill-ink stroke-line" />
          <circle cx="16" cy="19" r="3.2" className="fill-led-red" />
          <circle cx="24" cy="19" r="3.2" className="fill-led-green" />
          <circle cx="20" cy="24" r="3.2" className="fill-led-blue" />
          <rect x="10" y="28" width="20" height="3" rx="1" className="fill-ink" />
          <rect x="13" y="31" width="2" height="7" className="fill-metal" />
          <rect x="19" y="31" width="2" height="7" className="fill-metal" />
          <rect x="25" y="31" width="2" height="7" className="fill-metal" />
        </svg>
      )
    case 'servo':
      return (
        <svg {...common}>
          <rect x="6" y="16" width="26" height="16" rx="2" className="fill-accent" opacity="0.85" />
          <circle cx="26" cy="16" r="4" className="fill-metal" />
          <rect x="24" y="5" width="4" height="12" rx="2" className="fill-fg" />
        </svg>
      )
    case 'distance':
      return (
        <svg {...common}>
          <rect x="3" y="12" width="34" height="18" rx="2" className="fill-board" />
          <circle cx="12" cy="21" r="6" className="fill-metal" />
          <circle cx="28" cy="21" r="6" className="fill-metal" />
          <circle cx="12" cy="21" r="3" className="fill-ink" />
          <circle cx="28" cy="21" r="3" className="fill-ink" />
          <rect x="10" y="30" width="2" height="6" className="fill-metal" />
          <rect x="16" y="30" width="2" height="6" className="fill-metal" />
          <rect x="22" y="30" width="2" height="6" className="fill-metal" />
          <rect x="28" y="30" width="2" height="6" className="fill-metal" />
        </svg>
      )
    case 'oled':
      return (
        <svg {...common}>
          <rect x="4" y="8" width="32" height="24" rx="2" className="fill-board" />
          <rect x="8" y="11" width="24" height="14" className="fill-ink" />
          <path d="M10 22l4-5 4 3 4-6 4 5 4-2" className="stroke-led-blue" strokeWidth="1.5" fill="none" />
          <rect x="12" y="32" width="2" height="5" className="fill-metal" />
          <rect x="17" y="32" width="2" height="5" className="fill-metal" />
          <rect x="22" y="32" width="2" height="5" className="fill-metal" />
          <rect x="27" y="32" width="2" height="5" className="fill-metal" />
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
