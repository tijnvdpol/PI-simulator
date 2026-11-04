import { useSyncExternalStore } from 'react'

/** Weergavekwaliteit van de 3D-werkbank. Laag = geen SSAO, DOF, bloom of zachte schaduwen. */
export type Quality = 'high' | 'low'

const KEY = 'pisim.quality'
const listeners = new Set<() => void>()

function read(): Quality {
  try { return localStorage.getItem(KEY) === 'low' ? 'low' : 'high' } catch { return 'high' }
}
let current: Quality = read()

export function getQuality(): Quality { return current }

export function setQuality(q: Quality) {
  if (q === current) return
  current = q
  try { localStorage.setItem(KEY, q) } catch { /* opslag kan geblokkeerd zijn */ }
  listeners.forEach((l) => l())
}

export function useQuality(): Quality {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, getQuality, () => 'high')
}

/**
 * Beoordeelt of een reeks frametijden (ms) te traag is voor de hoge stand. Alleen frames uit een doorlopende reeks tellen mee:
 * de werkbank tekent op aanvraag, dus de tijd na een rustpauze zegt niets over de snelheid.
 */
export function isTooSlow(frameMs: number[], limitMs = 30, minFrames = 60): boolean {
  const run = frameMs.filter((d) => d < 120)
  if (run.length < minFrames) return false
  return run.reduce((a, b) => a + b, 0) / run.length > limitMs
}
