import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/preact'
import { useStudySession } from '../../src/hooks/useStudySession.ts'
import type { CardRecord, UserSettings } from '../../src/types.ts'
import { DEFAULT_SETTINGS } from '../../src/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  const now = new Date()
  return {
    id: 'treble:C4',
    note: 'C4',
    clef: 'treble',
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    created_at: now,
    schema_version: 1,
    ...overrides,
  }
}

function createMockDb(cards: CardRecord[] = []) {
  const storedCards = new Map<string, CardRecord>()
  for (const c of cards) {
    storedCards.set(c.id, { ...c })
  }
  const reviewLogs: unknown[] = []

  return {
    getCard: vi.fn(async (id: string) => storedCards.get(id)),
    putCard: vi.fn(async (card: CardRecord) => { storedCards.set(card.id, card) }),
    getCardsDue: vi.fn(async () => cards.filter(c => c.state !== 0)),
    getCardsByState: vi.fn(async () => cards.filter(c => c.state === 0)),
    addReviewLog: vi.fn(async (log: unknown) => { reviewLogs.push(log) }),
    _storedCards: storedCards,
    _reviewLogs: reviewLogs,
  }
}

const settings: UserSettings = { ...DEFAULT_SETTINGS }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useStudySession', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('initial state is idle', () => {
    const db = createMockDb()
    const { result } = renderHook(() => useStudySession(db, settings))

    expect(result.current.state.phase).toBe('idle')
    expect(result.current.state.queue).toEqual([])
    expect(result.current.state.currentCardId).toBeNull()
    expect(result.current.state.currentCard).toBeNull()
    expect(result.current.state.reviewed).toBe(0)
    expect(result.current.state.correct).toBe(0)
  })

  it('startSession transitions to showing_card with first card loaded', async () => {
    const card1 = makeCard({ id: 'treble:C4', note: 'C4' })
    const card2 = makeCard({ id: 'treble:D4', note: 'D4' })
    const db = createMockDb([card1, card2])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.state.phase).toBe('showing_card')
    expect(result.current.state.currentCard).not.toBeNull()
    expect(result.current.state.cardStartTime).not.toBeNull()
    expect(result.current.state.queue.length).toBeGreaterThan(0)
  })

  it('shuffles the session queue (does not preserve insertion order)', async () => {
    // Use enough cards that the chance of accidentally getting insertion order is negligible
    const cards = Array.from({ length: 20 }, (_, i) =>
      makeCard({ id: `treble:N${i}`, note: `N${i}` })
    )
    const db = createMockDb(cards)

    // Run startSession multiple times and check that order varies
    const orders: string[][] = []
    for (let trial = 0; trial < 5; trial++) {
      const { result } = renderHook(() => useStudySession(db, { ...settings, sessionSize: 20 }))
      await act(async () => {
        await result.current.startSession()
      })
      const order = [result.current.state.currentCardId!, ...result.current.state.queue]
      orders.push(order)
    }

    // At least 2 of the 5 orders should differ from each other
    const uniqueOrders = new Set(orders.map(o => o.join(',')))
    expect(uniqueOrders.size).toBeGreaterThan(1)
  })

  it('startSession with empty queue goes to session_complete', async () => {
    const db = createMockDb([])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.state.phase).toBe('session_complete')
  })

  it('submitAnswer with correct answer sets lastCorrect=true', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.submitAnswer('C4')
    })

    expect(result.current.state.lastCorrect).toBe(true)
    expect(result.current.state.lastAnswer).toBe('C4')
  })

  it('submitAnswer with incorrect answer sets lastCorrect=false and lastRating=1', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.submitAnswer('D4')
    })

    expect(result.current.state.lastCorrect).toBe(false)
    expect(result.current.state.lastRating).toBe(1)
  })

  it('submitAnswer transitions to revealing phase', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.submitAnswer('C4')
    })

    expect(result.current.state.phase).toBe('revealing')
  })

  it('submitAnswer writes updated card and review log to DB', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.submitAnswer('C4')
    })

    expect(db.putCard).toHaveBeenCalled()
    expect(db.addReviewLog).toHaveBeenCalled()
  })

  it('skip sets lastCorrect=false and rating=1', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.skip()
    })

    expect(result.current.state.lastCorrect).toBe(false)
    expect(result.current.state.lastRating).toBe(1)
    expect(result.current.state.phase).toBe('revealing')
  })

  it('nextCard advances to next card in queue', async () => {
    const card1 = makeCard({ id: 'treble:C4', note: 'C4' })
    const card2 = makeCard({ id: 'treble:D4', note: 'D4' })
    const db = createMockDb([card1, card2])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    const firstCardId = result.current.state.currentCardId

    await act(async () => {
      await result.current.submitAnswer(result.current.state.currentCard!.note)
    })

    act(() => {
      result.current.nextCard()
    })

    expect(result.current.state.phase).toBe('showing_card')
    expect(result.current.state.currentCardId).not.toBe(firstCardId)
  })

  it('nextCard on last card transitions to session_complete', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.submitAnswer('C4')
    })

    act(() => {
      result.current.nextCard()
    })

    expect(result.current.state.phase).toBe('session_complete')
  })

  it('undoLastGrade restores previous card state and re-shows card', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.submitAnswer('C4')
    })

    expect(result.current.state.phase).toBe('revealing')
    expect(result.current.state.reviewed).toBe(1)

    await act(async () => {
      await result.current.undoLastGrade()
    })

    expect(result.current.state.phase).toBe('showing_card')
    expect(result.current.state.reviewed).toBe(0)
    // DB should have been called to restore the card
    expect(db.putCard).toHaveBeenCalledTimes(2) // once for grade, once for undo
  })

  it('reviewed/correct counters increment correctly', async () => {
    const card1 = makeCard({ id: 'treble:C4', note: 'C4' })
    const card2 = makeCard({ id: 'treble:D4', note: 'D4' })
    const db = createMockDb([card1, card2])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    // Answer first card correctly
    await act(async () => {
      await result.current.submitAnswer(result.current.state.currentCard!.note)
    })

    expect(result.current.state.reviewed).toBe(1)
    expect(result.current.state.correct).toBe(1)

    act(() => {
      result.current.nextCard()
    })

    // Answer second card incorrectly
    await act(async () => {
      await result.current.submitAnswer('WRONG')
    })

    expect(result.current.state.reviewed).toBe(2)
    expect(result.current.state.correct).toBe(1)
  })

  it('submitAnswer saves previousCardState for undo', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.state.previousCardState).toBeNull()

    await act(async () => {
      await result.current.submitAnswer('C4')
    })

    expect(result.current.state.previousCardState).not.toBeNull()
    expect(result.current.state.previousCardState!.id).toBe('treble:C4')
  })

  it('undoLastGrade decrements correct counter when last answer was correct', async () => {
    const card = makeCard({ id: 'treble:C4', note: 'C4' })
    const db = createMockDb([card])

    const { result } = renderHook(() => useStudySession(db, settings))

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.submitAnswer('C4')
    })

    expect(result.current.state.correct).toBe(1)

    await act(async () => {
      await result.current.undoLastGrade()
    })

    expect(result.current.state.correct).toBe(0)
  })
})
