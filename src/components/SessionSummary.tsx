interface SessionSummaryProps {
  reviewed: number
  correct: number
  onNewSession: () => void
}

export function SessionSummary({ reviewed, correct, onNewSession }: SessionSummaryProps) {
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0

  return (
    <div class="flex flex-col items-center gap-4 py-8">
      <h2 class="text-2xl font-bold">Session Complete</h2>

      <div class="text-center">
        <p class="text-lg">
          Cards reviewed: <span class="font-semibold">{reviewed}</span>
        </p>
        <p class="text-lg">
          Accuracy: <span class="font-semibold">{accuracy}%</span>
        </p>
      </div>

      <button
        type="button"
        class="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700"
        onClick={onNewSession}
      >
        Study Again
      </button>
    </div>
  )
}
