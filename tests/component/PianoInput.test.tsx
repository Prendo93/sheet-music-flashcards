import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { PianoKeyboard } from '../../src/components/PianoKeyboard.tsx'

describe('PianoKeyboard (input mode)', () => {
  afterEach(() => {
    cleanup()
  })

  const defaultProps = {
    lowNote: 'C4',
    highNote: 'B4',
  }

  // ── Tapping white keys ───────────────────────────────────

  it('tapping a white key calls onKeyTap with correct note name', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard {...defaultProps} onKeyTap={onKeyTap} />)

    const c4Key = screen.getByLabelText('Play C4')
    fireEvent.click(c4Key)
    expect(onKeyTap).toHaveBeenCalledWith('C4')
  })

  // ── Tapping black keys ───────────────────────────────────

  it('tapping a black key calls onKeyTap with sharp name (e.g., "C#4")', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard {...defaultProps} onKeyTap={onKeyTap} />)

    const csKey = screen.getByLabelText('Play C sharp 4')
    fireEvent.click(csKey)
    expect(onKeyTap).toHaveBeenCalledWith('C#4')
  })

  // ── Disabled state ────────────────────────────────────────

  it('tapping when disabled=true does NOT call onKeyTap', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard {...defaultProps} onKeyTap={onKeyTap} disabled={true} />)

    const c4Key = screen.getByLabelText('Play C4')
    fireEvent.click(c4Key)
    expect(onKeyTap).not.toHaveBeenCalled()
  })

  // ── Cursor classes ────────────────────────────────────────

  it('keys have cursor-pointer class when onKeyTap is provided', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard {...defaultProps} onKeyTap={onKeyTap} />)

    const c4Key = screen.getByLabelText('Play C4')
    expect(c4Key.className).toContain('cursor-pointer')
  })

  it('keys do NOT have cursor-pointer when onKeyTap is absent (display mode)', () => {
    render(<PianoKeyboard {...defaultProps} />)

    const c4Key = screen.getByLabelText('Play C4')
    expect(c4Key.className).not.toContain('cursor-pointer')
  })

  // ── Octave correctness ────────────────────────────────────

  it('tapping keys in different octaves returns correct octave', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard lowNote="C4" highNote="C5" onKeyTap={onKeyTap} />)

    fireEvent.click(screen.getByLabelText('Play C4'))
    expect(onKeyTap).toHaveBeenCalledWith('C4')

    onKeyTap.mockClear()

    fireEvent.click(screen.getByLabelText('Play C5'))
    expect(onKeyTap).toHaveBeenCalledWith('C5')
  })

  // ── Aria labels ───────────────────────────────────────────

  it('all keys have aria-labels when interactive', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard {...defaultProps} onKeyTap={onKeyTap} />)

    // C4 through B4: 7 white keys + 5 black keys = 12 keys
    expect(screen.getByLabelText('Play C4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play D4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play E4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play F4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play G4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play A4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play B4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play C sharp 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play D sharp 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play F sharp 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play G sharp 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play A sharp 4')).toBeInTheDocument()
  })

  it('keys have aria-labels in display mode too', () => {
    render(<PianoKeyboard {...defaultProps} />)

    expect(screen.getByLabelText('Play C4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play C sharp 4')).toBeInTheDocument()
  })

  // ── Display mode highlight still works ────────────────────

  it('highlight still works in display mode (no onKeyTap, highlightNote set)', () => {
    render(<PianoKeyboard {...defaultProps} highlightNote="C4" />)

    const c4Key = screen.getByLabelText('Play C4')
    // Highlighted key should have a distinct visual indicator
    expect(c4Key.className).toContain('bg-blue-400')
  })

  // ── Multiple taps ─────────────────────────────────────────

  it('multiple taps call onKeyTap each time', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard {...defaultProps} onKeyTap={onKeyTap} />)

    fireEvent.click(screen.getByLabelText('Play C4'))
    fireEvent.click(screen.getByLabelText('Play D4'))
    fireEvent.click(screen.getByLabelText('Play E4'))

    expect(onKeyTap).toHaveBeenCalledTimes(3)
    expect(onKeyTap).toHaveBeenNthCalledWith(1, 'C4')
    expect(onKeyTap).toHaveBeenNthCalledWith(2, 'D4')
    expect(onKeyTap).toHaveBeenNthCalledWith(3, 'E4')
  })

  // ── preferSharp prop ───────────────────────────────────────

  it('emits flat names when preferSharp is false', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard lowNote="C4" highNote="B4" onKeyTap={onKeyTap} preferSharp={false} />)

    fireEvent.click(screen.getByLabelText('Play D flat 4'))
    expect(onKeyTap).toHaveBeenCalledWith('Db4')
  })

  it('labels black keys with flat names when preferSharp is false', () => {
    render(<PianoKeyboard lowNote="C4" highNote="B4" preferSharp={false} />)

    expect(screen.getByLabelText('Play D flat 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play E flat 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play G flat 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play A flat 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Play B flat 4')).toBeInTheDocument()
  })

  // ── All black keys use sharp names (default) ─────────────

  it('all black keys use sharp names, not flat names', () => {
    const onKeyTap = vi.fn()
    render(<PianoKeyboard {...defaultProps} onKeyTap={onKeyTap} />)

    // Tap all 5 black keys in octave 4
    fireEvent.click(screen.getByLabelText('Play C sharp 4'))
    fireEvent.click(screen.getByLabelText('Play D sharp 4'))
    fireEvent.click(screen.getByLabelText('Play F sharp 4'))
    fireEvent.click(screen.getByLabelText('Play G sharp 4'))
    fireEvent.click(screen.getByLabelText('Play A sharp 4'))

    expect(onKeyTap).toHaveBeenCalledWith('C#4')
    expect(onKeyTap).toHaveBeenCalledWith('D#4')
    expect(onKeyTap).toHaveBeenCalledWith('F#4')
    expect(onKeyTap).toHaveBeenCalledWith('G#4')
    expect(onKeyTap).toHaveBeenCalledWith('A#4')
    expect(onKeyTap).toHaveBeenCalledTimes(5)
  })
})
