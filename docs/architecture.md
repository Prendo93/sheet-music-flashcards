# Architecture Overview

## System Summary

Sheet Music Flashcards is a local-first, mobile-first SPA that teaches piano sight-reading through spaced-repetition flashcards. It runs entirely in the browser with no backend — all data is stored in IndexedDB.

## Tech Stack

| Layer | Choice | Bundle Impact |
|---|---|---|
| Framework | Preact + preact/compat | ~4KB gzipped |
| Build | Vite 6 | n/a (build tool) |
| Styling | Tailwind CSS 4 | ~2KB gzipped (CSS only) |
| Notation | VexFlow 5 | ~690KB gzipped (lazy-loaded, separate chunk) |
| SRS | ts-fsrs | ~5KB gzipped |
| Storage | idb (IndexedDB wrapper) | ~1KB gzipped |
| Testing | Vitest + @testing-library/preact + Playwright | n/a (dev only) |

## Data Flow

```
UserSettings (IndexedDB)
        │
        ▼
  Card Generator ──────► CardRecord[] (IndexedDB)
  (lib/music.ts)              │
                              ▼
                    Study Queue Builder
                    (lib/scheduler.ts)
                              │
                              ▼
                    StudySession Component
                    (useStudySession hook)
                       │           │
                       ▼           ▼
              SheetMusicDisplay  NotePicker
              (VexFlow SVG)     (button grid)
                                   │
                                   ▼
                            Auto-Grader
                            (lib/scheduler.ts)
                                   │
                              ┌────┴────┐
                              ▼         ▼
                    Updated CardRecord  ReviewLogRecord
                        (IndexedDB)     (IndexedDB)
```

## Component Map

```
App (tab switcher)
├── StudySession (state machine)
│   ├── SheetMusicDisplay (VexFlow rendering, lazy-loaded)
│   ├── NotePicker (3-row button grid: letter + accidental + octave)
│   ├── ResultFeedback (correct/incorrect display + undo toast)
│   └── SessionSummary (end-of-session stats)
├── SettingsPage (toggles for range, clefs, accidentals)
└── BottomNav (Study | Settings tabs, hidden during sessions)
```

## Key Files

| File | Purpose |
|---|---|
| `src/types.ts` | All TypeScript interfaces and type definitions |
| `src/lib/music.ts` | Note parsing, card generation, VexFlow format conversion |
| `src/lib/db.ts` | IndexedDB schema, connection, CRUD for all stores |
| `src/lib/scheduler.ts` | FSRS wrapper, auto-grading, study queue builder |
| `src/hooks/useStudySession.ts` | Study session state machine (useReducer) |
| `src/components/SheetMusicDisplay.tsx` | VexFlow SVG rendering, lazy-loaded, memoized |
| `src/components/NotePicker.tsx` | Structured note input (no keyboard needed) |

## State Management

- **IndexedDB** is the source of truth for all persistent data
- **React state** (`useReducer` in `useStudySession`) manages ephemeral session state
- **No global state library** — no Redux, Zustand, or similar
- **No React Router** — tab switching via `useState` in App

## Bundle Strategy

- Initial bundle: ~15KB gzipped (Preact + app shell + idb + ts-fsrs)
- VexFlow: ~690KB gzipped, loaded dynamically via `import('vexflow')` only when the Study tab renders its first card
- `vite.config.ts` uses `manualChunks` to force VexFlow into a separate chunk
