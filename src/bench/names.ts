import type { PartKind } from '../project/types'

export const PART_NAMES_NL: Record<PartKind, string> = {
  led: 'led', button: 'knop', buzzer: 'buzzer', temperature: 'temperatuursensor', potentiometer: 'potmeter',
  pwmled: 'dimbare led', rgbled: 'RGB-led', servo: 'servo', distance: 'afstandssensor', oled: 'OLED-scherm',
}
/** Met lidwoord, voor zinnen als "…is al in gebruik door de led". */
export const WITH_ARTICLE: Record<PartKind, string> = {
  led: 'de led', button: 'de knop', buzzer: 'de buzzer', temperature: 'de temperatuursensor', potentiometer: 'de potmeter',
  pwmled: 'de dimbare led', rgbled: 'de RGB-led', servo: 'de servo', distance: 'de afstandssensor', oled: 'het OLED-scherm',
}
