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
      ? 'bg-amber-50 border-amber-200'
      : 'bg-green-50 border-green-200'
    : 'bg-red-50 border-red-200'

  return (
    <div class={`rounded-lg border p-4 ${bgClass}`} role="status">
      <p class={`text-lg font-semibold ${colorClass}`}>
        {RATING_LABELS[rating]}
      </p>
      <p class="mt-1 text-sm text-gray-700">
        Correct answer: <span class="font-medium">{correctAnswer}</span>
      </p>
      {showUndo && (
        <button
          type="button"
          class="mt-3 rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300"
          onClick={onUndo}
        >
          Undo
        </button>
      )}
    </div>
  )
}
