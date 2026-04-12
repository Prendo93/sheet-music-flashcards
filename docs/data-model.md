# Data Model

## Overview

All persistent data lives in IndexedDB. There are three record types across three object stores: `cards`, `reviewLogs`, and `settings`. All types are defined in `src/types.ts`.

## CardRecord

Stored in the `cards` object store. Each record represents one flashcard: a specific note on a specific clef.

```typescript
interface CardRecord {
  id: string              // Deterministic: `${clef}:${note}` e.g. "treble:C#5"
  note: string            // Scientific pitch notation e.g. "C#5", "Bb3", "F4"
  clef: Clef              // "treble" | "bass"

  // FSRS scheduling state
  due: Date               // When the card is next due for review
  stability: number       // FSRS memory stability (days until ~90% recall probability)
  difficulty: number      // FSRS difficulty factor (0-10 scale, higher = harder)
  elapsed_days: number    // Days since last review
  scheduled_days: number  // Days between last review and current due date
  reps: number            // Total successful review count
  lapses: number          // Times the card was forgotten (rated Again after reaching Review state)
  state: 0 | 1 | 2 | 3   // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review?: Date      // Timestamp of most recent review (undefined for New cards)

  created_at: Date
  schema_version: 1
}
```

### Deterministic ID

Card IDs are computed as `${clef}:${note}` (e.g., `"treble:C#5"`, `"bass:F3"`). This means:

- Cards are **upserted, not inserted** — regenerating cards from settings produces the same IDs, so existing FSRS state is preserved.
- No UUID generation needed. The ID is derivable from the card's semantic identity.
- Two cards for the same note on different clefs are distinct: `"treble:C4"` and `"bass:C4"` are separate records.

### FSRS State Fields

These fields mirror the `Card` type from `ts-fsrs` and are updated after every review by calling the FSRS scheduler:

| Field | Meaning |
|---|---|
| `due` | Next review time. For New cards, this is `created_at`. The study queue queries `due <= now`. |
| `stability` | Memory stability in days. Higher = longer intervals between reviews. Starts at 0 for New cards. |
| `difficulty` | How hard this card is for the user (0-10). Updated based on rating history. |
| `elapsed_days` | Days elapsed since the previous review. Used by FSRS to compute next interval. |
| `scheduled_days` | The interval that was scheduled at last review. Used by FSRS for stability calculation. |
| `reps` | Incremented on each review. Stays 0 until the first review. |
| `lapses` | Incremented when a Review-state card is rated Again (forgotten). Triggers Relearning state. |
| `state` | Current FSRS state. Controls which queue the card goes into and which scheduling paths apply. |
| `last_review` | Timestamp of the last review. Undefined for never-reviewed cards. |

## ReviewLogRecord

Stored in the `reviewLogs` object store. Each record is one review event. This store is **append-only** — records are never updated or deleted.

```typescript
interface ReviewLogRecord {
  id: string                  // UUID (generated at review time)
  cardId: string              // References CardRecord.id e.g. "treble:C#5"
  rating: 1 | 2 | 3 | 4      // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: 0 | 1 | 2 | 3       // Card state at time of review (before the state transition)
  elapsed_days: number        // Days since previous review of this card
  scheduled_days: number      // Interval that was scheduled for this review
  reviewed_at: Date           // When this review happened
  response_time_ms: number    // Milliseconds from card shown to answer submitted
  correct: boolean            // Whether the user's note answer was correct
  schema_version: 1
}
```

### Purpose

Review logs serve two purposes:

1. **Analytics** — Session summaries, accuracy stats, and future stats dashboard use review logs to compute metrics.
2. **FSRS parameter optimization** — FSRS supports fitting custom parameters from review history. Review logs store all data needed for this (rating, state, elapsed time, response time). This is a planned future feature.

### Append-Only

Review logs are never modified. Even undo (which reverts the card to its previous state) does not delete the review log entry. This preserves a complete audit trail.

## UserSettings

Stored in the `settings` object store. There is exactly **one record** with a fixed ID of `'user_settings'` (singleton pattern).

```typescript
interface UserSettings {
  id: 'user_settings'
  noteRange: { low: string; high: string }  // e.g. { low: "E4", high: "F5" }
  clefs: { treble: boolean; bass: boolean }
  accidentals: { sharps: boolean; flats: boolean }
  newCardsPerDay: number
  sessionSize: number
  autoGradeThresholds: {
    easyMs: number    // Correct under this → Easy (rating 4)
    goodMs: number    // Correct under this → Good (rating 3); above → Hard (rating 2)
  }
  hasSeenOnboarding: boolean
  schema_version: 1
  updated_at: Date
}
```

### Default Values

