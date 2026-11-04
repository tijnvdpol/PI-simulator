import { VIEW_LABELS, VIEW_ORDER, type ViewName } from './cameraViews'

/** Knoppen voor de camerastanden, rechtsonder in de werkbank. */
export function CameraButtons({ onView }: { onView: (v: ViewName) => void }) {
  return (
    <div role="group" aria-label="Camerastand" className="absolute bottom-3 right-3 flex gap-1 rounded-ui border border-line bg-panel p-1">
      {VIEW_ORDER.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onView(v)}
          className="rounded-ui px-2.5 py-1 text-sm text-fg transition-colors duration-(--dur) hover:bg-line focus-visible:outline-2 focus-visible:outline-accent"
        >
          {VIEW_LABELS[v]}
        </button>
      ))}
    </div>
  )
}
