import { describe, it, expect } from 'vitest'
import type { CardRecord, UserSettings } from '../../src/types.ts'
import { DEFAULT_SETTINGS } from '../../src/types.ts'
import {
  evaluateProgression,
  applyMilestone,
  MILESTONES,
} from '../../src/lib/progression.ts'

// ============================================================
// Test helper
// ============================================================

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: 'treble:C4',
    note: 'C4',
    clef: 'treble',
    due: new Date(),
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 0,
    lapses: 0,
    state: 0,
    created_at: new Date(),
    schema_version: 1,
    ...overrides,
  }
}

/** Build an array of cards in Review state (state=2) with specified reps */
function makeReviewCards(count: number, repsEach: number): CardRecord[] {
  return Array.from({ length: count }, (_, i) =>
    makeCard({
      id: `treble:${String.fromCharCode(65 + (i % 7))}${4 + Math.floor(i / 7)}`,
      state: 2,
      reps: repsEach,
    }),
  )
}

// ============================================================
// MILESTONES data structure
// ============================================================

describe('MILESTONES', () => {
  it('has 7 milestone entries', () => {
    expect(MILESTONES).toHaveLength(7)
  })

  it('has milestones with levels 1 through 7', () => {
    const levels = MILESTONES.map((m) => m.level)
    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('has increasing minCardsAtReviewState across milestones', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].criteria.minCardsAtReviewState).toBeGreaterThanOrEqual(
        MILESTONES[i - 1].criteria.minCardsAtReviewState,
      )
    }
  })

  it('has increasing minTotalReviews across milestones', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].criteria.minTotalReviews).toBeGreaterThanOrEqual(
        MILESTONES[i - 1].criteria.minTotalReviews,
      )
    }
  })
})

// ============================================================
// evaluateProgression
// ============================================================

describe('evaluateProgression', () => {
  it('returns shouldUnlock=false with no cards', () => {
    const result = evaluateProgression(0, [])
    expect(result.shouldUnlock).toBe(false)
    expect(result.currentLevel).toBe(0)
    expect(result.nextMilestone).not.toBeNull()
  })

  it('returns shouldUnlock=false when not enough cards at Review state', () => {
    // Level 1 needs 5 cards at Review, give only 3
    const cards = makeReviewCards(3, 10)
    const result = evaluateProgression(0, cards)
    expect(result.shouldUnlock).toBe(false)
  })

  it('returns shouldUnlock=false when retention is too low', () => {
    // 5 Review cards, but also 5 Relearning cards → retention = 5/10 = 0.50
    const reviewCards = makeReviewCards(5, 6)
    const relearningCards = Array.from({ length: 5 }, (_, i) =>
      makeCard({
        id: `bass:${String.fromCharCode(65 + i)}3`,
        state: 3,
        reps: 6,
      }),
    )
    const cards = [...reviewCards, ...relearningCards]
    // Total reps: 10 * 6 = 60 (≥30), cardsAtReview: 5 (≥5), but retention: 0.50 (<0.80)
    const result = evaluateProgression(0, cards)
    expect(result.shouldUnlock).toBe(false)
  })

  it('returns shouldUnlock=false when not enough total reviews', () => {
    // 5 Review cards with only 1 rep each → totalReviews = 5 (<30)
    const cards = makeReviewCards(5, 1)
    const result = evaluateProgression(0, cards)
    expect(result.shouldUnlock).toBe(false)
  })

  it('returns shouldUnlock=true when ALL criteria met for level 1', () => {
    // Level 1: minCardsAtReviewState=5, minAverageRetention=0.80, minTotalReviews=30
    const cards = makeReviewCards(5, 6) // 5 review cards, 5*6=30 reps, retention=5/5=1.0
    const result = evaluateProgression(0, cards)
    expect(result.shouldUnlock).toBe(true)
    expect(result.nextMilestone).not.toBeNull()
    expect(result.nextMilestone!.level).toBe(1)
    expect(result.nextMilestone!.name).toBe('Bass Clef')
  })

  it('returns correct nextMilestone for level 0 (beginner)', () => {
    const result = evaluateProgression(0, [])
    expect(result.nextMilestone!.level).toBe(1)
    expect(result.nextMilestone!.name).toBe('Bass Clef')
  })

  it('returns correct nextMilestone for level 1', () => {
    const result = evaluateProgression(1, [])
    expect(result.nextMilestone!.level).toBe(2)
    expect(result.nextMilestone!.name).toBe('Accidentals')
  })

  it('returns correct nextMilestone for level 3', () => {
    const result = evaluateProgression(3, [])
    expect(result.nextMilestone!.level).toBe(4)
    expect(result.nextMilestone!.name).toBe('Key Signatures I')
  })

  it('returns shouldUnlock=false when already at max level', () => {
    const result = evaluateProgression(7, [])
    expect(result.shouldUnlock).toBe(false)
    expect(result.nextMilestone).toBeNull()
    expect(result.currentLevel).toBe(7)
  })

  it('returns currentLevel correctly', () => {
    const result = evaluateProgression(3, [])
    expect(result.currentLevel).toBe(3)
  })

  it('uses retention=0 when no Review or Relearning cards exist', () => {
    // All cards in New state (state=0)
    const cards = [makeCard({ state: 0, reps: 100 })]
    const result = evaluateProgression(0, cards)
    expect(result.shouldUnlock).toBe(false)
  })

  it('counts only state=2 cards for cardsAtReview', () => {
    // 3 Review (state=2), 3 Learning (state=1) — shouldn't count Learning
    const reviewCards = makeReviewCards(3, 10)
    const learningCards = Array.from({ length: 3 }, (_, i) =>
      makeCard({
        id: `bass:${String.fromCharCode(65 + i)}3`,
        state: 1,
        reps: 10,
      }),
    )
    const cards = [...reviewCards, ...learningCards]
    const result = evaluateProgression(0, cards)
    // cardsAtReview=3 which is <5, so should not unlock
    expect(result.shouldUnlock).toBe(false)
  })

  it('sums all reps across ALL cards for totalReviews', () => {
    // 5 Review cards with 4 reps each = 20, plus 5 New cards with 2 reps each = 10 → total 30
    const reviewCards = makeReviewCards(5, 4)
    const newCards = Array.from({ length: 5 }, (_, i) =>
      makeCard({
        id: `bass:${String.fromCharCode(65 + i)}3`,
        state: 0,
        reps: 2,
      }),
    )
    const cards = [...reviewCards, ...newCards]
    // cardsAtReview=5 (≥5), retention=5/(5+0)=1.0 (≥0.80), totalReviews=30 (≥30)
    const result = evaluateProgression(0, cards)
    expect(result.shouldUnlock).toBe(true)
  })
})

