import type { CardRecord, ReviewLogRecord } from '../types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Date set to midnight of the same calendar day (local time). */
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Format a Date to "YYYY-MM-DD" using local time. */
function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ---------------------------------------------------------------------------
// Today stats (compact widget)
// ---------------------------------------------------------------------------

export interface TodayStats {
  reviewedToday: number
  accuracyToday: number // 0-100
  streak: number
}

export function computeTodayStats(logs: ReviewLogRecord[], now?: Date): { reviewedToday: number; accuracyToday: number } {
  const today = startOfDay(now ?? new Date())
  const todayLogs = logs.filter((l) => l.reviewed_at >= today)
  const reviewedToday = todayLogs.length
  const correctToday = todayLogs.filter((l) => l.correct).length
  const accuracyToday = reviewedToday > 0 ? Math.round((correctToday / reviewedToday) * 100) : 0
  return { reviewedToday, accuracyToday }
}

export function computeStreak(logs: ReviewLogRecord[], now?: Date): number {
  const today = startOfDay(now ?? new Date())

  // Build a set of unique review dates (as local date strings)
  const reviewDates = new Set<string>()
  for (const log of logs) {
    reviewDates.add(formatDateLocal(startOfDay(log.reviewed_at)))
  }

  const todayStr = formatDateLocal(today)

  // Streak starts from today (or yesterday if no reviews today)
  let streak = 0
  let d = new Date(today)

  if (!reviewDates.has(todayStr)) {
    // Check yesterday
    d.setDate(d.getDate() - 1)
    if (!reviewDates.has(formatDateLocal(d))) {
      return 0
    }
  }

  while (reviewDates.has(formatDateLocal(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}

// ---------------------------------------------------------------------------
// Card state distribution
// ---------------------------------------------------------------------------

export interface CardStateDistribution {
  new: number
  learning: number
  review: number
  relearning: number
  total: number
  masteryPercent: number // review / total * 100
}

export function computeCardDistribution(cards: CardRecord[]): CardStateDistribution {
  let newCount = 0
  let learning = 0
  let review = 0
  let relearning = 0

  for (const card of cards) {
    switch (card.state) {
      case 0:
        newCount++
        break
      case 1:
        learning++
        break
      case 2:
        review++
        break
      case 3:
        relearning++
        break
    }
  }

  const total = cards.length
  const masteryPercent = total > 0 ? Math.round((review / total) * 100) : 0

  return {
    new: newCount,
    learning,
    review,
    relearning,
    total,
    masteryPercent,
  }
}

// ---------------------------------------------------------------------------
// Most confused notes
// ---------------------------------------------------------------------------

export interface ConfusedNote {
  note: string
  cardId: string
  totalReviews: number
  correctReviews: number
  accuracy: number // 0-100
}

export function computeConfusedNotes(logs: ReviewLogRecord[], topN: number = 5): ConfusedNote[] {
  if (logs.length === 0) return []

  // Group logs by cardId
  const byCard = new Map<string, { total: number; correct: number }>()
  for (const log of logs) {
    const entry = byCard.get(log.cardId) ?? { total: 0, correct: 0 }
    entry.total++
    if (log.correct) entry.correct++
    byCard.set(log.cardId, entry)
  }

  // Filter cards with at least 3 reviews, compute accuracy, sort ascending
  const results: ConfusedNote[] = []
  for (const [cardId, { total, correct }] of byCard) {
    if (total < 3) continue

    // Extract note name from cardId (format: "treble:C4" -> "C4")
    const note = cardId.split(':').pop() ?? cardId

    results.push({
      note,
      cardId,
      totalReviews: total,
      correctReviews: correct,
      accuracy: Math.round((correct / total) * 10000) / 100,
    })
  }

  // Sort by worst accuracy first
  results.sort((a, b) => a.accuracy - b.accuracy)

  return results.slice(0, topN)
}

// ---------------------------------------------------------------------------
// Weekly review history (last 7 days)
// ---------------------------------------------------------------------------

export interface DailyReviewCount {
  date: string // ISO date string "2026-04-13"
  reviewCount: number
  correctCount: number
}

export function computeWeeklyHistory(logs: ReviewLogRecord[], now?: Date): DailyReviewCount[] {
  const today = startOfDay(now ?? new Date())

  // Build 7-day array from (today - 6 days) through today
  const days: DailyReviewCount[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push({
      date: formatDateLocal(d),
      reviewCount: 0,
      correctCount: 0,
    })
  }

  // Build a map for quick lookup
  const dayMap = new Map<string, DailyReviewCount>()
  for (const day of days) {
    dayMap.set(day.date, day)
  }

  // Count reviews per day
  for (const log of logs) {
    const dateStr = formatDateLocal(startOfDay(log.reviewed_at))
    const entry = dayMap.get(dateStr)
    if (entry) {
      entry.reviewCount++
      if (log.correct) entry.correctCount++
    }
  }

  return days
}
