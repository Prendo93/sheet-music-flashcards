import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CardRecord, ReviewLogRecord, UserSettings } from '../../src/types.ts'
import { DEFAULT_SETTINGS } from '../../src/types.ts'
import {
  getDB,
  getCard,
  putCard,
  getAllCards,
  getCardsDue,
  getCardsByState,
  putCards,
  addReviewLog,
  getReviewLogsByCard,
  getReviewLogsSince,
  getSettings,
  putSettings,
  requestPersistentStorage,
  resetDB,
} from '../../src/lib/db.ts'

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
// Tests
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await resetDB()
})

// ---- getDB ---------------------------------------------------------------

describe('getDB', () => {
  it('creates the database and returns an IDBPDatabase', async () => {
    const db = await getDB()
    expect(db).toBeDefined()
    expect(db.name).toBe('sheet-music-flashcards')
  })

  it('returns the same instance on subsequent calls (singleton)', async () => {
    const db1 = await getDB()
    const db2 = await getDB()
    expect(db1).toBe(db2)
  })
})

// ---- Card CRUD -----------------------------------------------------------

describe('Card operations', () => {
  it('putCard + getCard round-trip', async () => {
    const card = makeCard()
    await putCard(card)
    const retrieved = await getCard('treble:C4')
    expect(retrieved).toBeDefined()
    expect(retrieved!.id).toBe('treble:C4')
    expect(retrieved!.note).toBe('C4')
    expect(retrieved!.clef).toBe('treble')
    expect(retrieved!.state).toBe(0)
  })

  it('getCard returns undefined for non-existent id', async () => {
    const result = await getCard('nonexistent')
    expect(result).toBeUndefined()
  })

  it('getAllCards returns all stored cards', async () => {
    await putCard(makeCard({ id: 'treble:C4', note: 'C4' }))
    await putCard(makeCard({ id: 'treble:D4', note: 'D4' }))
    await putCard(makeCard({ id: 'bass:E3', note: 'E3', clef: 'bass' }))

    const all = await getAllCards()
    expect(all).toHaveLength(3)
    const ids = all.map((c) => c.id).sort()
    expect(ids).toEqual(['bass:E3', 'treble:C4', 'treble:D4'])
  })

  it('getCardsDue returns only cards due on or before the given date', async () => {
    await putCard(makeCard({ id: 'a', due: new Date('2025-01-01') }))
    await putCard(makeCard({ id: 'b', due: new Date('2025-01-10') }))
    await putCard(makeCard({ id: 'c', due: new Date('2025-01-20') }))

    const due = await getCardsDue(new Date('2025-01-10'))
    const ids = due.map((c) => c.id).sort()
    expect(ids).toEqual(['a', 'b'])
  })

  it('getCardsDue returns empty array when no cards are due', async () => {
    await putCard(makeCard({ id: 'a', due: new Date('2025-06-01') }))
    const due = await getCardsDue(new Date('2025-01-01'))
    expect(due).toHaveLength(0)
  })

  it('getCardsByState filters correctly', async () => {
    await putCard(makeCard({ id: 'a', state: 0 }))
    await putCard(makeCard({ id: 'b', state: 1 }))
    await putCard(makeCard({ id: 'c', state: 0 }))
    await putCard(makeCard({ id: 'd', state: 2 }))

    const newCards = await getCardsByState(0)
    expect(newCards).toHaveLength(2)
    expect(newCards.map((c) => c.id).sort()).toEqual(['a', 'c'])

    const learning = await getCardsByState(1)
    expect(learning).toHaveLength(1)
    expect(learning[0].id).toBe('b')

    const review = await getCardsByState(2)
    expect(review).toHaveLength(1)
    expect(review[0].id).toBe('d')

    const relearning = await getCardsByState(3)
    expect(relearning).toHaveLength(0)
  })

  it('putCards batch stores multiple cards in a single transaction', async () => {
    const cards = [
      makeCard({ id: 'treble:C4' }),
      makeCard({ id: 'treble:D4', note: 'D4' }),
      makeCard({ id: 'treble:E4', note: 'E4' }),
    ]
    await putCards(cards)

    const all = await getAllCards()
    expect(all).toHaveLength(3)
  })

  it('putCards with empty array does not throw', async () => {
    await expect(putCards([])).resolves.not.toThrow()
    const all = await getAllCards()
    expect(all).toHaveLength(0)
  })
})

// ---- Review Log CRUD -----------------------------------------------------

