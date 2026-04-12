import { useState, useEffect, useCallback } from 'preact/hooks'
import type { UserSettings } from '../types.ts'
import { getSettings, putSettings } from '../lib/db.ts'

export function useSettings(): {
  settings: UserSettings | null
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>
  loading: boolean
} {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const s = await getSettings()
      if (!cancelled) {
        setSettings(s)
        setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const updateSettings = useCallback(
    async (partial: Partial<UserSettings>) => {
      const prev = settings
      if (!prev) return
      const merged: UserSettings = {
        ...prev,
        ...partial,
        updated_at: new Date(),
      }
      setSettings(merged)
      await putSettings(merged)
    },
    [settings],
  )

  return { settings, updateSettings, loading }
}
