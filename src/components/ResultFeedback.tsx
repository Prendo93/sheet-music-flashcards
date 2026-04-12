import { useState, useEffect } from 'preact/hooks'

interface ResultFeedbackProps {
  correct: boolean
  rating: 1 | 2 | 3 | 4
  correctAnswer: string
  userAnswer: string
  onUndo: () => void
  undoTimeoutMs?: number
}

const RATING_LABELS: Record<1 | 2 | 3 | 4, string> = {
  4: 'Fast!',
  3: 'Correct!',
  2: 'Correct, but slow',
  1: 'Incorrect',
}

export function ResultFeedback({
  correct,
  rating,
  correctAnswer,
  userAnswer: _userAnswer,
  onUndo,
  undoTimeoutMs = 2000,
}: ResultFeedbackProps) {
  const [showUndo, setShowUndo] = useState(true)

  useEffect(() => {
    if (correct) {
      navigator.vibrate?.(50)       // short pulse for correct
    } else {
      navigator.vibrate?.([50, 50, 50])  // triple pulse for incorrect
    }
  }, [correct])

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowUndo(false)
    }, undoTimeoutMs)
    return () => clearTimeout(timer)
  }, [undoTimeoutMs])

  const colorClass = correct
    ? rating === 2
      ? 'text-amber-600'
      : 'text-green-600'
    : 'text-red-600'

  const bgClass = correct
    ? rating === 2
      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
      : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
    : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'

  return (
    <div class={`rounded-lg border p-4 ${bgClass}`} role="status">
      <p class={`text-lg font-semibold ${colorClass}`}>
        {RATING_LABELS[rating]}
      </p>
      <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
        Correct answer: <span class="font-medium">{correctAnswer}</span>
      </p>
      {showUndo && (
        <button
          type="button"
          class="mt-3 rounded bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
          onClick={onUndo}
        >
          Undo
        </button>
      )}
    </div>
  )
}
