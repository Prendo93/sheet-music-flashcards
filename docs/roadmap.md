# Post-v1 Roadmap

## What v1 Ships With

- Single notes on treble/bass clef (naturals + accidentals)
- FSRS v6 spaced repetition via ts-fsrs
- Auto-grading (correct/incorrect + response time → FSRS rating)
- Structured NotePicker input (no soft keyboard)
- VexFlow 5 SVG rendering (lazy-loaded)
- Piano keyboard diagram on answer reveal
- IndexedDB persistence with `navigator.storage.persist()`
- Settings: note range, clefs, accidentals, session size, new cards/day
- Session summary, skip/IDK, undo grade
- 188 unit/component tests + 9 Playwright E2E tests
- Mobile-first (Pixel 5 viewport), portrait layout

## What v1 Does NOT Have

No audio, no key signatures, no chords, no progression system, no stats dashboard, no dark mode, no PWA, no data export UI, no MIDI input, no onboarding.

---

## v1.1 — Audio Feedback + Polish

**Goal:** Play the note's sound after answering to reinforce the notation→sound association. Polish the UX with dark mode and onboarding.

### Audio Feedback (not a cue — feedback only)

**What:** After the user answers (correctly or not), play the note's audio. This is multi-modal reinforcement: see the notation, see the piano diagram, hear the sound. Audio is NOT a cue mode (ear training is separate).

**Implementation:**

1. **Raw Web Audio API synth** (~50 lines, no Tone.js dependency):
   ```typescript
   // src/lib/synth.ts
   let ctx: AudioContext | null = null

   function ensureContext(): AudioContext {
     if (!ctx) ctx = new AudioContext()
     if (ctx.state === 'suspended') ctx.resume()
     return ctx
   }

   function midiToFrequency(midi: number): number {
     return 440 * Math.pow(2, (midi - 69) / 12)
   }

   export async function playNote(midi: number, durationMs = 500): Promise<void> {
     const ac = ensureContext()
     const osc = ac.createOscillator()
     const gain = ac.createGain()
     osc.type = 'triangle'
     osc.frequency.value = midiToFrequency(midi)
     gain.gain.setValueAtTime(0.3, ac.currentTime)
     gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + durationMs / 1000)
     osc.connect(gain).connect(ac.destination)
     osc.start()
     osc.stop(ac.currentTime + durationMs / 1000)
   }
   ```

2. **Browser autoplay gate:** `AudioContext` is suspended until first user gesture. Call `ensureContext()` on the first NotePicker tap. No separate "enable audio" screen needed — the first answer submission is a user gesture.

3. **Integration in StudySession:** After `submitAnswer` or `skip`, call `playNote(noteToMidi(card.note))` in the `revealing` phase.

4. **Settings toggle:** Add `audioFeedback: boolean` to `UserSettings` (default true). Respect it before calling `playNote`.

5. **Mobile Safari caveats:** `AudioContext` can enter "interrupted" state on incoming calls or headphone disconnect. Wrap `playNote` in a try/catch; if it fails, silently skip — audio is enhancement, not critical path.

**Tests:**
- Unit: `synth.ts` — mock `AudioContext`, verify `createOscillator` called with correct frequency for C4 (261.63 Hz), A4 (440 Hz)
- Component: mock `playNote`, verify it's called during reveal phase
- E2E: can't verify audio output, but verify no errors thrown

**Schema change:** Add `audioFeedback: boolean` to `UserSettings`. Bump `schema_version` to 2. Migration: set `audioFeedback = true` for existing v1 records.

---

### Dark Mode

**What:** Respect `prefers-color-scheme: dark` system preference, with optional manual override in settings.

**Implementation:**

1. Tailwind CSS 4's `@media (prefers-color-scheme: dark)` with `dark:` variant classes
2. VexFlow SVG styling: override stroke colors via CSS (`svg path { stroke: #e5e7eb }` in dark mode)
3. PianoKeyboard: invert white/black key colors in dark mode
4. Settings toggle: "Theme" → System / Light / Dark (3-way, stored in `UserSettings`)
5. Apply via a `data-theme` attribute on `<html>` element

