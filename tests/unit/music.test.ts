import { describe, it, expect } from 'vitest'
import {
  parseNote,
  formatNote,
  notesMatch,
  noteToMidi,
  midiToNoteName,
  toVexFlowKey,
  getVexFlowAccidental,
  generateCardIds,
  NATURALS,
  isNatural,
} from '../../src/lib/music.ts'

// ============================================================
// parseNote
// ============================================================

describe('parseNote', () => {
  it('parses a natural note', () => {
    expect(parseNote('C4')).toEqual({ letter: 'C', accidental: null, octave: 4 })
  })

  it('parses a sharp note', () => {
    expect(parseNote('C#5')).toEqual({ letter: 'C', accidental: '#', octave: 5 })
  })

  it('parses a flat note', () => {
    expect(parseNote('Bb3')).toEqual({ letter: 'B', accidental: 'b', octave: 3 })
  })

  it('parses all valid letters', () => {
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      const result = parseNote(`${letter}4`)
      expect(result.letter).toBe(letter)
    }
  })

  it('handles case-insensitive input', () => {
    expect(parseNote('c#5')).toEqual({ letter: 'C', accidental: '#', octave: 5 })
    expect(parseNote('bb3')).toEqual({ letter: 'B', accidental: 'b', octave: 3 })
    expect(parseNote('f4')).toEqual({ letter: 'F', accidental: null, octave: 4 })
  })

  it('parses octave 0', () => {
    expect(parseNote('A0')).toEqual({ letter: 'A', accidental: null, octave: 0 })
  })

  it('parses octave 8', () => {
    expect(parseNote('C8')).toEqual({ letter: 'C', accidental: null, octave: 8 })
  })

  it('throws for invalid letter', () => {
    expect(() => parseNote('H4')).toThrow()
    expect(() => parseNote('Z#5')).toThrow()
  })

  it('throws for invalid octave (out of range)', () => {
    expect(() => parseNote('C9')).toThrow()
    expect(() => parseNote('C-1')).toThrow()
  })

  it('throws for invalid accidental', () => {
    expect(() => parseNote('Cx4')).toThrow()
  })

  it('throws for empty string', () => {
    expect(() => parseNote('')).toThrow()
  })

  it('throws for nonsense input', () => {
    expect(() => parseNote('hello')).toThrow()
    expect(() => parseNote('123')).toThrow()
  })
})

// ============================================================
// formatNote
// ============================================================

describe('formatNote', () => {
  it('formats a natural note', () => {
    expect(formatNote({ letter: 'C', accidental: null, octave: 4 })).toBe('C4')
  })

  it('formats a sharp note', () => {
    expect(formatNote({ letter: 'C', accidental: '#', octave: 5 })).toBe('C#5')
  })

  it('formats a flat note', () => {
    expect(formatNote({ letter: 'B', accidental: 'b', octave: 3 })).toBe('Bb3')
  })

  it('round-trips with parseNote', () => {
    const notes = ['C4', 'C#5', 'Bb3', 'F4', 'A0', 'G#7', 'Eb2']
    for (const note of notes) {
      expect(formatNote(parseNote(note))).toBe(note)
    }
  })
})

// ============================================================
// notesMatch
// ============================================================

