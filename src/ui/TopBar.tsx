import type { ReactNode } from 'react'

function TopButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-ui px-3 py-2 text-sm font-medium text-fg transition-colors duration-(--dur) hover:bg-line disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export interface TopBarProps {
  onExamples?: () => void
  onSave?: () => void
  onOpen?: () => void
  onShare?: () => void
  children?: ReactNode
}

export function TopBar({ onExamples, onSave, onOpen, onShare, children }: TopBarProps) {
  return (
    <header className="flex items-center gap-2 border-b border-line bg-panel px-4 py-2">
      <div className="mr-4 flex items-center gap-2 font-semibold">
        <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-accent" />
        Pi-simulator
      </div>
      <TopButton onClick={onExamples}>Voorbeelden</TopButton>
      <TopButton onClick={onSave}>Opslaan</TopButton>
      <TopButton onClick={onOpen}>Openen</TopButton>
      <TopButton onClick={onShare}>Delen</TopButton>
      <div className="ml-auto">{children}</div>
    </header>
  )
}
