import { ButtonModel } from './ButtonModel'
import { BuzzerModel } from './BuzzerModel'
import { DistanceModel } from './DistanceModel'
import { LedModel } from './LedModel'
import { OledModel } from './OledModel'
import { PotentiometerModel } from './PotentiometerModel'
import { PwmLedModel } from './PwmLedModel'
import { RgbLedModel } from './RgbLedModel'
import { ServoModel } from './ServoModel'
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
    case 'pwmled': return <PwmLedModel {...props} />
    case 'rgbled': return <RgbLedModel {...props} />
    case 'servo': return <ServoModel {...props} />
    case 'distance': return <DistanceModel {...props} />
    case 'oled': return <OledModel {...props} />
  }
}
