export function EmptyState({ onOpenExamples }: { onOpenExamples: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
      <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-ui border border-line bg-panel/95 px-6 py-5 text-center shadow-lg">
        <p className="text-lg font-medium text-fg">Sleep een led naar je Pi om te beginnen</p>
        <button
          type="button"
          onClick={onOpenExamples}
          className="rounded-ui border border-accent px-4 py-2 font-medium text-accent transition-colors duration-(--dur) hover:bg-accent hover:text-ink"
        >
          Open een voorbeeld
        </button>
      </div>
    </div>
  )
}
