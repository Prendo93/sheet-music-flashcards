import { describe, it, expect } from 'vitest'
import {
  INTERVALS,
  CHORD_QUALITIES,
  getIntervalName,
  getInterval,
  identifyChord,
  buildChord,
  generateIntervalCardIds,
  generateChordCardIds,
} from '../../src/lib/chords.ts'

// ============================================================
// INTERVALS constant
// ============================================================

describe('INTERVALS', () => {
  it('has correct semitone value for unison', () => {
    expect(INTERVALS['unison']).toBe(0)
  })

  it('has correct semitone value for minor 2nd', () => {
    expect(INTERVALS['minor 2nd']).toBe(1)
  })

  it('has correct semitone value for major 3rd', () => {
    expect(INTERVALS['major 3rd']).toBe(4)
  })

  it('has correct semitone value for perfect 5th', () => {
    expect(INTERVALS['perfect 5th']).toBe(7)
  })

  it('has correct semitone value for octave', () => {
    expect(INTERVALS['octave']).toBe(12)
  })
})

// ============================================================
// CHORD_QUALITIES constant
// ============================================================

describe('CHORD_QUALITIES', () => {
  it('major has [0, 4, 7]', () => {
    expect(CHORD_QUALITIES['major']).toEqual([0, 4, 7])
  })

  it('minor has [0, 3, 7]', () => {
    expect(CHORD_QUALITIES['minor']).toEqual([0, 3, 7])
  })

  it('diminished has [0, 3, 6]', () => {
    expect(CHORD_QUALITIES['diminished']).toEqual([0, 3, 6])
  })

  it('dominant 7th has [0, 4, 7, 10]', () => {
    expect(CHORD_QUALITIES['dominant 7th']).toEqual([0, 4, 7, 10])
  })
})

// ============================================================
// getIntervalName
// ============================================================

describe('getIntervalName', () => {
  it('returns "major 3rd" for 4 semitones', () => {
    expect(getIntervalName(4)).toBe('major 3rd')
  })

  it('returns "perfect 5th" for 7 semitones', () => {
    expect(getIntervalName(7)).toBe('perfect 5th')
  })

  it('returns "unison" for 0 semitones', () => {
    expect(getIntervalName(0)).toBe('unison')
  })

  it('returns "octave" for 12 semitones', () => {
    expect(getIntervalName(12)).toBe('octave')
  })

  it('returns "minor 2nd" for 1 semitone', () => {
    expect(getIntervalName(1)).toBe('minor 2nd')
  })

  it('returns "tritone" for 6 semitones', () => {
    expect(getIntervalName(6)).toBe('tritone')
  })
})

// ============================================================
// getInterval
// ============================================================

describe('getInterval', () => {
  it('C4 to E4 is 4 semitones (major 3rd)', () => {
    expect(getInterval('C4', 'E4')).toBe(4)
  })

  it('C4 to G4 is 7 semitones (perfect 5th)', () => {
    expect(getInterval('C4', 'G4')).toBe(7)
  })

  it('C4 to C5 is 12 semitones (octave)', () => {
    expect(getInterval('C4', 'C5')).toBe(12)
  })

  it('returns absolute distance regardless of order', () => {
    expect(getInterval('E4', 'C4')).toBe(4)
  })
})

// ============================================================
// buildChord
// ============================================================

describe('buildChord', () => {
  it('builds C major: C4, E4, G4', () => {
    expect(buildChord('C4', 'major')).toEqual(['C4', 'E4', 'G4'])
  })

  it('builds A minor: A3, C4, E4', () => {
    expect(buildChord('A3', 'minor')).toEqual(['A3', 'C4', 'E4'])
  })

  it('builds G dominant 7th: G4, B4, D5, F5', () => {
    expect(buildChord('G4', 'dominant 7th')).toEqual(['G4', 'B4', 'D5', 'F5'])
  })

  it('throws for unknown quality', () => {
    expect(() => buildChord('C4', 'unknown')).toThrow()
  })
})

// ============================================================
// identifyChord
// ============================================================