```typescript
const DEFAULT_SETTINGS: UserSettings = {
  id: 'user_settings',
  noteRange: { low: 'E4', high: 'F5' },     // Treble staff notes, no ledger lines
  clefs: { treble: true, bass: false },       // Start with treble only
  accidentals: { sharps: false, flats: false }, // Natural notes only
  newCardsPerDay: 10,
  sessionSize: 20,
  autoGradeThresholds: { easyMs: 2000, goodMs: 5000 },
  hasSeenOnboarding: false,
  schema_version: 1,
  updated_at: new Date(),
}
```

**Why E4-F5?** This is the range of notes that sit on the five lines and four spaces of the treble clef staff without requiring ledger lines. It gives beginners exactly 9 natural notes to learn (E4, F4, G4, A4, B4, C5, D5, E5, F5) — a manageable starting set. As the user progresses, they expand the range in settings to add ledger-line notes.

**Why no accidentals by default?** Beginners should master letter names on the staff before adding sharps and flats. Enabling accidentals multiplies the card pool (each natural note gains up to 2 accidental variants).

**Why 2s/5s auto-grade thresholds?** Modeled on sight-reading fluency targets. Under 2 seconds indicates automatic recognition (Easy). 2-5 seconds indicates correct but effortful recognition (Good). Over 5 seconds indicates hesitation even if correct (Hard).

### Singleton Pattern

The settings store always contains exactly one record. On first launch, `DEFAULT_SETTINGS` is written. All reads and writes target the fixed key `'user_settings'`. There is no concept of multiple user profiles.

## IndexedDB Schema

Defined in `src/lib/db.ts`.

```typescript
const DB_NAME = 'sheet-music-flashcards'
const DB_VERSION = 1
```

### Store Definitions

| Store | Key Path | Auto Increment | Purpose |
|---|---|---|---|
| `cards` | `id` | No | Card records with FSRS state |
| `reviewLogs` | `id` | No | Append-only review history |
| `settings` | `id` | No | Singleton user settings |

### Indexes

| Store | Index Name | Key Path | Purpose |
|---|---|---|---|
| `cards` | `by-due` | `due` | Query cards due for review: `cards.index('by-due').getAll(IDBKeyRange.upperBound(now))` |
| `cards` | `by-state` | `state` | Query new cards (state=0) to enforce `newCardsPerDay` limit |
| `reviewLogs` | `by-card` | `cardId` | Get all reviews for a specific card (for stats and FSRS optimization) |
| `reviewLogs` | `by-date` | `reviewed_at` | Query reviews in a date range (for session summaries and daily stats) |

Each index exists to support a specific query pattern. IndexedDB does not support ad-hoc queries — every query path needs an explicit index.

## Schema Versioning Strategy

Every record type includes a `schema_version` field (currently `1` for all types). This is a **per-record version**, not a database version.

The strategy for future migrations:

1. **Add new fields** with defaults — old records (schema_version: 1) are migrated on read by applying defaults for missing fields.
2. **Bump schema_version** on the type to 2. Write-back migrated records opportunistically (e.g., after a review updates a card, write back the full v2 record).
3. **IndexedDB version bumps** (`DB_VERSION`) are reserved for structural changes: new stores, new indexes, or store renames. Field-level changes are handled by the per-record schema_version.

This avoids triggering IndexedDB's `onupgradeneeded` for every field change, which would require blocking all open connections.

## Card Lifecycle

Cards follow the FSRS state machine:

```
                  ┌─── Again ───┐
                  ▼              │
New ──review──► Learning ──Graduate──► Review ◄──── correct ────┐
                  ▲                      │                       │
                  │                      │ Again (lapse)         │
                  │                      ▼                       │
                  │               Relearning ──Graduate───────────┘
                  │                      │
                  └───── Again ──────────┘
```

| State | Value | Meaning | Intervals |
|---|---|---|---|
| New | 0 | Never reviewed. Pulled from the new-card queue. | N/A |
| Learning | 1 | First seen, in initial learning steps. | Minutes (1m, 10m) |
| Review | 2 | Graduated. Due at stability-based intervals. | Days to months |
| Relearning | 3 | Was in Review but lapsed (forgotten). Re-entering learning steps. | Minutes |

State transitions are computed by `ts-fsrs`. The app calls `fsrs.repeat(card, now)` which returns the next card state for each possible rating (Again/Hard/Good/Easy). The auto-grader picks the rating, and the corresponding card state is written back to IndexedDB.

## Relationships

```
CardRecord (cards store)
    │
    │  CardRecord.id ← ReviewLogRecord.cardId
    │
    ▼
ReviewLogRecord (reviewLogs store)
```

- **One-to-many**: One `CardRecord` has many `ReviewLogRecord` entries.
- **No foreign key enforcement**: IndexedDB does not support foreign keys. Referential integrity is maintained by application code.
- **Join pattern**: To get all reviews for a card, query the `by-card` index on `reviewLogs` with the card's ID.
- **Orphan tolerance**: If a card is deleted (e.g., user narrows note range), its review logs are intentionally kept. They remain useful for future FSRS parameter optimization and stats.
