import type { Part } from '../../project/types'
import type { PartLive } from '../../bench/components/Bench'

/** Elk onderdeel is één component met deze props, zodat een glTF-model er later zo voor kan. */
export interface PartModelProps {
  part: Part
  live: PartLive
}
