import { useState, useEffect } from 'preact/hooks'
import { getAllCards, getAllReviewLogs } from '../lib/db.ts'
import {
  computeTodayStats,
  computeStreak,
  computeCardDistribution,
  computeConfusedNotes,
  computeWeeklyHistory,
} from '../lib/stats.ts'
import type { CardStateDistribution, ConfusedNote, DailyReviewCount } from '../lib/stats.ts'

export interface StatsData {
  todayStats: { reviewedToday: number; accuracyToday: number; streak: number }
  cardDistribution: CardStateDistribution
  confusedNotes: ConfusedNote[]
  weeklyHistory: DailyReviewCount[]
}

export function useStats(): { stats: StatsData | null; loading: boolean } {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [cards, logs] = await Promise.all([getAllCards(), getAllReviewLogs()])

      if (cancelled) return

      const now = new Date()
      const { reviewedToday, accuracyToday } = computeTodayStats(logs, now)
      const streak = computeStreak(logs, now)
      const cardDistribution = computeCardDistribution(cards)
      const confusedNotes = computeConfusedNotes(logs)
      const weeklyHistory = computeWeeklyHistory(logs, now)

      setStats({
        todayStats: { reviewedToday, accuracyToday, streak },
        cardDistribution,
        confusedNotes,
        weeklyHistory,
      })
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return { stats, loading }
}
