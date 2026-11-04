import { Suspense, lazy } from 'react'
import { hasWebGL } from './webgl'

let promise: Promise<typeof import('./Bench3D')> | null = null

/** Start het laden van de 3D-code. Roep dit aan bij het openen van de pagina, naast het opstarten van Pyodide. */
export function loadBench3D() {
  return (promise ??= import('./Bench3D'))
}

const Bench3D = lazy(loadBench3D)

export function NoWebGLNotice() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div role="alert" className="max-w-md rounded-ui border border-danger bg-panel p-6">
        <h2 className="mb-2 text-lg font-semibold text-danger">3D wordt niet ondersteund</h2>
        <p className="text-fg-muted">
          Je browser kan geen WebGL gebruiken, en dat is nodig voor de werkbank. Probeer een andere of nieuwere browser,
          en controleer of hardwareversnelling aanstaat in de instellingen.
        </p>
      </div>
    </div>
  )
}

export function LazyBench3D() {
  if (!hasWebGL()) return <NoWebGLNotice />
  return (
    <Suspense fallback={<div role="status" className="flex h-full items-center justify-center text-fg-muted">3D-werkbank wordt geladen…</div>}>
      <Bench3D />
    </Suspense>
  )
}
