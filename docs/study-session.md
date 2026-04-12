# Study Session

## Overview

The study session is the core user experience. It presents flashcards one at a time, accepts user input via a structured NotePicker, auto-grades based on correctness and response time, and manages the card queue using FSRS scheduling.

## State Machine

```
idle → loading → showing_card → awaiting_input → revealing → showing_card (next)
                                                           → session_complete
```

| Phase | What Happens | User Sees |
|---|---|---|
| `idle` | No session active | "Start Study" or auto-starts |
| `loading` | Building queue from IndexedDB | Skeleton/spinner |
| `showing_card` | Card loaded, timer started | Staff notation + NotePicker |
| `awaiting_input` | Waiting for user tap | NotePicker interactive |
| `revealing` | Auto-graded, result shown | ResultFeedback + undo toast |
| `session_complete` | Queue exhausted | SessionSummary |

## Study Queue

Built by `lib/scheduler.ts` → `buildStudyQueue()`:

1. Get all cards where `due <= now` (overdue), sorted by due date (most overdue first)
2. Fill remaining session slots with new cards (`state === 0`) up to `newCardsPerDay` limit
3. Queue holds card IDs only; actual CardRecord loaded on demand per card

Queue size is capped by `settings.sessionSize` (default 20).

## Auto-Grading

The app knows the correct answer, so grading is automatic:

| Outcome | FSRS Rating | UI Color | Label |
|---|---|---|---|
| Incorrect | Again (1) | Red | "Incorrect" |
| Correct, > goodMs (5s) | Hard (2) | Amber | "Correct, but slow" |
| Correct, easyMs–goodMs (2-5s) | Good (3) | Green | "Correct!" |
| Correct, < easyMs (2s) | Easy (4) | Blue | "Fast!" |

Response time is measured from `showing_card` phase start to answer submission.

Thresholds are configurable in `UserSettings.autoGradeThresholds`.

## Answer Matching

Strict, case-insensitive comparison. No enharmonic equivalence.
- `"c#5"` matches `"C#5"` → correct
- `"Db5"` does NOT match `"C#5"` → incorrect

Implemented in `lib/music.ts` → `notesMatch()`.

## Undo

After grading, an "Undo" toast appears for 4 seconds. If tapped:
1. Restore `previousCardState` to IndexedDB (reverts FSRS state)
2. Remove the last ReviewLogRecord
3. Decrement reviewed/correct counters
4. Re-show the same card (phase → `showing_card`)

The previous card state is stored in `SessionState.previousCardState` before each grade.

## Skip / "I Don't Know"

Grades the card as Again (rating 1) with `correct: false`. Shows the correct answer in the reveal phase. Functionally identical to submitting a wrong answer but without requiring the user to guess.

## Session Interruption

The queue position and phase are persisted to `sessionStorage` on each card completion. If the user leaves (app switch, phone call) and returns, the session resumes from where they left off.

## Component Hierarchy

```
StudySession (state machine orchestrator)
├── SheetMusicDisplay (VexFlow notation, lazy-loaded)
├── NotePicker (structured button grid input)
├── ResultFeedback (correct/incorrect + undo toast)
└── SessionSummary (end-of-session stats)
```

## Hook: useStudySession

The `useStudySession` hook manages all session state via `useReducer`. It accepts a `DbApi` interface for testability (dependency injection, not direct import).

### Actions
- `START_SESSION` — transition to loading, build queue
- `SESSION_LOADED` — queue built, show first card
- `SUBMIT_ANSWER` — auto-grade, transition to revealing
- `SKIP` — grade as Again, transition to revealing
- `NEXT_CARD` — advance queue or complete session
- `UNDO` — restore previous state, re-show card
- `SESSION_EMPTY` — no cards to study

## Key Files

| File | Purpose |
|---|---|
| `src/hooks/useStudySession.ts` | State machine (useReducer) |
| `src/components/StudySession.tsx` | Composition component |
| `src/components/ResultFeedback.tsx` | Grade display + undo |
| `src/components/SessionSummary.tsx` | End stats |
| `src/components/NotePicker.tsx` | Input grid |
| `src/components/SheetMusicDisplay.tsx` | VexFlow rendering |
| `src/lib/scheduler.ts` | FSRS grading + queue building |
