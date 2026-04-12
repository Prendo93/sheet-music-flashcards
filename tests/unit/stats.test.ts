import { describe, it, expect } from 'vitest'
import type { CardRecord, ReviewLogRecord } from '../../src/types.ts'
import {
  computeCardDistribution,
  computeConfusedNotes,
  computeWeeklyHistory,
} from '../../src/lib/stats.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: 'treble:C4',
    note: 'C4',
    clef: 'treble',
    due: new Date('2025-01-01'),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    created_at: new Date('2025-01-01'),
    schema_version: 1,
    ...overrides,
  }
}

function makeReviewLog(overrides: Partial<ReviewLogRecord> = {}): ReviewLogRecord {
  return {
    id: 'log-1',
    cardId: 'treble:C4',
    rating: 3,
    state: 0,
    elapsed_days: 0,
    scheduled_days: 1,
    reviewed_at: new Date('2025-01-15'),
    response_time_ms: 1500,
    correct: true,
    schema_version: 1,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// computeCardDistribution
// ---------------------------------------------------------------------------

describe('computeCardDistribution', () => {
  it('returns correct counts with mixed states', () => {
    const cards = [
      makeCard({ id: 'a', state: 0 }),
      makeCard({ id: 'b', state: 1 }),
      makeCard({ id: 'c', state: 2 }),
      makeCard({ id: 'd', state: 2 }),
      makeCard({ id: 'e', state: 3 }),
    ]
    const dist = computeCardDistribution(cards)
    expect(dist.new).toBe(1)
    expect(dist.learning).toBe(1)
    expect(dist.review).toBe(2)
    expect(dist.relearning).toBe(1)
    expect(dist.total).toBe(5)
    expect(dist.masteryPercent).toBe(40) // 2/5 * 100
  })

  it('returns mastery 0% with all new cards', () => {
    const cards = [
      makeCard({ id: 'a', state: 0 }),
      makeCard({ id: 'b', state: 0 }),
      makeCard({ id: 'c', state: 0 }),
    ]
    const dist = computeCardDistribution(cards)
    expect(dist.new).toBe(3)
    expect(dist.review).toBe(0)
    expect(dist.masteryPercent).toBe(0)
  })

  it('returns mastery 100% with all review cards', () => {
    const cards = [
      makeCard({ id: 'a', state: 2 }),
      makeCard({ id: 'b', state: 2 }),
    ]
    const dist = computeCardDistribution(cards)
    expect(dist.review).toBe(2)
    expect(dist.total).toBe(2)
    expect(dist.masteryPercent).toBe(100)
  })

  it('handles empty array', () => {
    const dist = computeCardDistribution([])
    expect(dist.new).toBe(0)
    expect(dist.learning).toBe(0)
    expect(dist.review).toBe(0)
    expect(dist.relearning).toBe(0)
    expect(dist.total).toBe(0)
    expect(dist.masteryPercent).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// computeConfusedNotes
// ---------------------------------------------------------------------------

describe('computeConfusedNotes', () => {
  it('groups by cardId correctly', () => {
    const logs = [
      makeReviewLog({ id: '1', cardId: 'treble:C4', correct: true }),
      makeReviewLog({ id: '2', cardId: 'treble:C4', correct: false }),
      makeReviewLog({ id: '3', cardId: 'treble:C4', correct: true }),
      makeReviewLog({ id: '4', cardId: 'treble:D4', correct: false }),
      makeReviewLog({ id: '5', cardId: 'treble:D4', correct: false }),
      makeReviewLog({ id: '6', cardId: 'treble:D4', correct: false }),
    ]
    const result = computeConfusedNotes(logs)
    // D4 has 0% accuracy, C4 has 66.67% accuracy
    expect(result.length).toBe(2)
    expect(result[0].cardId).toBe('treble:D4')
    expect(result[0].accuracy).toBeCloseTo(0)
    expect(result[1].cardId).toBe('treble:C4')
    expect(result[1].accuracy).toBeCloseTo(66.67, 0)
  })

  it('sorts by worst accuracy first', () => {
    const logs = [
      // card A: 3 reviews, 2 correct = 66.7%
      makeReviewLog({ id: '1', cardId: 'treble:A4', correct: true }),
      makeReviewLog({ id: '2', cardId: 'treble:A4', correct: true }),
      makeReviewLog({ id: '3', cardId: 'treble:A4', correct: false }),
      // card B: 3 reviews, 1 correct = 33.3%
      makeReviewLog({ id: '4', cardId: 'treble:B4', correct: true }),
      makeReviewLog({ id: '5', cardId: 'treble:B4', correct: false }),
      makeReviewLog({ id: '6', cardId: 'treble:B4', correct: false }),
    ]
    const result = computeConfusedNotes(logs)
    expect(result[0].cardId).toBe('treble:B4')
    expect(result[1].cardId).toBe('treble:A4')
  })

  it('filters cards with fewer than 3 reviews', () => {
    const logs = [
      // card A: only 2 reviews — should be filtered
      makeReviewLog({ id: '1', cardId: 'treble:A4', correct: false }),
      makeReviewLog({ id: '2', cardId: 'treble:A4', correct: false }),
      // card B: 3 reviews — included
      makeReviewLog({ id: '3', cardId: 'treble:B4', correct: true }),
      makeReviewLog({ id: '4', cardId: 'treble:B4', correct: false }),
      makeReviewLog({ id: '5', cardId: 'treble:B4', correct: false }),
    ]
    const result = computeConfusedNotes(logs)
    expect(result.length).toBe(1)
    expect(result[0].cardId).toBe('treble:B4')
  })

  it('returns top 5 by default', () => {
    const logs: ReviewLogRecord[] = []
    // Create 7 cards each with 3 reviews
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
    let logId = 0
    for (const note of notes) {
      for (let i = 0; i < 3; i++) {
        logs.push(
          makeReviewLog({
            id: `log-${logId++}`,
            cardId: `treble:${note}`,
            correct: false,
          }),
        )
      }
    }
    const result = computeConfusedNotes(logs)
    expect(result.length).toBe(5)
  })

  it('extracts note name from cardId ("treble:C4" -> "C4")', () => {
    const logs = [
      makeReviewLog({ id: '1', cardId: 'treble:C4', correct: true }),
      makeReviewLog({ id: '2', cardId: 'treble:C4', correct: false }),
      makeReviewLog({ id: '3', cardId: 'treble:C4', correct: false }),
      makeReviewLog({ id: '4', cardId: 'bass:F3', correct: false }),
      makeReviewLog({ id: '5', cardId: 'bass:F3', correct: false }),
      makeReviewLog({ id: '6', cardId: 'bass:F3', correct: false }),
    ]
    const result = computeConfusedNotes(logs)
    expect(result[0].note).toBe('F3')
    expect(result[1].note).toBe('C4')
  })

  it('returns empty array with no logs', () => {
    const result = computeConfusedNotes([])
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// computeWeeklyHistory
// ---------------------------------------------------------------------------

describe('computeWeeklyHistory', () => {
  it('returns exactly 7 entries', () => {
    const result = computeWeeklyHistory([], new Date('2026-04-13'))
    expect(result.length).toBe(7)
  })

  it('includes today', () => {
    const now = new Date('2026-04-13T14:00:00')
    const result = computeWeeklyHistory([], now)
    expect(result[6].date).toBe('2026-04-13')
  })

  it('fills missing days with zeros', () => {
    const now = new Date('2026-04-13T14:00:00')
    const result = computeWeeklyHistory([], now)
    for (const entry of result) {
      expect(entry.reviewCount).toBe(0)
      expect(entry.correctCount).toBe(0)
    }
  })

  it('counts correctly for a day with multiple reviews', () => {
    const now = new Date('2026-04-13T20:00:00')
    const logs = [
      makeReviewLog({ id: '1', reviewed_at: new Date('2026-04-13T10:00:00'), correct: true }),
      makeReviewLog({ id: '2', reviewed_at: new Date('2026-04-13T11:00:00'), correct: true }),
      makeReviewLog({ id: '3', reviewed_at: new Date('2026-04-13T12:00:00'), correct: false }),
    ]
    const result = computeWeeklyHistory(logs, now)
    const today = result[6]
    expect(today.date).toBe('2026-04-13')
    expect(today.reviewCount).toBe(3)
    expect(today.correctCount).toBe(2)
  })

  it('is sorted chronologically (oldest first)', () => {
    const now = new Date('2026-04-13T14:00:00')
    const result = computeWeeklyHistory([], now)
    expect(result[0].date).toBe('2026-04-07')
    expect(result[6].date).toBe('2026-04-13')
    // Verify all dates are in order
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date > result[i - 1].date).toBe(true)
    }
  })
})
