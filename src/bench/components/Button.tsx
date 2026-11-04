/** Drukknop; een ingedrukte knop zakt zichtbaar naar beneden. */
export function ButtonArt({ pressed = false }: { pressed?: boolean }) {
  return (
    <g data-pressed={pressed ? 'true' : 'false'}>
      <rect x="-12" y="20" width="2.4" height="16" className="fill-metal" />
      <rect x="9.6" y="20" width="2.4" height="16" className="fill-metal" />
      <rect x="-26" y="-26" width="52" height="48" rx="6" className="fill-ink stroke-line" strokeWidth="2" />
      <g style={{ transform: `translateY(${pressed ? 3 : 0}px)`, transition: 'transform 100ms' }}>
        <circle cx="0" cy="-2" r={pressed ? 15 : 16} className="fill-accent" />
        <circle cx="0" cy="-2" r={pressed ? 10 : 11} className="fill-ink" opacity="0.18" />
      </g>
    </g>
  )
}
