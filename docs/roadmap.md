# Post-v1 Roadmap (Revised)

## Context

v1 is shipped: single notes on treble/bass clef, FSRS spaced repetition, auto-grading, NotePicker, VexFlow rendering, piano diagram on reveal, IndexedDB, settings. 188 unit/component tests + 9 E2E tests.

This roadmap was reviewed by 4 experts (music pedagogy, UX/product, tech architecture, devil's advocate). The revisions below incorporate their feedback.

---

## Why This App

The unique value is **research-backed spaced repetition (FSRS) applied specifically to sight-reading**. Most music reading apps use ad-hoc difficulty curves or fixed lesson plans. This app uses the same algorithm as Anki (FSRS v6) to optimally schedule each note for review based on individual performance. It's free, zero-install (PWA), open-source, and works offline.

---

## Release Structure

### Must Build (v1.1–v1.5)
Core features that make the app viable for daily use. Focused on retention, data safety, and pedagogical completeness.

### Aspirational (v2.0+)
Natural extensions that would be valuable but are not committed. Build if demand materializes.

---

## v1.1 — Retention + Data Safety

**Goal:** Give users a reason to come back and protect their data from browser purges. This is the most critical post-v1 release.

### Streak + Today Stats Widget

Show on the study page (not a separate tab):
- Cards reviewed today
- Accuracy today
- Current streak (consecutive days with ≥1 review)

**Implementation:** Query `reviewLogs` via the existing `getReviewLogsSince()` in `src/lib/db.ts`. Streak calculation: count consecutive days backward from today with ≥1 review log. Day boundary = midnight local time.

New file: `src/lib/stats.ts` (~40 lines)
New component: `src/components/TodayStats.tsx` — renders above the study session
Tests: streak calculation edge cases, day boundary, display

### PWA (Manifest + Service Worker)

- `public/manifest.json` with `display: "standalone"`, `orientation: "portrait"`
- `vite-plugin-pwa` with `registerType: 'prompt'` — shows "New version available" banner on updates instead of silently caching stale assets
- This exempts the origin from Safari ITP 7-day eviction when installed

**Effort:** ~1 hour. No install prompt UI yet (v1.5), just the manifest + SW.

### Minimal Data Export

One-way JSON export button in Settings. ~20 lines:
```typescript
async function exportData(): Promise<void> {
  const data = { version: 1, exportedAt: new Date().toISOString(), settings, cards, reviewLogs }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `flashcards-backup-${new Date().toISOString().slice(0,10)}.json`
  a.click()
}
```

Import/merge logic deferred to v1.5. This is the safety net for Safari data loss.

### Interactive Onboarding

2 screens max (not 3 informational screens):
1. One sentence: "Identify the note on the staff"
2. A real practice card (middle C on treble clef) — user taps the answer on NotePicker

Gate on `settings.hasSeenOnboarding` (field already exists). Teaches by doing, not by reading.

### Audio Feedback

Raw Web Audio API synth (`src/lib/synth.ts`, ~50 lines). Plays note after answering.
- Triangle oscillator + exponential gain ramp
- `ensureContext()` on first user gesture
- `UserSettings.audioFeedback: boolean` (default true)
- Try/catch — silent failure if audio breaks (enhancement, not critical)

Schema change: `UserSettings` gets `audioFeedback` field.

### Haptic Feedback

```typescript
navigator.vibrate?.(50)       // correct
navigator.vibrate?.([50,50,50]) // incorrect
```

Progressive enhancement in `ResultFeedback` component.

### Estimated effort: 2–3 days

---

## v1.2 — Dark Mode + Key Signatures

### Dark Mode

- Tailwind `dark:` variants + `data-theme` attribute on `<html>`
- Settings: "Theme" → System / Light / Dark (3-way toggle)
- VexFlow SVG: CSS override for stroke/fill colors. Note: VexFlow hardcodes black strokes — need `svg path { stroke: var(--staff-color) }` approach. Test carefully.
- PianoKeyboard: swap white/black key colors

### Key Signatures — Detailed Design

#### Core Concept

Key signatures tell the reader which notes are sharped or flatted throughout a piece. In G major, every F is played as F#. The sharp is shown once at the start of the staff (in the key signature), NOT next to each F note. The reader must remember which notes are affected.

This is a critical sight-reading skill. A reader who ignores key signatures will play wrong notes constantly in real music.

#### How It Works in the App

**All notes are tested in key-sig context.** When a key signature is active (e.g., G major), every card in the session shows the key signature on the staff. The student must read the note WITH the key signature in mind:

- A note on the F line → answer is "F#" (because G major has F#)
- A note on the C space → answer is still "C" (unaffected by G major)
- A note on the D line → answer is still "D" (unaffected by G major)

This tests that the student can read with the key signature present — both for affected notes (they must remember to apply the sharp/flat) AND unaffected notes (they must NOT over-apply the key signature).

#### VexFlow Rendering

**No accidental shown on affected notes** — this is how real sheet music works. The key signature at the start of the staff tells the reader. The note sits on its line/space with no additional mark.

```typescript
// Render the stave with key signature
const stave = new Stave(10, 40, 430)
stave.addClef(clef).addKeySignature('G')  // Shows one sharp (F#) on the staff
stave.setContext(context).draw()

// Render the note — NO accidental modifier even though it's F#
const staveNote = new StaveNote({
  clef,
  keys: ['f/4'],     // VexFlow key is 'f/4', not 'f#/4'
  duration: 'w',
})
// Do NOT add Accidental('#') — the key sig handles it
```

**Key insight for VexFlow:** The note is rendered at its natural position (F line), and the key signature displayed at the start of the staff is what tells the reader it's F#. We do NOT render the note as F# with an accidental mark — that would be redundant and not how music works.

#### FSRS and Card IDs

**Per-key card IDs for affected notes.** The tech architect review identified that sharing one FSRS schedule across different key contexts conflates different skills.

Card ID format: `${clef}:${note}:${keySig}`

Examples:
- `treble:F4:C` — F4 in C major (answer: F4) — this is the existing v1 card
- `treble:F4:G` — F4 in G major (answer: F#4) — new card, independent FSRS schedule
- `treble:C4:G` — C4 in G major (answer: C4) — unaffected note, but STILL a separate card because reading C4 with G major's key signature present is a different skill than reading C4 with no key signature (the student must consciously decide "this note is NOT affected")

**Card generation for key signatures:**

```typescript
function generateKeySignatureCards(
  noteRange: { low: string; high: string },
  clefs: { treble: boolean; bass: boolean },
  keySignatures: string[]
): string[] {
  const baseNotes = enumerateNotesInRange(noteRange) // naturals in range
  const enabledClefs = getEnabledClefs(clefs)
  const cards: string[] = []

  for (const keySig of keySignatures) {
    if (keySig === 'C') continue  // C major cards already exist as base cards (no key sig suffix)

    for (const note of baseNotes) {
      for (const clef of enabledClefs) {
        cards.push(`${clef}:${note}:${keySig}`)
      }
    }
  }

  return cards
}
```

**Combinatorial analysis:**
- E4–F5 range (9 naturals) × 1 clef × G major = 9 new cards
- E4–F5 range × 1 clef × G + F major = 18 new cards
- Even with 4 key signatures and 2 clefs: 9 × 2 × 4 = 72 cards — manageable

#### Correct Answer Logic

```typescript
// src/lib/keySignatures.ts

const KEY_SIGNATURES: Record<string, Record<string, string>> = {
  'C': {},                                    // no modifications
  'G': { 'F': 'F#' },                        // F → F# in all octaves
  'D': { 'F': 'F#', 'C': 'C#' },
  'A': { 'F': 'F#', 'C': 'C#', 'G': 'G#' },
  'E': { 'F': 'F#', 'C': 'C#', 'G': 'G#', 'D': 'D#' },
  'F': { 'B': 'Bb' },
  'Bb': { 'B': 'Bb', 'E': 'Eb' },
  'Eb': { 'B': 'Bb', 'E': 'Eb', 'A': 'Ab' },
}

function getCorrectAnswer(note: string, keySig: string): string {
  const parsed = parseNote(note)  // e.g., { letter: 'F', accidental: null, octave: 4 }
  const modifications = KEY_SIGNATURES[keySig] || {}
  const modified = modifications[parsed.letter]

  if (modified) {
    // This note's letter is affected by the key signature
    // e.g., F → F# in G major
    return `${modified}${parsed.octave}`  // "F#4"
  }

  // Not affected — answer is the natural note
  return note  // "C4"
}
```

#### NotePicker Adaptation

When key signatures are active, the NotePicker MUST show the accidental row (♮ / ♯ / ♭), even if the global accidentals setting is off. The student needs to be able to answer "F#4" for affected notes.

```typescript
const showAccidentals = settings.accidentals.sharps ||
                         settings.accidentals.flats ||
                         sessionKeySignature !== 'C'
```

#### Session Key Selection

When starting a session with key signatures enabled:
1. Randomly select ONE key signature from the enabled list
2. ALL cards in that session use this key context
3. Display the selected key at the top: "Studying in G major"
4. This models real music (a piece is in one key)

Future enhancement: mixed-key sessions where the key changes mid-session (more advanced).

#### Settings UI

```
Key Signatures section:
  [C] [G] [D] [A] [E]     ← sharp keys (circle of fifths order)
  [F] [Bb] [Eb] [Ab]      ← flat keys

Currently studying: G major (1 sharp: F#)
```

Toggle buttons, multiple can be selected. When a session starts, one is randomly chosen. C is always enabled (can't be deselected).

#### Progression Integration

| Level | Key Signatures Unlocked |
|---|---|
| 0–3 | C only (no key signature) |
| 4 | G major (1#) and F major (1♭) |
| 5 | D major (2#) and B♭ major (2♭) |
| 6–7 | (range/other features) |
| 8 | A, E♭ major (3#/3♭) |
| 9+ | All keys available |

#### Natural Signs (♮) — Deferred

When a note that IS affected by the key signature needs to be played as natural (a chromatic alteration within the piece), a natural sign (♮) is shown next to the note. This is a second-order concept:
- Student must know the key signature says "F is F#"
- Student must then see the ♮ and override that to "F is F natural here"

This requires explicit ♮ rendering in VexFlow (`new Accidental('n')`) and a different card type. Defer to v1.4+.

### Estimated effort: 3–4 days

---

## v1.3 — Progression System

**Goal:** Automatically expand the card pool as the user demonstrates mastery.

### Revised Progression Tiers (incorporating pedagogy review)

| Level | Name | Unlocks |
|---|---|---|
| 0 | Beginner | Treble clef, naturals, E4–F5 (on staff, no ledger lines) |
| 1 | Bass Clef | Bass clef naturals, G2–A3 (on bass staff) |
| 2 | Accidentals | Sharps and flats (same ranges — no range expansion yet) |
| 3 | First Ledger Lines | C4 (treble), middle C (bass) — one ledger line each direction |
| 4 | Key Sigs I | G major and F major |
| 5 | Key Sigs II | D, Bb, A, Eb major |
| 6 | Wider Range | 2+ ledger lines: A3–C6 (treble), C2–E4 (bass) |
| 7 | All Keys | Remaining major key signatures |
| 8+ | Full Control | Manual settings, no further auto-unlock |

**Key changes from original:**
- Accidentals before range expansion (build naming skill before spatial expansion)
- Ledger lines folded into range expansion, not isolated
- Landmark notes (treble G, bass F, middle C) trained implicitly at levels 0-3

### Unlock Criteria

```typescript
interface UnlockCriteria {
  minCardsAtReviewState: number   // Cards graduated from Learning → Review
  minAverageRetention: number     // e.g. 0.85 across current pool
  minTotalReviews: number         // Minimum reviews at this level
}
```

No `minDaysAtLevel` — performance-based only.

### Implementation

- `src/lib/progression.ts` — milestone definitions + `evaluateProgression()`
- Run at end of each session
- Auto vs manual: `UserSettings.autoProgression: boolean` (default true)
- Manual override always available in Settings

### Estimated effort: 2–3 days

---

## v1.4 — Stats Dashboard + Error Analytics

### Stats Page (3rd tab: Study | Stats | Settings)

**Today section:**
- Cards reviewed today, accuracy, current streak (already computed in v1.1 widget)

**Progress section:**
- Total cards by state (New / Learning / Review / Relearning)
- Mastery percentage
- **Most confused notes** — top 5 notes with lowest accuracy from review logs. High-value, trivial to compute.

**History section:**
- Last 7 days bar chart (simple div bars, no charting library)
- No heatmap (cut per UX reviewer — high effort, low signal)

### Daily Summary Store (performance optimization)

Per tech architect recommendation: add `dailySummary` IndexedDB store keyed by date string `{ date, reviewCount, correctCount }`. Append at session end. Stats reads ~7-90 small records instead of scanning thousands of review logs.

### Estimated effort: 2–3 days

---

## v1.5 — Data Import + Polish

### Data Import

Full import with merge logic:
- Parse JSON, validate version
- Card merge: keep whichever has more reviews
- Review log merge: by ID (idempotent)
- Schema migration on import for older versions

### Safari ITP Mitigation

- "Add to Home Screen" prompt (detect `beforeinstallprompt`, show on 3rd visit)
- Weekly backup reminder if `navigator.storage.persisted()` returns false

### Virtual Piano Input Mode

Make the existing `PianoKeyboard` component tappable as an input method (alternative to NotePicker):
- User taps the correct key on the piano diagram
- Settings toggle: "Input mode" → Note Picker / Piano Keyboard
- Reuses existing `PianoKeyboard.tsx` with added `onKeyTap` callback

### Audio Note Recognition Input Mode

Use the device microphone to detect which note the user plays on their real piano.

**How it works:**
1. User sees note on staff → plays it on their piano near the phone
2. App captures audio via `navigator.mediaDevices.getUserMedia({ audio: true })`
3. Pitch detection algorithm (autocorrelation or FFT) identifies the fundamental frequency
4. Convert frequency to MIDI note number → note name
5. Compare with correct answer

**Implementation:**
- `src/lib/pitchDetection.ts` — microphone capture + pitch detection
- Use the Web Audio API `AnalyserNode` to get frequency data
- Autocorrelation algorithm for pitch detection (~100 lines, well-documented algorithm)
- Accuracy target: correctly identify piano notes within ±50 cents (half a semitone)
- Latency: detect within 200ms of note onset

**UI flow:**
- Settings toggle: "Input mode" → Note Picker / Piano Keyboard / Play on Piano
- When active, show a microphone indicator and "Play the note..." prompt instead of NotePicker
- Visual feedback: detected frequency shown in real-time, locks in when stable for 100ms
- Fallback: if mic permission denied, show explanation + fall back to NotePicker

**Permissions:**
- `getUserMedia` requires HTTPS (already via PWA) and user permission
- Handle denial gracefully — disable the toggle and show explanation
- Show permission prompt on first enable, not on app startup

**Challenges:**
- Background noise filtering — piano notes have strong harmonics, use fundamental frequency
- Octave detection — autocorrelation can confuse octaves; use amplitude-weighted detection
- Multiple notes — if user accidentally plays two keys, take the loudest/most recent
- Mobile mic quality — test on real devices; phone mics are surprisingly good for pitch detection

### Estimated effort: 3–4 days

---

## Aspirational (v2.0+)

These are not committed. Build if demand materializes.

### v2.0 — Intervals + Chords (Combined)

Intervals ARE chords — a 2-note chord is an interval, a 3-note chord is a triad. Treat them as one feature with progressive difficulty.

**Progressive difficulty:**
1. **2-note intervals:** Show 2 stacked notes → identify the interval name (3rd, 5th, etc.) AND both note names
2. **Major/minor triads (root position):** 3 stacked notes → identify chord name (C major, Am, etc.)
3. **Triad inversions:** Same triads in 1st and 2nd inversion
4. **7th chords:** Dominant 7th, major 7th, minor 7th

**Input:** Root note picker + quality selector (Major / Minor / Dim / Aug / 7th). For intervals: interval name buttons (2nd through octave).

**Schema change:** CardRecord gains `type: 'single' | 'chord'` and `notes: string[]`. Batch migration in `openDB` upgrade — existing single-note cards get `type: 'single'` and `notes: [note]`.

**VexFlow:** Render chords as stacked note heads on one stem. Already supported.

### v2.1 — Multi-Note Sequences

3-4 notes in a measure → identify in order.

- Intermediate step: "note pairs" (2 notes) before full sequences
- Trains left-to-right scanning and pattern recognition
- Sequential NotePicker input — each correct note highlights green on staff

---

## Schema Migration Strategy

**Batch migration on DB upgrade** (not lazy per-record).

Use `idb`'s `upgrade(db, oldVersion, newVersion, tx)` callback. Walk all records in the transaction — atomic rollback if migration fails. Add a `migration_log` store for debugging.

Per-record `schema_version` retained only for the import path (records may arrive at any version from export files).

### Planned Schema Changes

| DB Version | Trigger | Changes |
|---|---|---|
| 1 | v1 (current) | Initial: cards, reviewLogs, settings stores |
| 2 | v1.1 | UserSettings: `+audioFeedback`, `+theme` |
| 3 | v1.2 | UserSettings: `+keySignatures`. New key-sig cards generated (additive, no migration of existing cards). |
| 4 | v1.3 | UserSettings: `+autoProgression`, `+progressionLevel`. `+dailySummary` store. |
| 5 | v2.0 | CardRecord: `+type` (single/chord), `note` → `notes[]` array. Batch migration of existing cards. |

Migration functions are written when needed, not pre-written.

---

## Infrastructure (Ongoing)

- **Performance budget:** Initial JS < 50KB gzip, LCP < 2s on 3G
- **Route-level code splitting:** Lazy-load Stats page, Settings page, Onboarding via `lazy()` + `Suspense`
- **Error boundaries:** Wrap SheetMusicDisplay (VexFlow can throw), wrap IndexedDB ops
- **CI/CD:** GitHub Actions: `npm test` + `npx playwright test` + `npx tsc -b`
- **Accessibility:** axe-core in component tests, focus management, screen reader announcements
- **Debounced card regeneration:** 300ms debounce on settings changes in `app.tsx`

---

## Review Team Findings (Summary)

### Music Pedagogy Expert
- **Adopted:** Reorder progression (accidentals before range expansion, ledger lines folded in, not isolated)
- **Adopted:** Intervals before chords, not parallel
- **Adopted:** Basic rhythm earlier (moved to v1.5/progression level 7)
- **Adopted:** Landmark notes trained implicitly via progression tiers 0-3
- **Noted:** Grand staff (both clefs simultaneously) missing — add as aspirational
- **Noted:** Add "note pair" step between single notes and sequences

### UX + Product Expert
- **Adopted:** v1.1 = retention + data safety (streak, PWA, export), not just polish
- **Adopted:** Interactive onboarding (practice card, not info screens)
- **Adopted:** Cut heatmap from stats (simple 7-day bars instead)
- **Adopted:** Virtual piano input before MIDI (reuse PianoKeyboard component)
- **Adopted:** Cut v2.2 (rhythm) and v3.0 (sequences) to aspirational

### Technical Architect
- **Adopted:** Batch migration on DB upgrade, not lazy per-record
- **Adopted:** Key-sig-affected notes get per-key card IDs (FSRS flaw fix)
- **Adopted:** Clean `note` → `notes[]` migration, not dual fields
- **Adopted:** `dailySummary` store for stats performance
- **Adopted:** PWA `registerType: 'prompt'` for cache freshness
- **Adopted:** Route-level code splitting with `lazy()` + `Suspense`
- **Noted:** MIDI is desktop-only, hide toggle on mobile

### Devil's Advocate
- **Adopted:** Reorder releases — retention before polish
- **Adopted:** Split roadmap into Must Build vs Aspirational
- **Adopted:** Double timeline estimates
- **Adopted:** "Most confused notes" error analytics in stats
- **Adopted:** "Why This App" positioning around FSRS
- **Noted:** Mixed-clef switching practice missing — add as progression feature
- **Noted:** No competitive moat beyond FSRS — lean into algorithm transparency

---

## Approximate Timeline

| Release | Theme | Effort |
|---|---|---|
| v1.1 | Streak, PWA, export, onboarding, audio, haptic | 2–3 days |
| v1.2 | Dark mode, key signatures | 3–4 days |
| v1.3 | Progression system | 2–3 days |
| v1.4 | Stats dashboard + error analytics | 2–3 days |
| v1.5 | Data import, basic rhythm, virtual piano input | 3–4 days |

Aspirational releases not estimated — build when ready.
