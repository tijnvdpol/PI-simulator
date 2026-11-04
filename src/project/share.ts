import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { parseProject, serializeProject } from './parse'
import type { Project, Result } from './types'

export function encodeShare(p: Project): string {
  return compressToEncodedURIComponent(serializeProject(p))
}

export function buildShareUrl(p: Project, base: string): string {
  return `${base.split('#')[0]}#p=${encodeShare(p)}`
}

export function decodeShare(hash: string): Result<Project> {
  const bad = { ok: false as const, error: 'Deze link is kapot of onvolledig, het project kan niet worden geopend.' }
  const m = /^#?p=(.+)$/.exec(hash)
  if (!m) return bad
  let json: string | null
  try { json = decompressFromEncodedURIComponent(m[1]) } catch { return bad }
  if (!json) return bad
  let raw: unknown
  try { raw = JSON.parse(json) } catch { return bad }
  return parseProject(raw)
}
