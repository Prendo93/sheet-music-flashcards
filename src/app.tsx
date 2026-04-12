import { useState, useEffect, useCallback } from 'preact/hooks'
import { AppShell } from './components/AppShell.tsx'
import { StudySession } from './components/StudySession.tsx'
import { SettingsPage } from './components/SettingsPage.tsx'
import { useSettings } from './hooks/useSettings.ts'
import { generateCardIds } from './lib/music.ts'
import { createNewCard } from './lib/scheduler.ts'
import {
  getCard,
  putCard,
  getCardsDue,
  getCardsByState,
  addReviewLog,
  putCards,
  requestPersistentStorage,
} from './lib/db.ts'
import type { DbApi } from './hooks/useStudySession.ts'

const db: DbApi = {
  getCard,
  putCard,
  getCardsDue,
  getCardsByState,
  addReviewLog,
}

type Tab = 'study' | 'settings'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('study')
  const [sessionActive, setSessionActive] = useState(false)
  const { settings, updateSettings, loading } = useSettings()

  // Request persistent storage on startup
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  // Generate card pool when settings change
  useEffect(() => {
    if (!settings) return

    async function syncCards() {
      const cardIds = generateCardIds({
        noteRange: settings!.noteRange,
        clefs: settings!.clefs,
        accidentals: settings!.accidentals,
      })

      // Create new cards for IDs that don't exist yet
      const newCards = []
      for (const id of cardIds) {
        const existing = await getCard(id)
        if (!existing) {
          const [clef, note] = id.split(':') as ['treble' | 'bass', string]
          newCards.push(createNewCard(id, note, clef))
        }
      }

      if (newCards.length > 0) {
        await putCards(newCards)
      }
    }

    syncCards()
  }, [settings?.noteRange.low, settings?.noteRange.high, settings?.clefs.treble, settings?.clefs.bass, settings?.accidentals.sharps, settings?.accidentals.flats])

  const handleSessionActive = useCallback((active: boolean) => {
    setSessionActive(active)
  }, [])

  if (loading || !settings) {
    return (
      <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
        <div class="flex items-center justify-center py-12">
          <p class="text-gray-500">Loading...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showNav={!sessionActive}
    >
      {activeTab === 'study' && (
        <StudySession
          db={db}
          settings={settings}
          onSessionActive={handleSessionActive}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsPage
          settings={settings}
          onUpdate={updateSettings}
        />
      )}
    </AppShell>
  )
}
