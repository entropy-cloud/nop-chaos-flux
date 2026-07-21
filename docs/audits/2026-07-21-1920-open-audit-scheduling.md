> Audit Status: closed
> Audit Type: open-ended
> Mission: scheduling

## Pre-check Context

This audit builds on two previous adversarial review executions for the scheduling mission:

- `docs/analysis/2026-07-20-2157-open-audit-scheduling/` (4 rounds, 38 findings: F-01 through F-38)
- `docs/analysis/2026-07-21-001-open-audit-scheduling/` (1 round, 7 findings: F-39 through F-45)

**Fix rate**: 33 of 38 from the first execution and 6 of 7 from the second are now resolved in HEAD. The codebase shows active, fast maintenance.

This round reports 5 novel findings (F-46 through F-50) not previously reported.

---

## F-46: `useOfflineDetection` is dead code — zero production imports; also implements wrong React pattern

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.ts:81-106`

**What**: The function `useOfflineDetection` is exported from the public utility module but imported by zero production files across the entire monorepo. A grep returns exactly 2 files: the definition and its own test file.

Beyond being dead, the pattern is wrong for React 19:

- It registers `window` event listeners at call time (render phase if called in a component), not through `useEffect` or `useSyncExternalStore`
- Returns `{ isOnline, cleanup }` — callers must manually invoke `cleanup()` in an effect lifecycle
- The project already demonstrates the CORRECT pattern at `barcode-scanner-overlay.tsx:50-61` using `useSyncExternalStore`

**Why care**: Dead export creates maintenance burden. If a future developer imports it expecting a correct hook, they get a buggy pattern that leaks event listeners across renders.

**Source perspective**: Dead code cleaner

**Confidence**: Certain

---

## F-47: Gantt `createInitialStore` captures schema config only at mount — `cellWidth`/`defaultZoom`/`taskBarHeight` changes silently ignored

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:29-41,53`

**What**: The store is created once via `useState(() => createInitialStore(resolved))`. Inside, `resolved.cellWidth`, `resolved.defaultZoom`, and `resolved.taskBarHeight` are read once and written to Zustand store state via the `GanttStoreConfig` constructor. A separate `useEffect` syncs task/link/resource/assignment data via `store.parse()`, but config changes are never re-synced.

If a parent dynamically changes `cellWidth: 60` to `cellWidth: 120`, the Gantt continues using the original value. `store.setZoom()` handles zoom levels independently, but the base `cellWidth` is permanent.

**Why care**: Affects any Gantt instance where config props are fed from dynamic schema data (API response, state-managed schema, user preference). While uncommon in static schema scenarios, it's a silent contract violation: the schema declares these as reactive `prop` fields (`scheduling-renderer-definitions.ts:27-31`), but they behave as one-time initializers.

**Source perspective**: Contract archaeologist

**Confidence**: Likely

---

