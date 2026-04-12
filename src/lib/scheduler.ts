import { FSRS, createEmptyCard, Rating, State } from 'ts-fsrs'
import type { Card, Grade, RecordLogItem } from 'ts-fsrs'
import type { CardRecord, ReviewLogRecord } from '../types.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutoGradeResult {
  rating: 1 | 2 | 3 | 4
  correct: boolean
}

export interface GradeResult {
  updatedCard: CardRecord
  reviewLog: ReviewLogRecord
}

export interface SchedulingPreview {
  [rating: number]: { interval: string }
}

// ---------------------------------------------------------------------------
// 1. Create FSRS instance
// ---------------------------------------------------------------------------

let _fsrs: FSRS | null = null

export function createScheduler(): FSRS {
  if (!_fsrs) {
    _fsrs = new FSRS({})
  }
  return _fsrs
}

// ---------------------------------------------------------------------------
// 2. Create a new card record
// ---------------------------------------------------------------------------

export function createNewCard(
  id: string,
  note: string,
  clef: 'treble' | 'bass',
): CardRecord {
  const now = new Date()
  const fsrsCard: Card = createEmptyCard(now)

  return {
    id,
    note,
    clef,
    due: fsrsCard.due,
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsed_days: fsrsCard.elapsed_days,
    scheduled_days: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state as 0 | 1 | 2 | 3,
    last_review: fsrsCard.last_review,
    created_at: now,
    schema_version: 1,
  }
}

// ---------------------------------------------------------------------------
// 3. Auto-grading logic
// ---------------------------------------------------------------------------

export function autoGrade(
  userAnswer: string,
  correctAnswer: string,
  responseTimeMs: number,
  thresholds: { easyMs: number; goodMs: number },
): AutoGradeResult {
  const isCorrect =
    userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()

  if (!isCorrect) {
    return { rating: 1, correct: false }
  }

  if (responseTimeMs < thresholds.easyMs) {
    return { rating: 4, correct: true }
  }
  if (responseTimeMs < thresholds.goodMs) {
    return { rating: 3, correct: true }
  }
  return { rating: 2, correct: true }
}

// ---------------------------------------------------------------------------
// 4. Grade a card
// ---------------------------------------------------------------------------

export function gradeCard(
  card: CardRecord,
  rating: 1 | 2 | 3 | 4,
  responseTimeMs: number,
  correct: boolean,
): GradeResult {
  const fsrs = createScheduler()
  const now = new Date()

  // Build the ts-fsrs Card from our CardRecord
  const fsrsCard: Card = {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.last_review,
  }

  const result: RecordLogItem = fsrs.next(fsrsCard, now, rating as Grade)
  const nextCard = result.card
  const log = result.log

  const updatedCard: CardRecord = {
    id: card.id,
    note: card.note,
    clef: card.clef,
    due: nextCard.due,
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    elapsed_days: nextCard.elapsed_days,
    scheduled_days: nextCard.scheduled_days,
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    state: nextCard.state as 0 | 1 | 2 | 3,
    last_review: nextCard.last_review,
    created_at: card.created_at,
    schema_version: 1,
  }

  const reviewLog: ReviewLogRecord = {
    id: crypto.randomUUID(),
    cardId: card.id,
    rating: rating,
    state: card.state,
    elapsed_days: log.elapsed_days,
    scheduled_days: log.scheduled_days,
    reviewed_at: now,
    response_time_ms: responseTimeMs,
    correct,
    schema_version: 1,
  }

  return { updatedCard, reviewLog }
}

// ---------------------------------------------------------------------------
// 5. Get scheduling preview
// ---------------------------------------------------------------------------

export function getSchedulingPreview(card: CardRecord): SchedulingPreview {
  const fsrs = createScheduler()
  const now = new Date()

  const fsrsCard: Card = {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.last_review,
  }

  const preview: SchedulingPreview = {}

  for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    const result: RecordLogItem = fsrs.next(fsrsCard, now, rating)
    const dueMs = result.card.due.getTime() - now.getTime()
    preview[rating] = { interval: formatInterval(Math.max(0, dueMs)) }
  }

  return preview
}

// ---------------------------------------------------------------------------
// 6. Format interval helper
// ---------------------------------------------------------------------------

export function formatInterval(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) {
    return '<1m'
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h`
  }

  const days = Math.floor(hours / 24)
  return `${days}d`
}
