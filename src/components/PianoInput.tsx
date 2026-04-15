import { useState } from 'preact/hooks'
import { PianoKeyboard } from './PianoKeyboard.tsx'
import { noteToMidi, midiToNoteName, parseNote } from '../lib/music.ts'
import { playNote } from '../lib/synth.ts'

interface PianoInputProps {
  onSubmit: (note: string) => void
  lowNote: string
  highNote: string
  accidentals: { sharps: boolean; flats: boolean }
  disabled?: boolean
}

export function PianoInput({
  onSubmit,
  lowNote,
  highNote,
  accidentals,
  disabled = false,
}: PianoInputProps) {
  const [selectedNote, setSelectedNote] = useState<string | null>(null)

  const bothEnabled = accidentals.sharps && accidentals.flats
  const defaultPreferSharp = !accidentals.flats || accidentals.sharps
  const [preferSharp, setPreferSharp] = useState(defaultPreferSharp)

  function handleKeyTap(note: string) {
    if (disabled) return
    setSelectedNote(note)
    try { playNote(noteToMidi(note)) } catch { /* silent */ }
  }

  function handleToggleAccidental() {
    const newPreferSharp = !preferSharp
    setPreferSharp(newPreferSharp)

    // If a black key is selected, recalculate its name
    if (selectedNote) {
      const parsed = parseNote(selectedNote)
      if (parsed.accidental !== null) {
        const midi = noteToMidi(selectedNote)
        setSelectedNote(midiToNoteName(midi, newPreferSharp))
      }
    }
  }

  function handleSubmit() {
    if (!selectedNote) return
    onSubmit(selectedNote)
    setSelectedNote(null)
  }

  const canSubmit = selectedNote !== null && !disabled

  return (
    <div class="flex flex-col gap-3">
      <PianoKeyboard
        lowNote={lowNote}
        highNote={highNote}
        highlightNote={selectedNote ?? undefined}
        onKeyTap={handleKeyTap}
        disabled={disabled}
        preferSharp={preferSharp}
      />

      {bothEnabled && (
        <div class="flex justify-center">
          <button
            type="button"
            aria-label={preferSharp ? 'Switch to flat' : 'Switch to sharp'}
            class={`min-h-[48px] px-4 rounded font-semibold text-lg ${
              preferSharp
                ? 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
                : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
            }`}
            onClick={handleToggleAccidental}
          >
            {preferSharp ? '♯ Sharp' : '♭ Flat'}
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label="Check"
        disabled={!canSubmit}
        class={`w-full min-h-[48px] rounded font-semibold text-lg text-white ${
          canSubmit
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