describe('notesMatch', () => {
  it('matches identical notes', () => {
    expect(notesMatch('C#5', 'C#5')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(notesMatch('c#5', 'C#5')).toBe(true)
    expect(notesMatch('C#5', 'c#5')).toBe(true)
    expect(notesMatch('bb3', 'Bb3')).toBe(true)
  })

  it('rejects enharmonic equivalents (C# !== Db)', () => {
    expect(notesMatch('C#5', 'Db5')).toBe(false)
    expect(notesMatch('Db5', 'C#5')).toBe(false)
  })

  it('rejects different octaves', () => {
    expect(notesMatch('C4', 'C5')).toBe(false)
  })

  it('rejects different letters', () => {
    expect(notesMatch('C4', 'D4')).toBe(false)
  })

  it('rejects natural vs accidental', () => {
    expect(notesMatch('C4', 'C#4')).toBe(false)
  })
})

// ============================================================
// noteToMidi
// ============================================================

describe('noteToMidi', () => {
  it('C4 = 60', () => {
    expect(noteToMidi('C4')).toBe(60)
  })

  it('A0 = 21', () => {
    expect(noteToMidi('A0')).toBe(21)
  })

  it('C8 = 108', () => {
    expect(noteToMidi('C8')).toBe(108)
  })

  it('C#4 = 61', () => {
    expect(noteToMidi('C#4')).toBe(61)
  })

  it('Bb3 = 58', () => {
    expect(noteToMidi('Bb3')).toBe(58)
  })

  it('D4 = 62', () => {
    expect(noteToMidi('D4')).toBe(62)
  })

  it('E4 = 64', () => {
    expect(noteToMidi('E4')).toBe(64)
  })

  it('F4 = 65', () => {
    expect(noteToMidi('F4')).toBe(65)
  })

  it('G4 = 67', () => {
    expect(noteToMidi('G4')).toBe(67)
  })

  it('A4 = 69', () => {
    expect(noteToMidi('A4')).toBe(69)
  })

  it('B4 = 71', () => {
    expect(noteToMidi('B4')).toBe(71)
  })

  it('is case-insensitive', () => {
    expect(noteToMidi('c4')).toBe(60)
    expect(noteToMidi('c#4')).toBe(61)
  })
})

// ============================================================
// midiToNoteName
// ============================================================

describe('midiToNoteName', () => {
  it('60 → C4', () => {
    expect(midiToNoteName(60, true)).toBe('C4')
    expect(midiToNoteName(60, false)).toBe('C4')
  })

  it('61 with preferSharp → C#4', () => {
    expect(midiToNoteName(61, true)).toBe('C#4')
  })

  it('61 without preferSharp → Db4', () => {
    expect(midiToNoteName(61, false)).toBe('Db4')
  })

  it('21 → A0', () => {
    expect(midiToNoteName(21, true)).toBe('A0')
  })

  it('108 → C8', () => {
    expect(midiToNoteName(108, true)).toBe('C8')
  })

  it('round-trips with noteToMidi for natural notes', () => {
    const naturals = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
    for (const note of naturals) {
      expect(midiToNoteName(noteToMidi(note), true)).toBe(note)
    }
  })

  it('round-trips with noteToMidi for sharps', () => {
    const sharps = ['C#4', 'D#4', 'F#4', 'G#4', 'A#4']
    for (const note of sharps) {
      expect(midiToNoteName(noteToMidi(note), true)).toBe(note)
    }
  })

  it('round-trips with noteToMidi for flats', () => {
    const flats = ['Db4', 'Eb4', 'Gb4', 'Ab4', 'Bb4']
    for (const note of flats) {
      expect(midiToNoteName(noteToMidi(note), false)).toBe(note)
    }
  })
})

// ============================================================
// toVexFlowKey
// ============================================================

describe('toVexFlowKey', () => {
  it('converts a natural note', () => {
    expect(toVexFlowKey('C4')).toBe('c/4')
  })

  it('converts a sharp note', () => {
    expect(toVexFlowKey('C#5')).toBe('c#/5')
  })

  it('converts a flat note', () => {
    expect(toVexFlowKey('Bb3')).toBe('bb/3')
  })

  it('converts case-insensitively', () => {
    expect(toVexFlowKey('c#5')).toBe('c#/5')
  })
})

// ============================================================
// getVexFlowAccidental
// ============================================================

describe('getVexFlowAccidental', () => {
  it('returns # for sharp notes', () => {
    expect(getVexFlowAccidental('C#5')).toBe('#')
  })

  it('returns b for flat notes', () => {
    expect(getVexFlowAccidental('Bb3')).toBe('b')
  })

  it('returns null for natural notes', () => {
    expect(getVexFlowAccidental('C4')).toBeNull()
  })
})

// ============================================================
// NATURALS & isNatural
// ============================================================

describe('NATURALS', () => {
  it('contains 7 notes in order', () => {
    expect(NATURALS).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })
})

describe('isNatural', () => {
  it('returns true for natural notes', () => {
    expect(isNatural('C4')).toBe(true)
    expect(isNatural('D5')).toBe(true)
  })

  it('returns false for sharps', () => {
    expect(isNatural('C#4')).toBe(false)
  })

  it('returns false for flats', () => {
    expect(isNatural('Bb3')).toBe(false)
  })
})

// ============================================================
// generateCardIds
// ============================================================

describe('generateCardIds', () => {
  it('generates naturals only when accidentals disabled', () => {
    const ids = generateCardIds({
      noteRange: { low: 'C4', high: 'E4' },
      clefs: { treble: true, bass: false },
      accidentals: { sharps: false, flats: false },
    })
    expect(ids).toEqual(['treble:C4', 'treble:D4', 'treble:E4'])
  })

  it('includes sharps when sharps enabled', () => {
    const ids = generateCardIds({
      noteRange: { low: 'C4', high: 'D4' },
      clefs: { treble: true, bass: false },
      accidentals: { sharps: true, flats: false },
    })
    expect(ids).toEqual(['treble:C4', 'treble:C#4', 'treble:D4'])
  })

  it('includes flats when flats enabled', () => {
    const ids = generateCardIds({
      noteRange: { low: 'C4', high: 'D4' },
      clefs: { treble: true, bass: false },
      accidentals: { sharps: false, flats: true },
    })
    expect(ids).toEqual(['treble:C4', 'treble:Db4', 'treble:D4'])
  })

  it('includes both sharp and flat variants when both enabled', () => {
    const ids = generateCardIds({
      noteRange: { low: 'C4', high: 'D4' },
      clefs: { treble: true, bass: false },
      accidentals: { sharps: true, flats: true },
    })
    expect(ids).toEqual(['treble:C4', 'treble:C#4', 'treble:Db4', 'treble:D4'])
  })

  it('crosses with enabled clefs', () => {
    const ids = generateCardIds({
      noteRange: { low: 'C4', high: 'D4' },
      clefs: { treble: true, bass: true },
      accidentals: { sharps: false, flats: false },
    })
    expect(ids).toEqual(['bass:C4', 'treble:C4', 'bass:D4', 'treble:D4'])
  })

  it('sorts by MIDI number then by clef', () => {
    const ids = generateCardIds({
      noteRange: { low: 'C4', high: 'C#4' },
      clefs: { treble: true, bass: true },
      accidentals: { sharps: true, flats: true },
    })
    expect(ids).toEqual([
      'bass:C4', 'treble:C4',
      'bass:C#4', 'bass:Db4', 'treble:C#4', 'treble:Db4',
    ])
  })

  it('returns correct count for naturals only', () => {
    const ids = generateCardIds({
      noteRange: { low: 'E4', high: 'F5' },
      clefs: { treble: true, bass: false },
      accidentals: { sharps: false, flats: false },
    })
    // E4, F4, G4, A4, B4, C5, D5, E5, F5 = 9 naturals
    expect(ids).toHaveLength(9)
  })

  it('produces deterministic output', () => {
    const config = {
      noteRange: { low: 'C4', high: 'G4' },
      clefs: { treble: true, bass: false } as { treble: boolean; bass: boolean },
      accidentals: { sharps: true, flats: false },
    }
    const first = generateCardIds(config)
    const second = generateCardIds(config)
    expect(first).toEqual(second)
  })

  it('handles only bass clef', () => {
    const ids = generateCardIds({
      noteRange: { low: 'C4', high: 'D4' },
      clefs: { treble: false, bass: true },
      accidentals: { sharps: false, flats: false },
    })
    expect(ids).toEqual(['bass:C4', 'bass:D4'])
  })

  it('returns empty array when no clefs enabled', () => {
    const ids = generateCardIds({
      noteRange: { low: 'C4', high: 'D4' },
      clefs: { treble: false, bass: false },
      accidentals: { sharps: false, flats: false },
    })
    expect(ids).toEqual([])
  })

  it('handles E/F and B/C correctly (no sharp between E-F or B-C)', () => {
    const ids = generateCardIds({
      noteRange: { low: 'E4', high: 'F4' },
      clefs: { treble: true, bass: false },
      accidentals: { sharps: true, flats: false },
    })
    expect(ids).toEqual(['treble:E4', 'treble:F4'])
  })
})
