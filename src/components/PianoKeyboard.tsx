import { useRef } from 'preact/hooks'
import { noteToMidi, midiToNoteName } from '../lib/music.ts'

interface PianoKeyboardProps {
  highlightNote?: string
  wrongNote?: string
  lowNote: string
  highNote: string
  onKeyTap?: (note: string) => void
  disabled?: boolean
  preferSharp?: boolean
}

/**
 * Map of semitone-within-octave to whether it's a black key.
 * 0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B
 */
const BLACK_KEY_SEMITONES = new Set([1, 3, 6, 8, 10])

function isBlackKey(midi: number): boolean {
  return BLACK_KEY_SEMITONES.has(((midi % 12) + 12) % 12)
}

/**
 * Build a human-readable aria-label for a note.
 * E.g., "C4" -> "Play C4", "C#4" -> "Play C sharp 4"
 */
function ariaLabelForNote(noteName: string): string {
  return `Play ${noteName.replace('#', ' sharp ').replace('b', ' flat ')}`
}

export function PianoKeyboard({
  highlightNote,
  wrongNote,
  lowNote,
  highNote,
  onKeyTap,
  disabled = false,
  preferSharp = true,
}: PianoKeyboardProps) {
  const lowMidi = noteToMidi(lowNote)
  const highMidi = noteToMidi(highNote)
  const highlightMidi = highlightNote ? noteToMidi(highlightNote) : null
  const wrongMidi = wrongNote ? noteToMidi(wrongNote) : null

  const isInteractive = !!onKeyTap

  // Build list of all MIDI notes in range
  const keys: Array<{ midi: number; noteName: string; isBlack: boolean }> = []
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const noteName = midiToNoteName(midi, preferSharp)
    keys.push({ midi, noteName, isBlack: isBlackKey(midi) })
  }

  const whiteKeys = keys.filter((k) => !k.isBlack)
  const blackKeys = keys.filter((k) => k.isBlack)

  const lastDragNoteRef = useRef<string | null>(null)

  function handleClick(noteName: string) {
    if (!onKeyTap || disabled) return
    onKeyTap(noteName)
  }

  function getNoteFromPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)
    if (!el) return null
    const note = (el as HTMLElement).getAttribute?.('data-note')
    return note || null
  }

  function handlePointerDown(e: PointerEvent) {
    if (!onKeyTap || disabled) return
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const note = getNoteFromPoint(e.clientX, e.clientY)
    if (note) {
      lastDragNoteRef.current = note
      onKeyTap(note)
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!onKeyTap || disabled) return
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    const note = getNoteFromPoint(e.clientX, e.clientY)
    if (note && note !== lastDragNoteRef.current) {
      lastDragNoteRef.current = note
      onKeyTap(note)
    }
  }

  function handlePointerUp(e: PointerEvent) {
    lastDragNoteRef.current = null
    const target = e.currentTarget as HTMLElement
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId)
    }
  }

  // Calculate positions for black keys relative to white keys
  // Each white key has a fixed width. Black keys are positioned between specific white keys.
  const whiteKeyCount = whiteKeys.length
  // White key width as percentage
  const whiteKeyWidthPct = whiteKeyCount > 0 ? 100 / whiteKeyCount : 0

  // Map MIDI -> index in whiteKeys for positioning
  const whiteKeyIndex = new Map<number, number>()
  whiteKeys.forEach((k, i) => {
    whiteKeyIndex.set(k.midi, i)
  })

  /**
   * For a black key (e.g., C#4 = midi 61), the white key to its left
   * is the one with midi - 1 (C4 = midi 60). Position the black key
   * centered between that white key and the next.
   */
  function blackKeyLeftPct(midi: number): number {
    const leftWhiteMidi = midi - 1
    const idx = whiteKeyIndex.get(leftWhiteMidi)
    if (idx === undefined) {
      // Edge case: the white key to the left is outside our range
      // Position relative to the start
      return -whiteKeyWidthPct * 0.3
    }
    return (idx + 1) * whiteKeyWidthPct - whiteKeyWidthPct * 0.3
  }

  const correctClass = wrongNote ? 'bg-green-400' : 'bg-blue-400'
  const wrongClass = 'bg-red-400'
  const whiteBaseClass = 'bg-white border border-gray-300'
  const blackBaseClass = 'bg-gray-900'

  const containerRole = isInteractive ? 'group' : 'img'
  const containerLabel = highlightNote
    ? `Piano keyboard showing ${highlightNote}`
    : 'Piano keyboard'

  return (
    <div
      class="relative select-none"
      style={{ height: '120px', touchAction: isInteractive ? 'none' : undefined }}
      role={containerRole}
      aria-label={containerLabel}
      onPointerDown={isInteractive ? handlePointerDown : undefined}
      onPointerMove={isInteractive ? handlePointerMove : undefined}
      onPointerUp={isInteractive ? handlePointerUp : undefined}
    >
      {/* White keys */}
      <div class="flex h-full">
        {whiteKeys.map((key) => {
          const isHighlighted = highlightMidi === key.midi
          const isWrong = wrongMidi === key.midi && !isHighlighted
          const baseClass = isHighlighted ? correctClass : isWrong ? wrongClass : whiteBaseClass
          const interactiveClass = isInteractive ? 'cursor-pointer hover:bg-gray-100' : ''
          const disabledClass = disabled ? 'opacity-50' : ''
          const dataNoteValue = isHighlighted && highlightNote ? highlightNote : isWrong && wrongNote ? wrongNote : key.noteName

          return (
            <div
              key={key.midi}
              role="button"
              aria-label={ariaLabelForNote(key.noteName)}
              data-note={dataNoteValue}
              data-key-type="white"
              data-midi={key.midi}
              class={`flex-1 h-full rounded-b ${baseClass} ${interactiveClass} ${disabledClass} flex items-end justify-center pb-1 text-xs text-gray-500`}
              onClick={() => handleClick(key.noteName)}
            />
          )
        })}
      </div>

      {/* Black keys */}
      {blackKeys.map((key) => {
        const leftPct = blackKeyLeftPct(key.midi)
        const isHighlighted = highlightMidi === key.midi
        const isWrong = wrongMidi === key.midi && !isHighlighted
        const baseClass = isHighlighted ? correctClass : isWrong ? wrongClass : blackBaseClass
        const interactiveClass = isInteractive ? 'cursor-pointer hover:bg-gray-700' : ''
        const disabledClass = disabled ? 'opacity-50' : ''
        const dataNoteValue = isHighlighted && highlightNote ? highlightNote : isWrong && wrongNote ? wrongNote : key.noteName

        return (
          <div
            key={key.midi}
            role="button"
            aria-label={ariaLabelForNote(key.noteName)}
            data-note={dataNoteValue}
            data-key-type="black"
            data-midi={key.midi}
            class={`absolute top-0 rounded-b ${baseClass} ${interactiveClass} ${disabledClass}`}
            style={{
              left: `${leftPct}%`,
              width: `${whiteKeyWidthPct * 0.6}%`,
              height: '60%',
              zIndex: 1,
            }}
            onClick={() => handleClick(key.noteName)}
          />
        )
      })}
    </div>
  )
}
