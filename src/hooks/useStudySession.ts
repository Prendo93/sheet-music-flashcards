import { useReducer, useCallback, useRef } from 'preact/hooks'
import { autoGrade, gradeCard } from '../lib/scheduler.ts'
import type { CardRecord, ReviewLogRecord, UserSettings, SessionState } from '../types.ts'

// ---------------------------------------------------------------------------
// DbApi interface — injected for testability
// ---------------------------------------------------------------------------

export interface DbApi {
  getCard: (id: string) => Promise<CardRecord | undefined>
  putCard: (card: CardRecord) => Promise<void>
  getCardsDue: (before: Date) => Promise<CardRecord[]>
  getCardsByState: (state: 0 | 1 | 2 | 3) => Promise<CardRecord[]>
  addReviewLog: (log: ReviewLogRecord) => Promise<void>
}

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

type SessionAction =
  | { type: 'START_LOADING' }
  | { type: 'SESSION_LOADED'; queue: string[]; firstCard: CardRecord | null; cardStartTime: number }
  | { type: 'ANSWER_SUBMITTED'; answer: string; correct: boolean; rating: 1 | 2 | 3 | 4; previousCardState: CardRecord; updatedCard: CardRecord }
  | { type: 'NEXT_CARD'; nextQueue: string[]; card: CardRecord | null; cardStartTime: number }
  | { type: 'SESSION_COMPLETE' }
  | { type: 'UNDO'; restoredCard: CardRecord; wasCorrect: boolean; restoredQueue: string[] }

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: SessionState = {
  phase: 'idle',
  queue: [],
  currentCardId: null,
  currentCard: null,
  cardStartTime: null,
  lastAnswer: null,
  lastCorrect: null,
  lastRating: null,
  previousCardState: null,
  reviewed: 0,
  correct: 0,
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, phase: 'loading' }

    case 'SESSION_LOADED': {
      if (!action.firstCard) {
        return { ...initialState, phase: 'session_complete' }
      }
      return {
        ...initialState,
        phase: 'showing_card',
        queue: action.queue,
        currentCardId: action.firstCard.id,
        currentCard: action.firstCard,
        cardStartTime: action.cardStartTime,
      }
    }

    case 'ANSWER_SUBMITTED':
      return {
        ...state,
        phase: 'revealing',
        lastAnswer: action.answer,
        lastCorrect: action.correct,
        lastRating: action.rating,
        previousCardState: action.previousCardState,
        currentCard: action.updatedCard,
        reviewed: state.reviewed + 1,
        correct: action.correct ? state.correct + 1 : state.correct,
      }

    case 'NEXT_CARD': {
      if (!action.card) {
        return { ...state, phase: 'session_complete' }
      }
      return {
        ...state,
        phase: 'showing_card',
        queue: action.nextQueue,
        currentCardId: action.card.id,
        currentCard: action.card,
        cardStartTime: action.cardStartTime,
        lastAnswer: null,
        lastCorrect: null,
        lastRating: null,
        previousCardState: null,
      }
    }

    case 'SESSION_COMPLETE':
      return { ...state, phase: 'session_complete' }

    case 'UNDO':
      return {
        ...state,
        phase: 'showing_card',
        queue: action.restoredQueue,
        currentCardId: action.restoredCard.id,
        currentCard: action.restoredCard,
        cardStartTime: Date.now(),
        lastAnswer: null,
        lastCorrect: null,
        lastRating: null,
        previousCardState: null,
        reviewed: state.reviewed - 1,
        correct: action.wasCorrect ? state.correct - 1 : state.correct,
      }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStudySession(db: DbApi, settings: UserSettings) {
  const [state, dispatch] = useReducer(sessionReducer, initialState)

  // Keep a map of cardId -> CardRecord loaded at session start for sync lookups
  const cardMapRef = useRef<Map<string, CardRecord>>(new Map())

  const startSession = useCallback(async () => {
    dispatch({ type: 'START_LOADING' })

    const now = new Date()
    const dueCards = await db.getCardsDue(now)
    const newCards = await db.getCardsByState(0)

    // Merge due + new, deduplicate by id, limit to sessionSize
    const seen = new Set<string>()
    const allCards: CardRecord[] = []
    for (const card of [...dueCards, ...newCards]) {
      if (!seen.has(card.id)) {
        seen.add(card.id)
        allCards.push(card)
      }
    }
    const sessionCards = allCards.slice(0, settings.sessionSize)

    if (sessionCards.length === 0) {
      dispatch({ type: 'SESSION_LOADED', queue: [], firstCard: null, cardStartTime: 0 })
      return
    }

    // Populate the card map for sync lookups
    const map = new Map<string, CardRecord>()
    for (const card of sessionCards) {
      map.set(card.id, card)
    }
    cardMapRef.current = map

    const queue = sessionCards.map(c => c.id)
    const firstCard = sessionCards[0]

    dispatch({
      type: 'SESSION_LOADED',
      queue: queue.slice(1),
      firstCard,
      cardStartTime: Date.now(),
    })
  }, [db, settings.sessionSize])

  const submitAnswer = useCallback(async (answer: string) => {
    if (!state.currentCard || state.phase !== 'showing_card') return

    const card = state.currentCard
    const responseTimeMs = Date.now() - (state.cardStartTime ?? Date.now())

    const { rating, correct } = autoGrade(
      answer,
      card.note,
      responseTimeMs,
      settings.autoGradeThresholds,
    )

    const previousCardState = { ...card }
    const { updatedCard, reviewLog } = gradeCard(card, rating, responseTimeMs, correct)

    await db.putCard(updatedCard)
    await db.addReviewLog(reviewLog)

    dispatch({
      type: 'ANSWER_SUBMITTED',
      answer,
      correct,
      rating,
      previousCardState,
      updatedCard,
    })
  }, [state.currentCard, state.phase, state.cardStartTime, db, settings.autoGradeThresholds])

  const skip = useCallback(async () => {
    if (!state.currentCard || state.phase !== 'showing_card') return

    const card = state.currentCard
    const responseTimeMs = Date.now() - (state.cardStartTime ?? Date.now())

    const rating = 1 as const
    const correct = false

    const previousCardState = { ...card }
    const { updatedCard, reviewLog } = gradeCard(card, rating, responseTimeMs, correct)

    await db.putCard(updatedCard)
    await db.addReviewLog(reviewLog)

    dispatch({
      type: 'ANSWER_SUBMITTED',
      answer: '',
      correct,
      rating,
      previousCardState,
      updatedCard,
    })
  }, [state.currentCard, state.phase, state.cardStartTime, db])

  const undoLastGrade = useCallback(async () => {
    if (!state.previousCardState) return

    const wasCorrect = state.lastCorrect ?? false

    await db.putCard(state.previousCardState)

    dispatch({
      type: 'UNDO',
      restoredCard: state.previousCardState,
      wasCorrect,
      restoredQueue: state.queue,
    })
  }, [state.previousCardState, state.lastCorrect, state.queue, db])

  const nextCard = useCallback(() => {
    if (state.queue.length === 0) {
      dispatch({ type: 'SESSION_COMPLETE' })
      return
    }

    const nextId = state.queue[0]
    const remainingQueue = state.queue.slice(1)
    const card = cardMapRef.current.get(nextId) ?? null

    dispatch({
      type: 'NEXT_CARD',
      nextQueue: remainingQueue,
      card,
      cardStartTime: Date.now(),
    })
  }, [state.queue])

  return {
    state,
    startSession,
    submitAnswer,
    skip,
    undoLastGrade,
    nextCard,
  }
}
