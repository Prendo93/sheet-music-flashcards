import type { ParsedNote, Accidental } from '../types.ts'

// ============================================================
// Constants
// ============================================================

export const NATURALS: readonly string[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

/**
 * Semitone offset from C for each natural note.
 */
const SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/**
 * Chromatic scale using sharp names.
 */
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Chromatic scale using flat names.
 */
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const VALID_LETTERS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G'])

const NOTE_REGEX = /^([A-Ga-g])([#b]?)([0-8])$/

// ============================================================
// Note Parsing
// ============================================================

export function parseNote(noteStr: string): ParsedNote {
  const match = noteStr.match(NOTE_REGEX)
  if (!match) {
    throw new Error(`Invalid note: "${noteStr}"`)
  }

  const letter = match[1].toUpperCase()
  const accidentalStr = match[2]
  const octave = parseInt(match[3], 10)

  if (!VALID_LETTERS.has(letter)) {
    throw new Error(`Invalid note letter: "${letter}"`)
  }

  const accidental: Accidental = accidentalStr === '#' ? '#' : accidentalStr === 'b' ? 'b' : null

  return { letter, accidental, octave }
}

export function formatNote(parsed: ParsedNote): string {
  return `${parsed.letter}${parsed.accidental ?? ''}${parsed.octave}`
}

// ============================================================
// Note Comparison
// ============================================================

export function notesMatch(answer: string, correct: string): boolean {
  const a = parseNote(answer)
  const b = parseNote(correct)
  return a.letter === b.letter && a.accidental === b.accidental && a.octave === b.octave
}

// ============================================================
// MIDI Conversion
// ============================================================

export function noteToMidi(note: string): number {
  const parsed = parseNote(note)
  let semitone = SEMITONES[parsed.letter]
  if (parsed.accidental === '#') semitone += 1
  if (parsed.accidental === 'b') semitone -= 1
  // MIDI: C4 = 60. Formula: (octave + 1) * 12 + semitone
  return (parsed.octave + 1) * 12 + semitone
}

export function midiToNoteName(midi: number, preferSharp: boolean): string {
  const semitone = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const names = preferSharp ? SHARP_NAMES : FLAT_NAMES
  return `${names[semitone]}${octave}`
}

// ============================================================
// VexFlow Format Conversion
// ============================================================

export function toVexFlowKey(note: string): string {
  const parsed = parseNote(note)
  const letterLower = parsed.letter.toLowerCase()
  const acc = parsed.accidental ?? ''
  return `${letterLower}${acc}/${parsed.octave}`
}

export function getVexFlowAccidental(note: string): Accidental {
  return parseNote(note).accidental
}

// ============================================================
// Range Helpers
// ============================================================

export function isNatural(note: string): boolean {
  return parseNote(note).accidental === null
}

// ============================================================
// Card Generation
// ============================================================

interface CardGenerationConfig {
  noteRange: { low: string; high: string }
  clefs: { treble: boolean; bass: boolean }
  accidentals: { sharps: boolean; flats: boolean }
}

/**
 * Per-clef natural register caps. Notes outside these MIDI ranges are not
 * generated as cards for that clef — e.g., F5 on a bass clef would require
 * many ledger lines and look like a "treble note on the wrong staff."
 *
 * Bass clef cap: C5 (MIDI 72) — covers the bass staff plus middle C / one
 *   ledger line above for the C-above-middle-C area.
 * Treble clef floor: A3 (MIDI 57) — covers the treble staff plus a ledger
 *   line below for the middle-C area.
 */
const BASS_MIDI_MAX = 72  // C5
const TREBLE_MIDI_MIN = 57 // A3

function isInClefRegister(midi: number, clef: 'bass' | 'treble'): boolean {
  if (clef === 'bass') return midi <= BASS_MIDI_MAX
  return midi >= TREBLE_MIDI_MIN
}

export function generateCardIds(config: CardGenerationConfig): string[] {
  const { noteRange, clefs, accidentals } = config

  // Determine enabled clefs
  const enabledClefs: Array<'bass' | 'treble'> = []
  if (clefs.bass) enabledClefs.push('bass')
  if (clefs.treble) enabledClefs.push('treble')

  if (enabledClefs.length === 0) return []

  const lowMidi = noteToMidi(noteRange.low)
  const highMidi = noteToMidi(noteRange.high)

  // Collect all note names within the MIDI range
  const notes: Array<{ name: string; midi: number }> = []

  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const sharpName = midiToNoteName(midi, true)
    const flatName = midiToNoteName(midi, false)
    const isNaturalNote = sharpName === flatName // natural notes have same sharp/flat name

    if (isNaturalNote) {
      // Always include naturals
      notes.push({ name: sharpName, midi })
    } else {
      // Accidental note — include sharp and/or flat variant
      if (accidentals.sharps) {
        notes.push({ name: sharpName, midi })
      }
      if (accidentals.flats) {
        notes.push({ name: flatName, midi })
      }
    }
  }

  // Build card IDs: cross notes with clefs, filtered by per-clef natural register
  // Sort by MIDI, then by note name (sharp before flat, since '#' < 'D'), then by clef
  const cards: Array<{ id: string; midi: number; noteName: string; clef: string }> = []

  for (const note of notes) {
    for (const clef of enabledClefs) {
      if (!isInClefRegister(note.midi, clef)) continue
      cards.push({
        id: `${clef}:${note.name}`,
        midi: note.midi,
        noteName: note.name,
        clef,
      })
    }
  }

  // Sort: primary by MIDI, secondary by clef, tertiary by note name
  cards.sort((a, b) => {
    if (a.midi !== b.midi) return a.midi - b.midi
    if (a.clef !== b.clef) return a.clef.localeCompare(b.clef)
    return a.noteName.localeCompare(b.noteName)
  })

  return cards.map((c) => c.id)
}
