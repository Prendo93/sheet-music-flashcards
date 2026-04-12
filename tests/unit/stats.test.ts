import { describe, it, expect } from 'vitest'
import type { ReviewLogRecord } from '../../src/types.ts'
import { startOfDay, computeTodayStats, computeStreak } from '../../src/lib/stats.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLog(overrides: Partial<ReviewLogRecord> = {}): ReviewLogRecord {
  return {
    id: `log-${Math.random().toString(36).slice(2, 8)}`,
    cardId: 'treble:C4',
    rating: 3,
    state: 0,
    elapsed_days: 0,
    scheduled_days: 1,
    reviewed_at: new Date(),
    response_time_ms: 1500,
    correct: true,
    schema_version: 1,
    ...overrides,
  }
}

/** Create a Date at a specific hour on a given day offset from `base`. */
function dayAt(base: Date, dayOffset: number, hour = 12): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  return d
}

// ---------------------------------------------------------------------------
// startOfDay
// ---------------------------------------------------------------------------

describe('startOfDay', () => {
  it('returns midnight local time for a given date', () => {
    const input = new Date(2026, 3, 13, 15, 30, 45, 123) // Apr 13, 2026 3:30pm
    const result = startOfDay(input)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // April = month 3
    expect(result.getDate()).toBe(13)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('does not mutate the input date', () => {
    const input = new Date(2026, 3, 13, 15, 30, 0, 0)
    const origTime = input.getTime()
    startOfDay(input)
    expect(input.getTime()).toBe(origTime)
  })
})

// ---------------------------------------------------------------------------
// computeTodayStats
// ---------------------------------------------------------------------------

describe('computeTodayStats', () => {
  const now = new Date(2026, 3, 13, 14, 0, 0, 0) // Apr 13, 2026 2:00pm

  it('returns zeros when there are no logs', () => {
    const result = computeTodayStats([], now)
    expect(result).toEqual({
      reviewedToday: 0,
      accuracyToday: 0,
      streak: 0,
    })
  })

  it('counts only logs from today and calculates accuracy', () => {
    const logs = [
      makeLog({ reviewed_at: dayAt(now, 0, 10), correct: true }),
      makeLog({ reviewed_at: dayAt(now, 0, 11), correct: true }),
      makeLog({ reviewed_at: dayAt(now, 0, 12), correct: false }),
    ]
    const result = computeTodayStats(logs, now)
    expect(result.reviewedToday).toBe(3)
    expect(result.accuracyToday).toBeCloseTo(66.67, 0)
  })

  it('ignores logs from yesterday', () => {
    const logs = [
      makeLog({ reviewed_at: dayAt(now, -1, 10), correct: true }),
      makeLog({ reviewed_at: dayAt(now, -1, 22), correct: false }),
      makeLog({ reviewed_at: dayAt(now, 0, 9), correct: true }),
    ]
    const result = computeTodayStats(logs, now)
    expect(result.reviewedToday).toBe(1)
    expect(result.accuracyToday).toBe(100)
  })

  it('returns 0 accuracy when reviewed but none correct', () => {
    const logs = [
      makeLog({ reviewed_at: dayAt(now, 0, 10), correct: false }),
      makeLog({ reviewed_at: dayAt(now, 0, 11), correct: false }),
    ]
    const result = computeTodayStats(logs, now)
    expect(result.reviewedToday).toBe(2)
    expect(result.accuracyToday).toBe(0)
  })

  it('returns 100 accuracy when all correct', () => {
    const logs = [
      makeLog({ reviewed_at: dayAt(now, 0, 8), correct: true }),
      makeLog({ reviewed_at: dayAt(now, 0, 9), correct: true }),
      makeLog({ reviewed_at: dayAt(now, 0, 10), correct: true }),
    ]
    const result = computeTodayStats(logs, now)
    expect(result.reviewedToday).toBe(3)
    expect(result.accuracyToday).toBe(100)
  })

  it('includes streak in the result', () => {
    // Today + yesterday + day before = 3-day streak
    const logs = [
      makeLog({ reviewed_at: dayAt(now, 0, 10) }),
      makeLog({ reviewed_at: dayAt(now, -1, 10) }),
      makeLog({ reviewed_at: dayAt(now, -2, 10) }),
    ]
    const result = computeTodayStats(logs, now)
    expect(result.streak).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// computeStreak
// ---------------------------------------------------------------------------

describe('computeStreak', () => {
  const now = new Date(2026, 3, 13, 14, 0, 0, 0) // Apr 13, 2026 2:00pm

  it('returns 0 with no logs', () => {
    expect(computeStreak([], now)).toBe(0)
  })

  it('returns 1 with reviews today only', () => {
    const logs = [makeLog({ reviewed_at: dayAt(now, 0, 10) })]
    expect(computeStreak(logs, now)).toBe(1)
  })

  it('counts consecutive days correctly (3 days)', () => {
    const logs = [
      makeLog({ reviewed_at: dayAt(now, 0, 10) }),
      makeLog({ reviewed_at: dayAt(now, -1, 15) }),
      makeLog({ reviewed_at: dayAt(now, -2, 9) }),
    ]
    expect(computeStreak(logs, now)).toBe(3)
  })

  it('breaks streak at a gap', () => {
    // today, yesterday, gap, 3 days ago
    const logs = [
      makeLog({ reviewed_at: dayAt(now, 0, 10) }),
      makeLog({ reviewed_at: dayAt(now, -1, 10) }),
      // no log for dayAt(now, -2)
      makeLog({ reviewed_at: dayAt(now, -3, 10) }),
    ]
    expect(computeStreak(logs, now)).toBe(2)
  })

  it('counts from yesterday when today has no reviews (streak not broken yet)', () => {
    const logs = [
      makeLog({ reviewed_at: dayAt(now, -1, 10) }),
      makeLog({ reviewed_at: dayAt(now, -2, 10) }),
      makeLog({ reviewed_at: dayAt(now, -3, 10) }),
    ]
    expect(computeStreak(logs, now)).toBe(3)
  })

  it('boundary: review at 11:59pm and 12:01am same day counts as 1', () => {
    const late = new Date(2026, 3, 12, 23, 59, 0, 0) // Apr 12 11:59pm
    const early = new Date(2026, 3, 12, 0, 1, 0, 0)  // Apr 12 12:01am
    const logs = [
      makeLog({ reviewed_at: late }),
      makeLog({ reviewed_at: early }),
    ]
    // now is Apr 13; these are both Apr 12 = yesterday, so streak from yesterday = 1
    expect(computeStreak(logs, now)).toBe(1)
  })

  it('handles multiple reviews on the same day correctly', () => {
    const logs = [
      makeLog({ reviewed_at: dayAt(now, 0, 8) }),
      makeLog({ reviewed_at: dayAt(now, 0, 12) }),
      makeLog({ reviewed_at: dayAt(now, 0, 18) }),
      makeLog({ reviewed_at: dayAt(now, -1, 10) }),
      makeLog({ reviewed_at: dayAt(now, -1, 14) }),
    ]
    expect(computeStreak(logs, now)).toBe(2)
  })
})
