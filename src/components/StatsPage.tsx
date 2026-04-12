import type { CardStateDistribution, ConfusedNote, DailyReviewCount } from '../lib/stats.ts'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StatsPageProps {
  todayStats: { reviewedToday: number; accuracyToday: number; streak: number }
  cardDistribution: CardStateDistribution
  confusedNotes: ConfusedNote[]
  weeklyHistory: DailyReviewCount[]
}

// ---------------------------------------------------------------------------
// Day abbreviation helper
// ---------------------------------------------------------------------------

const DAY_ABBREVS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function dayAbbrev(dateStr: string): string {
  // Parse "YYYY-MM-DD" -> day of week
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return DAY_ABBREVS[date.getDay()]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatsPage({
  todayStats,
  cardDistribution,
  confusedNotes,
  weeklyHistory,
}: StatsPageProps) {
  const maxReviews = Math.max(...weeklyHistory.map((d) => d.reviewCount), 1)

  return (
    <div class="space-y-6">
      {/* Today Section */}
      <section class="border-b border-gray-200 pb-4">
        <h2 class="text-base font-semibold mb-2">Today</h2>
        <p class="text-sm">
          Today: {todayStats.reviewedToday} cards, {todayStats.accuracyToday}% accuracy
        </p>
        <p class="text-sm">
          Streak: {todayStats.streak} days {'\uD83D\uDD25'}
        </p>
      </section>

      {/* Progress Section */}
      <section class="border-b border-gray-200 pb-4">
        <h2 class="text-base font-semibold mb-2">Progress</h2>
        <p class="text-sm mb-2">
          {cardDistribution.review} / {cardDistribution.total} cards mastered ({cardDistribution.masteryPercent}%)
        </p>
        <div class="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div
            role="progressbar"
            aria-valuenow={cardDistribution.masteryPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            class="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${cardDistribution.masteryPercent}%` }}
          />
        </div>
        <p class="text-sm text-gray-600">
          New: {cardDistribution.new} · Learning: {cardDistribution.learning} · Review: {cardDistribution.review} · Relearning: {cardDistribution.relearning}
        </p>
      </section>

      {/* Most Confused Notes */}
      {confusedNotes.length > 0 && (
        <section class="border-b border-gray-200 pb-4">
          <h2 class="text-base font-semibold mb-2">Notes to Focus On</h2>
          <div class="space-y-2">
            {confusedNotes.map((cn) => (
              <div key={cn.cardId} class="flex items-center gap-2">
                <span class="text-sm font-medium w-10">{cn.note}</span>
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-red-400 h-2 rounded-full"
                    style={{ width: `${cn.accuracy}%` }}
                  />
                </div>
                <span class="text-sm text-gray-600 w-12 text-right">{cn.accuracy}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* This Week */}
      <section class="pb-4">
        <h2 class="text-base font-semibold mb-2">This Week</h2>
        <div class="flex items-end justify-between gap-1" style={{ height: '120px' }}>
          {weeklyHistory.map((day) => {
            const barHeight = maxReviews > 0
              ? Math.max((day.reviewCount / maxReviews) * 100, day.reviewCount > 0 ? 4 : 0)
              : 0
            return (
              <div key={day.date} class="flex flex-col items-center flex-1">
                <span class="text-xs text-gray-600 mb-1">
                  {day.reviewCount > 0 ? day.reviewCount : ''}
                </span>
                <div class="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                  <div
                    class="bg-blue-500 rounded-t mx-auto"
                    style={{
                      height: `${barHeight}%`,
                      width: '100%',
                      maxWidth: '32px',
                    }}
                  />
                </div>
                <span class="text-xs text-gray-500 mt-1">{dayAbbrev(day.date)}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
