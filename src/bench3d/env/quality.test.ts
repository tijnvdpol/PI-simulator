import { afterEach, describe, expect, it } from 'vitest'
import { getQuality, isTooSlow, setQuality } from './quality'

describe('kwaliteitsstand', () => {
  afterEach(() => setQuality('high'))

  it('start op Hoog en onthoudt een wijziging', () => {
    expect(getQuality()).toBe('high')
    setQuality('low')
    expect(getQuality()).toBe('low')
  })

  it('schakelt pas terug na genoeg frames, en alleen als het gemiddelde te traag is', () => {
    expect(isTooSlow(Array(30).fill(80))).toBe(false) // te weinig frames om iets te zeggen
    expect(isTooSlow(Array(90).fill(16))).toBe(false) // 60 fps
    expect(isTooSlow(Array(90).fill(45))).toBe(true) // ~22 fps
  })

  it('negeert pauzes tussen losse frames (de werkbank tekent op aanvraag)', () => {
    const frames = [...Array(70).fill(16), ...Array(20).fill(2500)]
    expect(isTooSlow(frames)).toBe(false)
  })
})
