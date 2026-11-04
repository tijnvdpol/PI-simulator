import { ButtonModel } from './ButtonModel'
import { BuzzerModel } from './BuzzerModel'
import { LedModel } from './LedModel'
import { PotentiometerModel } from './PotentiometerModel'
import { TemperatureModel } from './TemperatureModel'
import type { PartModelProps } from './types'

/** Kiest het model bij het soort onderdeel. Hier komt later een glTF-variant per soort. */
export function PartModel(props: PartModelProps) {
  switch (props.part.kind) {
    case 'led': return <LedModel {...props} />
    case 'button': return <ButtonModel {...props} />
    case 'buzzer': return <BuzzerModel {...props} />
    case 'temperature': return <TemperatureModel {...props} />
    case 'potentiometer': return <PotentiometerModel {...props} />
  }
}
