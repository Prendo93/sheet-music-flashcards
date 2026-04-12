# Architectural Decision Records

## ADR-001: Preact over React

**Status:** Accepted

**Context:** The app is a small mobile-first SPA with ~15 components. Bundle size directly impacts mobile load time.

**Decision:** Use Preact with `preact/compat` alias.

**Rationale:** Preact is ~4KB gzipped vs React's ~42KB. The `preact/compat` layer provides full React API compatibility, so `@testing-library/preact`, and React-compatible libraries work unchanged. If a compatibility issue surfaces, switching back to React is a one-line Vite alias change.

---

## ADR-002: State-based Tab Switcher over React Router

**Status:** Accepted

**Context:** The app has exactly 2 views: Study and Settings (Stats deferred to v1.1).

**Decision:** Use `useState<'study' | 'settings'>` in the root `App` component instead of React Router.

**Rationale:** React Router adds ~20KB gzipped for features we don't use (loaders, actions, nested routes, URL params). A simple tab state is sufficient. Deep-linkable URLs are not needed — this is a mobile app users open to drill, not a multi-page site.

---

## ADR-003: FSRS via ts-fsrs for Spaced Repetition

**Status:** Accepted

**Context:** Need a spaced repetition algorithm. Options: SM-2 (classic Anki), FSRS (modern, also now Anki default), Leitner boxes (simple).

**Decision:** Use FSRS v6 via the `ts-fsrs` npm package.

**Rationale:** FSRS reduces reviews by 20-30% vs SM-2 at equal retention. `ts-fsrs` is maintained by the FSRS creator's organization, is stateless (pure functions), and is TypeScript-native. The marginal complexity over Leitner is low since the library handles all math. At small card counts (<50), FSRS won't meaningfully outperform simpler algorithms, but as the card pool grows with progression, the investment pays off.

---

## ADR-004: Auto-grading over Self-grading

**Status:** Accepted

**Context:** Traditional SRS apps (Anki) use 4-button self-grading (Again/Hard/Good/Easy). But note identification is objectively verifiable — the app knows if the answer is correct.

**Decision:** Auto-grade using correctness + response time. Incorrect → Again (1). Correct + slow (>5s) → Hard (2). Correct + moderate (2-5s) → Good (3). Correct + fast (<2s) → Easy (4).

**Rationale:** Removes one interaction per card (faster drilling). Students are unreliable self-assessors in this domain. Response time is a more objective signal of fluency. Thresholds are configurable in settings. An undo toast (4s window) handles mis-taps.

---

## ADR-005: Structured Note Picker over Text Input

**Status:** Accepted

**Context:** Users need to input note names (e.g., "C#5") on mobile.

**Decision:** Use a 3-row button grid (letter row, accidental toggle, octave selector) instead of a text input with soft keyboard.

**Rationale:** The soft keyboard covers half the screen (hiding the notation the user is trying to read), is slow for this specific input (3+ keystrokes across different keyboard zones), and invites typos. The structured picker eliminates keyboard popup entirely, makes invalid input impossible, and reduces input to 1-3 taps. For beginners (one octave, no accidentals), input is a single letter tap.

---

## ADR-006: Lazy-loaded VexFlow

**Status:** Accepted

**Context:** VexFlow 5 is ~690KB gzipped — the largest dependency by far.

**Decision:** Load VexFlow via dynamic `import('vexflow')` inside the `SheetMusicDisplay` component. Vite's `manualChunks` config forces it into a separate bundle chunk.

**Rationale:** The initial app shell loads in ~15KB. VexFlow only downloads when the user first visits the Study tab. This gives a fast initial paint and avoids penalizing users on the Settings page.

---

## ADR-007: IndexedDB with idb wrapper

**Status:** Accepted

**Context:** Need persistent local storage for cards, review logs, and settings. Options: localStorage (sync, 5MB limit, string-only), IndexedDB (async, large capacity, structured data).

**Decision:** Use IndexedDB via the `idb` promise wrapper. Use `fake-indexeddb` in tests.

**Rationale:** IndexedDB supports indexed queries (e.g., "all cards where due <= now"), structured cloning (Date objects stored natively), and has generous storage limits. The `idb` wrapper is 1KB and makes the callback-based IndexedDB API ergonomic. Safari caveats (7-day ITP eviction, private browsing) are mitigated by calling `navigator.storage.persist()` at startup.

---

## ADR-008: Strict Note Name Matching (No Enharmonics)

**Status:** Accepted

**Context:** Should C# and Db be accepted as equivalent answers?

**Decision:** No. Strict matching only — the user must type the exact note name shown (case-insensitive).

**Rationale:** The goal is to train precise notation reading. If the card shows C#, the answer is C#, not Db. Accepting enharmonics would undermine the learning of specific note spellings, which matters when reading key signatures and accidentals in real sheet music.

---

## ADR-009: TDD Red/Green/Refactor

**Status:** Accepted

**Context:** Development methodology choice for the project.

**Decision:** All code follows strict TDD: write a failing test first, write minimal code to pass, then refactor.

**Rationale:** User requirement. Ensures comprehensive test coverage from day one, catches regressions early, and produces well-designed interfaces (since tests drive the API design).

---

## ADR-010: No Key Signatures in v1

**Status:** Accepted

**Context:** Key signatures add a third dimension to card identity (note × clef × key signature), causing combinatorial explosion and complex answer-checking logic.

**Decision:** Defer key signatures to v1.1+. Cards in v1 are `(note, clef)` tuples only.

**Rationale:** The core skill being trained is note identification on the staff. Key signatures add significant complexity (VexFlow rendering, card generation cross-product, context-dependent correct answers) with limited pedagogical value at the beginner level. Ship the core loop first, validate it works, then add key signatures.
