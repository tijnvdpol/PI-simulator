export const MAX_LINES = 500

export interface ConsoleLine { id: number; stream: 'out' | 'err' | 'sys'; text: string }
export type NewLine = { stream: ConsoleLine['stream']; text: string }
export type ConsoleAction =
  | { type: 'out' | 'err' | 'sys'; text: string }
  | { type: 'batch'; lines: NewLine[] }
  | { type: 'clear' }

let nextId = 1

/** Houdt maximaal de laatste 500 regels vast, zodat een `print()`-lus de pagina niet vastzet. */
export function consoleReducer(lines: ConsoleLine[], a: ConsoleAction): ConsoleLine[] {
  if (a.type === 'clear') return []
  const add: NewLine[] = a.type === 'batch' ? a.lines : [{ stream: a.type, text: a.text }]
  const tail = add.length > MAX_LINES ? add.slice(-MAX_LINES) : add
  const next = [...lines, ...tail.map((l) => ({ id: nextId++, stream: l.stream, text: l.text }))]
  return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next
}
