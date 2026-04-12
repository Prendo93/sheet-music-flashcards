# Music Theory Encoding

## Overview

This document describes how musical notes are represented, validated, converted, and generated throughout the codebase. The core music logic lives in `src/lib/music.ts` with types defined in `src/types.ts`.

## Scientific Pitch Notation

All notes in the system use **scientific pitch notation** (SPN): a letter name, optional accidental, and octave number.

```
C#5  →  C = letter, # = accidental, 5 = octave
Bb3  →  B = letter, b = accidental, 3 = octave
F4   →  F = letter, (no accidental), 4 = octave
```

This is the standard encoding used in MIDI software, music theory, and the `ts-fsrs` card IDs.

## Note Letter Names

The seven natural note letters, in ascending order:

```
C  D  E  F  G  A  B
```

These repeat in every octave. The **chromatic scale** (all 12 semitones) within one octave:

```
C  C#/Db  D  D#/Eb  E  F  F#/Gb  G  G#/Ab  A  A#/Bb  B
```

## Accidentals

| Symbol | Name | Encoding | Meaning |
|---|---|---|---|
| `#` | Sharp | `'#'` | Raises pitch by one semitone |
| `b` | Flat | `'b'` | Lowers pitch by one semitone |
| (none) | Natural | `null` | No modification |

In `ParsedNote`, the accidental field is typed as `Accidental = '#' | 'b' | null`.

Double sharps (`##`) and double flats (`bb`) are not supported. They are rare in beginner sight-reading and would complicate the card generation and grading logic.

## MIDI Mapping

MIDI note numbers provide a universal numeric representation. The formula:

```
MIDI = (octave + 1) * 12 + semitone_offset
```

Where `semitone_offset` for each note letter:

| Note | C | C# | D | D# | E | F | F# | G | G# | A | A# | B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Offset | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |

Key reference points:

| Note | MIDI | Significance |
|---|---|---|
| A0 | 21 | Lowest piano key |
| C4 | 60 | Middle C |
| A4 | 69 | Concert pitch (440 Hz) |
| C8 | 108 | Highest piano key |

