import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { SettingsPage } from '../../src/components/SettingsPage.tsx'
import { DEFAULT_SETTINGS } from '../../src/types.ts'
import type { UserSettings } from '../../src/types.ts'

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    updated_at: new Date('2025-01-01'),
    ...overrides,
  }
}

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders clef toggles with correct initial state', () => {
    const settings = makeSettings({ clefs: { treble: true, bass: false } })
    render(<SettingsPage settings={settings} onUpdate={vi.fn()} />)

    const trebleToggle = screen.getByRole('button', { name: /treble clef/i })
    const bassToggle = screen.getByRole('button', { name: /bass clef/i })

    expect(trebleToggle).toHaveAttribute('aria-pressed', 'true')
    expect(bassToggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggling bass clef calls onUpdate with clefs.bass=true', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ clefs: { treble: true, bass: false } })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: /bass clef/i }))

    expect(onUpdate).toHaveBeenCalledWith({
      clefs: { treble: true, bass: true },
    })
  })

  it('cannot disable the only enabled clef', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ clefs: { treble: true, bass: false } })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const trebleToggle = screen.getByRole('button', { name: /treble clef/i })
    expect(trebleToggle).toBeDisabled()

    fireEvent.click(trebleToggle)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('allows disabling a clef when both are enabled', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ clefs: { treble: true, bass: true } })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const trebleToggle = screen.getByRole('button', { name: /treble clef/i })
    expect(trebleToggle).not.toBeDisabled()

    fireEvent.click(trebleToggle)
    expect(onUpdate).toHaveBeenCalledWith({
      clefs: { treble: false, bass: true },
    })
  })

  it('renders accidental toggles', () => {
    const settings = makeSettings({ accidentals: { sharps: false, flats: false } })
    render(<SettingsPage settings={settings} onUpdate={vi.fn()} />)

    expect(screen.getByRole('button', { name: /sharps/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /flats/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggling sharps calls onUpdate', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ accidentals: { sharps: false, flats: false } })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: /sharps/i }))

    expect(onUpdate).toHaveBeenCalledWith({
      accidentals: { sharps: true, flats: false },
    })
  })

  it('shows current note range', () => {
    const settings = makeSettings({ noteRange: { low: 'E4', high: 'F5' } })
    render(<SettingsPage settings={settings} onUpdate={vi.fn()} />)

    expect(screen.getByText(/E4\s*[–—-]\s*F5/)).toBeInTheDocument()
  })

  it('range preset buttons update range', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings()
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: /two octaves/i }))
    expect(onUpdate).toHaveBeenCalledWith({
      noteRange: { low: 'C3', high: 'C5' },
    })

    onUpdate.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /full range/i }))
    expect(onUpdate).toHaveBeenCalledWith({
      noteRange: { low: 'A0', high: 'C8' },
    })
  })

  it('session size input works', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ sessionSize: 20 })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const input = screen.getByLabelText(/session size/i)
    expect(input).toHaveValue(20)

    fireEvent.change(input, { target: { value: '30' } })
    expect(onUpdate).toHaveBeenCalledWith({ sessionSize: 30 })
  })

  it('new cards per day input works', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ newCardsPerDay: 10 })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const input = screen.getByLabelText(/new cards per day/i)
    expect(input).toHaveValue(10)

    fireEvent.change(input, { target: { value: '25' } })
    expect(onUpdate).toHaveBeenCalledWith({ newCardsPerDay: 25 })
  })

  it('clamps session size to valid range', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ sessionSize: 20 })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const input = screen.getByLabelText(/session size/i)

    fireEvent.change(input, { target: { value: '200' } })
    expect(onUpdate).toHaveBeenCalledWith({ sessionSize: 100 })

    onUpdate.mockClear()

    fireEvent.change(input, { target: { value: '2' } })
    expect(onUpdate).toHaveBeenCalledWith({ sessionSize: 5 })
  })

  // ============================================================
  // Key Signatures
  // ============================================================

  it('renders key signature toggles with C always pressed', () => {
    const settings = makeSettings({ keySignatures: ['C'] })
    render(<SettingsPage settings={settings} onUpdate={vi.fn()} />)

    // Find the C button within the Key Signatures section
    const buttons = screen.getAllByRole('button')
    const cButton = buttons.find((b) => b.textContent === 'C' && b.getAttribute('aria-pressed') === 'true')
    expect(cButton).toBeTruthy()
    expect(cButton).toBeDisabled()
  })

  it('toggling G key signature calls onUpdate', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ keySignatures: ['C'] })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const buttons = screen.getAllByRole('button')
    const gButton = buttons.find((b) => b.textContent === 'G')!
    expect(gButton).toBeTruthy()

    fireEvent.click(gButton)
    expect(onUpdate).toHaveBeenCalledWith({ keySignatures: ['C', 'G'] })
  })

  it('toggling an already-enabled key signature removes it', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ keySignatures: ['C', 'G', 'F'] })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const buttons = screen.getAllByRole('button')
    const gButton = buttons.find((b) => b.textContent === 'G' && b.getAttribute('aria-pressed') === 'true')!
    expect(gButton).toBeTruthy()

    fireEvent.click(gButton)
    expect(onUpdate).toHaveBeenCalledWith({ keySignatures: ['C', 'F'] })
  })

  it('C key signature cannot be deselected', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ keySignatures: ['C'] })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const buttons = screen.getAllByRole('button')
    const cButton = buttons.find((b) => b.textContent === 'C')!
    fireEvent.click(cButton)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('renders all 8 key signature buttons', () => {
    const settings = makeSettings({ keySignatures: ['C'] })
    render(<SettingsPage settings={settings} onUpdate={vi.fn()} />)

    const allKeys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb']
    const buttons = screen.getAllByRole('button')
    for (const key of allKeys) {
      const found = buttons.find((b) => b.textContent === key)
      expect(found).toBeTruthy()
    }
  })

  it('clamps new cards per day to valid range', () => {
    const onUpdate = vi.fn()
    const settings = makeSettings({ newCardsPerDay: 10 })
    render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

    const input = screen.getByLabelText(/new cards per day/i)

    fireEvent.change(input, { target: { value: '100' } })
    expect(onUpdate).toHaveBeenCalledWith({ newCardsPerDay: 50 })

    onUpdate.mockClear()

    fireEvent.change(input, { target: { value: '0' } })
    expect(onUpdate).toHaveBeenCalledWith({ newCardsPerDay: 1 })
  })
})