// ============================================================
// applyMilestone
// ============================================================

describe('applyMilestone', () => {
  it('merges settingsUnlock into settings', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const milestone = MILESTONES[0] // Bass Clef
    const updated = applyMilestone(settings, milestone)
    expect(updated.clefs).toEqual({ treble: true, bass: true })
  })

  it('preserves unrelated settings fields', () => {
    const settings = { ...DEFAULT_SETTINGS, newCardsPerDay: 15, sessionSize: 25 }
    const milestone = MILESTONES[0] // Bass Clef (only changes clefs)
    const updated = applyMilestone(settings, milestone)
    expect(updated.newCardsPerDay).toBe(15)
    expect(updated.sessionSize).toBe(25)
    expect(updated.noteRange).toEqual(settings.noteRange)
  })

  it('with clef unlock enables bass clef', () => {
    const settings = { ...DEFAULT_SETTINGS, clefs: { treble: true, bass: false } }
    const milestone = MILESTONES[0] // settingsUnlock: { clefs: { treble: true, bass: true } }
    const updated = applyMilestone(settings, milestone)
    expect(updated.clefs.bass).toBe(true)
    expect(updated.clefs.treble).toBe(true)
  })

  it('with noteRange unlock changes range', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const milestone = MILESTONES[2] // level 3: noteRange: { low: 'C4', high: 'G5' }
    const updated = applyMilestone(settings, milestone)
    expect(updated.noteRange).toEqual({ low: 'C4', high: 'G5' })
  })

  it('with accidentals unlock enables sharps and flats', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const milestone = MILESTONES[1] // level 2: accidentals: { sharps: true, flats: true }
    const updated = applyMilestone(settings, milestone)
    expect(updated.accidentals).toEqual({ sharps: true, flats: true })
  })

  it('with keySignatures unlock sets key signatures', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const milestone = MILESTONES[3] // level 4: keySignatures: ['C', 'G', 'F']
    const updated = applyMilestone(settings, milestone)
    expect(updated.keySignatures).toEqual(['C', 'G', 'F'])
  })

  it('does not mutate the original settings object', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const originalClefs = { ...settings.clefs }
    applyMilestone(settings, MILESTONES[0])
    expect(settings.clefs).toEqual(originalClefs)
  })
})
