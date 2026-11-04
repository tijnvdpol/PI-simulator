// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PartLive } from '../bench/benchTypes'
import type { Part, PartKind } from '../project/types'
import { PartList } from './PartList'

const part = (kind: PartKind, id = kind): Part => ({ id, kind, x: 0, y: 0, connections: {} })
const show = (p: Part, live: PartLive) =>
  render(<PartList parts={[p]} live={() => live} locked={false} selectedId={null} onSelect={vi.fn()} onRemove={vi.fn()} onPress={vi.fn()} />)

describe('PartList: live-waarden van de nieuwe onderdelen', () => {
  it('dimbare led: helderheid', () => {
    show(part('pwmled'), { level: 0.5 })
    expect(screen.getByRole('button')).toHaveAttribute('data-brightness', '0.50')
  })
  it('RGB-led: de drie niveaus', () => {
    show(part('rgbled'), { rgb: [1, 0.5, 0] })
    expect(screen.getByRole('button')).toHaveAttribute('data-rgb', '1.0,0.5,0.0')
  })
  it('servo: stand, of "los" als hij ontkoppeld is', () => {
    const { unmount } = show(part('servo'), { servo: 0.75 })
    expect(screen.getByRole('button')).toHaveAttribute('data-servo', '0.75')
    unmount()
    show(part('servo'), { servo: null })
    expect(screen.getByRole('button')).toHaveAttribute('data-servo', 'los')
  })
  it('afstandssensor: centimeters', () => {
    show(part('distance'), { distanceCm: 42 })
    expect(screen.getByRole('button')).toHaveAttribute('data-distance', '42')
  })
  it('OLED: aantal aangezette pixels', () => {
    const bytes = new Uint8Array(1024); bytes[0] = 0b10100000; bytes[1000] = 0xff
    show(part('oled'), { display: { version: 1, on: true, contrast: 255 }, readDisplay: () => bytes })
    expect(screen.getByRole('button')).toHaveAttribute('data-lit', '10')
  })
  it('OLED uit of zonder gegevens: 0', () => {
    show(part('oled'), { display: { version: 1, on: false, contrast: 255 }, readDisplay: () => new Uint8Array(1024).fill(255) })
    expect(screen.getByRole('button')).toHaveAttribute('data-lit', '0')
  })
})
