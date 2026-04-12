import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CardRecord, ReviewLogRecord, UserSettings } from '../../src/types.ts'
import { DEFAULT_SETTINGS } from '../../src/types.ts'
import { putCard, putSettings, addReviewLog, resetDB } from '../../src/lib/db.ts'
import { buildExportData, downloadExportData } from '../../src/lib/export.ts'
import type { ExportData } from '../../src/lib/export.ts'

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

describe('buildExportData', () => {
  it('returns correct structure with version: 1', async () => {
    const data = await buildExportData()
    expect(data.version).toBe(1)
    expect(data).toHaveProperty('exportedAt')
    expect(data).toHaveProperty('settings')
    expect(data).toHaveProperty('cards')
    expect(data).toHaveProperty('reviewLogs')
  })

  it('includes all cards from DB', async () => {
    await putCard(makeCard({ id: 'treble:C4', note: 'C4' }))
    await putCard(makeCard({ id: 'treble:D4', note: 'D4' }))
    await putCard(makeCard({ id: 'bass:E3', note: 'E3', clef: 'bass' }))

    const data = await buildExportData()
    expect(data.cards).toHaveLength(3)
    const ids = data.cards.map((c) => c.id).sort()
    expect(ids).toEqual(['bass:E3', 'treble:C4', 'treble:D4'])
  })

  it('includes settings', async () => {
    const customSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      newCardsPerDay: 25,
      sessionSize: 50,
      updated_at: new Date('2025-02-01'),
    }
    await putSettings(customSettings)

    const data = await buildExportData()
    expect(data.settings.newCardsPerDay).toBe(25)
    expect(data.settings.sessionSize).toBe(50)
  })

  it('includes exportedAt as ISO string', async () => {
    const before = new Date().toISOString()
    const data = await buildExportData()
    const after = new Date().toISOString()

    expect(data.exportedAt).toBeDefined()
    // Verify it's a valid ISO string
    expect(() => new Date(data.exportedAt)).not.toThrow()
    expect(data.exportedAt >= before).toBe(true)
    expect(data.exportedAt <= after).toBe(true)
  })

  it('with empty DB returns empty arrays and default settings', async () => {
    const data = await buildExportData()
    expect(data.cards).toEqual([])
    expect(data.reviewLogs).toEqual([])
    expect(data.settings.id).toBe('user_settings')
    expect(data.settings.newCardsPerDay).toBe(DEFAULT_SETTINGS.newCardsPerDay)
  })

  it('includes review logs', async () => {
    await addReviewLog(makeReviewLog({ id: 'log-1', cardId: 'treble:C4' }))
    await addReviewLog(makeReviewLog({ id: 'log-2', cardId: 'treble:D4' }))

    const data = await buildExportData()
    expect(data.reviewLogs).toHaveLength(2)
    const ids = data.reviewLogs.map((l) => l.id).sort()
    expect(ids).toEqual(['log-1', 'log-2'])
  })
})

describe('downloadExportData', () => {
  it('creates correct filename format', () => {
    const mockElement = { href: '', download: '', click: vi.fn() } as any
    vi.spyOn(document, 'createElement').mockReturnValue(mockElement)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const data: ExportData = {
      version: 1,
      exportedAt: '2025-06-15T12:00:00.000Z',
      settings: DEFAULT_SETTINGS,
      cards: [],
      reviewLogs: [],
    }

    downloadExportData(data)

    expect(mockElement.download).toBe('flashcards-backup-2025-06-15.json')
    expect(mockElement.click).toHaveBeenCalledOnce()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()

    vi.restoreAllMocks()
  })
})
