import type { ReactNode } from 'react'
import { Menu } from './Menu'

export interface TopBarProps {
  onNew?: () => void
  onExamples?: () => void
  onSave?: () => void
  onDownload?: () => void
  onOpenLast?: () => void
  onPickFile?: () => void
  onShare?: () => void
  children?: ReactNode
}

export function TopBar({ onNew, onExamples, onSave, onDownload, onOpenLast, onPickFile, onShare, children }: TopBarProps) {
  const plain = 'rounded-ui px-3 py-2 text-sm font-medium text-fg transition-colors duration-(--dur) hover:bg-line'
  return (
    <header className="flex items-center gap-2 border-b border-line bg-panel px-4 py-2">
      <div className="mr-4 flex items-center gap-2 font-semibold">
        <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-accent" />
        Pi-simulator
      </div>
      <button type="button" onClick={onNew} className={plain}>Nieuw</button>
      <button type="button" onClick={onExamples} className={plain}>Voorbeelden</button>
      <Menu label="Opslaan" items={[
        { label: 'Opslaan in je browser', onSelect: () => onSave?.() },
        { label: 'Downloaden als bestand', onSelect: () => onDownload?.() },
      ]} />
      <Menu label="Openen" items={[
        { label: 'Laatst opgeslagen', onSelect: () => onOpenLast?.() },
        { label: 'Bestand kiezen…', onSelect: () => onPickFile?.() },
      ]} />
      <button type="button" onClick={onShare} className={plain}>Delen</button>
      <div className="ml-auto">{children}</div>
    </header>
  )
}
