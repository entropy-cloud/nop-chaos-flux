# Round 03: Dead Code, Global State Leaks, and Error Handling Gaps

> **Status**: Complete  
> **Method**: Code inspection and cross-referencing exports vs. usage  
> **Sources**: All scheduling package source files

---

## Finding 3.1 — Global Mutable State in use-kanban-adder

**Where**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-adder.ts:14`

```typescript
let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}
```

**What**: A module-level `let idCounter` that persists across all Kanban board instances. If two Kanban boards are mounted on the same page, they share the same counter, producing non-deterministic and potentially colliding IDs.

**Why care**: This is a concrete bug. Real scenario: a dashboard with two Kanban boards for different departments. Both boards generate card IDs from the same counter, producing sequential IDs like `card-1721600000000-1`, `card-1721600000000-2` across both boards. While `Date.now()` in the prefix makes true collisions unlikely, the cross-instance state leak is a correctness anti-pattern. In SSR environments, this counter is shared across requests, which would be catastrophic.

**Confidence**: Determinate

---

## Finding 3.2 — gantt-store: `_dirty` Flag Set But Never Read

**Where**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:29,72,171,190,206,233,255,267`

**What**: The `_dirty` instance property is set to `true` in every mutation method (`updateTask`, `updateLink`, `toggleOpen`, `deleteTask`, `addLink`, `removeLink`) and reset to `false` in `parse()` (line 72). But it is **never read** by any code path — no getter, no conditional, no subscriber check.

**Why care**: Dead code that creates maintenance confusion. A future developer reading the code will wonder whether `_dirty` is part of some reactive pattern they need to maintain. It's not — it's a leftover from an incomplete optimization or debugging effort.

**Confidence**: Determinate

---

## Finding 3.3 — Kanban: `_handleCardRemove` and `shouldMerge` Unused

**Where**:

1. `kanban/kanban-board.tsx:289-296` — `_handleCardRemove` is defined but never called from any event handler or JSX
2. `kanban/kanban-undo-stack.ts:84-90` — `shouldMerge` is exported and has tests, but is never called by `pushCommand` or any other function

**What**: `_handleCardRemove` would wire to `events.onCardRemove` but the card removal logic in the renderer doesn't call it. `shouldMerge` implements merge logic for the undo stack but the undo operations never invoke it — they always push a new command.

**Why care**: These are unimplemented feature stubs. `_handleCardRemove` specifically means that the `onCardRemove` event, while declared in the schema, is never dispatched — another contract drift point. `shouldMerge` is implemented, tested, but not wired — wasted test coverage.

**Confidence**: Determinate

---

## Finding 3.4 — Calendar: Deprecated Components With Active Event Wiring

**Where**:

- `packages/flux-renderers-scheduling/src/calendar/index.ts:51-68` — Four deprecated exports with `@deprecated Unwired` annotations
- `scheduling-renderer-definitions.ts:136-161` — Events for these deprecated components are still registered

**What**: The following are marked `@deprecated Unwired` but their corresponding events remain in the public definitions:

| Deprecated export          | Wired events in definitions                                                   |
| -------------------------- | ----------------------------------------------------------------------------- |
| `CalendarBatchScheduler`   | `onBatchSchedule`, `batchScheduling`                                          |
| `CalendarResourceGroup`    | `onGroupToggle`, `resources[].resources`, `resources[].open`                  |
| `CalendarTimezoneSelector` | `onTimezoneChange`, `timezoneSelector`                                        |
| `useCalendarICal`          | `onImport`, `onImportError`, `component:importICal`, `component:exportToICal` |

**Why care**: Deprecation typically means "will be removed" or "don't use." But the deprecated components still have their events registered in the canonical definitions file. Either:

- They should be removed from definitions (if truly deprecated)
- They should be wired to the renderer (if still planned)
- The definitions should record the deprecation status

Currently, the schema promises functionality that is explicitly marked as deprecated/unwired — confusing for API consumers.

**Confidence**: Determinate

---

## Finding 3.5 — Silent Catch Blocks (Error Handling Gaps)

**Where**:

1. `kanban/kanban-board.tsx:179-181` — Empty `catch` block:
   ```typescript
   } catch {
     /* bad expression — fall through to no-op */
   }
   ```
2. `gantt/gantt-compact.tsx:56` — Edge case in error formatting:
   ```typescript
   err instanceof Error ? err.message : String(err) || 'Unknown error';
   ```

**What**: The Kanban's `filterCard` expression compilation silently catches all errors and falls through to return `undefined` (no filter). A user who provides a malformed expression gets no feedback — no console warning, no error event, nothing. The Gantt error formatting has a minor edge case where `String(err)` for falsy values like empty string `''` yields `''` (falsy), triggering the `|| 'Unknown error'` fallback — technically works but is fragile.

**Why care**: The Kanban silence at Finding 3.5.1 is a DX (developer experience) issue. The comment says "bad expression" but doesn't tell the user. In a low-code platform where schema is often hand-written or AI-generated, silent failure on expression errors makes debugging very hard.

**Confidence**: Determinate

---

## Finding 3.6 — Test: Invalid Assertion (False Positive)

**Where**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.test.tsx:86-97`

**What**: The test "should call onClose when close button clicked" creates an `onClose` mock, renders the overlay, queries for the close button, but **never actually clicks it** and **never asserts** that `onClose` was called. The test passes even though the close button hasn't been interacted with.

```tsx
// Query for close button but never click it
const closeButton = screen.getByRole('button', { name: /close/i });
// Never: await user.click(closeButton);
// Never: expect(onClose).toHaveBeenCalled();
```

**Why care**: False-positive tests erode confidence in the test suite. This test looks like it validates behavior but doesn't. If the close button is later broken, this test won't catch it.

**Confidence**: Determinate (test code shows no assertion on the mock)

---

## Round Assessment

**Round coverage**: 6 findings covering dead code, global state leaks, deprecated artifacts, and test quality.

**Most critical**: Finding 3.1 (global `idCounter`) is a latent multi-instance bug — the kind of issue that passes all tests (which run in isolation with one board) but fails in production.

**Best follow-up direction**: Assess whether the overall finding pattern (contract drift + convention violations + dead code) warrants a cross-package remediation plan or can be addressed incrementally.
