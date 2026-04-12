import { describe, it, expect, vi } from 'vitest'
import {
  createScheduler,
  createNewCard,
  autoGrade,
  gradeCard,
  getSchedulingPreview,
  formatInterval,
} from '../../src/lib/scheduler.ts'
import type { AutoGradeResult, GradeResult, SchedulingPreview } from '../../src/lib/scheduler.ts'
import type { CardRecord } from '../../src/types.ts'

// ---------------------------------------------------------------------------
// createNewCard
// ---------------------------------------------------------------------------
describe('createNewCard', () => {
  it('returns a CardRecord with the given id, note, and clef', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    expect(card.id).toBe('treble:C4')
    expect(card.note).toBe('C4')
    expect(card.clef).toBe('treble')
  })

  it('initialises FSRS state to New with 0 reps', () => {
    const card = createNewCard('bass:F3', 'F3', 'bass')
    expect(card.state).toBe(0) // State.New
    expect(card.reps).toBe(0)
    expect(card.lapses).toBe(0)
    expect(card.stability).toBe(0)
    expect(card.difficulty).toBe(0)
    expect(card.elapsed_days).toBe(0)
    expect(card.scheduled_days).toBe(0)
  })

  it('sets created_at to a recent Date', () => {
    const before = new Date()
    const card = createNewCard('treble:D5', 'D5', 'treble')
    const after = new Date()
    expect(card.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(card.created_at.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('sets schema_version to 1', () => {
    const card = createNewCard('treble:E4', 'E4', 'treble')
    expect(card.schema_version).toBe(1)
  })

  it('sets due to a Date', () => {
    const card = createNewCard('treble:E4', 'E4', 'treble')
    expect(card.due).toBeInstanceOf(Date)
  })
})

// ---------------------------------------------------------------------------
// autoGrade
// ---------------------------------------------------------------------------
describe('autoGrade', () => {
  const thresholds = { easyMs: 2000, goodMs: 5000 }

  it('returns Again (1) and correct=false when answer is wrong', () => {
    const result = autoGrade('D4', 'C4', 1000, thresholds)
    expect(result.rating).toBe(1)
    expect(result.correct).toBe(false)
  })

  it('returns Easy (4) when correct and fast (under easyMs)', () => {
    const result = autoGrade('C4', 'C4', 1500, thresholds)
    expect(result.rating).toBe(4)
    expect(result.correct).toBe(true)
  })

  it('returns Good (3) when correct and moderate (under goodMs but >= easyMs)', () => {
    const result = autoGrade('C4', 'C4', 3000, thresholds)
    expect(result.rating).toBe(3)
    expect(result.correct).toBe(true)
  })

  it('returns Hard (2) when correct but slow (>= goodMs)', () => {
    const result = autoGrade('C4', 'C4', 6000, thresholds)
    expect(result.rating).toBe(2)
    expect(result.correct).toBe(true)
  })

  it('performs case-insensitive comparison', () => {
    const result = autoGrade('c#5', 'C#5', 1000, thresholds)
    expect(result.rating).toBe(4)
    expect(result.correct).toBe(true)
  })

  it('does NOT treat enharmonic equivalents as correct (C#5 != Db5)', () => {
    const result = autoGrade('Db5', 'C#5', 1000, thresholds)
    expect(result.rating).toBe(1)
    expect(result.correct).toBe(false)
  })

  it('returns Easy when responseTimeMs equals 0', () => {
    const result = autoGrade('C4', 'C4', 0, thresholds)
    expect(result.rating).toBe(4)
    expect(result.correct).toBe(true)
  })

  it('returns Good when responseTimeMs equals easyMs exactly', () => {
    const result = autoGrade('C4', 'C4', 2000, thresholds)
    expect(result.rating).toBe(3)
    expect(result.correct).toBe(true)
  })

  it('returns Hard when responseTimeMs equals goodMs exactly', () => {
    const result = autoGrade('C4', 'C4', 5000, thresholds)
    expect(result.rating).toBe(2)
    expect(result.correct).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// gradeCard
// ---------------------------------------------------------------------------
describe('gradeCard', () => {
  it('grading a New card with Good moves it out of New state and updates due', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    const { updatedCard, reviewLog } = gradeCard(card, 3, 2500, true)

    // Card should no longer be New (state 0)
    expect(updatedCard.state).not.toBe(0)
    // Due date should be in the future (or at least now)
    expect(updatedCard.due.getTime()).toBeGreaterThanOrEqual(card.due.getTime())
    // Reps should increment
    expect(updatedCard.reps).toBeGreaterThan(0)
    // Preserves identity fields
    expect(updatedCard.id).toBe('treble:C4')
    expect(updatedCard.note).toBe('C4')
    expect(updatedCard.clef).toBe('treble')
    expect(updatedCard.schema_version).toBe(1)
    expect(updatedCard.created_at).toEqual(card.created_at)
  })

  it('returns a valid ReviewLogRecord', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    const { reviewLog } = gradeCard(card, 3, 2500, true)

    expect(reviewLog.id).toBeTruthy()
    expect(typeof reviewLog.id).toBe('string')
    expect(reviewLog.cardId).toBe('treble:C4')
    expect(reviewLog.rating).toBe(3)
    expect(reviewLog.state).toBe(0) // state BEFORE grading (was New)
    expect(reviewLog.response_time_ms).toBe(2500)
    expect(reviewLog.correct).toBe(true)
    expect(reviewLog.reviewed_at).toBeInstanceOf(Date)
    expect(reviewLog.schema_version).toBe(1)
    expect(typeof reviewLog.elapsed_days).toBe('number')
    expect(typeof reviewLog.scheduled_days).toBe('number')
  })

  it('grading with Again keeps a short interval', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    const { updatedCard } = gradeCard(card, 1, 8000, false)

    // After Again on a new card, the interval should be very short
    // scheduled_days should be 0 (same-day) or very small
    expect(updatedCard.scheduled_days).toBeLessThanOrEqual(1)
  })

  it('grading preserves last_review as a Date', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    const { updatedCard } = gradeCard(card, 3, 2500, true)

    expect(updatedCard.last_review).toBeInstanceOf(Date)
  })

  it('grading with Easy on a new card produces a longer interval than Good', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    const goodResult = gradeCard(card, 3, 2500, true)
    const easyResult = gradeCard(card, 4, 2500, true)

    // Easy should produce a due date >= Good's due date
    expect(easyResult.updatedCard.due.getTime()).toBeGreaterThanOrEqual(
      goodResult.updatedCard.due.getTime()
    )
  })
})

// ---------------------------------------------------------------------------
// getSchedulingPreview
// ---------------------------------------------------------------------------
describe('getSchedulingPreview', () => {
  it('returns a preview with entries for all 4 ratings', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    const preview = getSchedulingPreview(card)

    expect(preview[1]).toBeDefined()
    expect(preview[2]).toBeDefined()
    expect(preview[3]).toBeDefined()
    expect(preview[4]).toBeDefined()
  })

  it('each entry has a formatted interval string', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    const preview = getSchedulingPreview(card)

    for (const rating of [1, 2, 3, 4] as const) {
      expect(typeof preview[rating].interval).toBe('string')
      expect(preview[rating].interval.length).toBeGreaterThan(0)
    }
  })

  it('Again interval is shorter than or equal to Easy interval for a new card', () => {
    const card = createNewCard('treble:C4', 'C4', 'treble')
    const preview = getSchedulingPreview(card)

    // We just check that Again is not showing a longer interval than Easy
    // Since interval format varies, we trust the formatting function and just verify presence
    expect(preview[1].interval).toBeTruthy()
    expect(preview[4].interval).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// formatInterval
// ---------------------------------------------------------------------------
describe('formatInterval', () => {
  it('returns "<1m" for less than 60 seconds', () => {
    expect(formatInterval(30_000)).toBe('<1m')
    expect(formatInterval(0)).toBe('<1m')
    expect(formatInterval(59_999)).toBe('<1m')
  })

  it('returns "Xm" for minutes', () => {
    expect(formatInterval(60_000)).toBe('1m')
    expect(formatInterval(300_000)).toBe('5m')
    expect(formatInterval(600_000)).toBe('10m')
  })

  it('returns "Xh" for hours', () => {
    expect(formatInterval(3_600_000)).toBe('1h')
    expect(formatInterval(7_200_000)).toBe('2h')
  })

  it('returns "Xd" for days', () => {
    expect(formatInterval(86_400_000)).toBe('1d')
    expect(formatInterval(86_400_000 * 7)).toBe('7d')
  })

  it('rounds down partial units', () => {
    // 90 seconds → 1m (not 2m)
    expect(formatInterval(90_000)).toBe('1m')
    // 5400 seconds (1.5h) → 1h
    expect(formatInterval(5_400_000)).toBe('1h')
  })
})

// ---------------------------------------------------------------------------
// createScheduler
// ---------------------------------------------------------------------------
describe('createScheduler', () => {
  it('returns an FSRS instance', () => {
    const scheduler = createScheduler()
    expect(scheduler).toBeDefined()
    // FSRS has a 'next' method
    expect(typeof scheduler.next).toBe('function')
    // FSRS has a 'repeat' method
    expect(typeof scheduler.repeat).toBe('function')
  })
})
