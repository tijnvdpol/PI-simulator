/** Temperatuursensor in het zwarte "TO-92"-huisje met drie pootjes. */
export function TemperatureArt({ celsius = 20 }: { celsius?: number }) {
  return (
    <g>
      <rect x="-11.2" y="0" width="2.4" height="32" className="fill-metal" />
      <rect x="-1.2" y="0" width="2.4" height="32" className="fill-metal" />
      <rect x="8.8" y="0" width="2.4" height="32" className="fill-metal" />
      <path d="M-18 0a18 18 0 0 1 36 0z" className="fill-ink stroke-line" strokeWidth="2" />
      <text x="0" y="-5" textAnchor="middle" fontSize="9" className="fill-fg-muted">{Math.round(celsius)}°</text>
    </g>
  )
}
