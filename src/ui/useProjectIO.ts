import { useCallback, useState } from 'react'
import { buildShareUrl, decodeShare } from '../project/share'
import { loadLocal, projectToBlob, readProjectFile, saveLocal } from '../project/storage'
import type { Project } from '../project/types'

export type ToastKind = 'ok' | 'info' | 'fout'

/** Bepaalt welk project er bij het openen van de pagina geladen wordt (alleen via een deellink). */
export function resolveInitial(hash: string, _store?: Storage): { project: Project | null; error: string | null } {
  if (!/^#?p=/.test(hash)) return { project: null, error: null }
  const r = decodeShare(hash)
  return r.ok ? { project: r.value, error: null } : { project: null, error: r.error }
}

export interface ProjectIODeps {
  project: Project
  openProject: (p: Project) => void
  toast: (message: string, kind: ToastKind) => void
  store?: Storage
  href?: string
  clipboard?: { writeText(text: string): Promise<void> }
  saveBlob?: (blob: Blob, filename: string) => void
  /** Na een gelukte keer opslaan of downloaden. */
  onSaved?: () => void
}

function defaultSaveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pi-project'

export function useProjectIO(deps: ProjectIODeps) {
  const { project, openProject, toast } = deps
  const [sharedUrl, setSharedUrl] = useState<string | null>(null)

  const save = useCallback(() => {
    try {
      saveLocal(project, deps.store)
      toast('Opgeslagen in je browser', 'ok')
      deps.onSaved?.()
    } catch {
      toast('Opslaan lukt niet (is je browser-opslag vol of uitgeschakeld?). Download je project als bestand.', 'fout')
    }
  }, [project, toast, deps.store, deps.onSaved])

  const openLast = useCallback(() => {
    const r = loadLocal(deps.store)
    if (r === null) toast('Er is nog niets opgeslagen.', 'info')
    else if (!r.ok) toast(r.error, 'fout')
    else openProject(r.value)
  }, [openProject, toast, deps.store])

  const download = useCallback(() => {
    (deps.saveBlob ?? defaultSaveBlob)(projectToBlob(project), `${slug(project.name)}.json`)
    deps.onSaved?.()
  }, [project, deps.saveBlob, deps.onSaved])

  const importFile = useCallback(async (file: File) => {
    const r = await readProjectFile(file)
    if (r.ok) openProject(r.value)
    else toast(r.error, 'fout')
  }, [openProject, toast])

  const share = useCallback(async () => {
    const url = buildShareUrl(project, deps.href ?? location.href)
    try {
      await (deps.clipboard ?? navigator.clipboard).writeText(url)
      toast(url.length > 8000 ? 'Link gekopieerd (let op: hij is erg lang, sommige programma’s knippen hem af)' : 'Link gekopieerd', url.length > 8000 ? 'info' : 'ok')
    } catch {
      setSharedUrl(url)
    }
  }, [project, toast, deps.clipboard, deps.href])

  return { save, openLast, download, importFile, share, sharedUrl, closeShared: () => setSharedUrl(null) }
}