**Key concern:** Staff lines and note heads must remain clearly visible in dark mode. Test with actual VexFlow output.

---

### First-Run Onboarding

**What:** 3-screen overlay on first launch explaining how the app works.

**Screens:**
1. "You'll see a note on the staff" (show example notation)
2. "Tap the note name below" (show NotePicker with arrow)
3. "The app tracks your progress with spaced repetition" (brief FSRS explanation)

**Implementation:**
- `src/components/Onboarding.tsx` — 3-step modal overlay with Next/Skip buttons
- Gate on `settings.hasSeenOnboarding` (field already exists in UserSettings)
- Set `hasSeenOnboarding = true` on dismiss
- Show before first StudySession renders

---

### Haptic Feedback

**What:** Vibration on correct/incorrect answers.

```typescript
// Correct: short pulse
navigator.vibrate?.(50)

// Incorrect: triple pulse
navigator.vibrate?.([50, 50, 50])
```

Progressive enhancement — no-op if `vibrate` API unavailable. Call from `ResultFeedback` component on mount.

---

## v1.2 — Key Signatures

**Goal:** Teach reading notes in the context of key signatures. This is fundamental to real sight-reading.

### Pedagogical Approach

Key signatures are a **session-level context**, not a per-card dimension. This avoids the combinatorial explosion of `note × clef × keySig` cards.

