# Storage

## Local-First Architecture

Sheet Music Flashcards has **no backend**. All data — cards, review history, settings — lives exclusively in the browser's IndexedDB. There are no API calls, no user accounts, no cloud sync. The app works fully offline after the initial page load.

This is a deliberate architectural choice (see ADR-007 in `docs/decisions.md`). The tradeoff is that data lives in one browser on one device. If the user clears browser data or switches devices, their progress is lost. Future export/import functionality is planned to mitigate this.

## idb Library

The app uses the [`idb`](https://github.com/jakearchibald/idb) library (v8) as a promise-based wrapper over the IndexedDB API.

**Why idb:** IndexedDB's native API is callback-based and uses `onsuccess`/`onerror` event handlers on request objects. This is awkward to compose and error-handle. `idb` wraps every operation in a Promise, making the API compatible with `async`/`await`. At ~1KB gzipped, the cost is negligible.

```typescript
// Native IndexedDB (verbose, callback-based)
const request = store.get('treble:C4')
request.onsuccess = () => { /* ... */ }
request.onerror = () => { /* ... */ }

// With idb (clean, async)
const card = await db.get('cards', 'treble:C4')
```

## Database Connection

The database connection uses a **singleton pattern** via `getDB()` in `src/lib/db.ts`.

```typescript
let dbPromise: Promise<IDBPDatabase<SheetMusicDB>> | null = null

function getDB(): Promise<IDBPDatabase<SheetMusicDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SheetMusicDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create stores and indexes on first open or version bump
      },
    })
  }
  return dbPromise
}
```

- The database is opened lazily on first access and reused for the lifetime of the page.
- The `upgrade` callback runs only when `DB_VERSION` increases (or on first visit). It defines stores and indexes.
- All CRUD functions (`getCard`, `putCard`, `getSettings`, etc.) call `getDB()` internally.

### resetDB()

For testing, `resetDB()` nulls out `dbPromise`, forcing the next `getDB()` call to open a fresh connection. This is called in test setup to ensure a clean database per test.

```typescript
function resetDB(): void {
  dbPromise = null
}
```

## Safari Caveats

### ITP 7-Day Eviction

Safari's Intelligent Tracking Prevention (ITP) can **evict all IndexedDB data** for sites the user hasn't visited in 7 days. This means a user who takes a week-long break could lose all their flashcard progress.

**Mitigation:** The app calls `navigator.storage.persist()` at startup (see below). When granted, this exempts the origin from ITP eviction. However, Safari may silently deny the request — there is no guaranteed fix.

### Private Browsing Mode

In Safari Private Browsing, IndexedDB has **zero quota**. Any write attempt fails immediately. The app should detect this condition and warn the user that their data will not be saved.

Detection pattern:

```typescript
// Attempt a test write; if it throws, we're likely in private browsing
try {
  const db = await openDB('test', 1, {
    upgrade(db) { db.createObjectStore('test') },
  })
  await db.put('test', true, 'test')
  db.close()
  await deleteDB('test')
} catch {
  // Private browsing or quota exceeded — warn user
}
```

## navigator.storage.persist()

Called at app startup (in `src/main.tsx` or the DB initialization path):

```typescript
if (navigator.storage?.persist) {
  const granted = await navigator.storage.persist()
  // granted: true = data is durable, false = browser may evict under pressure
}
```

**What it does:** Requests that the browser treat this origin's storage as persistent (not subject to automatic eviction under storage pressure or ITP rules).

**What happens if denied:** The app continues to work normally. Data is stored in IndexedDB as usual, but the browser reserves the right to evict it under storage pressure or after 7 days of inactivity (Safari). There is no user-visible error — the risk is silent future data loss.

**Browser behavior:**
- Chrome: Usually auto-grants for installed PWAs and engaged sites
- Firefox: Shows a permission prompt
- Safari: May silently deny; behavior varies by version

## Data Safety

| Concern | Status |
|---|---|
| Backend sync | None. Data exists in one browser only. |
| Cross-device sync | Not supported. Each browser/device has independent data. |
| Browser data cleared | All progress lost. No recovery mechanism. |
| Schema migration | Per-record `schema_version` field enables field-level migration without data loss. See `docs/data-model.md`. |
| Export/import | Planned for a future version. Will serialize all stores to JSON for backup and cross-device transfer. |
| Corruption recovery | No built-in mechanism. IndexedDB transactions are atomic, so partial writes do not occur. |

## Testing Approach

### fake-indexeddb

Tests use the [`fake-indexeddb`](https://github.com/nicolo-ribaudo/fake-indexeddb) package (v6), which provides a complete in-memory implementation of the IndexedDB API for Node.js.

Setup in `src/test-utils/setup.ts`:

```typescript
import 'fake-indexeddb/auto'
```

The `auto` import patches the global scope with `indexedDB`, `IDBKeyRange`, and all related constructors. The `idb` library and all app code work against this polyfill without modification.

### Clean Database Per Test

Each test starts with a fresh database by calling `resetDB()` in a `beforeEach` hook. This nulls out the cached database promise, so the next `getDB()` call opens a new connection to a new in-memory database.

```typescript
import { resetDB } from '../../src/lib/db'

beforeEach(() => {
  resetDB()
})
```

This ensures tests are fully isolated — no state leaks between tests.

### What This Covers

- All CRUD operations against cards, reviewLogs, and settings stores
- Index queries (due cards, cards by state, reviews by date)
- Schema upgrade logic
- Concurrent transaction behavior

### What This Does Not Cover

- Safari-specific eviction behavior (requires real Safari testing)
- Storage quota limits (fake-indexeddb has no quota enforcement)
- `navigator.storage.persist()` (not available in jsdom/fake-indexeddb)

## Performance Considerations

### Batch Puts in Single Transaction

When regenerating cards from settings changes, all card upserts are performed in a **single IndexedDB transaction**:

```typescript
const tx = db.transaction('cards', 'readwrite')
const store = tx.objectStore('cards')
await Promise.all(cards.map(card => store.put(card)))
await tx.done
```

This is significantly faster than individual `db.put()` calls, which each open and commit a separate transaction. For 50+ cards, the difference is measurable on mobile.

### Indexed Queries for Due Cards

The study queue builder queries due cards using the `by-due` index:

```typescript
const dueCards = await db.getAllFromIndex('cards', 'by-due', IDBKeyRange.upperBound(now))
```

This avoids loading all cards into memory and filtering in JavaScript. IndexedDB handles the range query at the storage layer.

### Debounced Card Regeneration

When the user changes settings (note range, clefs, accidentals), card regeneration is **debounced** — typically 300-500ms. This prevents expensive regeneration on every slider tick or toggle. The regeneration only fires once the user stops adjusting.

### Transaction Scope

Transactions are scoped as narrowly as possible:
- Read-only transactions (`'readonly'`) for queries — these can run concurrently.
- Read-write transactions (`'readwrite'`) only for mutations — these are serialized by IndexedDB.
- A single review writes to both `cards` (update) and `reviewLogs` (insert) in one transaction to ensure atomicity.
