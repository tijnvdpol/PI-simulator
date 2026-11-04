import { Suspense, lazy } from 'react'
import type { BenchProps } from '../bench/benchTypes'
import { hasWebGL } from './webgl'

let promise: Promise<typeof import('./Bench3D')> | null = null

/** Start het laden van de 3D-code. Roep dit aan bij het openen van de pagina, naast het opstarten van Pyodide. */
export function loadBench3D() {
  return (promise ??= import('./Bench3D'))
}

/** Start het laden van de 3D-code, maar alleen als de browser WebGL kan. */
export function preloadBench3D(): Promise<unknown> | null {
  return hasWebGL() ? loadBench3D() : null
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

/** De 3D-werkbank, lazy geladen. Zonder WebGL een melding; de kinderen (zoals de lege-staat-uitnodiging) blijven dan zichtbaar. */
export function LazyBench3D(props: BenchProps) {
  if (!hasWebGL()) return <div data-testid="bench" className="relative h-full w-full"><NoWebGLNotice />{props.children}</div>
  return (
    <Suspense
      fallback={
        <div data-testid="bench" className="relative h-full w-full">
          <div role="status" className="flex h-full items-center justify-center text-fg-muted">3D-werkbank wordt geladen…</div>
          {props.children}
        </div>
      }
    >
      <Bench3D {...props} />
    </Suspense>
  )
}
