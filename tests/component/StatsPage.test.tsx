import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/preact'
import { StatsPage } from '../../src/components/StatsPage.tsx'
import type { CardStateDistribution, ConfusedNote, DailyReviewCount } from '../../src/lib/stats.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultProps() {
  return {
    todayStats: { reviewedToday: 12, accuracyToday: 83, streak: 5 },
    cardDistribution: {
      new: 10,
      learning: 5,
      review: 20,
      relearning: 2,
      total: 37,
      masteryPercent: 54,
    } as CardStateDistribution,
    confusedNotes: [
      { note: 'F3', cardId: 'bass:F3', totalReviews: 8, correctReviews: 2, accuracy: 25 },
      { note: 'C4', cardId: 'treble:C4', totalReviews: 10, correctReviews: 5, accuracy: 50 },
    ] as ConfusedNote[],
    weeklyHistory: [
      { date: '2026-04-07', reviewCount: 5, correctCount: 4 },
      { date: '2026-04-08', reviewCount: 0, correctCount: 0 },
      { date: '2026-04-09', reviewCount: 12, correctCount: 10 },
      { date: '2026-04-10', reviewCount: 3, correctCount: 2 },
      { date: '2026-04-11', reviewCount: 8, correctCount: 7 },
      { date: '2026-04-12', reviewCount: 0, correctCount: 0 },
      { date: '2026-04-13', reviewCount: 15, correctCount: 12 },
    ] as DailyReviewCount[],
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders today stats section', () => {
    render(<StatsPage {...defaultProps()} />)

    expect(screen.getByText(/12 cards/i)).toBeInTheDocument()
    expect(screen.getByText(/83%/)).toBeInTheDocument()
  })

  it('shows mastery percentage and progress bar', () => {
    render(<StatsPage {...defaultProps()} />)

    expect(screen.getByText(/20\s*\/\s*37\s*cards mastered/i)).toBeInTheDocument()
    expect(screen.getByText(/54%/)).toBeInTheDocument()

    // Check progress bar exists (role=progressbar)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-valuenow', '54')
  })

  it('shows card distribution counts', () => {
    render(<StatsPage {...defaultProps()} />)

    expect(screen.getByText(/New:\s*10/)).toBeInTheDocument()
    expect(screen.getByText(/Learning:\s*5/)).toBeInTheDocument()
    expect(screen.getByText(/Review:\s*20/)).toBeInTheDocument()
    expect(screen.getByText(/Relearning:\s*2/)).toBeInTheDocument()
  })

  it('shows confused notes section when there are confused notes', () => {
    render(<StatsPage {...defaultProps()} />)

    expect(screen.getByText(/Notes to Focus On/i)).toBeInTheDocument()
    expect(screen.getByText('F3')).toBeInTheDocument()
    expect(screen.getByText('C4')).toBeInTheDocument()
    expect(screen.getByText(/25%/)).toBeInTheDocument()
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('hides confused notes section when empty', () => {
    const props = { ...defaultProps(), confusedNotes: [] }
    render(<StatsPage {...props} />)

    expect(screen.queryByText(/Notes to Focus On/i)).not.toBeInTheDocument()
  })

  it('shows weekly bars', () => {
    render(<StatsPage {...defaultProps()} />)

    // Should show day abbreviations (T appears twice: Tuesday and Thursday)
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getAllByText('T').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('W')).toBeInTheDocument()

    // Should show review counts on top of bars
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('shows 0% mastery with all new cards', () => {
    const props = {
      ...defaultProps(),
      cardDistribution: {
        new: 10,
        learning: 0,
        review: 0,
        relearning: 0,
        total: 10,
        masteryPercent: 0,
      } as CardStateDistribution,
    }
    render(<StatsPage {...props} />)

    expect(screen.getByText(/0\s*\/\s*10\s*cards mastered/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('shows streak with fire emoji', () => {
    render(<StatsPage {...defaultProps()} />)

    // Streak section should contain the fire emoji and the streak count
    const streakEl = screen.getByText(/Streak:/)
    expect(streakEl.textContent).toContain('5')
    expect(streakEl.textContent).toContain('\uD83D\uDD25')
  })
})