MIDI numbers are used for range comparison (is note X within the user's configured range?) and ordering (sorting notes chromatically). A note like `Bb3` maps to MIDI 58: `(3 + 1) * 12 + 10 = 58`.

### Range: A0 (21) to C8 (108)

The app limits valid notes to the 88-key piano range. Notes outside this range are rejected by validation.

## Enharmonic Equivalents

Two note names are **enharmonic** if they produce the same pitch:

```
C# = Db     (MIDI 61)
D# = Eb     (MIDI 63)
F# = Gb     (MIDI 66)
G# = Ab     (MIDI 68)
A# = Bb     (MIDI 70)
```

### Strict Matching (No Enharmonic Acceptance)

This app uses **strict name matching** — if the card shows C#, only "C#" is accepted, not "Db". See ADR-008 in `docs/decisions.md`.

**Why:** The goal is training precise notation reading. In real sheet music, C# and Db appear in different key signatures and musical contexts. A player must learn to read and name each spelling correctly. Accepting enharmonics would allow a student to avoid learning specific note spellings.

This means the grading function compares answer strings directly (case-insensitive) rather than converting to MIDI and comparing numbers.

## VexFlow Format

VexFlow (the notation rendering library) uses its own note format: lowercase letter + accidental + `/` + octave.

### Conversion Rules

| Scientific Pitch | VexFlow Key | Rule |
|---|---|---|
| `C4` | `c/4` | Lowercase, insert `/` before octave |
| `C#5` | `c#/5` | Accidental stays between letter and `/` |
| `Bb3` | `bb/3` | Flat `b` is kept (note: VexFlow uses lowercase `b`) |
| `F4` | `f/4` | No accidental, just letter and octave |

The conversion in code:

```typescript
// "C#5" → "c#/5"
const vfKey = note.toLowerCase().replace(/(\d)/, '/$1')
```

This regex finds the first digit (octave number) and inserts a `/` before it. The `toLowerCase()` call handles the case conversion.

**Important:** VexFlow accidentals must also be added as explicit modifiers on the `StaveNote` via `staveNote.addModifier(new Accidental('#'))`. The accidental in the key string positions the note on the staff, but the visual accidental symbol requires a separate modifier.

## Clef Ranges

### Treble Clef Staff Notes (No Ledger Lines)

```
Line/Space    Note
─────────────────────
5th line      F5
4th space     E5
4th line      D5
3rd space     C5
3rd line      B4
2nd space     A4
2nd line      G4
1st space     F4
1st line      E4
```

**Range: E4 to F5** — 9 natural notes. This is the default `noteRange` in `UserSettings`.

### Bass Clef Staff Notes (No Ledger Lines)

```
Line/Space    Note
─────────────────────
5th line      A3
4th space     G3
4th line      F3
3rd space     E3
3rd line      D3
2nd space     C3
2nd line      B2
1st space     A2
1st line      G2
```

**Range: G2 to A3** — 9 natural notes.

### Full Piano Range

A0 to C8 (MIDI 21 to 108). Users can expand their `noteRange` setting to include ledger-line notes above and below the staff.

## Card Generation Algorithm

Cards are generated from `UserSettings` by crossing three dimensions: notes, clefs, and accidentals. This logic lives in `src/lib/music.ts`.

### Steps

1. **Enumerate natural notes in range**: Starting from `noteRange.low`, walk chromatically up to `noteRange.high`, collecting all natural notes (no accidentals).

2. **Expand with accidentals**: For each natural note, optionally add sharp and/or flat variants based on settings:
   - If `accidentals.sharps` is true, add `{letter}#{octave}` (e.g., `C#5`)
   - If `accidentals.flats` is true, add `{letter}b{octave}` (e.g., `Db5`)
   - Skip invalid accidentals: `E#` and `B#` are enharmonic to natural notes (`F` and `C`) and are excluded. Similarly, `Fb` and `Cb` are excluded.

3. **Cross with clefs**: For each note, generate a card for each enabled clef:
   - If `clefs.treble` is true, generate `"treble:{note}"`
   - If `clefs.bass` is true, generate `"bass:{note}"`

4. **Produce card IDs**: The output is an array of deterministic IDs like `["treble:E4", "treble:F4", "treble:G4", ...]`.

### Example

With default settings (`E4-F5`, treble only, no accidentals):

```
Input:  noteRange={low:"E4", high:"F5"}, clefs={treble:true, bass:false}, accidentals={sharps:false, flats:false}
Output: ["treble:E4", "treble:F4", "treble:G4", "treble:A4", "treble:B4",
         "treble:C5", "treble:D5", "treble:E5", "treble:F5"]
```

With accidentals enabled and both clefs:

```
Input:  noteRange={low:"C4", high:"D4"}, clefs={treble:true, bass:true}, accidentals={sharps:true, flats:false}
Output: ["treble:C4", "treble:C#4", "treble:D4",
         "bass:C4", "bass:C#4", "bass:D4"]
```

### Card Upsert on Settings Change

When settings change, the card generator produces a new set of IDs. Cards are upserted:

- **New IDs** get fresh `CardRecord` entries (New state, default FSRS fields).
- **Existing IDs** are left untouched — their FSRS state is preserved.
- **Removed IDs** (notes no longer in range) are **not deleted** — the cards remain in IndexedDB but are simply not included in the study queue. This preserves review history if the user re-expands the range later.

Card regeneration is debounced on settings change to avoid excessive IndexedDB writes while the user adjusts sliders.

## Note Validation Rules

A note string is valid if it matches all of these:

| Component | Valid Values | Examples |
|---|---|---|
| Letter | A, B, C, D, E, F, G (case-insensitive) | `C`, `g`, `A` |
| Accidental | `#`, `b`, or omitted | `C#`, `Db`, `F` |
| Octave | 0 through 8 | `C4`, `A0`, `C8` |

Additional constraints:

- The full note must fall within the piano range: A0 (MIDI 21) to C8 (MIDI 108).
- The `ParsedNote` type decomposes any valid string: `{ letter: string, accidental: Accidental, octave: number }`.

### Parsing

```typescript
// "C#5" → { letter: "C", accidental: "#", octave: 5 }
// "Bb3" → { letter: "B", accidental: "b", octave: 3 }
// "F4"  → { letter: "F", accidental: null, octave: 4 }
```

The parser extracts the first character as the letter, checks the second character for `#` or `b`, and parses the remaining characters as the octave number. Invalid strings (wrong letter, missing octave, out of range) are rejected.
