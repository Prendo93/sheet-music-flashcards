import { noteToMidi } from '../lib/music.ts'

interface PianoKeyboardProps {
  highlightNote: string
  lowNote: string
  highNote: string
}

// Which semitones within an octave are white keys (C=0, D=2, E=4, F=5, G=7, A=9, B=11)
const WHITE_SEMITONES = new Set([0, 2, 4, 5, 7, 9, 11])

// Sharp names for black keys
const SHARP_NAMES: Record<number, string> = {
  1: 'C#', 3: 'D#', 6: 'F#', 8: 'G#', 10: 'A#',
}
// White key letter names
const WHITE_NAMES: Record<number, string> = {
  0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B',
}

interface KeyInfo {
  midi: number
  note: string      // e.g. "C4", "F#4"
  isBlack: boolean
  semitone: number   // 0-11
  octave: number
}

function buildKeys(lowMidi: number, highMidi: number): KeyInfo[] {
  const keys: KeyInfo[] = []
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const semitone = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1
    const isBlack = !WHITE_SEMITONES.has(semitone)
    const name = isBlack ? SHARP_NAMES[semitone] : WHITE_NAMES[semitone]
    keys.push({
      midi,
      note: `${name}${octave}`,
      isBlack,
      semitone,
      octave,
    })
  }
  return keys
}

function isHighlighted(keyInfo: KeyInfo, highlightMidi: number): boolean {
  return keyInfo.midi === highlightMidi
}

export function PianoKeyboard({ highlightNote, lowNote, highNote }: PianoKeyboardProps) {
  const lowMidi = noteToMidi(lowNote)
  const highMidi = noteToMidi(highNote)
  const highlightMidi = noteToMidi(highlightNote)
  const allKeys = buildKeys(lowMidi, highMidi)

  const whiteKeys = allKeys.filter((k) => !k.isBlack)
  const blackKeys = allKeys.filter((k) => k.isBlack)

  const whiteKeyWidth = 100 / whiteKeys.length
  // Map each white key to its x position index
  const whitePositions = new Map<number, number>()
  whiteKeys.forEach((k, i) => {
    whitePositions.set(k.midi, i)
  })

  // Black key positioning: placed between white keys
  // A black key at semitone S is between the white key to its left and right
  function getBlackKeyX(blackKey: KeyInfo): number {
    // Find the white key just below this black key
    const lowerWhiteMidi = blackKey.midi - 1
    const lowerIdx = whitePositions.get(lowerWhiteMidi)
    if (lowerIdx === undefined) {
      // Edge case: black key at the very start
      return 0
    }
    // Position the black key straddling the boundary between lower and upper white keys
    return (lowerIdx + 0.65) * whiteKeyWidth
  }

  // Determine data-note attribute: use highlight note's spelling for the highlighted key
  function getDataNote(keyInfo: KeyInfo): string {
    if (keyInfo.midi === highlightMidi) {
      return highlightNote
    }
    return keyInfo.note
  }

  return (
    <div
      role="img"
      aria-label={`Piano keyboard highlighting ${highlightNote}`}
      class="relative w-full max-w-[400px] mx-auto select-none"
      style={{ height: '80px' }}
    >
      {/* White keys */}
      {whiteKeys.map((key, i) => {
        const highlighted = isHighlighted(key, highlightMidi)
        return (
          <div
            key={key.midi}
            data-note={getDataNote(key)}
            data-key-type="white"
            class={`absolute top-0 bottom-0 border border-gray-300 rounded-b ${
              highlighted ? 'bg-blue-400' : 'bg-white'
            }`}
            style={{
              left: `${i * whiteKeyWidth}%`,
              width: `${whiteKeyWidth}%`,
            }}
          />
        )
      })}

      {/* Black keys */}
      {blackKeys.map((key) => {
        const highlighted = isHighlighted(key, highlightMidi)
        const x = getBlackKeyX(key)
        const blackWidth = whiteKeyWidth * 0.6
        return (
          <div
            key={key.midi}
            data-note={getDataNote(key)}
            data-key-type="black"
            class={`absolute top-0 rounded-b z-10 ${
              highlighted ? 'bg-blue-600' : 'bg-gray-800'
            }`}
            style={{
              left: `${x}%`,
              width: `${blackWidth}%`,
              height: '55%',
            }}
          />
        )
      })}
    </div>
  )
}
