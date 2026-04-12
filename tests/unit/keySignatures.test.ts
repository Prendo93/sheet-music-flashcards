import { describe, it, expect } from 'vitest'
import {
  getAvailableKeys,
  getCorrectAnswer,
  getAffectedNotes,
  isNoteAffected,
  generateKeySignatureCardIds,
} from '../../src/lib/keySignatures.ts'

// ============================================================
// getCorrectAnswer
// ============================================================

describe('getCorrectAnswer', () => {
  it('returns F#4 for F4 in G major (F is sharped)', () => {
    expect(getCorrectAnswer('F4', 'G')).toBe('F#4')
  })

  it('returns C4 unchanged for C4 in G major (C unaffected)', () => {
    expect(getCorrectAnswer('C4', 'G')).toBe('C4')
  })

  it('returns F4 unchanged in C major (no modifications)', () => {
    expect(getCorrectAnswer('F4', 'C')).toBe('F4')
  })

  it('returns Bb4 for B4 in F major', () => {
    expect(getCorrectAnswer('B4', 'F')).toBe('Bb4')
  })

  it('returns Bb4 for B4 in Bb major', () => {
    expect(getCorrectAnswer('B4', 'Bb')).toBe('Bb4')
  })

  it('returns Eb4 for E4 in Eb major', () => {
    expect(getCorrectAnswer('E4', 'Eb')).toBe('Eb4')
  })

  it('applies F# and C# in D major', () => {
    expect(getCorrectAnswer('F5', 'D')).toBe('F#5')
    expect(getCorrectAnswer('C3', 'D')).toBe('C#3')
    expect(getCorrectAnswer('G4', 'D')).toBe('G4')
  })

  it('applies all sharps in A major (F#, C#, G#)', () => {
    expect(getCorrectAnswer('F4', 'A')).toBe('F#4')
    expect(getCorrectAnswer('C4', 'A')).toBe('C#4')
    expect(getCorrectAnswer('G4', 'A')).toBe('G#4')
    expect(getCorrectAnswer('D4', 'A')).toBe('D4')
  })

  it('applies all sharps in E major (F#, C#, G#, D#)', () => {
    expect(getCorrectAnswer('F4', 'E')).toBe('F#4')
    expect(getCorrectAnswer('C4', 'E')).toBe('C#4')
    expect(getCorrectAnswer('G4', 'E')).toBe('G#4')
    expect(getCorrectAnswer('D4', 'E')).toBe('D#4')
    expect(getCorrectAnswer('A4', 'E')).toBe('A4')
  })

  it('applies Bb and Eb in Bb major', () => {
    expect(getCorrectAnswer('B3', 'Bb')).toBe('Bb3')
    expect(getCorrectAnswer('E5', 'Bb')).toBe('Eb5')
    expect(getCorrectAnswer('A4', 'Bb')).toBe('A4')
  })

  it('applies Bb, Eb, Ab in Eb major', () => {
    expect(getCorrectAnswer('B4', 'Eb')).toBe('Bb4')
    expect(getCorrectAnswer('E4', 'Eb')).toBe('Eb4')
    expect(getCorrectAnswer('A4', 'Eb')).toBe('Ab4')
    expect(getCorrectAnswer('D4', 'Eb')).toBe('D4')
  })

  it('works across different octaves', () => {
    expect(getCorrectAnswer('F2', 'G')).toBe('F#2')
    expect(getCorrectAnswer('F7', 'G')).toBe('F#7')
    expect(getCorrectAnswer('B0', 'F')).toBe('Bb0')
    expect(getCorrectAnswer('B8', 'F')).toBe('Bb8')
  })
})

// ============================================================
// getAffectedNotes
// ============================================================

describe('getAffectedNotes', () => {
  it('returns ["F"] for G major', () => {
    expect(getAffectedNotes('G')).toEqual(['F'])
  })

  it('returns ["F", "C"] for D major', () => {
    expect(getAffectedNotes('D')).toEqual(['F', 'C'])
  })

  it('returns empty array for C major', () => {
    expect(getAffectedNotes('C')).toEqual([])
  })

  it('returns ["B"] for F major', () => {
    expect(getAffectedNotes('F')).toEqual(['B'])
  })

  it('returns ["B", "E"] for Bb major', () => {
    expect(getAffectedNotes('Bb')).toEqual(['B', 'E'])
  })

  it('returns ["B", "E", "A"] for Eb major', () => {
    expect(getAffectedNotes('Eb')).toEqual(['B', 'E', 'A'])
  })
})

