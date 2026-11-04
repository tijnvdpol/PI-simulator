import type { ProKind } from '../circuit/types'

export const PRO_DRAG_TYPE = 'application/x-pisim-propart'

// Tijdens het slepen mag de browser de inhoud van de sleepdata niet laten lezen; de werkbank leest hier welk onderdeel het is.
let current: ProKind | null = null
export const setDraggedKind = (k: ProKind | null) => { current = k }
export const getDraggedKind = (): ProKind | null => current
