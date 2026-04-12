import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ChordPicker } from '../../src/components/ChordPicker.tsx'

describe('ChordPicker', () => {
  afterEach(() => {
    cleanup()
  })

  // ── Interval mode ─────────────────────────────────────────

  it('renders interval name buttons in interval mode', () => {
    render(<ChordPicker mode="interval" onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'minor 2nd' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'major 3rd' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'perfect 5th' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'octave' })).toBeInTheDocument()
  })

  it('clicking interval button calls onSubmit with interval name', () => {
    const onSubmit = vi.fn()
    render(<ChordPicker mode="interval" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'major 3rd' }))
    expect(onSubmit).toHaveBeenCalledWith('major 3rd')
  })

  // ── Chord mode ────────────────────────────────────────────

  it('renders root note buttons and quality buttons in chord mode', () => {
    render(<ChordPicker mode="chord" onSubmit={vi.fn()} />)
    // Root note buttons
    for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      expect(screen.getByRole('button', { name: `Root ${letter}` })).toBeInTheDocument()
    }
    // Quality buttons
    expect(screen.getByRole('button', { name: 'Major' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Minor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dim' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aug' })).toBeInTheDocument()
  })

  it('selecting root + quality + submit calls onSubmit with "C major" format', () => {
    const onSubmit = vi.fn()
    render(<ChordPicker mode="chord" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Root C' }))
    fireEvent.click(screen.getByRole('button', { name: 'Major' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit chord' }))
    expect(onSubmit).toHaveBeenCalledWith('C major')
  })

  it('selecting root + minor quality submits correctly', () => {
    const onSubmit = vi.fn()
    render(<ChordPicker mode="chord" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Root A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Minor' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit chord' }))
    expect(onSubmit).toHaveBeenCalledWith('A minor')
  })

  // ── Disabled state ────────────────────────────────────────

  it('disabled state prevents interaction in interval mode', () => {
    const onSubmit = vi.fn()
    render(<ChordPicker mode="interval" onSubmit={onSubmit} disabled />)
    const allButtons = screen.getAllByRole('button')
    for (const btn of allButtons) {
      expect(btn).toBeDisabled()
    }
  })

  it('disabled state prevents interaction in chord mode', () => {
    const onSubmit = vi.fn()
    render(<ChordPicker mode="chord" onSubmit={onSubmit} disabled />)
    const allButtons = screen.getAllByRole('button')
    for (const btn of allButtons) {
      expect(btn).toBeDisabled()
    }
  })

  // ── Accessibility ─────────────────────────────────────────

  it('all interval buttons have aria-labels', () => {
    render(<ChordPicker mode="interval" onSubmit={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn).toHaveAttribute('aria-label')
    }
  })

  it('submit button is disabled until both root and quality are selected', () => {
    render(<ChordPicker mode="chord" onSubmit={vi.fn()} />)
    const submitBtn = screen.getByRole('button', { name: 'Submit chord' })
    expect(submitBtn).toBeDisabled()

    // Select only root
    fireEvent.click(screen.getByRole('button', { name: 'Root C' }))
    expect(submitBtn).toBeDisabled()

    // Select quality too
    fireEvent.click(screen.getByRole('button', { name: 'Major' }))
    expect(submitBtn).toBeEnabled()
  })
})