// ============================================================
// isNoteAffected
// ============================================================

describe('isNoteAffected', () => {
  it('returns true for F in G major', () => {
    expect(isNoteAffected('F', 'G')).toBe(true)
  })

  it('returns false for C in G major', () => {
    expect(isNoteAffected('C', 'G')).toBe(false)
  })

  it('returns true for B in F major', () => {
    expect(isNoteAffected('B', 'F')).toBe(true)
  })

  it('returns false for any note in C major', () => {
    expect(isNoteAffected('A', 'C')).toBe(false)
    expect(isNoteAffected('F', 'C')).toBe(false)
  })
})

// ============================================================
// getAvailableKeys
// ============================================================

describe('getAvailableKeys', () => {
  it('returns all 8 key signatures', () => {
    const keys = getAvailableKeys()
    expect(keys).toHaveLength(8)
  })

  it('includes all expected keys', () => {
    const keys = getAvailableKeys()
    expect(keys).toContain('C')
    expect(keys).toContain('G')
    expect(keys).toContain('D')
    expect(keys).toContain('A')
    expect(keys).toContain('E')
    expect(keys).toContain('F')
    expect(keys).toContain('Bb')
    expect(keys).toContain('Eb')
  })
})

// ============================================================
// generateKeySignatureCardIds
// ============================================================

describe('generateKeySignatureCardIds', () => {
  it('generates 9 cards for G major, treble, E4-F5 range', () => {
    const ids = generateKeySignatureCardIds({
      noteRange: { low: 'E4', high: 'F5' },
      clefs: { treble: true, bass: false },
      keySignatures: ['G'],
    })
    // E4, F4, G4, A4, B4, C5, D5, E5, F5 = 9 naturals × 1 clef × 1 keySig
    expect(ids).toHaveLength(9)
  })

  it('generates correct count with G+F major, both clefs', () => {
    const ids = generateKeySignatureCardIds({
      noteRange: { low: 'C4', high: 'D4' },
      clefs: { treble: true, bass: true },
      keySignatures: ['G', 'F'],
    })
    // C4, D4 = 2 naturals × 2 clefs × 2 keySigs = 8
    expect(ids).toHaveLength(8)
  })

  it('card IDs have correct format clef:note:keySig', () => {
    const ids = generateKeySignatureCardIds({
      noteRange: { low: 'E4', high: 'E4' },
      clefs: { treble: true, bass: false },
      keySignatures: ['G'],
    })
    expect(ids).toEqual(['treble:E4:G'])
  })

  it('returns empty array for empty keySignatures', () => {
    const ids = generateKeySignatureCardIds({
      noteRange: { low: 'E4', high: 'F5' },
      clefs: { treble: true, bass: false },
      keySignatures: [],
    })
    expect(ids).toEqual([])
  })

  it('skips C in keySignatures array (base cards already exist)', () => {
    const ids = generateKeySignatureCardIds({
      noteRange: { low: 'E4', high: 'E4' },
      clefs: { treble: true, bass: false },
      keySignatures: ['C', 'G'],
    })
    // Only G generates cards, not C
    expect(ids).toEqual(['treble:E4:G'])
  })

  it('includes ALL notes in range, not just affected ones', () => {
    const ids = generateKeySignatureCardIds({
      noteRange: { low: 'C4', high: 'E4' },
      clefs: { treble: true, bass: false },
      keySignatures: ['G'],
    })
    // C4, D4, E4 — all included even though only F is affected by G major
    expect(ids).toHaveLength(3)
    expect(ids).toContain('treble:C4:G')
    expect(ids).toContain('treble:D4:G')
    expect(ids).toContain('treble:E4:G')
  })

  it('only uses natural notes within range (no accidentals)', () => {
    const ids = generateKeySignatureCardIds({
      noteRange: { low: 'C4', high: 'C#4' },
      clefs: { treble: true, bass: false },
      keySignatures: ['G'],
    })
    // Only C4 is a natural; C#4 is skipped since key sig cards use naturals
    expect(ids).toEqual(['treble:C4:G'])
  })
})
