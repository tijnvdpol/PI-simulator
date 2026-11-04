import { useEffect, useRef } from 'react'
import { serializeProject } from '../project/parse'
import type { Project } from '../project/types'
import { resolveInitial } from './useProjectIO'

/** Is er iets veranderd sinds het project is geladen of opgeslagen? */
export function isDirty(baseline: string, project: Project): boolean {
  return serializeProject(project) !== baseline
}

/** Laat de browser vragen of je echt weg wilt als er niet-opgeslagen werk is (verversen, tabblad sluiten). */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}

/** Een deellink die in een al geopende tab wordt geplakt, moet het project ook laden. */
export function useShareLinkListener(onProject: (p: Project) => void, onError: (message: string) => void): void {
  const handlers = useRef({ onProject, onError })
  handlers.current = { onProject, onError }
  useEffect(() => {
    const onHash = () => {
      if (!/^#?p=/.test(window.location.hash)) return
      const r = resolveInitial(window.location.hash)
      history.replaceState(null, '', window.location.pathname + window.location.search)
      if (r.project) handlers.current.onProject(r.project)
      else if (r.error) handlers.current.onError(r.error)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
}
