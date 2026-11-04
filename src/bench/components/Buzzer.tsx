/** Buzzer met geluidsgolven als hij piept. */
export function BuzzerArt({ active = false }: { active?: boolean }) {
  return (
    <g data-active={active ? 'true' : 'false'}>
      <rect x="-9.2" y="24" width="2.4" height="14" className="fill-metal" />
      <rect x="6.8" y="24" width="2.4" height="14" className="fill-metal" />
      <circle cx="0" cy="0" r="26" className="fill-ink stroke-line" strokeWidth="2" />
      <circle cx="0" cy="0" r="5" className="fill-metal-dark" />
      <text x="-16" y="-12" fontSize="10" className="fill-fg-muted">+</text>
      {active && (
        <g fill="none" className="stroke-warning" strokeWidth="2.5" strokeLinecap="round">
          <path d="M32 -12a16 16 0 0 1 0 24" />
          <path d="M40 -20a28 28 0 0 1 0 40" />
        </g>
      )}
    </g>
  )
}