describe('identifyChord', () => {
  it('identifies C major from [C4, E4, G4]', () => {
    expect(identifyChord(['C4', 'E4', 'G4'])).toBe('C major')
  })

  it('identifies A minor from [A3, C4, E4]', () => {
    expect(identifyChord(['A3', 'C4', 'E4'])).toBe('A minor')
  })

  it('returns null for only 2 notes (interval, not chord)', () => {
    expect(identifyChord(['C4', 'E4'])).toBeNull()
  })

  it('returns null for unknown quality', () => {
    expect(identifyChord(['C4', 'D4', 'F#4'])).toBeNull()
  })
})

// ============================================================
// generateIntervalCardIds
// ============================================================

describe('generateIntervalCardIds', () => {
  it('produces IDs in "interval:clef:note1+note2" format', () => {
    const ids = generateIntervalCardIds({
      noteRange: { low: 'C4', high: 'E4' },
      intervals: ['major 3rd'],
      clefs: { treble: true, bass: false },
    })
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(id).toMatch(/^interval:treble:[A-G][#b]?\d\+[A-G][#b]?\d$/)
    }
  })

  it('generates correct ID for major 3rd from C4', () => {
    const ids = generateIntervalCardIds({
      noteRange: { low: 'C4', high: 'E4' },
      intervals: ['major 3rd'],
      clefs: { treble: true, bass: false },
    })
    expect(ids).toContain('interval:treble:C4+E4')
  })

  it('skips intervals that go out of range', () => {
    const ids = generateIntervalCardIds({
      noteRange: { low: 'C4', high: 'E4' },
      intervals: ['octave'],
      clefs: { treble: true, bass: false },
    })
    // C4 + octave = C5 which is > E4, so no valid intervals
    expect(ids).toEqual([])
  })

  it('returns empty array for empty intervals list', () => {
    const ids = generateIntervalCardIds({
      noteRange: { low: 'C4', high: 'G4' },
      intervals: [],
      clefs: { treble: true, bass: false },
    })
    expect(ids).toEqual([])
  })

  it('generates IDs for both clefs when both enabled', () => {
    const ids = generateIntervalCardIds({
      noteRange: { low: 'C4', high: 'E4' },
      intervals: ['major 3rd'],
      clefs: { treble: true, bass: true },
    })
    expect(ids).toContain('interval:treble:C4+E4')
    expect(ids).toContain('interval:bass:C4+E4')
  })
})

// ============================================================
// generateChordCardIds
// ============================================================

describe('generateChordCardIds', () => {
  it('produces IDs in "chord:clef:note1+note2+note3" format', () => {
    const ids = generateChordCardIds({
      noteRange: { low: 'C4', high: 'G4' },
      qualities: ['major'],
      clefs: { treble: true, bass: false },
    })
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(id).toMatch(/^chord:treble:[A-G][#b]?\d(\+[A-G][#b]?\d){2,}$/)
    }
  })

  it('generates C major chord ID within range', () => {
    const ids = generateChordCardIds({
      noteRange: { low: 'C4', high: 'G4' },
      qualities: ['major'],
      clefs: { treble: true, bass: false },
    })
    expect(ids).toContain('chord:treble:C4+E4+G4')
  })

  it('skips chords that go out of range', () => {
    const ids = generateChordCardIds({
      noteRange: { low: 'C4', high: 'E4' },
      qualities: ['major'],
      clefs: { treble: true, bass: false },
    })
    // C major needs C4+E4+G4, G4 > E4, so no valid chords
    expect(ids).toEqual([])
  })

  it('returns empty array for empty qualities list', () => {
    const ids = generateChordCardIds({
      noteRange: { low: 'C4', high: 'G4' },
      qualities: [],
      clefs: { treble: true, bass: false },
    })
    expect(ids).toEqual([])
  })

  it('generates IDs for both clefs when both enabled', () => {
    const ids = generateChordCardIds({
      noteRange: { low: 'C4', high: 'G4' },
      qualities: ['major'],
      clefs: { treble: true, bass: true },
    })
    expect(ids).toContain('chord:treble:C4+E4+G4')
    expect(ids).toContain('chord:bass:C4+E4+G4')
  })
})
