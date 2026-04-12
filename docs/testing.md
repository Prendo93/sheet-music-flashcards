# Testing Strategy

## Overview

The project uses strict TDD (red/green/refactor). Every function and component has tests written before the implementation. Tests are the specification.

## Stack

| Tool | Purpose |
|---|---|
| Vitest | Test runner + assertions |
| @testing-library/preact | Component rendering + queries |
| @testing-library/jest-dom | DOM matchers (toBeInTheDocument, etc.) |
| fake-indexeddb | In-memory IndexedDB for unit tests |
| Playwright | E2E tests (deferred to Phase 4) |

## Configuration

```
vitest.config.ts
├── environment: 'jsdom'
├── setupFiles: ['./src/test-utils/setup.ts']
├── include: ['tests/**/*.test.{ts,tsx}']
└── coverage: { provider: 'v8', include: ['src/lib/**'] }
```

The setup file (`src/test-utils/setup.ts`) imports:
- `fake-indexeddb/auto` — polyfills global IndexedDB
- `@testing-library/jest-dom/vitest` — adds DOM matchers to expect

## Test Layers

### Unit Tests (`tests/unit/`)

Pure logic in `src/lib/`. No DOM, no components.

| File | Tests | What |
|---|---|---|
| `music.test.ts` | 64 | Note parsing, MIDI, VexFlow format, card generation |
| `db.test.ts` | 21 | IndexedDB CRUD, settings, storage safety |
| `scheduler.test.ts` | 28 | FSRS grading, auto-grade, intervals, queue |

**Pattern:** Import function → call with inputs → assert outputs. For DB tests, call `resetDB()` in `beforeEach` for isolation.

### Component Tests (`tests/component/`)

Preact components rendered in jsdom via @testing-library/preact.

| File | Tests | What |
|---|---|---|
| `NotePicker.test.tsx` | ~15 | Button rendering, selection, submit |
| `StudySession.test.tsx` | ~8 | Full flow with mocked DB |
| `SettingsPage.test.tsx` | ~10 | Toggles, range, session config |

**Pattern:** `render(<Component {...props} />)` → `screen.getByRole/getByText` → `fireEvent.click` → assert.

### E2E Tests (`tests/e2e/`) — Phase 4

Playwright against the Vite dev server. Mobile viewport (Pixel 5).

## Mocking Strategy

### VexFlow
VexFlow requires real SVG DOM which jsdom doesn't fully support. In component tests, mock the entire `SheetMusicDisplay` component:
```typescript
vi.mock('../src/components/SheetMusicDisplay.tsx', () => ({
  SheetMusicDisplay: ({ note, clef }: any) => <div data-testid="staff">{clef}:{note}</div>
}))
```

Only test real VexFlow rendering in Playwright E2E tests.

### IndexedDB
`fake-indexeddb/auto` provides a full in-memory IndexedDB implementation. Tests use the real `idb` wrapper code against this fake — no mocking needed for DB operations.

Call `resetDB()` in `beforeEach` to get a clean database per test.

### FSRS
Don't mock ts-fsrs. It's pure functions with deterministic output. Test the real scheduler logic against the real FSRS library.

### Hooks with DB Dependencies
The `useStudySession` hook accepts a `DbApi` interface parameter instead of importing DB functions directly. Tests pass a mock object:
```typescript
const mockDb: DbApi = {
  getCard: vi.fn().mockResolvedValue(someCard),
  putCard: vi.fn().mockResolvedValue(undefined),
  getCardsDue: vi.fn().mockResolvedValue([card1, card2]),
  getCardsByState: vi.fn().mockResolvedValue([newCard]),
  addReviewLog: vi.fn().mockResolvedValue(undefined),
}
```

## Running Tests

```bash
npm test              # vitest run (all tests, CI mode)
npm run test:watch    # vitest (watch mode for development)
npx vitest run tests/unit/music.test.ts  # single file
```

## Coverage

Coverage is tracked for `src/lib/` (the pure logic layer). Target: 90%+ line coverage.

Component coverage is not formally tracked — the value is in testing behavior, not hitting every branch of JSX rendering.

## Adding New Tests

1. Create test file in appropriate directory (`tests/unit/` or `tests/component/`)
2. Write failing tests that describe the desired behavior
3. Implement the code to make tests pass
4. Refactor while keeping tests green
5. Run `npm test` to verify all tests still pass
