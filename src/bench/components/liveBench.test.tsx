// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Part } from '../../project/types'
import { Bench } from './Bench'

const led: Part = { id: 'l', kind: 'led', x: 100, y: 100, color: 'red', connection: { type: 'pin', physical: 11 } }
const btn: Part = { id: 'b', kind: 'button', x: 200, y: 100, connection: { type: 'pin', physical: 13 } }
const temp: Part = { id: 't', kind: 'temperature', x: 300, y: 100, connection: { type: 'adc', channel: 0 } }
const pot: Part = { id: 'p', kind: 'potentiometer', x: 400, y: 100, connection: { type: 'adc', channel: 1 } }

const base = { connecting: null, error: null, dispatch: () => {} }
const el = (c: HTMLElement, id: string) => c.querySelector(`[data-part-id="${id}"]`)!

describe('live werkbank', () => {
  it('led met level 1 heeft gloed, level 0 niet', () => {
    const { container, rerender } = render(<Bench {...base} parts={[led]} locked live={() => ({ level: 1 })} />)
    expect(container.querySelector('[data-glow="on"]')).not.toBeNull()
    rerender(<Bench {...base} parts={[led]} locked live={() => ({ level: 0 })} />)
    expect(container.querySelector('[data-glow="off"]')).not.toBeNull()
  })
  it('knop: pointerdown/up tijdens draaien roept onPartPress aan', () => {
    const onPartPress = vi.fn()
    const { container } = render(<Bench {...base} parts={[btn]} locked onPartPress={onPartPress} />)
    fireEvent.pointerDown(el(container, 'b'))
    expect(onPartPress).toHaveBeenLastCalledWith(btn, true)
    fireEvent.pointerUp(el(container, 'b'))
    expect(onPartPress).toHaveBeenLastCalledWith(btn, false)
  })
  it('knop loslaten door de muis weg te halen telt als loslaten', () => {
    const onPartPress = vi.fn()
    const { container } = render(<Bench {...base} parts={[btn]} locked onPartPress={onPartPress} />)
    fireEvent.pointerDown(el(container, 'b'))
    fireEvent.pointerLeave(el(container, 'b'))
    expect(onPartPress).toHaveBeenLastCalledWith(btn, false)
  })
  it('spatiebalk drukt een knop met focus in', () => {
    const onPartPress = vi.fn()
    const { container } = render(<Bench {...base} parts={[btn]} locked onPartPress={onPartPress} />)
    fireEvent.keyDown(el(container, 'b'), { key: ' ' })
    expect(onPartPress).toHaveBeenLastCalledWith(btn, true)
    fireEvent.keyUp(el(container, 'b'), { key: ' ' })
    expect(onPartPress).toHaveBeenLastCalledWith(btn, false)
  })
  it('niet tijdens draaien: pointerdown drukt niet in', () => {
    const onPartPress = vi.fn()
    const { container } = render(<Bench {...base} parts={[btn]} locked={false} onPartPress={onPartPress} />)
    fireEvent.pointerDown(el(container, 'b'))
    expect(onPartPress).not.toHaveBeenCalled()
  })
  it('ingedrukte knop is zichtbaar ingedrukt', () => {
    const { container } = render(<Bench {...base} parts={[btn]} locked live={() => ({ pressed: true })} />)
    expect(container.querySelector('[data-pressed="true"]')).not.toBeNull()
  })
  it('temperatuurschuifje meldt de nieuwe waarde', () => {
    const onChange = vi.fn()
    render(<Bench {...base} parts={[temp]} locked={false} sensors={{ values: { t: 25 }, onChange }} />)
    const slider = screen.getByLabelText('Temperatuur') as HTMLInputElement
    expect(slider.value).toBe('25')
    fireEvent.change(slider, { target: { value: '30' } })
    expect(onChange).toHaveBeenCalledWith(temp, 30)
    expect(screen.getByText('25 °C')).toBeInTheDocument()
  })
  it('potmeterschuifje werkt in procenten', () => {
    const onChange = vi.fn()
    render(<Bench {...base} parts={[pot]} locked sensors={{ values: { p: 0.5 }, onChange }} />)
    const slider = screen.getByLabelText('Stand van de potmeter') as HTMLInputElement
    expect(slider.value).toBe('50')
    fireEvent.change(slider, { target: { value: '80' } })
    expect(onChange).toHaveBeenCalledWith(pot, 0.8)
  })
})
