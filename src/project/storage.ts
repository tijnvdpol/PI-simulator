import { parseProject, serializeProject } from './parse'
import type { Project, Result } from './types'

export const STORAGE_KEY = 'pi-simulator:project'

export function saveLocal(p: Project, store: Storage = localStorage): void {
  store.setItem(STORAGE_KEY, serializeProject(p))
}

export function loadLocal(store: Storage = localStorage): Result<Project> | null {
  const text = store.getItem(STORAGE_KEY)
  if (text === null) return null
  try {
    return parseProject(JSON.parse(text))
  } catch {
    return { ok: false, error: 'Je opgeslagen project is beschadigd en kon niet worden geopend.' }
  }
}

export function projectToBlob(p: Project): Blob {
  return new Blob([serializeProject(p)], { type: 'application/json' })
}

export async function readProjectFile(file: File): Promise<Result<Project>> {
  try {
    return parseProject(JSON.parse(await file.text()))
  } catch {
    return { ok: false, error: 'Dit bestand is geen geldig project (het is geen JSON).' }
  }
}
