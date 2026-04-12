import { parseNote, formatNote, noteToMidi, midiToNoteName } from './music.ts'

// ============================================================
// Key signature definitions — which note letters are modified
// ============================================================

const KEY_SIGNATURES: Record<string, Record<string, string>> = {
  'C': {},
  'G': { 'F': 'F#' },
  'D': { 'F': 'F#', 'C': 'C#' },
  'A': { 'F': 'F#', 'C': 'C#', 'G': 'G#' },
  'E': { 'F': 'F#', 'C': 'C#', 'G': 'G#', 'D': 'D#' },
  'F': { 'B': 'Bb' },
  'Bb': { 'B': 'Bb', 'E': 'Eb' },
  'Eb': { 'B': 'Bb', 'E': 'Eb', 'A': 'Ab' },
}

// ============================================================
// Get all available key signature names
// ============================================================

export function getAvailableKeys(): string[] {
  return Object.keys(KEY_SIGNATURES)
}

// ============================================================
// Get the correct answer for a note in a key signature context
// ============================================================

export function getCorrectAnswer(note: string, keySig: string): string {
  const sig = KEY_SIGNATURES[keySig]
  if (!sig) {
    throw new Error(`Unknown key signature: "${keySig}"`)
  }

  const parsed = parseNote(note)
  const modification = sig[parsed.letter]

  if (!modification) {
    // Note letter is not affected by this key signature
    return note
  }

  // Parse the modification to get the accidental
  const modParsed = parseNote(modification + '4') // append dummy octave for parsing
  return formatNote({
    letter: parsed.letter,
    accidental: modParsed.accidental,
    octave: parsed.octave,
  })
}

// ============================================================
// Get which notes are affected by a key signature
// ============================================================

export function getAffectedNotes(keySig: string): string[] {
  const sig = KEY_SIGNATURES[keySig]
  if (!sig) {
    throw new Error(`Unknown key signature: "${keySig}"`)
  }
  return Object.keys(sig)
}

// ============================================================
// Check if a specific note letter is affected by a key signature
// ============================================================

export function isNoteAffected(noteLetter: string, keySig: string): boolean {
  const sig = KEY_SIGNATURES[keySig]
  if (!sig) {
    throw new Error(`Unknown key signature: "${keySig}"`)
  }
  return noteLetter in sig
}

// ============================================================
// Generate card IDs for key signature context
// ============================================================

export function generateKeySignatureCardIds(config: {
  noteRange: { low: string; high: string }
  clefs: { treble: boolean; bass: boolean }
  keySignatures: string[]
}): string[] {
  const { noteRange, clefs, keySignatures } = config

  // Filter out 'C' — base cards already exist for C major
  const activeKeys = keySignatures.filter((k) => k !== 'C')
  if (activeKeys.length === 0) return []

  // Determine enabled clefs
  const enabledClefs: string[] = []
  if (clefs.bass) enabledClefs.push('bass')
  if (clefs.treble) enabledClefs.push('treble')
  if (enabledClefs.length === 0) return []

  const lowMidi = noteToMidi(noteRange.low)
  const highMidi = noteToMidi(noteRange.high)

  // Collect all natural notes within the MIDI range
  const naturalNotes: string[] = []
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const name = midiToNoteName(midi, true)
    const parsed = parseNote(name)
    if (parsed.accidental === null) {
      naturalNotes.push(name)
    }
  }

  // Build card IDs: naturalNotes × enabledClefs × activeKeys
  const ids: string[] = []
  for (const keySig of activeKeys) {
    for (const note of naturalNotes) {
      for (const clef of enabledClefs) {
        ids.push(`${clef}:${note}:${keySig}`)
      }
    }
  }

  return ids
}
