import { describe, expect, it } from 'vitest'
import { describeTerminal, explainTerminal } from './labels'

describe('namen van aansluitpunten', () => {
  it('pinnen, gaatjes, rails en kanalen', () => {
    expect(describeTerminal('pin:11')).toBe('Pin 11 · GPIO 17')
    expect(describeTerminal('pin:6')).toBe('Pin 6 · GND')
    expect(describeTerminal('h:e12')).toBe('Rij e · kolom 12')
    expect(describeTerminal('r:t+:3')).toBe('Plus-rail boven')
    expect(describeTerminal('r:b-:3')).toBe('Min-rail onder')
    expect(describeTerminal('adc:3')).toBe('MCP3008 · kanaal CH3')
  })
  it('legt de interne verbinding uit', () => {
    expect(explainTerminal('h:b7')).toMatch(/a–e in kolom 7/)
    expect(explainTerminal('h:h7')).toMatch(/f–j in kolom 7/)
    expect(explainTerminal('r:t-:1')).toMatch(/hele rail/)
    expect(explainTerminal('pin:1')).toBeNull()
  })
})
