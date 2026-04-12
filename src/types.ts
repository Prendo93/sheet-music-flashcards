// ============================================================
// Card Record — stored in IndexedDB 'cards' store
// ============================================================

export interface CardRecord {
  /** Deterministic ID: `${clef}:${note}` e.g. "treble:C#5" */
  id: string
  /** Note name in scientific pitch notation e.g. "C#5", "Bb3", "F4" */
  note: string
  /** Which clef the card is displayed on */
  clef: Clef

  // FSRS scheduling state (mirrors ts-fsrs Card)
  due: Date
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  /** 0=New, 1=Learning, 2=Review, 3=Relearning */
  state: 0 | 1 | 2 | 3
  last_review?: Date

  created_at: Date
  schema_version: 1
}

// ============================================================
// Review Log — stored in IndexedDB 'reviewLogs' store
// ============================================================

export interface ReviewLogRecord {
  id: string
  cardId: string
  /** 1=Again, 2=Hard, 3=Good, 4=Easy */
  rating: 1 | 2 | 3 | 4
  /** Card state at time of review */
  state: 0 | 1 | 2 | 3
  elapsed_days: number
  scheduled_days: number
  reviewed_at: Date
  /** Milliseconds from card shown to answer submitted */
  response_time_ms: number
  /** Whether the user's answer was correct */
  correct: boolean
  schema_version: 1
}

// ============================================================
// User Settings — stored in IndexedDB 'settings' store (singleton)
// ============================================================

export interface UserSettings {
  id: 'user_settings'
  noteRange: { low: string; high: string }
  clefs: { treble: boolean; bass: boolean }
  accidentals: { sharps: boolean; flats: boolean }
  keySignatures: string[]
  newCardsPerDay: number
  sessionSize: number
  autoGradeThresholds: {
    /** Correct under this ms → Easy (rating 4) */
    easyMs: number
    /** Correct under this ms → Good (rating 3); above → Hard (rating 2) */
    goodMs: number
  }
  theme: 'system' | 'light' | 'dark'
  hasSeenOnboarding: boolean
  autoProgression: boolean
  progressionLevel: number
  keySignatures: string[]
  schema_version: 1
  updated_at: Date
}

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'user_settings',
  noteRange: { low: 'E4', high: 'F5' },
  clefs: { treble: true, bass: false },
  accidentals: { sharps: false, flats: false },
  keySignatures: ['C'],
  newCardsPerDay: 10,
  sessionSize: 20,
  autoGradeThresholds: { easyMs: 2000, goodMs: 5000 },
  theme: 'system',
  hasSeenOnboarding: false,
  autoProgression: true,
  progressionLevel: 0,
  keySignatures: ['C'],
  schema_version: 1,
  updated_at: new Date(),
}

// ============================================================
// Music domain types
// ============================================================

export type Clef = 'treble' | 'bass'

export type Accidental = '#' | 'b' | null

export interface ParsedNote {
  letter: string
  accidental: Accidental
  octave: number
}

// ============================================================
// Study session state
// ============================================================

export type SessionPhase =
  | 'idle'
  | 'loading'
  | 'showing_card'
  | 'awaiting_input'
  | 'revealing'
  | 'session_complete'

export interface SessionState {
  phase: SessionPhase
  queue: string[]
  currentCardId: string | null
  currentCard: CardRecord | null
  cardStartTime: number | null
  lastAnswer: string | null
  lastCorrect: boolean | null
  lastRating: 1 | 2 | 3 | 4 | null
  /** For undo: the card state before grading */
  previousCardState: CardRecord | null
  reviewed: number
  correct: number
}
