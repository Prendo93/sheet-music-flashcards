import { useState } from 'preact/hooks'

// Interval names displayed as buttons (skip unison — rarely useful as a flashcard)
const INTERVAL_NAMES = [
  'minor 2nd', 'major 2nd',
  'minor 3rd', 'major 3rd',
  'perfect 4th', 'tritone', 'perfect 5th',
  'minor 6th', 'major 6th',
  'minor 7th', 'major 7th',
  'octave',
]

const ROOT_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

const QUALITY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' },
  { label: 'Dim', value: 'diminished' },
  { label: 'Aug', value: 'augmented' },
  { label: 'Dom7', value: 'dominant 7th' },
  { label: 'Maj7', value: 'major 7th' },
  { label: 'Min7', value: 'minor 7th' },
]

interface ChordPickerProps {
  mode: 'interval' | 'chord'
  onSubmit: (answer: string) => void
  disabled?: boolean
}

export function ChordPicker({ mode, onSubmit, disabled = false }: ChordPickerProps) {
  if (mode === 'interval') {
    return <IntervalPicker onSubmit={onSubmit} disabled={disabled} />
  }
  return <ChordModePicker onSubmit={onSubmit} disabled={disabled} />
}

// ── Interval Mode ───────────────────────────────────────────

function IntervalPicker({ onSubmit, disabled }: { onSubmit: (answer: string) => void; disabled: boolean }) {
  return (
    <div class="flex flex-wrap gap-2 justify-center p-2" role="group" aria-label="Interval selection">
      {INTERVAL_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={name}
          disabled={disabled}
          class="px-3 py-2 rounded-lg border border-primary bg-surface text-text-primary text-sm font-medium
                 disabled:opacity-50 disabled:cursor-not-allowed
                 hover:bg-primary hover:text-white active:scale-95 transition-all"
          onClick={() => onSubmit(name)}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

// ── Chord Mode ──────────────────────────────────────────────

function ChordModePicker({ onSubmit, disabled }: { onSubmit: (answer: string) => void; disabled: boolean }) {
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null)
  const [selectedAccidental, setSelectedAccidental] = useState<string>('')
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null)

  const canSubmit = selectedRoot !== null && selectedQuality !== null

  function handleSubmit() {
    if (!canSubmit) return
    const rootStr = `${selectedRoot}${selectedAccidental}`
    onSubmit(`${rootStr} ${selectedQuality}`)
    setSelectedRoot(null)
    setSelectedAccidental('')
    setSelectedQuality(null)
  }

  return (
    <div class="flex flex-col gap-3 p-2">
      {/* Root note row */}
      <div class="flex flex-wrap gap-2 justify-center" role="group" aria-label="Root note selection">
        {ROOT_NOTES.map((note) => (
          <button
            key={note}
            type="button"
            aria-label={`Root ${note}`}
            aria-pressed={selectedRoot === note ? 'true' : 'false'}
            disabled={disabled}
            class={`px-3 py-2 rounded-lg border text-sm font-medium transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${selectedRoot === note
                       ? 'bg-primary text-white border-primary'
                       : 'bg-surface text-text-primary border-primary hover:bg-primary hover:text-white'}`}
            onClick={() => setSelectedRoot(note)}
          >
            {note}
          </button>
        ))}
      </div>

      {/* Accidental toggle row */}
      <div class="flex gap-2 justify-center" role="group" aria-label="Accidental selection">
        {[
          { label: 'Natural', value: '' },
          { label: 'Sharp', value: '#' },
          { label: 'Flat', value: 'b' },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            aria-label={opt.label}
            aria-pressed={selectedAccidental === opt.value ? 'true' : 'false'}
            disabled={disabled}
            class={`px-3 py-2 rounded-lg border text-sm font-medium transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${selectedAccidental === opt.value
                       ? 'bg-primary text-white border-primary'
                       : 'bg-surface text-text-primary border-primary hover:bg-primary hover:text-white'}`}
            onClick={() => setSelectedAccidental(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Quality row */}
      <div class="flex flex-wrap gap-2 justify-center" role="group" aria-label="Chord quality selection">
        {QUALITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-label={opt.label}
            aria-pressed={selectedQuality === opt.value ? 'true' : 'false'}
            disabled={disabled}
            class={`px-3 py-2 rounded-lg border text-sm font-medium transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${selectedQuality === opt.value
                       ? 'bg-primary text-white border-primary'
                       : 'bg-surface text-text-primary border-primary hover:bg-primary hover:text-white'}`}
            onClick={() => setSelectedQuality(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Submit button */}
      <div class="flex justify-center">
        <button
          type="button"
          aria-label="Submit chord"
          disabled={disabled || !canSubmit}
          class="px-6 py-3 rounded-lg bg-primary text-white font-semibold text-base
                 disabled:opacity-50 disabled:cursor-not-allowed
                 hover:bg-primary-dark active:scale-95 transition-all"
          onClick={handleSubmit}
        >
          Check
        </button>
      </div>
    </div>
  )
}
