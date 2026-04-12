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

### Key Signatures

**Critical design decision (from tech architect review):** Key-signature-affected notes get **separate card IDs** to prevent FSRS from conflating different skills.

Example: In G major, F becomes F#. Card ID `treble:F4:G` is a distinct card from `treble:F4:C`. FSRS tracks them independently.

**Why not session-level context:** If `treble:F4` has one FSRS schedule shared across C major and G major sessions, the difficulty score averages two different skills. A user who always gets F4 right in C but wrong in G would see it scheduled as "easy" — the wrong answer.

**Combinatorial cost is small:** G major only adds new cards for F-line notes (1 per octave in range), not all 7 notes. With 3 key signatures enabled, the card pool grows by ~5-10 cards, not hundreds.

**Implementation:**
1. `src/lib/keySignatures.ts` — key sig definitions, `getAffectedNotes(keySig)`, `getCorrectNoteInKey(note, keySig)`
2. Card ID format: `${clef}:${note}:${keySig}` (e.g., `treble:F4:G`)
3. `generateCardIds()` gains a `keySignatures` parameter
4. `SheetMusicDisplay` adds `stave.addKeySignature(keySig)` before rendering
5. NotePicker shows accidental row when key sigs are active (even if global accidentals off)
6. **Training scaffold:** First 2-3 cards per session show the key signature and name the affected notes before testing begins

**Settings:** `keySignatures: string[]` — default `['C']`. UI: checkboxes for available keys, introduced in circle-of-fifths order.

**Natural signs (♮) deferred** to v1.3+ — they require understanding that an accidental overrides a key signature, which is a second-order concept.

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
| 7 | Basic Rhythm | Note duration identification (whole, half, quarter, eighth) |
| 8 | All Keys | Remaining major key signatures |
| 9+ | Full Control | Manual settings, no further auto-unlock |

**Key changes from original:**
- Accidentals before range expansion (build naming skill before spatial expansion)
- Ledger lines folded into range expansion, not isolated
- Basic rhythm at level 7 (earlier than original v2.2)
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

### Basic Rhythm Cards

Note duration identification — "what kind of note is this?" (whole, half, quarter, eighth):
- VexFlow already supports duration codes (`'w'`, `'h'`, `'q'`, `'8'`)
- New card type: show a note with a specific duration, user identifies the duration
- Duration picker UI: 4 buttons (whole, half, quarter, eighth)
- Separate from pitch identification (user doesn't need to name the note, just the duration)

### Virtual Piano Input Mode

Make the existing `PianoKeyboard` component tappable as an input method (alternative to NotePicker):
- User taps the correct key on the piano diagram
- Settings toggle: "Input mode" → Note Picker / Piano Keyboard
- Reuses existing `PianoKeyboard.tsx` with added `onKeyTap` callback

### Estimated effort: 3–4 days

---

## Aspirational (v2.0+)

These are not committed. Build if demand materializes.

### v2.0 — Intervals

Show two notes on the staff → user identifies the interval name.

- Intervals BEFORE chords (a chord is a stack of intervals)
- Progressive: 3rds → 5ths/4ths → 2nds → 6ths/7ths → tritone
- New card type: `type: 'interval'` with `notes: string[]`
- Schema change: CardRecord gains `type` and `notes` fields
- Batch migration in `openDB` upgrade callback (not lazy per-record)

### v2.1 — Chords

Stacked notes → user identifies chord name.

- Major triads (root) → minor triads → inversions → 7th chords
- Input: root note + quality picker (Major / Minor / Dim / Aug / 7th)
- Separate "Chord Mode" toggle, not mixed with single notes

### v2.2 — MIDI Input (Desktop Only)

Web MIDI API — Chrome/Edge only, no Safari/Firefox. Desktop feature.

- Conditionally show MIDI toggle based on `navigator.requestMIDIAccess` existence
- Hide on mobile entirely
- Answer by playing note on real keyboard
- Fallback to NotePicker on disconnect

### v2.3 — Multi-Note Sequences

3-4 notes in a measure → identify in order.

- Intermediate step: "note pairs" (2 notes) before full sequences
- Trains left-to-right scanning and pattern recognition
- Sequential NotePicker input — each correct note highlights green on staff

### v2.4 — Advanced Rhythm

Tap-along mode: user taps rhythm in time, app analyzes timing accuracy.

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
| 3 | v1.2 | UserSettings: `+keySignatures`. Card IDs gain key context suffix. |
| 4 | v1.3 | UserSettings: `+autoProgression`, `+progressionLevel`. `+dailySummary` store. |
| 5 | v1.5 | CardRecord: `+duration` for rhythm cards. `+type` field. |
| 6 | v2.0 | CardRecord: `note` → `notes[]` array. Batch migration of existing cards. |

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
