import type { ReviewLogRecord } from '../types.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TodayStatsResult {
  reviewedToday: number
  accuracyToday: number    // 0-100 percentage, 0 if no reviews
  streak: number           // consecutive days with ≥1 review
}

// ---------------------------------------------------------------------------
// startOfDay — midnight local time for a given date
// ---------------------------------------------------------------------------

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// ---------------------------------------------------------------------------
// computeStreak — consecutive days backward from today with ≥1 review
// If today has 0 reviews, start counting from yesterday (not broken yet)
// ---------------------------------------------------------------------------

export function computeStreak(allLogs: ReviewLogRecord[], now: Date = new Date()): number {
  if (allLogs.length === 0) return 0

  // Build a Set of day keys (YYYY-MM-DD in local time) that have reviews
  const reviewDays = new Set<string>()
  for (const log of allLogs) {
    const d = startOfDay(log.reviewed_at)
    reviewDays.add(d.toDateString())
  }

  const today = startOfDay(now)
  const hasReviewsToday = reviewDays.has(today.toDateString())

  // Start counting from today if it has reviews, otherwise from yesterday
  let checkDay = new Date(today)
  if (!hasReviewsToday) {
    checkDay.setDate(checkDay.getDate() - 1)
  }

  let streak = 0
  while (reviewDays.has(checkDay.toDateString())) {
    streak++
    checkDay.setDate(checkDay.getDate() - 1)
  }

  return streak
}

// ---------------------------------------------------------------------------
// computeTodayStats — aggregate today's reviews + streak
// ---------------------------------------------------------------------------

export function computeTodayStats(allLogs: ReviewLogRecord[], now: Date = new Date()): TodayStatsResult {
  const todayStart = startOfDay(now)

  const todayLogs = allLogs.filter((log) => log.reviewed_at >= todayStart)
  const reviewedToday = todayLogs.length
  const correctToday = todayLogs.filter((log) => log.correct).length
  const accuracyToday = reviewedToday === 0 ? 0 : Math.round((correctToday / reviewedToday) * 100 * 100) / 100

  return {
    reviewedToday,
    accuracyToday,
    streak: computeStreak(allLogs, now),
  }
}
