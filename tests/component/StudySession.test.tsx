import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact'
import { ResultFeedback } from '../../src/components/ResultFeedback.tsx'
import { SessionSummary } from '../../src/components/SessionSummary.tsx'

// ---------------------------------------------------------------------------
// ResultFeedback
// ---------------------------------------------------------------------------

describe('ResultFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('shows "Correct!" with correct answer for a correct response', () => {
    render(
      <ResultFeedback
        correct={true}
        rating={3}
        correctAnswer="C4"
        userAnswer="C4"
        onUndo={() => {}}
      />
    )

    // The rating label for Good (3) is "Correct!"
    expect(screen.getByText('Correct!')).toBeInTheDocument()
  })

  it('shows "Incorrect" for an incorrect response', () => {
    render(
      <ResultFeedback
        correct={false}
        rating={1}
        correctAnswer="C4"
        userAnswer="D4"
        onUndo={() => {}}
      />
    )

    expect(screen.getByText('Incorrect')).toBeInTheDocument()
  })

  it('shows correct rating labels based on rating', () => {
    const { unmount } = render(
      <ResultFeedback
        correct={true}
        rating={4}
        correctAnswer="C4"
        userAnswer="C4"
        onUndo={() => {}}
      />
    )
    expect(screen.getByText('Fast!')).toBeInTheDocument()
    unmount()

    render(
      <ResultFeedback
        correct={true}
        rating={2}
        correctAnswer="C4"
        userAnswer="C4"
        onUndo={() => {}}
      />
    )
    expect(screen.getByText('Correct, but slow')).toBeInTheDocument()
  })

  it('shows an Undo button that calls onUndo', () => {
    const onUndo = vi.fn()
    render(
      <ResultFeedback
        correct={true}
        rating={3}
        correctAnswer="C4"
        userAnswer="C4"
        onUndo={onUndo}
      />
    )

    const undoBtn = screen.getByRole('button', { name: /undo/i })
    fireEvent.click(undoBtn)
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('hides the Undo button after undoTimeoutMs', async () => {
    render(
      <ResultFeedback
        correct={true}
        rating={3}
        correctAnswer="C4"
        userAnswer="C4"
        onUndo={() => {}}
        undoTimeoutMs={2000}
      />
    )

    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()

    vi.advanceTimersByTime(2100)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument()
    })
  })

  it('displays the correct answer text', () => {
    render(
      <ResultFeedback
        correct={false}
        rating={1}
        correctAnswer="C4"
        userAnswer="D4"
        onUndo={() => {}}
      />
    )

    expect(screen.getByText('C4')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// SessionSummary
// ---------------------------------------------------------------------------

describe('SessionSummary', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows "Session Complete" heading', () => {
    render(
      <SessionSummary reviewed={10} correct={8} onNewSession={() => {}} />
    )

    expect(screen.getByText('Session Complete')).toBeInTheDocument()
  })

  it('shows reviewed count and accuracy percentage', () => {
    render(
      <SessionSummary reviewed={10} correct={8} onNewSession={() => {}} />
    )

    expect(screen.getByText(/10/)).toBeInTheDocument()
    expect(screen.getByText(/80%/)).toBeInTheDocument()
  })

  it('shows 0% accuracy when reviewed is 0', () => {
    render(
      <SessionSummary reviewed={0} correct={0} onNewSession={() => {}} />
    )

    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('"Study Again" button calls onNewSession', () => {
    const onNewSession = vi.fn()
    render(
      <SessionSummary reviewed={10} correct={8} onNewSession={onNewSession} />
    )

    const btn = screen.getByRole('button', { name: /study again/i })
    fireEvent.click(btn)
    expect(onNewSession).toHaveBeenCalledTimes(1)
  })
})
