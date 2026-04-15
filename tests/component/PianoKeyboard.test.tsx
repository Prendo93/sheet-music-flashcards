import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/preact'
import { PianoKeyboard } from '../../src/components/PianoKeyboard.tsx'

describe('PianoKeyboard', () => {
  it('renders a piano with the correct aria-label', () => {
    const { container } = render(<PianoKeyboard highlightNote="C4" lowNote="C4" highNote="B4" />)
    const piano = container.querySelector('[role="img"]')
    expect(piano).not.toBeNull()
    expect(piano!.getAttribute('aria-label')).toMatch(/piano.*C4/i)
  })

  it('highlights the correct white key via data-note', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="E4" lowNote="C4" highNote="B4" />
    )
    const highlighted = container.querySelector('[data-note="E4"]')
    expect(highlighted).not.toBeNull()
    expect(highlighted!.classList.toString()).toContain('blue')
  })

  it('highlights a sharp key', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="F#4" lowNote="C4" highNote="B4" />
    )
    const highlighted = container.querySelector('[data-note="F#4"]')
    expect(highlighted).not.toBeNull()
    expect(highlighted!.classList.toString()).toContain('blue')
  })

  it('highlights a flat key (maps to same piano key as its enharmonic)', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="Bb4" lowNote="C4" highNote="B4" />
    )
    const highlighted = container.querySelector('[data-note="Bb4"]')
    expect(highlighted).not.toBeNull()
    expect(highlighted!.classList.toString()).toContain('blue')
  })

  it('renders correct number of white keys for C4-B4', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="C4" lowNote="C4" highNote="B4" />
    )
    const whiteKeys = container.querySelectorAll('[data-key-type="white"]')
    expect(whiteKeys.length).toBe(7)
  })

  it('renders correct number of black keys for C4-B4', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="C4" lowNote="C4" highNote="B4" />
    )
    const blackKeys = container.querySelectorAll('[data-key-type="black"]')
    expect(blackKeys.length).toBe(5)
  })

  it('renders keys for a two-octave range', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="C4" lowNote="C3" highNote="B4" />
    )
    const whiteKeys = container.querySelectorAll('[data-key-type="white"]')
    expect(whiteKeys.length).toBe(14)
  })

  it('renders correct white keys for default range E4-F5', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="E4" lowNote="E4" highNote="F5" />
    )
    const piano = container.querySelector('[role="img"]')
    expect(piano).not.toBeNull()
    // E4-F5: white keys = E, F, G, A, B, C, D, E, F = 9
    const whiteKeys = container.querySelectorAll('[data-key-type="white"]')
    expect(whiteKeys.length).toBe(9)
  })

  it('non-highlighted white keys are white, not blue', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="C4" lowNote="C4" highNote="B4" />
    )
    const dKey = container.querySelector('[data-note="D4"]')
    expect(dKey).not.toBeNull()
    expect(dKey!.classList.toString()).not.toContain('blue')
  })

  it('has aria-label that includes the highlighted note', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="G4" lowNote="C4" highNote="B4" />
    )
    const piano = container.querySelector('[role="img"]')
    expect(piano!.getAttribute('aria-label')).toMatch(/G4/)
  })

  // ── Dual highlight (wrongNote) ────────────────────────────

  it('highlights correct note in green and wrong note in red when wrongNote is provided', () => {
    const { container } = render(
      <PianoKeyboard
        highlightNote="E4"
        wrongNote="D4"
        lowNote="C4"
        highNote="B4"
      />
    )
    const correctKey = container.querySelector('[data-note="E4"]')
    const wrongKey = container.querySelector('[data-note="D4"]')

    expect(correctKey!.classList.toString()).toContain('green')
    expect(wrongKey!.classList.toString()).toContain('red')
  })

  it('does not show red highlight when wrongNote is not provided', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="E4" lowNote="C4" highNote="B4" />
    )
    const allKeys = container.querySelectorAll('[data-key-type]')
    const hasRed = Array.from(allKeys).some((k) => k.classList.toString().includes('red'))
    expect(hasRed).toBe(false)
  })

  it('uses blue highlight by default when no wrongNote', () => {
    const { container } = render(
      <PianoKeyboard highlightNote="E4" lowNote="C4" highNote="B4" />
    )
    const correctKey = container.querySelector('[data-note="E4"]')
    expect(correctKey!.classList.toString()).toContain('blue')
  })
})
