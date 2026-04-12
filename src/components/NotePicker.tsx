import { useState } from 'preact/hooks'
import type { Accidental } from '../types.ts'

interface NotePickerProps {
  onSubmit: (note: string) => void
  showAccidentals: boolean
  octaveRange: [number, number]
  disabled?: boolean
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

const ACCIDENTALS: Array<{ label: string; value: Accidental; display: string }> = [
  { label: 'Natural', value: null, display: '\u266E' },
  { label: 'Sharp', value: '#', display: '\u266F' },
  { label: 'Flat', value: 'b', display: '\u266D' },
]

export function NotePicker({ onSubmit, showAccidentals, octaveRange, disabled = false }: NotePickerProps) {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [selectedAccidental, setSelectedAccidental] = useState<Accidental>(null)
  const [selectedOctave, setSelectedOctave] = useState<number | null>(null)

  const isSingleOctave = octaveRange[0] === octaveRange[1]
  const effectiveOctave = isSingleOctave ? octaveRange[0] : selectedOctave

  const canSubmit = selectedLetter !== null && effectiveOctave !== null

  function handleSubmit() {
    if (!canSubmit) return

    const accidentalStr = showAccidentals && selectedAccidental !== null ? selectedAccidental : ''
    const note = `${selectedLetter}${accidentalStr}${effectiveOctave}`
    onSubmit(note)

    // Reset for next card
    setSelectedLetter(null)
    setSelectedAccidental(null)
    setSelectedOctave(null)
  }

  // Build octave buttons array
  const octaves: number[] = []
  for (let i = octaveRange[0]; i <= octaveRange[1]; i++) {
    octaves.push(i)
  }

  return (
    <div class="flex flex-col gap-3">
      {/* Row 1: Letter buttons */}
      <div class="flex w-full gap-2">
        {LETTERS.map((letter) => (
          <button
            key={letter}
            type="button"
            aria-label={`Note ${letter}`}
            aria-pressed={selectedLetter === letter ? 'true' : 'false'}
            disabled={disabled}
            class={`flex-1 min-h-[48px] rounded font-semibold text-lg ${
              selectedLetter === letter
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
            }`}
            onClick={() => setSelectedLetter(letter)}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Row 2: Accidental buttons */}
      {showAccidentals && (
        <div class="flex justify-center gap-2">
          {ACCIDENTALS.map((acc) => (
            <button
              key={acc.label}
              type="button"
              aria-label={acc.label}
              aria-pressed={selectedAccidental === acc.value ? 'true' : 'false'}
              disabled={disabled}
              class={`min-w-[48px] min-h-[48px] rounded font-semibold text-lg ${
                selectedAccidental === acc.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
              }`}
              onClick={() => setSelectedAccidental(acc.value)}
            >
              {acc.display}
            </button>
          ))}
        </div>
      )}

      {/* Row 3: Octave buttons (hidden for single octave) */}
      {!isSingleOctave && (
        <div class="flex justify-center gap-2">
          {octaves.map((oct) => (
            <button
              key={oct}
              type="button"
              aria-label={`Octave ${oct}`}
              aria-pressed={selectedOctave === oct ? 'true' : 'false'}
              disabled={disabled}
              class={`min-w-[48px] min-h-[48px] rounded font-semibold text-lg ${
                selectedOctave === oct
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
              }`}
              onClick={() => setSelectedOctave(oct)}
            >
              {oct}
            </button>
          ))}
        </div>
      )}

      {/* Check / Submit button */}
      <button
        type="button"
        aria-label="Submit answer"
        disabled={disabled || !canSubmit}
        class={`w-full min-h-[48px] rounded font-semibold text-lg text-white ${
          canSubmit && !disabled
            ? 'bg-green-500'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
        onClick={handleSubmit}
      >
        Check
      </button>
    </div>
  )
}
