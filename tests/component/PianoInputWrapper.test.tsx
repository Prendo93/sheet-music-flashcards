import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

// Mock synth module before importing PianoInput
vi.mock('../../src/lib/synth.ts', () => ({
  playNote: vi.fn(),
  ensureAudioContext: vi.fn(),
  isAudioReady: vi.fn(() => true),
}))

import { PianoInput } from '../../src/components/PianoInput.tsx'
import { playNote } from '../../src/lib/synth.ts'

describe('PianoInput', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const defaultProps = {
    onSubmit: vi.fn(),
    lowNote: 'C4',
    highNote: 'B4',
    accidentals: { sharps: false, flats: false },
  }

  it('renders a piano keyboard and a Check button', () => {
    render(<PianoInput {...defaultProps} />)

    expect(screen.getByRole('group', { name: /piano/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit|check/i })).toBeInTheDocument()
  })

  it('Check button is disabled when no key is selected', () => {
    render(<PianoInput {...defaultProps} />)

    const checkBtn = screen.getByRole('button', { name: /check/i })
    expect(checkBtn).toBeDisabled()
  })

  it('tapping a key highlights it and enables Check button', () => {
    render(<PianoInput {...defaultProps} />)

    fireEvent.click(screen.getByLabelText('Play C4'))

    const checkBtn = screen.getByRole('button', { name: /check/i })
    expect(checkBtn).not.toBeDisabled()
  })

  it('tapping Check calls onSubmit with the selected note name', () => {
    const onSubmit = vi.fn()
    render(<PianoInput {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByLabelText('Play E4'))
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    expect(onSubmit).toHaveBeenCalledWith('E4')
  })

  it('resets selection after submit', () => {
    const onSubmit = vi.fn()
    render(<PianoInput {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByLabelText('Play E4'))
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    // Check button should be disabled again after submit
    const checkBtn = screen.getByRole('button', { name: /check/i })
    expect(checkBtn).toBeDisabled()
  })

  it('plays sound when key is tapped', () => {
    render(<PianoInput {...defaultProps} />)

    fireEvent.click(screen.getByLabelText('Play C4'))

    expect(playNote).toHaveBeenCalledTimes(1)
    // C4 MIDI = 60
    expect(playNote).toHaveBeenCalledWith(60)
  })

  it('tapping a different key changes the selection', () => {
    const onSubmit = vi.fn()
    render(<PianoInput {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByLabelText('Play C4'))
    fireEvent.click(screen.getByLabelText('Play D4'))
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    expect(onSubmit).toHaveBeenCalledWith('D4')
  })

  // ── Sharp/flat toggle ─────────────────────────────────────

  it('hides sharp/flat toggle when only sharps enabled', () => {
    render(
      <PianoInput {...defaultProps} accidentals={{ sharps: true, flats: false }} />
    )

    expect(screen.queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument()
  })

  it('hides sharp/flat toggle when only flats enabled', () => {
    render(
      <PianoInput {...defaultProps} accidentals={{ sharps: false, flats: true }} />
    )

    expect(screen.queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument()
  })

  it('shows sharp/flat toggle when both accidentals enabled', () => {
    render(
      <PianoInput {...defaultProps} accidentals={{ sharps: true, flats: true }} />
    )

    expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument()
  })

  it('toggling to flat changes selected black key name and submits flat name', () => {
    const onSubmit = vi.fn()
    render(
      <PianoInput
        {...defaultProps}
        onSubmit={onSubmit}
        accidentals={{ sharps: true, flats: true }}
      />
    )

    // Tap the C#4 key (defaults to sharp)
    fireEvent.click(screen.getByLabelText('Play C sharp 4'))

    // Toggle to flat
    fireEvent.click(screen.getByRole('button', { name: /switch to flat/i }))

    // Submit — should be Db4 now
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(onSubmit).toHaveBeenCalledWith('Db4')
  })

  it('uses flat names by default when only flats enabled', () => {
    const onSubmit = vi.fn()
    render(
      <PianoInput
        {...defaultProps}
        onSubmit={onSubmit}
        accidentals={{ sharps: false, flats: true }}
      />
    )

    // Black keys should use flat names
    fireEvent.click(screen.getByLabelText('Play D flat 4'))
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(onSubmit).toHaveBeenCalledWith('Db4')
  })

  // ── Disabled state ────────────────────────────────────────

  it('does not allow interaction when disabled', () => {
    const onSubmit = vi.fn()
    render(<PianoInput {...defaultProps} onSubmit={onSubmit} disabled />)

    fireEvent.click(screen.getByLabelText('Play C4'))
    expect(playNote).not.toHaveBeenCalled()

    const checkBtn = screen.getByRole('button', { name: /check/i })
    expect(checkBtn).toBeDisabled()
  })
})
