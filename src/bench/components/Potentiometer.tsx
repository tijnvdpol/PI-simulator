/** Potmeter; de draaiknop wijst naar de huidige stand (0..1). */
export function PotentiometerArt({ value = 0.5 }: { value?: number }) {
  const angle = -135 + value * 270
  return (
    <g>
      <rect x="-11.2" y="14" width="2.4" height="30" className="fill-metal" />
      <rect x="-1.2" y="14" width="2.4" height="30" className="fill-metal" />
      <rect x="8.8" y="14" width="2.4" height="30" className="fill-metal" />
      <rect x="-28" y="-6" width="56" height="22" rx="4" className="fill-accent" opacity="0.85" />
      <circle cx="0" cy="-8" r="18" className="fill-metal stroke-metal-dark" strokeWidth="2" />
      <g transform={`translate(0 -8) rotate(${angle})`}>
        <rect x="-1.5" y="-16" width="3" height="11" rx="1" className="fill-ink" />
      </g>
    </g>
  )
}
