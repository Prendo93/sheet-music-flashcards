import { noteToMidi, midiToNoteName, parseNote } from './music.ts'

// ============================================================
// Interval definitions (name → semitones)
// ============================================================

export const INTERVALS: Record<string, number> = {
  'unison': 0,
  'minor 2nd': 1,
  'major 2nd': 2,
  'minor 3rd': 3,
  'major 3rd': 4,
  'perfect 4th': 5,
  'tritone': 6,
  'perfect 5th': 7,
  'minor 6th': 8,
  'major 6th': 9,
  'minor 7th': 10,
  'major 7th': 11,
  'octave': 12,
}

// Reverse lookup: semitones → interval name
const SEMITONES_TO_INTERVAL: Record<number, string> = {}
for (const [name, semitones] of Object.entries(INTERVALS)) {
  SEMITONES_TO_INTERVAL[semitones] = name
}

// ============================================================
// Chord quality definitions (intervals from root in semitones)
// ============================================================

export const CHORD_QUALITIES: Record<string, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'diminished': [0, 3, 6],
  'augmented': [0, 4, 8],
  'dominant 7th': [0, 4, 7, 10],
  'major 7th': [0, 4, 7, 11],
  'minor 7th': [0, 3, 7, 10],
}

// ============================================================
// Interval helpers
// ============================================================

/**
 * Get interval name from semitone distance.
 * Returns the interval name string, or throws if unknown.
 */
export function getIntervalName(semitones: number): string {
  const name = SEMITONES_TO_INTERVAL[semitones]
  if (!name) {
    throw new Error(`Unknown interval: ${semitones} semitones`)
  }
  return name
}

/**
 * Get semitone distance between two notes (absolute value).
 */
export function getInterval(note1: string, note2: string): number {
  return Math.abs(noteToMidi(note1) - noteToMidi(note2))
}

// ============================================================
// Chord identification
// ============================================================

/**
 * Identify a chord from its notes.
 * Returns quality name + root (e.g. "C major") or null if not recognized.
 * Requires at least 3 notes; 2 notes is an interval, not a chord.
 */
export function identifyChord(notes: string[]): string | null {
  if (notes.length < 3) return null

  // Convert all to MIDI and sort ascending
  const midiNotes = notes.map((n) => ({ name: n, midi: noteToMidi(n) }))
  midiNotes.sort((a, b) => a.midi - b.midi)

  // Try each note as potential root
  for (let i = 0; i < midiNotes.length; i++) {
    const rootMidi = midiNotes[i].midi
    const rootParsed = parseNote(midiNotes[i].name)
    const rootName = `${rootParsed.letter}${rootParsed.accidental ?? ''}`

    // Compute intervals from this root (wrapping around octave if needed)
    const intervals = midiNotes.map((n) => {
      let diff = n.midi - rootMidi
      if (diff < 0) diff += 12
      return diff % 12
    })
    intervals.sort((a, b) => a - b)

    // Check against known chord qualities
    for (const [quality, pattern] of Object.entries(CHORD_QUALITIES)) {
      if (pattern.length !== intervals.length) continue
      if (pattern.every((p, idx) => p === intervals[idx])) {
        return `${rootName} ${quality}`
      }
    }
  }

  return null
}

// ============================================================
// Chord building
// ============================================================

/**
 * Generate notes for a chord given root and quality.
 * Uses sharp names for accidentals when building from MIDI.
 */
export function buildChord(root: string, quality: string): string[] {
  const pattern = CHORD_QUALITIES[quality]
  if (!pattern) {
    throw new Error(`Unknown chord quality: "${quality}"`)
  }

  const rootMidi = noteToMidi(root)
  const rootParsed = parseNote(root)
  const preferSharp = rootParsed.accidental !== 'b'

  return pattern.map((semitones) => {
    if (semitones === 0) return root
    return midiToNoteName(rootMidi + semitones, preferSharp)
  })
}

// ============================================================
// Card ID generators
// ============================================================

interface IntervalCardConfig {
  noteRange: { low: string; high: string }
  intervals: string[]
  clefs: { treble: boolean; bass: boolean }
}

/**
 * Generate interval card IDs for a given range.
 * Format: "interval:clef:note1+note2"
 */
export function generateIntervalCardIds(config: IntervalCardConfig): string[] {
  const { noteRange, intervals, clefs } = config

  if (intervals.length === 0) return []

  const enabledClefs: string[] = []
  if (clefs.bass) enabledClefs.push('bass')
  if (clefs.treble) enabledClefs.push('treble')
  if (enabledClefs.length === 0) return []

  const lowMidi = noteToMidi(noteRange.low)
  const highMidi = noteToMidi(noteRange.high)

  // Collect all natural notes in range as potential starting notes
  const startNotes: string[] = []
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const name = midiToNoteName(midi, true)
    // Only use natural notes as interval starting points
    const parsed = parseNote(name)
    if (parsed.accidental === null) {
      startNotes.push(name)
    }
  }

  const ids: string[] = []

  for (const intervalName of intervals) {
    const semitones = INTERVALS[intervalName]
    if (semitones === undefined) continue

    for (const startNote of startNotes) {
      const startMidi = noteToMidi(startNote)
      const endMidi = startMidi + semitones

      // Skip if end note is out of range
      if (endMidi > highMidi || endMidi < lowMidi) continue

      const endNote = midiToNoteName(endMidi, true)

      for (const clef of enabledClefs) {
        ids.push(`interval:${clef}:${startNote}+${endNote}`)
      }
    }
  }

  return ids
}

interface ChordCardConfig {
  noteRange: { low: string; high: string }
  qualities: string[]
  clefs: { treble: boolean; bass: boolean }
}

/**
 * Generate chord card IDs.
 * Format: "chord:clef:note1+note2+note3"
 */
export function generateChordCardIds(config: ChordCardConfig): string[] {
  const { noteRange, qualities, clefs } = config

  if (qualities.length === 0) return []

  const enabledClefs: string[] = []
  if (clefs.bass) enabledClefs.push('bass')
  if (clefs.treble) enabledClefs.push('treble')
  if (enabledClefs.length === 0) return []

  const lowMidi = noteToMidi(noteRange.low)
  const highMidi = noteToMidi(noteRange.high)

  // Collect all natural notes in range as potential roots
  const rootNotes: string[] = []
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const name = midiToNoteName(midi, true)
    const parsed = parseNote(name)
    if (parsed.accidental === null) {
      rootNotes.push(name)
    }
  }

  const ids: string[] = []

  for (const quality of qualities) {
    const pattern = CHORD_QUALITIES[quality]
    if (!pattern) continue

    for (const root of rootNotes) {
      const rootMidi = noteToMidi(root)
      const highestNoteMidi = rootMidi + pattern[pattern.length - 1]

      // Skip if any note in the chord goes out of range
      if (highestNoteMidi > highMidi) continue

      const chordNotes = pattern.map((semitones) => {
        if (semitones === 0) return root
        return midiToNoteName(rootMidi + semitones, true)
      })

      const notesStr = chordNotes.join('+')

      for (const clef of enabledClefs) {
        ids.push(`chord:${clef}:${notesStr}`)
      }
    }
  }

  return ids
}
