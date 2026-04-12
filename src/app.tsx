import { useState, useEffect } from 'preact/hooks'
import { AppShell } from './components/AppShell.tsx'
import { StudySession } from './components/StudySession.tsx'
import { SettingsPage } from './components/SettingsPage.tsx'
import { TodayStats } from './components/TodayStats.tsx'
import { Onboarding } from './components/Onboarding.tsx'
import { useSettings } from './hooks/useSettings.ts'
import { generateCardIds } from './lib/music.ts'
import { createNewCard } from './lib/scheduler.ts'
import { computeTodayStats, computeStreak } from './lib/stats.ts'
import { ensureAudioContext } from './lib/synth.ts'
import {
  getCard,
  putCard,
  getCardsDue,
  getCardsByState,
  addReviewLog,
  putCards,
  getAllReviewLogs,
  requestPersistentStorage,
} from './lib/db.ts'
import type { DbApi } from './hooks/useStudySession.ts'
import type { TodayStats as TodayStatsType } from './lib/stats.ts'

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
  const [sessionKey, setSessionKey] = useState(0)
  const [todayStats, setTodayStats] = useState<TodayStatsType | null>(null)
  const { settings, updateSettings, loading } = useSettings()

  // Request persistent storage on startup
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  // Load today stats on mount and after each session key change
  useEffect(() => {
    async function loadStats() {
      const logs = await getAllReviewLogs()
      const { reviewedToday, accuracyToday } = computeTodayStats(logs)
      const streak = computeStreak(logs)
      setTodayStats({ reviewedToday, accuracyToday, streak })
    }
    loadStats()
  }, [sessionKey])

  // Ensure audio context on first user interaction
  useEffect(() => {
    function handleFirstInteraction() {
      try { ensureAudioContext() } catch { /* silent */ }
      document.removeEventListener('click', handleFirstInteraction)
    }
    document.addEventListener('click', handleFirstInteraction)
    return () => document.removeEventListener('click', handleFirstInteraction)
  }, [])

  // Theme management: apply 'dark' class to <html> based on settings.theme
  useEffect(() => {
    const root = document.documentElement
    if (!settings) return

    function applyTheme() {
      if (settings!.theme === 'dark' ||
          (settings!.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', applyTheme)
    return () => mq.removeEventListener('change', applyTheme)
  }, [settings?.theme])

  // Generate card pool when settings change
  useEffect(() => {
    if (!settings) return

    let cancelled = false

    async function syncCards() {
      const cardIds = generateCardIds({
        noteRange: settings!.noteRange,
        clefs: settings!.clefs,
        accidentals: settings!.accidentals,
      })

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

    return () => { cancelled = true }
  }, [settings?.noteRange.low, settings?.noteRange.high, settings?.clefs.treble, settings?.clefs.bass, settings?.accidentals.sharps, settings?.accidentals.flats])

  // Handle onboarding completion
  async function handleOnboardingComplete() {
    if (settings) {
      await updateSettings({ hasSeenOnboarding: true })
    }
  }

  if (loading || !settings) {
    return (
      <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
        <div class="flex items-center justify-center py-12">
          <p class="text-gray-500">Loading...</p>
        </div>
      </AppShell>
    )
  }

  // Show onboarding for new users
  if (!settings.hasSeenOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showNav={true}
    >
      {activeTab === 'study' && (
        <div class="flex flex-col gap-4">
          {todayStats && (
            <TodayStats
              reviewedToday={todayStats.reviewedToday}
              accuracyToday={todayStats.accuracyToday}
              streak={todayStats.streak}
            />
          )}
          {cardsReady ? (
            <StudySession
              key={sessionKey}
              db={db}
              settings={settings}
            />
          ) : (
            <div class="flex items-center justify-center py-12">
              <p class="text-gray-500">Preparing cards...</p>
            </div>
          )}
        </div>
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
