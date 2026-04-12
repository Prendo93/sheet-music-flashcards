import { useState, useEffect } from 'preact/hooks'
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
  const [cardsReady, setCardsReady] = useState(false)
  // Incremented when settings change to force StudySession re-mount
  const [sessionKey, setSessionKey] = useState(0)
  const { settings, updateSettings, loading } = useSettings()

  // Request persistent storage on startup
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  // Generate card pool when settings change — block rendering until done
  useEffect(() => {
    if (!settings) return

    let cancelled = false

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

      if (!cancelled) {
        setCardsReady(true)
        setSessionKey((k) => k + 1)
      }
    }

    setCardsReady(false)
    syncCards()

    return () => {
      cancelled = true
    }
  }, [settings?.noteRange.low, settings?.noteRange.high, settings?.clefs.treble, settings?.clefs.bass, settings?.accidentals.sharps, settings?.accidentals.flats])

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
      showNav={true}
    >
      {activeTab === 'study' && (
        cardsReady ? (
          <StudySession
            key={sessionKey}
            db={db}
            settings={settings}
          />
        ) : (
          <div class="flex items-center justify-center py-12">
            <p class="text-gray-500">Preparing cards...</p>
          </div>
        )
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
