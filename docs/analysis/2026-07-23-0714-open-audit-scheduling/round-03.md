> Audit Status: open
> Audit Type: open-ended
> Mission: scheduling

# Open-Ended Adversarial Audit — Scheduling (Round 3, 2026-07-23)

## Pre-Check: Previous Round Status

| Source                   | Findings | New this round               |
| ------------------------ | -------- | ---------------------------- |
| Deep audit D09-04/D09-05 | 2        | 0 (re-verified still broken) |
| Round-01/round-02        | 0        | —                            |
| **New this round**       | **6**    | **6**                        |

Round-02 items F-84 through F-90 are not verified in this round — this round's focus is on cross-cutting patterns and imperative-API gaps missed by prior audits. `[events]` dep issues (D09-04/D09-05) are re-verified as still present.

---

## New Findings

### F-91: Barcode `scanNow` imperative handle bypasses readOnly gate — F-24 fix only covered UI paths

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:195-212`

**What**: F-24 was reported and verified fixed for the UI paths: `handleFocus` (line 61), `handleScanClick` (line 87), and `handleScanResult` (line 153) all check `if (resolved.readOnly) return;`. However, the imperative handle method `scanNow` (exposed via `useInputComponentHandle`) does NOT check `resolved.readOnly`:

```typescript
scanNow: () => {
      scanOnFocusOpenedRef.current = false;
      if (cameraAvailable === null) {
        checkCameraAvailability().then((result) => {
          setCameraAvailable(result.isAvailable);
          if (result.isAvailable) {
            setOverlayOpen(true);  // ← opens overlay even when readOnly
          }
        })
        // ...
      }
      if (cameraAvailable) {
        setOverlayOpen(true);  // ← opens overlay even when readOnly
        // ...
      }
      // ...
    },
