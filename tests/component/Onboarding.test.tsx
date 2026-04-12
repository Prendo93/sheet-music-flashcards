import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Onboarding } from '../../src/components/Onboarding.tsx'

// VexFlow doesn't work in jsdom — mock SheetMusicDisplay
vi.mock('../../src/components/SheetMusicDisplay.tsx', () => ({
  SheetMusicDisplay: ({ note, clef }: any) => <div data-testid="staff">{clef}:{note}</div>
}))

describe('Onboarding', () => {
  afterEach(() => {
    cleanup()
  })

  // ── Step 1: Welcome ────────────────────────────────────────

  it('renders welcome step with heading and Next button', () => {
    render(<Onboarding onComplete={vi.fn()} />)

    expect(screen.getByText('Welcome to Sheet Music Flashcards')).toBeInTheDocument()
    expect(screen.getByText("You'll see a note on the staff. Your job is to identify it.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('renders Skip link on step 1', () => {
    render(<Onboarding onComplete={vi.fn()} />)

    expect(screen.getByText('Skip')).toBeInTheDocument()
  })

  it('clicking Next advances to step 2 (practice card)', () => {
    render(<Onboarding onComplete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText("Try it! What note is this?")).toBeInTheDocument()
  })

  // ── Step 2: Practice Card ──────────────────────────────────

  it('step 2 shows the NotePicker', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // NotePicker renders letter buttons
    expect(screen.getByRole('button', { name: 'Note C' })).toBeInTheDocument()
  })

  it('step 2 shows the sheet music display (mocked)', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    const staff = screen.getByTestId('staff')
    expect(staff).toHaveTextContent('treble:C4')
  })

  it('submitting correct answer (C) shows success message', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Select C and submit
    fireEvent.click(screen.getByRole('button', { name: 'Note C' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.getByText("That's right! You're ready to start.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Studying' })).toBeInTheDocument()
  })

  it('submitting incorrect answer shows retry message', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Select D (wrong) and submit
    fireEvent.click(screen.getByRole('button', { name: 'Note D' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.getByText("The correct answer is C. Tap 'C' to try again.")).toBeInTheDocument()
  })

  // ── Completion ─────────────────────────────────────────────

  it('clicking Skip on step 1 calls onComplete', () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} />)

    fireEvent.click(screen.getByText('Skip'))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('clicking Skip on step 2 calls onComplete', () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByText('Skip'))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('clicking Start Studying after correct answer calls onComplete', () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Submit correct answer
    fireEvent.click(screen.getByRole('button', { name: 'Note C' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))

    // Click Start Studying
    fireEvent.click(screen.getByRole('button', { name: 'Start Studying' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
