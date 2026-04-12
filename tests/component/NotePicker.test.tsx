import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { NotePicker } from '../../src/components/NotePicker.tsx'

describe('NotePicker', () => {
  afterEach(() => {
    cleanup()
  })
  const defaultProps = {
    onSubmit: vi.fn(),
    showAccidentals: true,
    octaveRange: [3, 5] as [number, number],
  }

  // ── Rendering letter buttons ──────────────────────────────

  it('renders 7 letter buttons (C through B)', () => {
    render(<NotePicker {...defaultProps} />)
    for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      expect(screen.getByRole('button', { name: `Note ${letter}` })).toBeInTheDocument()
    }
  })

  it('letter buttons have type="button"', () => {
    render(<NotePicker {...defaultProps} />)
    const btn = screen.getByRole('button', { name: 'Note C' })
    expect(btn).toHaveAttribute('type', 'button')
  })

  // ── Rendering accidental buttons ──────────────────────────

  it('renders accidental row when showAccidentals is true', () => {
    render(<NotePicker {...defaultProps} showAccidentals={true} />)
    expect(screen.getByRole('button', { name: 'Natural' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sharp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flat' })).toBeInTheDocument()
  })

  it('hides accidental row when showAccidentals is false', () => {
    render(<NotePicker {...defaultProps} showAccidentals={false} />)
    expect(screen.queryByRole('button', { name: 'Natural' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sharp' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Flat' })).not.toBeInTheDocument()
  })

  // ── Rendering octave buttons ──────────────────────────────

  it('renders correct octave buttons based on octaveRange', () => {
    render(<NotePicker {...defaultProps} octaveRange={[3, 5]} />)
    expect(screen.getByRole('button', { name: 'Octave 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Octave 4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Octave 5' })).toBeInTheDocument()
  })

  it('does not render octave buttons outside the range', () => {
    render(<NotePicker {...defaultProps} octaveRange={[4, 5]} />)
    expect(screen.queryByRole('button', { name: 'Octave 3' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Octave 6' })).not.toBeInTheDocument()
  })

  it('hides octave row when range is single octave [4,4]', () => {
    render(<NotePicker {...defaultProps} octaveRange={[4, 4]} />)
    expect(screen.queryByRole('button', { name: 'Octave 4' })).not.toBeInTheDocument()
  })

  // ── Check button state ────────────────────────────────────

  it('Check button is disabled until letter and octave are selected', () => {
    render(<NotePicker {...defaultProps} />)
    const checkBtn = screen.getByRole('button', { name: 'Submit answer' })
    expect(checkBtn).toBeDisabled()
  })

  it('Check button is enabled once letter and octave are both selected', () => {
    render(<NotePicker {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note C' }))
    fireEvent.click(screen.getByRole('button', { name: 'Octave 4' }))
    const checkBtn = screen.getByRole('button', { name: 'Submit answer' })
    expect(checkBtn).toBeEnabled()
  })

  it('Check button is enabled with single octave range (auto-selected) once letter is selected', () => {
    render(<NotePicker {...defaultProps} octaveRange={[4, 4]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note E' }))
    const checkBtn = screen.getByRole('button', { name: 'Submit answer' })
    expect(checkBtn).toBeEnabled()
  })

  // ── Selection highlighting (aria-pressed) ─────────────────

  it('selecting a letter highlights it with aria-pressed', () => {
    render(<NotePicker {...defaultProps} />)
    const btnC = screen.getByRole('button', { name: 'Note C' })
    expect(btnC).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btnC)
    expect(btnC).toHaveAttribute('aria-pressed', 'true')
  })

  it('selecting a different letter de-selects the previous one', () => {
    render(<NotePicker {...defaultProps} />)
    const btnC = screen.getByRole('button', { name: 'Note C' })
    const btnD = screen.getByRole('button', { name: 'Note D' })
    fireEvent.click(btnC)
    fireEvent.click(btnD)
    expect(btnC).toHaveAttribute('aria-pressed', 'false')
    expect(btnD).toHaveAttribute('aria-pressed', 'true')
  })

  it('selecting an accidental highlights it with aria-pressed', () => {
    render(<NotePicker {...defaultProps} />)
    const sharpBtn = screen.getByRole('button', { name: 'Sharp' })
    fireEvent.click(sharpBtn)
    expect(sharpBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('natural accidental is selected by default', () => {
    render(<NotePicker {...defaultProps} />)
    const naturalBtn = screen.getByRole('button', { name: 'Natural' })
    expect(naturalBtn).toHaveAttribute('aria-pressed', 'true')
  })

  // ── Submit with onSubmit ──────────────────────────────────

  it('calls onSubmit with correct natural note (e.g. "E4")', () => {
    const onSubmit = vi.fn()
    render(<NotePicker {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note E' }))
    fireEvent.click(screen.getByRole('button', { name: 'Octave 4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(onSubmit).toHaveBeenCalledWith('E4')
  })

  it('calls onSubmit with correct sharp note (e.g. "C#5")', () => {
    const onSubmit = vi.fn()
    render(<NotePicker {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note C' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sharp' }))
    fireEvent.click(screen.getByRole('button', { name: 'Octave 5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(onSubmit).toHaveBeenCalledWith('C#5')
  })

  it('calls onSubmit with correct flat note (e.g. "Bb4")', () => {
    const onSubmit = vi.fn()
    render(<NotePicker {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Flat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Octave 4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(onSubmit).toHaveBeenCalledWith('Bb4')
  })

  it('calls onSubmit with auto-selected octave for single octave range', () => {
    const onSubmit = vi.fn()
    render(<NotePicker {...defaultProps} onSubmit={onSubmit} octaveRange={[4, 4]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note F' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(onSubmit).toHaveBeenCalledWith('F4')
  })

  it('omits accidental when showAccidentals is false', () => {
    const onSubmit = vi.fn()
    render(<NotePicker {...defaultProps} onSubmit={onSubmit} showAccidentals={false} octaveRange={[4, 4]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note G' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(onSubmit).toHaveBeenCalledWith('G4')
  })

  // ── Reset after submit ────────────────────────────────────

  it('resets selections after submit', () => {
    const onSubmit = vi.fn()
    render(<NotePicker {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note C' }))
    fireEvent.click(screen.getByRole('button', { name: 'Octave 4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))

    // After submit, letter and octave should be de-selected
    expect(screen.getByRole('button', { name: 'Note C' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Octave 4' })).toHaveAttribute('aria-pressed', 'false')
    // Check button should be disabled again
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled()
    // Natural should be re-selected as default
    expect(screen.getByRole('button', { name: 'Natural' })).toHaveAttribute('aria-pressed', 'true')
  })

  // ── Disabled state ────────────────────────────────────────

  it('all buttons are disabled when disabled prop is true', () => {
    render(<NotePicker {...defaultProps} disabled={true} />)
    const allButtons = screen.getAllByRole('button')
    for (const btn of allButtons) {
      expect(btn).toBeDisabled()
    }
  })

  it('buttons are not disabled when disabled prop is false', () => {
    render(<NotePicker {...defaultProps} disabled={false} />)
    // Letter buttons should not be disabled
    const noteC = screen.getByRole('button', { name: 'Note C' })
    expect(noteC).not.toBeDisabled()
  })
})