```

A parent component or sibling renderer calling `ref.current.scanNow()` on a readOnly barcode-input will open the scanner overlay, scan barcodes, and write them to the form — completely bypassing the readOnly constraint.

**Test contradiction**: The regression test at `barcode-input.test.tsx:446-457` is named `'scanNow should not open overlay when readOnly is true'` but asserts `toBeTruthy()`:

```typescript
it('scanNow should not open overlay when readOnly is true', async () => {
  // ...
  act(() => {
    lastCall.scanNow();
  });
  await waitFor(() => {
    expect(document.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeTruthy();
    // ↑ assertion contradicts test name — should be toBeFalsy() after fix
  });
});
```

The test was apparently written to match the buggy behavior. When the fix is applied (checking `readOnly` in `scanNow`), this test will fail.

**Why previous audits missed this**: F-24 was reported as a holistic "readOnly bypassed by scanner" issue. The fix PR verified the three UI paths but missed the imperative API path. No prior audit specifically tested the imperative handle method against readOnly.

**Confidence**: Certain

---

### F-92: Barcode-input validation error messages are hardcoded English — not translatable

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:113-139`

**What**: The `validateScanResult` function returns hardcoded English error strings:

| Line | Condition                 | English string                                              |
| ---- | ------------------------- | ----------------------------------------------------------- |
| 115  | `required`                | `'This field is required'`                                  |
| 119  | `minLength`               | `` `Minimum length is ${minL} characters` ``                |
| 123  | `maxLength`               | `` `Maximum length is ${maxL} characters` ``                |
| 129  | `pattern`                 | `` `Value does not match pattern: ${resolved.pattern}` ``   |
| 132  | `pattern` (invalid regex) | `` `Invalid pattern: ${resolved.pattern}` ``                |
| 136  | `validate.message`        | `resolved.validate.message` (already consumer-provided, OK) |

None of these use `t('flux.barcode.*')` keys. The `@nop-chaos/flux-i18n` package is already a dependency and is used elsewhere in the same file (e.g., ARIA labels via `useFluxTranslation`). Every other barcode-input text string goes through i18n.

**Why care**: A user in any non-English locale sees validation errors in English while all other UI elements are properly localized. The `flux.barcode.*` namespace already has keys for scan-related strings — adding validation error keys would be consistent.

**Confidence**: Certain

---

### F-93: Kanban mount/unmount effect depends on `[events]` — fires lifecycle on every render (D09-04, still unfixed)

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:128-131`

**What**: The mount effect has `[events]` as a dependency:

```typescript
useEffect(() => {
  void events.onMount?.({});
  return () => {
    void events.onUnmount?.({});
  };
}, [events]);
```

The `events` object is part of `RendererComponentProps` and does not have a stability guarantee. If `events` changes identity on every render (which is the common case for objects created inline in render), the mount/unmount effect fires on every render — `onUnmount` fires with stale events, then `onMount` fires with new events. This is not a correct lifecycle implementation.

**Comparison**: Gantt (`gantt.tsx:66-77`) and Calendar (`calendar.tsx:55-56,118-125`) both use `eventsRef` to decouple the mount effect from the `events` prop identity, with `[]` deps. The deep audit (D09-04) recommended this fix but it was never applied to Kanban.

**Why care**: Any schema consumer relying on `onMount`/`onUnmount` for initialization/cleanup will have their handlers called on every render, not just mount/unmount. This means resources allocated in `onMount` (subscriptions, timers) are torn down and recreated on every render — a performance and correctness bug.

**Confidence**: Certain

---

### F-94: Barcode-input mount/unmount effect depends on `[events]` — fires lifecycle on every render (D09-05, still unfixed)

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:32-37`

**What**: Same pattern as F-93 — mount effect with `[events]` dependency:

```typescript
useEffect(() => {
  void events.onMount?.({});
  return () => {
    void events.onUnmount?.({});
  };
}, [events]);
```

Same root cause and same impact as F-93. The deep audit D09-05 flagged this but it was never fixed.

**Confidence**: Certain

---

### F-95: Kanban event dispatches use `events` directly — no `eventsRef` pattern — inconsistent with Gantt/Calendar

**Location**: All event dispatch sites in `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`

**What**: Every event dispatch in Kanban directly accesses `events` from the render closure rather than via a ref:

| Line | Expression                                                                        |
| ---- | --------------------------------------------------------------------------------- |
| 275  | `void events.onCardMove?.(payload)`                                               |
| 295  | `void events.onColumnReorder?.(payload)`                                          |
| 314  | `void events.onColumnReorder?.({ columnId, fromIndex: idx, toIndex: targetIdx })` |
| 319  | `void events.onCardClick?.({ cardId, columnId, index })`                          |
| 320  | `void events.onColumnClick?.({ columnId })`                                       |
| 327  | `void events.onCardAdd?.({ cardId, columnId, index: -1 })`                        |
| 337  | `void events.onCardRemove?.({ cardId, columnId })`                                |
| 359  | `void events.onColumnAdd?.({ columnId, index: rootChildren.length })`             |

These are dispatched from callbacks that may fire asynchronously (DnD drop handler from `useKanbanDnd`, keyboard event handler). If React re-renders the component between the callback being scheduled and executing, the `events` object captured in the closure may be stale. The DnD hooks already use `stateRef` to avoid this for internal state — but the event callbacks don't use the same pattern.

**Comparison**: Gantt (`gantt.tsx:66-67` + all event dispatch sites use `eventsRef.current.*`) and Calendar (`calendar.tsx:55-56` + `eventsRef.current.onGroupToggle`) both use `eventsRef` for all event dispatches. This is the project's established pattern for event handler safety.

**Why care**: In React 19 with concurrent rendering, a render can be interrupted and resumed. Event callbacks that capture `events` from a render that was started but not committed could fire with stale handlers. Using `eventsRef.current` at dispatch time always reads the latest committed events. The inconsistency also creates a maintenance burden — future developers must know which event dispatch style is "correct" for this codebase.

**Confidence**: Likely

---

### F-96: Cross-subdomain dependency on `calendar/hooks/use-focus-trap.js` — fragile internal API boundary

**Location**:

- `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:13`
- `packages/flux-renderers-scheduling/src/kanban/components/kanban-activity-log.tsx:5`
- `packages/flux-renderers-scheduling/src/calendar/hooks/use-focus-trap.js` (source)

**What**: Two subdomains (barcode-input and kanban) import a hook from the calendar subdomain's private hooks directory:

```typescript
// barcode-scanner-overlay.tsx:13
import { useFocusTrap } from '../calendar/hooks/use-focus-trap.js';

// kanban-activity-log.tsx:5
import { useFocusTrap } from '../../calendar/hooks/use-focus-trap.js';
```

The `calendar/hooks/` directory is not declared as a shared/public API. If a developer refactors the calendar hooks directory (e.g., renames `use-focus-trap.ts` to `use-calendar-focus-trap.ts`, or moves it into a `calendar/utils/` directory), the barcode-input and kanban consumers silently break. There is no index re-export that would make this migration visible.

**Why care**: This is a low-level package-internal dependency that is invisible to anyone who doesn't grep for cross-subdomain imports. It creates a maintenance coupling between three subdomains that have no explicit relationship. A future restructure of calendar internals would accidentally break barcode keyboard accessibility.

**Suggested fix**: Either (a) promote `useFocusTrap` to the package-level `src/index.ts` so it's a documented internal export, or (b) extract it to `src/shared/` or `src/hooks/` at the package root, making the shared nature explicit.

**Confidence**: Certain

---

## Summary

| ID   | Severity | File                                                           | Issue                                                                          |
| ---- | -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| F-91 | P0       | `barcode-input.tsx:195-212` + `barcode-input.test.tsx:446-457` | `scanNow` imperative handle bypasses `readOnly`; test assertion inverted       |
| F-92 | P1       | `barcode-input.tsx:113-139`                                    | Validation error messages hardcoded English, not i18n                          |
| F-93 | P1       | `kanban-board.tsx:128-131`                                     | Mount/unmount effect dep `[events]` — fires on every render (D09-04 unfixed)   |
| F-94 | P1       | `barcode-input.tsx:32-37`                                      | Mount/unmount effect dep `[events]` — fires on every render (D09-05 unfixed)   |
| F-95 | P2       | `kanban-board.tsx:275-359`                                     | 8 event dispatches use `events` directly, not `eventsRef` — stale handler risk |
| F-96 | P3       | `barcode-scanner-overlay.tsx:13`, `kanban-activity-log.tsx:5`  | Cross-subdomain `useFocusTrap` import — fragile internal boundary              |

### Verification Accounting

| Category                             | Count              |
| ------------------------------------ | ------------------ |
| Round-02 items NOT re-checked        | 7 (F-84–F-90)      |
| Deep audit items re-verified unfixed | 2 (D09-04, D09-05) |
| New findings this round              | 6 (F-91–F-96)      |

### Blindness Self-Assessment

**Likely missed this round**:

1. **E2E test suite**: Did not run actual Playwright tests. Several findings (F-91, F-93, F-94) would benefit from e2e confirmation but were identified via static analysis.
2. **CSS coverage**: Did not audit whether all `nop-*` CSS classes referenced in JSX have definitions.
3. **Zustand store memory**: Did not profile Gantt store growth under 10,000+ tasks, or Kanban undo stack with 1000+ snapshots.
4. **React Compiler validation**: Did not verify that React Compiler auto-memoization actually covers the patterns in Kanban (no `eventsRef`) — Compiler may optimize around direct `events` closure capture differently than human reasoning.
5. **Security**: Did not probe XSS vectors through task text, card titles, or event names passed through schema data.

**Best starting point for next round**: Run the full test suite + e2e suite to verify regressions, then measure bundle composition and CSS coverage.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