**How it works:**
1. User enables key signatures in settings (e.g., selects "G major")
2. The staff displays the key signature (one sharp: F#)
3. When a note appears on the F line, the correct answer is "F#" (because the key signature makes it sharp)
4. The card ID is still just `treble:F4` — the key signature modifies the correct answer at render time

**Implementation:**

1. **Settings:** Add `keySignatures: string[]` to `UserSettings` (e.g., `['C', 'G', 'F']`). Default `['C']` (no key signature).

2. **Key signature definitions** (`src/lib/keySignatures.ts`):
   ```typescript
   const KEY_SIGNATURES: Record<string, string[]> = {
     'C': [],           // no accidentals
     'G': ['F#'],       // F# in all octaves
     'D': ['F#', 'C#'],
     'A': ['F#', 'C#', 'G#'],
     'E': ['F#', 'C#', 'G#', 'D#'],
     'F': ['Bb'],
     'Bb': ['Bb', 'Eb'],
     'Eb': ['Bb', 'Eb', 'Ab'],
   }

   function getCorrectNoteInKey(note: string, keySignature: string): string
   // e.g. getCorrectNoteInKey('F4', 'G') → 'F#4' (because G major has F#)
   // e.g. getCorrectNoteInKey('C4', 'G') → 'C4' (unaffected)
   ```

3. **Session key selection:** When starting a session, randomly select one key signature from the enabled list. All cards in that session use the same key context. This models real music (a piece is in one key at a time).

4. **VexFlow rendering:** Add key signature to the stave:
   ```typescript
   stave.addClef(clef).addKeySignature(keySignature)
   ```
   VexFlow handles the visual placement of sharps/flats on the staff.

5. **Answer checking:** The correct answer becomes `getCorrectNoteInKey(card.note, sessionKey)`. If the key is G and the card is F4, the correct answer is "F#4". The NotePicker must show the accidental row when key signatures are active (even if global accidentals setting is off).

6. **Natural signs:** If the user sees a note with an explicit natural sign (♮) in a key signature context, the answer is the natural note. VexFlow supports `Accidental('n')` for this. This is an advanced scenario for later.

**Tests:**
- `getCorrectNoteInKey` for each key signature
- Card answer checking with key context
- VexFlow renders key signature correctly (E2E)
- NotePicker shows accidentals when key sig is active

**Progression order for key signatures (when auto-progression is added):**
1. C major (no accidentals — baseline)
2. G major (one sharp: F#) and F major (one flat: Bb)
3. D major (two sharps) and Bb major (two flats)
4. Continue adding sharps/flats in circle-of-fifths order

---

## v1.3 — Progression System

**Goal:** Automatically expand the card pool as the user demonstrates mastery, following a pedagogically sound sequence.

### Progression Tiers

| Level | Name | Unlocks |
|---|---|---|
| 0 | Beginner | Treble clef, naturals, E4–F5 (on staff, no ledger lines) |
| 1 | Bass Clef | Bass clef enabled, G2–A3 (on bass staff) |
| 2 | Wider Range | Treble C4–G5, Bass F2–C4 (introduces middle C as ledger line) |
| 3 | Accidentals | Sharps and flats together |
| 4 | Ledger Lines | Range extends to A3–C6 (treble), C2–E4 (bass) — 1-2 ledger lines |
| 5 | Key Sigs I | G major and F major |
| 6 | Key Sigs II | D, Bb, A, Eb major |
| 7 | Extended Ledger | Range extends to F2–G6 — 3+ ledger lines |
| 8 | All Keys | All 15 major key signatures |
| 9+ | Full Control | User has full manual control, no further auto-unlock |

### Unlock Criteria

```typescript
interface UnlockCriteria {
  minCardsAtReviewState: number   // Cards graduated from Learning to Review
  minAverageRetention: number     // e.g. 0.85 across current pool
  minTotalReviews: number         // Minimum reviews at this level
}
```

**Note:** No `minDaysAtLevel` — the pedagogy reviewer said performance-based criteria are sufficient. If the user demonstrates mastery, let them progress regardless of calendar time.

### Implementation

1. **`src/lib/progression.ts`:**
   ```typescript
   interface Milestone {
     level: number
     name: string
     criteria: UnlockCriteria
     settingsUnlock: Partial<UserSettings>
   }

   function evaluateProgression(
     currentLevel: number,
     cards: CardRecord[],
     settings: UserSettings
   ): { shouldUnlock: boolean; nextMilestone: Milestone | null }
   ```

2. **Evaluation timing:** Run at end of each study session (not per-card). Check if criteria for the next level are met.

3. **Auto vs manual:** `UserSettings.autoProgression: boolean` (default true). If auto, apply settings change immediately and show a brief congratulatory toast. If manual, show a prompt: "You've mastered the basics! Ready to add bass clef?"

4. **`UserSettings.progressionLevel: number`** — tracks the current tier. Settings changes are additive (enabling doesn't re-trigger old unlocks).

5. **Manual override:** User can always change settings manually. If they set range beyond their current tier, `progressionLevel` advances to match. If they restrict, level stays (re-enabling won't re-trigger).

**Tests:**
- `evaluateProgression` with various card states and retention levels
- Level 0 → 1 unlock when criteria met
- No unlock when criteria not met
- Manual override updates level correctly
- E2E: complete enough cards to trigger progression

---

## v1.4 — Stats Dashboard

**Goal:** Show the user their progress, strengths, and weaknesses.

### Stats Page Layout

**Today section:**
- Cards reviewed today
- Accuracy today
- Current streak (consecutive days with at least 1 review)

**Progress section:**
- Total cards in deck (by state: New / Learning / Review / Relearning)
- Mastery percentage (cards in Review state / total cards)
- Note range mastery map — visual grid showing which notes are mastered vs weak

**History section:**
- Review calendar heatmap (like GitHub's contribution graph) — color intensity = reviews that day
- Accuracy trend over last 30 days (line chart or simple bar)

### Implementation

1. **`src/hooks/useStats.ts`:**
   ```typescript
   function useStats(): {
     todayReviews: number
     todayAccuracy: number
     streak: number
     totalCards: { new: number; learning: number; review: number; relearning: number }
     loading: boolean
   }
   ```

2. **Data source:** Query `reviewLogs` store by `reviewed_at` index. Query `cards` store by `state` index. All reads, no writes.

3. **Review calendar:** 90-day grid. Each cell = one day. Shade by review count:
   - 0 reviews: gray
   - 1-5: light green
   - 6-15: medium green
   - 16+: dark green

4. **Streak calculation** (`src/lib/stats.ts`):
   - Day boundary = midnight local time
   - Count consecutive days backwards from today that have ≥1 review log
   - If today has 0 reviews, still count streak from yesterday (not broken yet)

5. **Performance:** Stats page is not time-critical. Aggregate on mount, no caching needed. If the review log grows very large (10K+ entries), consider a summary table indexed by date.

6. **Tab:** Add "Stats" as a third tab in the BottomNav between Study and Settings.

**Tests:**
- `useStats` with mock review logs: streak calculation, accuracy, day boundary
- Component: stats page renders correct numbers
- E2E: navigate to stats, verify numbers match actual reviews

---

## v1.5 — PWA + Data Safety

**Goal:** Make the app installable, fully offline, and protect user data from browser purges.

### PWA

1. **Web App Manifest** (`public/manifest.json`):
   ```json
   {
     "name": "Sheet Music Flashcards",
     "short_name": "Flashcards",
     "start_url": "/",
     "display": "standalone",
     "orientation": "portrait",
     "background_color": "#ffffff",
     "theme_color": "#2563eb",
     "icons": [
       { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
     ]
   }
   ```

2. **Service Worker:** Use `vite-plugin-pwa` for asset caching. Cache-first strategy for all built assets. Since there's no backend API, the app is fully functional offline after first load.

3. **Install prompt:** Detect `beforeinstallprompt` event. Show a subtle "Add to Home Screen" banner on the 3rd visit (not the first — don't nag). On iOS (no install prompt), show instructions manually.

4. **iOS safe areas:** Already handled with `env(safe-area-inset-*)`. When installed as PWA, `display: standalone` removes the Safari chrome.

### Data Export / Import

1. **Export:** `src/lib/export.ts`
   ```typescript
   interface ExportData {
     version: 1
     exportedAt: string
     settings: UserSettings
     cards: CardRecord[]
     reviewLogs: ReviewLogRecord[]
   }

   async function exportData(): Promise<ExportData>
   ```
   - JSON blob download via `Blob` + `URL.createObjectURL` + `<a download>`
   - Button in Settings: "Export Data" → downloads `flashcards-backup-2026-04-13.json`

2. **Import:** `src/lib/import.ts`
   ```typescript
   async function importData(data: ExportData): Promise<{ imported: number; skipped: number }>
   ```
   - Parse JSON, validate `version` field
   - For each card: if card ID exists and has more reviews, keep existing; otherwise overwrite
   - For review logs: merge by ID (idempotent)
   - Button in Settings: "Import Data" → file picker → confirm dialog → import

3. **Schema migration on import:** The `schema_version` field on each record enables forward-compatible imports. If an imported record has `schema_version: 1` and the app expects `schema_version: 2`, apply the migration transform.

**Tests:**
- Export produces valid JSON with all data
- Import into empty DB restores all data
- Import into existing DB merges correctly (doesn't duplicate)
- Import with older schema_version applies migration

### Safari ITP Mitigation

v1 already calls `navigator.storage.persist()`. Additional measures:

1. **Encourage PWA installation:** When installed, Safari exempts the origin from ITP eviction
2. **Weekly backup reminder:** If `navigator.storage.persisted()` returns false and the user has been active for >7 days, show a non-blocking reminder: "Your progress may be cleared by your browser. Export a backup or install this app."
3. **Auto-export to localStorage:** On each session completion, write a compressed summary of card states to localStorage as a recovery snapshot. If IndexedDB is wiped, detect the empty DB on startup and offer to restore from the snapshot.

---

## v2.0 — Intervals + Chords

**Goal:** Expand beyond single-note identification to interval recognition and chord reading.

### Intervals

**What:** Show two notes on the staff. User identifies the interval (e.g., "major 3rd", "perfect 5th").

**Card types:**
- Visual: two notes on staff → name the interval
- Naming: interval name → identify the second note given the first

**Interval list (progressive):**
1. Unison, octave (trivial)
2. Perfect 5th, perfect 4th
3. Major 3rd, minor 3rd
4. Major 2nd, minor 2nd
5. Major 6th, minor 6th, major 7th, minor 7th
6. Tritone, augmented/diminished intervals

**Implementation:**
- New card type field: `type: 'single' | 'interval' | 'chord'` added to `CardRecord`
- VexFlow can render two notes on the same beat/staff
- New input method: interval picker (buttons for each interval name)
- FSRS scheduling works the same — each interval card has its own schedule

**Schema change:** `CardRecord.type` field. `CardRecord.notes` array instead of single `note` field. Card ID becomes `${type}:${clef}:${notes.join('+')}`.

### Chords

**What:** Show 3+ notes stacked on the staff. User identifies the chord name.

**Progression:**
1. Major triads (root position): C, F, G, then all 12
2. Minor triads: Am, Dm, Em, then all 12
3. Inversions: first inversion, second inversion
4. 7th chords: dominant 7th, major 7th, minor 7th
5. Extended chords: 9th, 11th, 13th (advanced)

**Implementation:**
- VexFlow renders chords as stacked note heads on one stem
- New input method: chord name picker (root note + quality buttons)
- Card generation: enumerate chord types × root notes × inversions
- Consider a separate "Chord Mode" toggle in settings rather than mixing with single notes

---

## v2.1 — MIDI Input

**Goal:** Let the user answer by playing the note on a real piano/keyboard connected via MIDI.

### Web MIDI API

```typescript
async function requestMIDI(): Promise<MIDIAccess> {
  return navigator.requestMIDIAccess()
}

function listenForNoteOn(access: MIDIAccess, callback: (midi: number) => void) {
  for (const input of access.inputs.values()) {
    input.onmidimessage = (event) => {
      const [status, note, velocity] = event.data
      if ((status & 0xF0) === 0x90 && velocity > 0) {
        callback(note) // MIDI note number
      }
    }
  }
}
```

### Integration

1. **Settings toggle:** `midiInputEnabled: boolean` (field already reserved in UserSettings)
2. **Input mode:** When MIDI is enabled, the NotePicker is replaced by a "Play the note on your piano" prompt
3. **Answer detection:** Convert incoming MIDI note number to note name via `midiToNoteName`. Compare with card's correct answer.
4. **Latency:** MIDI is essentially zero-latency. No special handling needed.
5. **Chord detection:** For chord cards, collect MIDI notes within a 200ms window and compare the set.
6. **Fallback:** If MIDI device disconnects, fall back to NotePicker with a toast notification.

### Browser Support

Web MIDI API requires a secure context (HTTPS) and is supported in Chrome/Edge. Not supported in Safari or Firefox (as of 2025). Show a clear message if unsupported.

### Permissions

`requestMIDIAccess()` may prompt the user. Handle denial gracefully — disable the MIDI toggle and show explanation text.

---

## v2.2 — Rhythm Reading

**Goal:** Train rhythm identification alongside pitch.

### Card Types

1. **Rhythm-only cards:** Show a measure with note durations but no pitch (all on one line). User taps the rhythm on screen or identifies the time signature / note values.
2. **Pitch + rhythm cards:** Show a measure with both pitch and rhythm. User must identify both (advanced).

### Note Duration Display

VexFlow already supports different note durations (`'w'`, `'h'`, `'q'`, `'8'`, `'16'`). Current v1 always renders whole notes. Extend to:

- Whole notes (already)
- Half notes, quarter notes, eighth notes, sixteenth notes
- Dotted notes
- Rests
- Ties and beams (grouping eighth/sixteenth notes)

### Rhythm Input

Options:
1. **Tap-along:** User taps a "beat" button in time. App uses timing analysis to check rhythm accuracy. Complex but the most musical approach.
2. **Duration picker:** User selects the duration of each note shown. Simpler but more quiz-like.
3. **Time signature identification:** Show a measure, user picks the time signature (4/4, 3/4, 6/8, etc.)

Start with option 3 (simplest), then add option 1 for advanced users.

---

## v3.0 — Multi-Note Sequences

**Goal:** Train reading sequences of notes, not just individual notes. This builds the scanning and pattern-recognition skills needed for real sight-reading.

### What It Looks Like

Show a measure with 3-4 notes. The user must identify them in order (left to right). This trains:
- Reading ahead (not just the current note)
- Pattern recognition (scales, arpeggios, common melodic shapes)
- Speed (timed mode with pressure to read quickly)

### Implementation

1. **VexFlow multi-note rendering:** Render multiple `StaveNote` objects in a single `Voice`. VexFlow handles beam grouping and spacing.
2. **Sequential input:** NotePicker in "sequence mode" — user taps notes one at a time, building up the sequence. Each correct note highlights green on the staff. An incorrect note shows red and resets.
3. **Card generation:** Generate sequences from scales, arpeggios, and common melodic patterns within the enabled range. Sequences are harder to generate deterministically — may need a sequence definition file.
4. **FSRS for sequences:** Each unique sequence is a card. The ID could be `seq:treble:C4+D4+E4+F4`.

---

## Infrastructure & Quality (Ongoing)

### Performance Budget

| Metric | Target |
|---|---|
| Initial JS (gzipped) | < 50KB |
| LCP (3G mobile) | < 2s |
| VexFlow chunk | < 700KB (lazy) |
| IndexedDB read (session start) | < 100ms |

Add Lighthouse CI to the build pipeline when CI/CD is set up.

### Accessibility Improvements

- axe-core integration in component tests (`vitest-axe`)
- Keyboard navigation testing in Playwright
- `focus` management after card transitions
- Screen reader announcements for grade results
- `prefers-reduced-motion` for any future animations

### Error Boundaries

- Wrap SheetMusicDisplay in an error boundary (VexFlow can throw on edge cases)
- Wrap IndexedDB operations with fallback messages
- Detect Safari private browsing (zero IndexedDB quota) and show a clear warning

### CI/CD

- GitHub Actions workflow: `npm test` + `npx playwright test` + `npx tsc -b`
- Deploy to GitHub Pages or Vercel (static site, no backend)
- Lighthouse CI budget check
- Dependabot for security updates

### Debounced Settings → Card Regeneration

Currently card regeneration runs on every settings change. If the user drags a range slider (future), this fires many times. Add 300ms debounce to the settings effect in `app.tsx`.

---

## Approximate Timeline

| Release | Theme | Effort |
|---|---|---|
| v1.1 | Audio feedback, dark mode, onboarding, haptic | 1-2 days |
| v1.2 | Key signatures | 2-3 days |
| v1.3 | Progression system | 1-2 days |
| v1.4 | Stats dashboard | 1-2 days |
| v1.5 | PWA + data export/import | 1-2 days |
| v2.0 | Intervals + chords | 3-5 days |
| v2.1 | MIDI input | 1-2 days |
| v2.2 | Rhythm reading | 3-5 days |
| v3.0 | Multi-note sequences | 3-5 days |

---

## Schema Migration Path

Each release that adds fields to `UserSettings` or `CardRecord` bumps `schema_version`. The migration strategy:

1. **On DB open:** Check `schema_version` of stored records
2. **Per-record migration:** Transform v1 → v2 → v3 on read (lazy migration)
3. **New fields get defaults:** e.g., `audioFeedback` defaults to `true` for existing users
4. **No destructive migrations:** Never delete data, only add fields
5. **Export/import compatibility:** Import function handles records at any schema version

### Planned Schema Changes

| Version | Changes |
|---|---|
| v1 | Current: CardRecord, ReviewLogRecord, UserSettings |
| v2 | UserSettings: `+audioFeedback`, `+theme` |
| v3 | UserSettings: `+keySignatures`, `+autoProgression`, `+progressionLevel` |
| v4 | CardRecord: `+type` (single/interval/chord), `note` → `notes` array |
| v5 | UserSettings: `+rhythmEnabled`, CardRecord: `+duration` |
