import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/preact'
import { resetDB, putSettings } from '../../src/lib/db.ts'
import { DEFAULT_SETTINGS } from '../../src/types.ts'
import type { UserSettings } from '../../src/types.ts'
import { useSettings } from '../../src/hooks/useSettings.ts'

describe('useSettings', () => {
  beforeEach(async () => {
    await resetDB()
  })

  it('returns loading=true initially, then false after load', async () => {
    const { result } = renderHook(() => useSettings())

    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.settings).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.settings).not.toBeNull()
  })

  it('returns DEFAULT_SETTINGS when DB is empty', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const settings = result.current.settings!
    expect(settings.noteRange).toEqual({ low: 'E4', high: 'F5' })
    expect(settings.clefs).toEqual({ treble: true, bass: false })
    expect(settings.accidentals).toEqual({ sharps: false, flats: false })
    expect(settings.newCardsPerDay).toBe(10)
    expect(settings.sessionSize).toBe(20)
    expect(settings.id).toBe('user_settings')
  })

  it('loads existing settings from DB', async () => {
    const existing: UserSettings = {
      ...DEFAULT_SETTINGS,
      clefs: { treble: true, bass: true },
      newCardsPerDay: 25,
      updated_at: new Date('2025-06-01'),
    }
    await putSettings(existing)

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.settings!.clefs).toEqual({ treble: true, bass: true })
    expect(result.current.settings!.newCardsPerDay).toBe(25)
  })

  it('updateSettings merges partial and persists to DB', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.updateSettings({ clefs: { treble: true, bass: true } })
    })

    // Local state updated
    expect(result.current.settings!.clefs).toEqual({ treble: true, bass: true })
    // Other fields preserved
    expect(result.current.settings!.noteRange).toEqual({ low: 'E4', high: 'F5' })
    expect(result.current.settings!.sessionSize).toBe(20)
  })

  it('updateSettings sets updated_at to current time', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const before = new Date()

    await act(async () => {
      await result.current.updateSettings({ newCardsPerDay: 15 })
    })

    const after = new Date()
    const updatedAt = result.current.settings!.updated_at

    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('multiple updates accumulate correctly', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.updateSettings({ clefs: { treble: true, bass: true } })
    })

    await act(async () => {
      await result.current.updateSettings({ accidentals: { sharps: true, flats: false } })
    })

    await act(async () => {
      await result.current.updateSettings({ newCardsPerDay: 30 })
    })

    const settings = result.current.settings!
    expect(settings.clefs).toEqual({ treble: true, bass: true })
    expect(settings.accidentals).toEqual({ sharps: true, flats: false })
    expect(settings.newCardsPerDay).toBe(30)
    // Original defaults still intact
    expect(settings.sessionSize).toBe(20)
    expect(settings.noteRange).toEqual({ low: 'E4', high: 'F5' })
  })

  it('updateSettings persists changes to IndexedDB', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.updateSettings({ sessionSize: 50 })
    })

    // Re-render a new hook instance to verify it reads the persisted value
    const { result: result2 } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result2.current.loading).toBe(false)
    })

    expect(result2.current.settings!.sessionSize).toBe(50)
  })
})
