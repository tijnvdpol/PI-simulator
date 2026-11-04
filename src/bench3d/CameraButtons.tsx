import { setQuality, useQuality } from './env/quality'
import { VIEW_LABELS, VIEW_ORDER, type ViewName } from './cameraViews'

/** Knoppen voor de camerastanden, rechtsonder in de werkbank. */
export function CameraButtons({ onView }: { onView: (v: ViewName) => void }) {
  const quality = useQuality()
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
      <button
        type="button"
        aria-pressed={quality === 'high'}
        title="Hoog: zachte schaduwen, ambient occlusion en scherptediepte. Laag: sneller."
        onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}
        className="ml-1 rounded-ui border-l border-line px-2.5 py-1 text-sm text-fg-muted transition-colors duration-(--dur) hover:bg-line focus-visible:outline-2 focus-visible:outline-accent"
      >
        Kwaliteit: {quality === 'high' ? 'Hoog' : 'Laag'}
      </button>
    </div>
  )
}