## F-48: `as any` on barcode event dispatch — type safety bypass on production core path

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx:106-107,116-117`

**What**: Three `as any` casts on the event dispatch core path:

```typescript
helpers.dispatch(events.onScan as any, {
  ...(events.onScan as any)?.__ctx,
  barcode: result.barcode,
  format: result.format,
});
helpers.dispatch(events.onScanError as any, {
  ...(events.onScanError as any)?.__ctx,
  error: { message: error },
});
```

`events.onScan` and `events.onScanError` are typed `ActionSchema | undefined`. The casts erase this guard. If `__ctx` doesn't exist on `onScan`, the spread silently produces `{}`. Any malformed payload keys pass through unchecked.

**Why care**: This is production code on the event dispatch core path, not test mock setup. The identical pattern in `UpdateTaskCommand` was flagged as F-40 and has been fixed (now uses `Partial<GanttTaskData>`), but barcode-input's dispatch was never caught because it lives in a different sub-domain. The scheduling package now has an inconsistent type safety baseline across sub-domains.

**Source perspective**: Contract archaeologist

**Confidence**: Certain

---

## F-49: Deprecated `GanttTask`/`GanttLink` still required by `GanttSchema` — deprecation creates a contradiction

**Location**: `packages/flux-renderers-scheduling/src/schemas.ts:4-26,66-69`

**What**: `GanttTask` (line 4) and `GanttLink` (line 19) are marked `@deprecated` with JSDoc telling consumers to use types from `./gantt/gantt.types.js`. But `GanttSchema` (lines 68-69) still references them:

```typescript
export interface GanttSchema extends BaseSchema {
  type: 'gantt';
  tasks?: GanttTask[];   // uses deprecated type
  links?: GanttLink[];   // uses deprecated type
```

The index.ts barrel now correctly exports `GanttTaskData`/`GanttLinkData` (F-45 fix). But any consumer who writes `tasks: GanttTaskData[]` gets a type error if they also use `GanttSchema` — because `GanttSchema.tasks` requires `GanttTask`. The `GanttTaskData` type has `children` (same as `GanttTask`) plus `segments`/`baselines` that shouldn't appear in schema data.

The deprecation creates a deadlock: `GanttSchema` can't stop using `GanttTask` until all consumers migrate, but consumers can't migrate because `GanttSchema` still requires `GanttTask`.

**Why care**: Schema consumers see a `@deprecated` warning on `GanttTask` when authoring Gantt schema data, but the stated replacement (`GanttTaskData`) is incompatible with the only type (`GanttSchema`) that accepts it. The deprecation is unfollowable.

**Source perspective**: Contract archaeologist

**Confidence**: Certain

---

## F-50: BarcodeScannerOverlay effect depends on unstable `start`/`stop` closures — camera lifecycle effect re-runs on every render

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:104-108`

**What**: The camera effect dependency array includes `stop` and `start`:

```typescript
const camera = useBarcodeCamera({ videoRef });
const { stop, start } = camera;

useEffect(() => {
  // init camera
  return () => {
    stop();
  };
}, [open, wasmUrl, onScanError, stop, start]);
```

`useBarcodeCamera` returns `start` and `stop` as fresh closures created in the hook body each render. Since they're new object references each time, the effect re-runs on every parent render — even when `open`, `wasmUrl`, and `onScanError` are unchanged. The cleanup calls `stop()`, which stops the camera stream; the effect re-runs and calls `start()`, which re-initializes `getUserMedia()`.

**Why care**: For a camera, this causes the video feed to briefly cut out on every parent re-render. The `sessionRef` guard prevents data races, but users see a visual flicker. Repeated `getUserMedia()` calls may trigger browser permission UI or throttling.

**Source perspective**: React 19 enforcer

**Confidence**: Certain

---

## Cross-Round Summary

| ID   | Severity | File                                       | Issue                                                                                                 |
| ---- | -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| F-46 | P2       | barcode-queue.ts:81-106                    | Dead export `useOfflineDetection` — zero production imports + wrong render-time listener registration |
| F-47 | P2       | gantt.tsx:29-41,53                         | Store config (cellWidth/defaultZoom/taskBarHeight) captured once; schema prop changes ignored         |
| F-48 | P2       | barcode-input-renderer.tsx:106-107,116-117 | `as any` on event dispatch bypasses type safety — production core path                                |
| F-49 | P2       | schemas.ts:4-26,68-69                      | Deprecated GanttTask/GanttLink still used by GanttSchema — deprecation unfollowable                   |
| F-50 | P3       | barcode-scanner-overlay.tsx:104-108        | Unstable start/stop refs cause camera stop/start cycle on every render                                |

**Total this round**: 5 new findings (0 P0, 4 P2, 1 P3)

### Key Patterns Detected

1. **Inconsistent type safety elimination**: `UpdateTaskCommand` `as any` was fixed (F-40) but barcode-input dispatch `as any` persists (F-48). Same pattern, different sub-domain, suggesting no cross-sub-domain review gate.

2. **Deprecation not reconciled with schema**: `GanttSchema` makes the `GanttTask` deprecation unfollowable (F-49). The deprecation was mechanically applied without checking whether the schema type itself could migrate.

3. **Fast fix cycle, uneven depth**: 39 of 45 prior findings are resolved in HEAD. But some fixes (like `useOfflineDetection` being dead) and type safety gaps (F-48) persist because they're in less-scrutinized sub-domains.

### Blindness Self-Assessment

What this round likely missed:

- E2E test execution (no test suite run; unknown which tests fail/flake)
- Performance profiling (no measurement of Gantt render cost, Calendar virtualizer, or Kanban undo memory)
- Bundle size analysis (no tree-shaking verification for dead code like F-46)
- Security audit (no XSS probing in task/event text rendering)
- Accessibility audit (no screen-reader or keyboard-only testing)
- Cross-package type contracts (no verification of generic narrowing at `flux-core`/`flux-react`/`flux-renderers-scheduling` boundary)

Best starting point for next round: run the actual test suite and check for failures, then audit i18n key consistency across all four sub-domains.
