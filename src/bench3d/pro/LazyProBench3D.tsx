import { Suspense, lazy } from 'react'
import { hasWebGL } from '../webgl'
import { NoWebGLNotice } from '../LazyBench3D'
import type { ProBenchProps } from './ProBench3D'

let promise: Promise<typeof import('./ProBench3D')> | null = null

export function loadProBench3D() {
  return (promise ??= import('./ProBench3D'))
}

export function preloadProBench3D(): Promise<unknown> | null {
  return hasWebGL() ? loadProBench3D() : null
}

const ProBench3D = lazy(loadProBench3D)

/** De pro-werkbank, lazy geladen (zelfde three-bundel als de simpele werkbank). */
export function LazyProBench3D(props: ProBenchProps) {
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
      <ProBench3D {...props} />
    </Suspense>
  )
}
