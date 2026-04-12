import type { CardRecord, UserSettings } from '../types.ts'

// ============================================================
// Unlock Criteria
// ============================================================

export interface UnlockCriteria {
  minCardsAtReviewState: number
  minAverageRetention: number
  minTotalReviews: number
}

// ============================================================
// Milestone
// ============================================================

export interface Milestone {
  level: number
  name: string
  description: string
  criteria: UnlockCriteria
  settingsUnlock: Partial<UserSettings>
}

// ============================================================
// Milestone Definitions
// ============================================================

export const MILESTONES: Milestone[] = [
  {
    level: 1,
    name: 'Bass Clef',
    description: 'Add bass clef notes',
    criteria: { minCardsAtReviewState: 5, minAverageRetention: 0.80, minTotalReviews: 30 },
    settingsUnlock: { clefs: { treble: true, bass: true } },
  },
  {
    level: 2,
    name: 'Accidentals',
    description: 'Add sharps and flats',
    criteria: { minCardsAtReviewState: 10, minAverageRetention: 0.80, minTotalReviews: 60 },
    settingsUnlock: { accidentals: { sharps: true, flats: true } },
  },
  {
    level: 3,
    name: 'First Ledger Lines',
    description: 'Expand range to include middle C',
    criteria: { minCardsAtReviewState: 15, minAverageRetention: 0.85, minTotalReviews: 100 },
    settingsUnlock: { noteRange: { low: 'C4', high: 'G5' } },
  },
  {
    level: 4,
    name: 'Key Signatures I',
    description: 'Add G major and F major',
    criteria: { minCardsAtReviewState: 20, minAverageRetention: 0.85, minTotalReviews: 150 },
    settingsUnlock: { keySignatures: ['C', 'G', 'F'] },
  },
  {
    level: 5,
    name: 'Key Signatures II',
    description: 'Add D, Bb, A, Eb major',
    criteria: { minCardsAtReviewState: 25, minAverageRetention: 0.85, minTotalReviews: 200 },
    settingsUnlock: { keySignatures: ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb'] },
  },
  {
    level: 6,
    name: 'Wider Range',
    description: 'Extend to 2+ ledger lines',
    criteria: { minCardsAtReviewState: 30, minAverageRetention: 0.85, minTotalReviews: 250 },
    settingsUnlock: { noteRange: { low: 'A3', high: 'C6' } },
  },
  {
    level: 7,
    name: 'All Keys',
    description: 'All major key signatures',
    criteria: { minCardsAtReviewState: 35, minAverageRetention: 0.85, minTotalReviews: 300 },
    settingsUnlock: { keySignatures: ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'Ab'] },
  },
]

// ============================================================
// Progression Result
// ============================================================

export interface ProgressionResult {
  shouldUnlock: boolean
  nextMilestone: Milestone | null
  currentLevel: number
}

// ============================================================
// evaluateProgression
// ============================================================

export function evaluateProgression(
  currentLevel: number,
  cards: CardRecord[],
): ProgressionResult {
  const nextMilestone = MILESTONES.find((m) => m.level === currentLevel + 1) ?? null

  // Already at max level
  if (!nextMilestone) {
    return { shouldUnlock: false, nextMilestone: null, currentLevel }
  }

  const { criteria } = nextMilestone

  // Count cards at Review state (state === 2)
  const cardsAtReview = cards.filter((c) => c.state === 2).length

  // Retention: Review / (Review + Relearning)
  const cardsAtRelearning = cards.filter((c) => c.state === 3).length
  const reviewPlusRelearning = cardsAtReview + cardsAtRelearning
  const retention = reviewPlusRelearning > 0 ? cardsAtReview / reviewPlusRelearning : 0

  // Sum all reps across ALL cards
  const totalReviews = cards.reduce((sum, c) => sum + c.reps, 0)

  // Check all criteria
  const shouldUnlock =
    cardsAtReview >= criteria.minCardsAtReviewState &&
    retention >= criteria.minAverageRetention &&
    totalReviews >= criteria.minTotalReviews

  return { shouldUnlock, nextMilestone, currentLevel }
}

// ============================================================
// applyMilestone
// ============================================================

export function applyMilestone(
  settings: UserSettings,
  milestone: Milestone,
): UserSettings {
  return { ...settings, ...milestone.settingsUnlock }
}
