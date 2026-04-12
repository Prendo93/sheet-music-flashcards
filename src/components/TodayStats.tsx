interface TodayStatsProps {
  reviewedToday: number
  accuracyToday: number
  streak: number
}

export function TodayStats({ reviewedToday, accuracyToday, streak }: TodayStatsProps) {
  if (streak === 0 && reviewedToday === 0) {
    return null
  }

  return (
    <div class="flex items-center justify-center gap-4 text-sm text-gray-500">
      <span>{'\u{1F525}'} {streak}</span>
      <span>{'\u{1F4DD}'} {reviewedToday}</span>
      <span>{'\u2713'} {Math.round(accuracyToday)}%</span>
    </div>
  )
}