describe('Review log operations', () => {
  it('addReviewLog + getReviewLogsByCard round-trip', async () => {
    const log1 = makeReviewLog({ id: 'log-1', cardId: 'treble:C4' })
    const log2 = makeReviewLog({ id: 'log-2', cardId: 'treble:C4', rating: 1, correct: false })
    const log3 = makeReviewLog({ id: 'log-3', cardId: 'treble:D4' })

    await addReviewLog(log1)
    await addReviewLog(log2)
    await addReviewLog(log3)

    const logsC4 = await getReviewLogsByCard('treble:C4')
    expect(logsC4).toHaveLength(2)
    expect(logsC4.map((l) => l.id).sort()).toEqual(['log-1', 'log-2'])

    const logsD4 = await getReviewLogsByCard('treble:D4')
    expect(logsD4).toHaveLength(1)
    expect(logsD4[0].id).toBe('log-3')
  })

  it('getReviewLogsByCard returns empty array for unknown card', async () => {
    const logs = await getReviewLogsByCard('nonexistent')
    expect(logs).toEqual([])
  })

  it('getReviewLogsSince filters by date', async () => {
    await addReviewLog(makeReviewLog({ id: 'log-1', reviewed_at: new Date('2025-01-10') }))
    await addReviewLog(makeReviewLog({ id: 'log-2', reviewed_at: new Date('2025-01-15') }))
    await addReviewLog(makeReviewLog({ id: 'log-3', reviewed_at: new Date('2025-01-20') }))

    const recent = await getReviewLogsSince(new Date('2025-01-15'))
    const ids = recent.map((l) => l.id).sort()
    expect(ids).toEqual(['log-2', 'log-3'])
  })

  it('getReviewLogsSince returns empty array when none match', async () => {
    await addReviewLog(makeReviewLog({ id: 'log-1', reviewed_at: new Date('2025-01-01') }))
    const recent = await getReviewLogsSince(new Date('2025-06-01'))
    expect(recent).toHaveLength(0)
  })
})

// ---- Settings CRUD -------------------------------------------------------

describe('Settings', () => {
  it('getSettings returns DEFAULT_SETTINGS when store is empty', async () => {
    const settings = await getSettings()
    expect(settings.id).toBe('user_settings')
    expect(settings.newCardsPerDay).toBe(DEFAULT_SETTINGS.newCardsPerDay)
    expect(settings.sessionSize).toBe(DEFAULT_SETTINGS.sessionSize)
    expect(settings.clefs).toEqual(DEFAULT_SETTINGS.clefs)
    expect(settings.hasSeenOnboarding).toBe(false)
  })

  it('putSettings + getSettings round-trip', async () => {
    const customSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      newCardsPerDay: 25,
      sessionSize: 50,
      hasSeenOnboarding: true,
      updated_at: new Date('2025-02-01'),
    }
    await putSettings(customSettings)

    const retrieved = await getSettings()
    expect(retrieved.newCardsPerDay).toBe(25)
    expect(retrieved.sessionSize).toBe(50)
    expect(retrieved.hasSeenOnboarding).toBe(true)
  })

  it('putSettings overwrites existing settings', async () => {
    await putSettings({ ...DEFAULT_SETTINGS, newCardsPerDay: 5, updated_at: new Date() })
    await putSettings({ ...DEFAULT_SETTINGS, newCardsPerDay: 30, updated_at: new Date() })

    const settings = await getSettings()
    expect(settings.newCardsPerDay).toBe(30)
  })
})

// ---- requestPersistentStorage --------------------------------------------

describe('requestPersistentStorage', () => {
  it('does not throw when navigator.storage API is unavailable', async () => {
    const result = await requestPersistentStorage()
    expect(typeof result).toBe('boolean')
  })

  it('returns true when persist() resolves true', async () => {
    const original = navigator.storage?.persist
    Object.defineProperty(navigator, 'storage', {
      value: { persist: vi.fn().mockResolvedValue(true) },
      writable: true,
      configurable: true,
    })

    const result = await requestPersistentStorage()
    expect(result).toBe(true)

    if (original) {
      Object.defineProperty(navigator, 'storage', {
        value: { persist: original },
        writable: true,
        configurable: true,
      })
    }
  })
})

// ---- resetDB -------------------------------------------------------------

describe('resetDB', () => {
  it('clears all data', async () => {
    await putCard(makeCard({ id: 'treble:C4' }))
    await addReviewLog(makeReviewLog())
    await putSettings({ ...DEFAULT_SETTINGS, updated_at: new Date() })

    expect(await getAllCards()).toHaveLength(1)

    await resetDB()

    expect(await getAllCards()).toHaveLength(0)
    const settings = await getSettings()
    expect(settings).toEqual(expect.objectContaining({ id: 'user_settings' }))
  })

  it('subsequent getDB creates a fresh database', async () => {
    const db1 = await getDB()
    await resetDB()
    const db2 = await getDB()
    expect(db2).not.toBe(db1)
    expect(db2.name).toBe('sheet-music-flashcards')
  })
})
