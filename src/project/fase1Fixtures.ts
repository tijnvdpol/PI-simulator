/** Echte projectgegevens zoals fase 1 ze opsloeg (versie 1), voor de migratietests. Niet aanpassen. */
export const FASE1_JSON = {
  version: 1,
  name: 'Fase 1 deellink',
  parts: [
    { id: 'part-1', kind: 'led', x: 420, y: 140, color: 'red', connection: { type: 'pin', physical: 11 } },
    { id: 'part-2', kind: 'potentiometer', x: 300, y: 130, connection: { type: 'adc', channel: 2 } },
    { id: 'part-3', kind: 'button', x: 520, y: 140, connection: null },
  ],
  code: 'from gpiozero import LED\nLED(17).on()\n',
}

/** Een deellink die fase 1 maakte (lz-string van de JSON hierboven, ingesprongen met 2 spaties). */
export const FASE1_SHARE_HASH = '#p=N4KABGBEBuCmBOBnAlgewHaQFxgIwBpwp0BDAW1mygDETFY8wATWWAGzeXQGtJCJIABxLwALoioBtIhFAR5UZEypCRogLS4+M+ZG5dlOSG1jL+CqAA8qAFgBMABnMLIATyq4bTnQIDGqNlR4FXhTbQsof3R0WF9RNEwcOQioUVdBSiNBLnCUoQALVxRfEjYPXB8wAF8dKucwZJclFWExdTtcl310QyhBVFFYdHjUCkHg+oFrHABmB28Itw85yciMGLiEqkaLSDSMlRImX07d33ySaPYqO0qahTqdHYFmrLV1GdOBbt7IACMAK6iUQYL5WKgAVkcqyWOE8CzO61iI0SYHQAI4tSIAF1zJB-CwVAAzeCjMAAc2yqAAXghUGBkGR+mIwAAZACiABEADroDmcgAUuAA7ABKAB0GAFot5kBAVSAA'
