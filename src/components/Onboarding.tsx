import { useState } from 'preact/hooks'
import { SheetMusicDisplay } from './SheetMusicDisplay.tsx'
import { NotePicker } from './NotePicker.tsx'

interface OnboardingProps {
  onComplete: () => void
}

type Step = 'welcome' | 'practice'
type PracticeResult = 'none' | 'correct' | 'incorrect'

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [practiceResult, setPracticeResult] = useState<PracticeResult>('none')

  function handleAnswer(note: string) {
    // Correct answer is C4
    if (note === 'C4') {
      setPracticeResult('correct')
    } else {
      setPracticeResult('incorrect')
    }
  }

  return (
    <div class="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6">
      <div class="flex flex-col items-center" style={{ maxWidth: '400px', width: '100%' }}>
        {step === 'welcome' && (
          <>
            <h1 class="text-2xl font-bold mb-4">Welcome to Sheet Music Flashcards</h1>
            <p class="text-gray-600 text-center mb-6">
              You'll see a note on the staff. Your job is to identify it.
            </p>
            <button
              type="button"
              class="bg-blue-600 text-white rounded-lg px-6 py-3 font-medium"
              onClick={() => setStep('practice')}
            >
              Next
            </button>
            <button
              type="button"
              class="text-sm text-gray-400 underline mt-4"
              onClick={onComplete}
            >
              Skip
            </button>
          </>
        )}

        {step === 'practice' && (
          <>
            <p class="text-gray-600 text-center mb-6">
              Try it! What note is this?
            </p>
            <div class="w-full mb-4">
              <SheetMusicDisplay note="C4" clef="treble" />
            </div>

            {practiceResult === 'correct' ? (
              <>
                <p class="text-gray-600 text-center mb-6">
                  That's right! You're ready to start.
                </p>
                <button
                  type="button"
                  class="bg-blue-600 text-white rounded-lg px-6 py-3 font-medium"
                  onClick={onComplete}
                >
                  Start Studying
                </button>
              </>
            ) : (
              <>
                {practiceResult === 'incorrect' && (
                  <p class="text-gray-600 text-center mb-6">
                    The correct answer is C. Tap 'C' to try again.
                  </p>
                )}
                <div class="w-full">
                  <NotePicker
                    onSubmit={handleAnswer}
                    showAccidentals={false}
                    octaveRange={[4, 4]}
                  />
                </div>
              </>
            )}

            <button
              type="button"
              class="text-sm text-gray-400 underline mt-4"
              onClick={onComplete}
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  )
}
