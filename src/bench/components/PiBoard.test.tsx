// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PiBoard, pinPosition } from './PiBoard'

const renderBoard = (props: Parameters<typeof PiBoard>[0] = {}) =>
  render(<svg><PiBoard {...props} /></svg>)

describe('PiBoard', () => {
  it('rendert 40 pinnen met data-physical', () => {
    const { container } = renderBoard()
    const pins = container.querySelectorAll('[data-physical]')
    expect(pins).toHaveLength(40)
    expect(pins[0].getAttribute('data-physical')).toBe('1')
    expect(pins[39].getAttribute('data-physical')).toBe('40')
  })
  it('hover op pin 11 toont "GPIO 17"', () => {
    const { container } = renderBoard()
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.mouseEnter(container.querySelector('[data-physical="11"]')!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Pin 11')
    expect(screen.getByRole('tooltip')).toHaveTextContent('GPIO 17')
    fireEvent.mouseLeave(container.querySelector('[data-physical="11"]')!)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
  it('hover op voedingspin toont 5V', () => {
    const { container } = renderBoard()
    fireEvent.mouseEnter(container.querySelector('[data-physical="2"]')!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('5V')
  })
  it('met selectable=[11] is alleen pin 11 klikbaar', () => {
    const onPinClick = vi.fn()
    const { container } = renderBoard({ selectable: [11], onPinClick })
    fireEvent.click(container.querySelector('[data-physical="12"]')!)
    expect(onPinClick).not.toHaveBeenCalled()
    fireEvent.click(container.querySelector('[data-physical="11"]')!)
    expect(onPinClick).toHaveBeenCalledWith(11)
    expect(container.querySelector('[data-physical="11"]')).toHaveAttribute('data-selectable', 'true')
    expect(container.querySelector('[data-physical="12"]')).toHaveAttribute('data-selectable', 'false')
  })
  it('zonder selectable doet klikken niets', () => {
    const onPinClick = vi.fn()
    const { container } = renderBoard({ onPinClick })
    fireEvent.click(container.querySelector('[data-physical="11"]')!)
    expect(onPinClick).not.toHaveBeenCalled()
  })
  it('issuePins worden gemarkeerd', () => {
    const { container } = renderBoard({ issuePins: [11] })
    expect(container.querySelector('[data-physical="11"]')).toHaveAttribute('data-issue', 'true')
    expect(container.querySelector('[data-physical="12"]')).toHaveAttribute('data-issue', 'false')
  })
  it('pinPosition: 1 en 2 naast elkaar-rij, 1 en 3 naast elkaar in kolom', () => {
    const a = pinPosition(1), b = pinPosition(2), c = pinPosition(3)
    expect(a.x).toBe(b.x)
    expect(a.y).not.toBe(b.y)
    expect(c.y).toBe(a.y)
    expect(c.x).toBeGreaterThan(a.x)
  })
})
