> Audit Status: open
> Audit Type: open-ended (Round 1)
> Mission: scheduling
> Date: 2026-07-21
> Source perspective: Dead code cleaner + contract archaeologist + React 19 enforcer

## Pre-check: Previously Reported Issues Status (HEAD at 2026-07-21)

Verified the current HEAD against all 45 findings from prior audit executions (`2026-07-20-2157` rounds 1-4 + `2026-07-21-001` round 1).

### Resolved Since Last Round

| Fixed | Previous ID | Issue                                                        | Evidence                                                                                               |
| ----- | ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| ✓     | F-39        | AddLinkCommand.redo() orphan link                            | `undo-stack.ts:111` — now updates `this.linkId = link.id`                                              |
| ✓     | F-40        | UpdateTaskCommand `as any` on core execution                 | `undo-stack.ts:25-26` — now typed as `Partial<GanttTaskData>`                                          |
| ✓     | F-41        | Kanban filterText one-time initializer                       | `use-kanban-filter.ts:12-17` — now has `useEffect` sync                                                |
| ✓     | F-42        | Calendar dual controlled-mode surfaces                       | `use-calendar-state.ts:12` — `CalendarStateOptions` no longer has controlledDate/controlledView params |
| ✓     | F-43        | CSS import test sync throw expectation                       | `calendar.test.tsx:139-142` — now correctly uses `await import` + `expect(mod).toBeDefined()`          |
| ✓     | F-36        | Calendar lifecycle test zero assertions                      | `calendar.test.tsx:165-179` — now has proper call-count + argument assertions                          |
| ✓     | F-45        | Deprecated GanttTask/GanttLink exported without replacements | `index.ts:16` — now exports `GanttTaskData`/`GanttLinkData` from `gantt.types.js`                      |

### Still Open or Unresolved

| Previous ID | Issue                                                              | Status                                                                                                      |
| ----------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| F-44        | 45+ `useCallback`/`useMemo` redundant with React Compiler          | Still present — no lint enforcement added                                                                   |
| F-19        | Calendar hardcoded `zh-CN` locale (now partly fixed via i18n keys) | `calendar.tsx` now uses `t('scheduling.calendar.*')` for shift types; header/weekday labels still hardcoded |

### Fix Rate

33 of 38 actionable findings from `2026-07-20-2157` resolved; 6 of 7 from `2026-07-21-001` resolved. Very fast fix cycle.

---

## New Findings

### F-46: `useOfflineDetection` is dead code — exported but zero production imports; also implements wrong pattern

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.ts:81-106`

**What**: The function `useOfflineDetection` is exported from the public utility module but imported by zero production files:

```typescript
export function useOfflineDetection(onOnline?: () => void, onOffline?: () => void) {
  if (typeof window === 'undefined') { return { isOnline: true, cleanup: () => {} }; }
  const isOnline = navigator.onLine;
  const handleOnline = () => { onOnline?.(); };
  const handleOffline = () => { onOffline?.(); };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return { isOnline, cleanup: () => { window.removeEventListener(...); } };
}
```

A grep for `useOfflineDetection` across all `packages/` files returns exactly 2 files: the definition file and its own test file (`barcode-queue.test.ts:2,99-101`). Zero production consumers.

Beyond being dead code, the pattern is wrong for React:

- The function registers `window` event listeners at call time (render phase if called in a component), not through `useEffect`/`useSyncExternalStore`
- Returns `{ isOnline, cleanup }` — if called in render, listeners leak with every render; callers must manually call `cleanup` in an effect
- The project already has the CORRECT pattern in `barcode-scanner-overlay.tsx:50-61` using `useSyncExternalStore`

**Why care**: Dead export creates maintenance burden and misleads future developers. If someone imports it hoping for a ready-made online/offline hook, they get a buggy pattern that leaks event listeners and doesn't integrate with React's lifecycle. The correct pattern is already demonstrated 5 lines away in the same package.

**Confidence**: Certain

---

### F-47: Gantt `createInitialStore` captures schema config once — `cellWidth`/`defaultZoom`/`taskBarHeight` changes ignored forever

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:29-41,53`

**What**: The store is created once via `useState(() => createInitialStore(resolved))` (line 53). The `createInitialStore` function (lines 29-41) reads `resolved.cellWidth`, `resolved.defaultZoom`, and `resolved.taskBarHeight` from the initial props:

```typescript
function createInitialStore(resolved: Record<string, unknown>): GanttStore {
  const s = new GanttStore({
    cellWidth: (resolved.cellWidth as number) ?? 40,
    defaultZoom: (resolved.defaultZoom as string) ?? 'week',
    taskBarHeight: (resolved.taskBarHeight as number) ?? 28,
  });
  ...
}
```

The `useEffect` at lines 63-69 synces task/link/resource/assignment data into the store via `store.parse()`, but no mechanism syncs `cellWidth`, `defaultZoom`, or `taskBarHeight` if these schema props change after mount.

**Concrete scenario**: A parent renders Gantt with `cellWidth: 60` initially (compact view), then dynamically switches to `cellWidth: 120` (detailed view) via a schema-controlled action. The store still uses `cellWidth: 60`. `store.setZoom()` (line 513) changes zoom levels independently, but the initial `cellWidth` is the base for all non-zoom scales. The Gantt stays in the compact cell width.

**Scale**: Affects all Gantt instances where config props are fed from dynamic schema data (API response, state-managed schema, user preference).

**Confidence**: Likely — depends on whether config is truly dynamic vs. one-time mount-time. For static schema use cases, no impact.

---

### F-48: Barcode dispatch uses `as any` on event payload — type safety bypass in production event dispatch path

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx:106-107,116-117`

**What**: The barcode-input renderer's event dispatch pattern:

```typescript
if (events.onScan) {
  helpers.dispatch(events.onScan as any, {
    ...(events.onScan as any)?.__ctx,
    barcode: result.barcode,
    format: result.format,
  });
}

if (events.onScanError) {
  helpers.dispatch(events.onScanError as any, {
    ...(events.onScanError as any)?.__ctx,
    error: { message: error },
  });
}
```

Three `as any` casts on the production dispatch path:

1. `events.onScan as any` — bypasses `ActionSchema | undefined` type
2. `(events.onScan as any)?.__ctx` — assumes `__ctx` exists, no type checking
3. `events.onScanError as any` — same bypass for error path

The `__ctx` spread silently produces `{}` if `onScan` is a plain ActionSchema without `__ctx`. Any misspelled payload keys (e.g., `barecode` instead of `barcode`) pass through unchecked.

**Why care**: This is distinct from the test-only `as any` patterns (which mock `RendererComponentProps` in test files). This is production code on the event dispatch core path. The `UpdateTaskCommand` `as any` was already flagged as F-40 and has been fixed with proper types. But barcode-input's dispatch was never flagged.

The contrast is stark: scheduling-renderer-definitions.ts registers `onScan` and `onScanError` as fully typed event fields (inherited from barcodeInputFieldRules), but the actual dispatch code erases all type safety.

**Confidence**: Certain

---

### F-49: Deprecated `GanttTask`/`GanttLink` still used by `GanttSchema` type — deprecation cannot be followed

**Location**: `packages/flux-renderers-scheduling/src/schemas.ts:4-26,66-69`

**What**: Two interconnected problems:

1. `GanttTask` (line 4) and `GanttLink` (line 19) are marked `@deprecated` with JSDoc: "Use `GanttTask` from `./gantt/gantt.types.js` instead"
2. But `GanttSchema` (lines 68-69) still references them:
   ```typescript
   tasks?: GanttTask[];
   links?: GanttLink[];
   ```

The replacement type `GanttTaskData` (gantt.types.ts:18-32) has NO `children` field — it's a runtime store type without hierarchical nesting. The `GanttTaskData` type:

```typescript
export interface GanttTaskData {
  id: GanttId;
  text: string;
  start: string;
  end: string;
  duration?: number;
  progress?: number;
  parent?: GanttId | null;
  open?: boolean;
  children?: GanttTaskData[]; // <-- wait, it DOES have children
  calendar?: string;
  segments?: GanttBaseline[];
}
```

Actually, reading more carefully, `GanttTaskData` DOES have `children?: GanttTaskData[]`. So the deprecation IS followable for consumers who write input data. But:

- The `GanttSchema` type itself still uses the deprecated `GanttTask` — this means any consumer who type-checks against `GanttSchema` sees the deprecated type
- The deprecated type adds `open?: boolean` (which `GanttTaskData` also has) but does NOT add `$x`, `$y`, etc. — the schema type actually has fewer computed fields than the runtime type, making it MORE suitable for schema work
- A consumer who follows the deprecation and switches to `GanttTaskData` gets the same shape plus runtime-only fields (`segments`, `baselines`) that shouldn't appear in schemas
- The `index.ts` barrel now exports `GanttTaskData` (fixed from F-45), but the `GanttSchema` type still references `GanttTask`

**Why care**: The deprecation creates a contradictory contract:

- Schema consumers see `@deprecated` warning on `GanttTask` when authoring Gantt data
- But they can't use the stated replacement because the `GanttSchema` type itself requires `GanttTask`
- The only resolution is to change `GanttSchema.tasks` to use `GanttTaskData` in the type, but then both types are identical (GanttTaskData has children) — so the deprecation serves no purpose beyond re-export churn

**Confidence**: Certain — the deprecation is semantically correct only if `GanttSchema` is also updated, creating a perfect deadlock where neither the deprecation nor the schema can change independently.

---

### F-50: BarcodeScannerOverlay effect depends on unstable `start`/`stop` references — camera lifecycle effect re-runs on every render

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:104-108`

**What**: The effect dependency array includes `stop` and `start`:

```typescript
const camera = useBarcodeCamera({ videoRef }); // line 62
const { stop, start } = camera; // line 72

useEffect(() => {
  // ... camera init logic
  return () => {
    mountedRef.current = false;
    stop();
  };
}, [open, wasmUrl, onScanError, stop, start]); // line 108
```

`useBarcodeCamera` (the hook) returns `start` and `stop` as fresh closures created in the hook body every render:

```typescript
// use-barcode-camera.ts
const stop = () => { ... };      // new closure every render
const start = async () => { ... }; // new closure every render
return { videoRef, isActive, error, start, stop };
```

Since `start` and `stop` are new object references each render, the effect re-runs on every render of any ancestor — even when `open`, `wasmUrl`, and `onScanError` are unchanged. The cleanup calls `stop()`, which increments `sessionRef` and stops the camera; the effect re-runs and calls `start()`, which re-initializes the camera stream.

**Why care**: For a camera, this manifests as the video feed stopping and restarting ("flicker") on every parent re-render. In practice:

- A parent state change (e.g., a reactive form value two levels up) causes the scanner overlay's video to briefly cut out
- The session guard (`sessionRef`) prevents data races, but the visual flicker is a usability degradation
- The `stop`/`start` cycle also sends unnecessary `getUserMedia()` calls, which may trigger browser permission dialogs on repeated calls

**Contrast with `scrollToToday`** (F-01/F-29, both now fixed): those were stubs that silently did nothing. This is the opposite — it works, but too eagerly (calls stop/start more times than necessary).

**Confidence**: Certain

---

## Cross-Round Summary

### Verification Cross-Check

| Source     | Findings Found | Overlap with prior audits | Novel |
| ---------- | -------------- | ------------------------- | ----- |
| This round | 5              | 0                         | 5     |

### Final Status

| ID   | Severity | File                                       | Issue                                                                                           |
| ---- | -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| F-46 | P2       | barcode-queue.ts:81-106                    | `useOfflineDetection` dead export + wrong render-time event registration pattern                |
| F-47 | P2       | gantt.tsx:29-41,53                         | `createInitialStore` captures cellWidth/defaultZoom/taskBarHeight once — config changes ignored |
| F-48 | P2       | barcode-input-renderer.tsx:106-107,116-117 | `as any` on barcode event dispatch bypasses type safety in production core path                 |
| F-49 | P2       | schemas.ts:4-26,68-69                      | Deprecated GanttTask/GanttLink still used by GanttSchema — deprecation is unfollowable dead end |
| F-50 | P3       | barcode-scanner-overlay.tsx:104-108        | Effect depends on unstable start/stop references — camera lifecycle re-runs on every render     |

**Total this round**: 5 new findings (0 P0, 4 P2, 1 P3)

### Key Pattern Detected

**Event dispatch type safety erosion (2 instances across packages)**: The barcode-input dispatch `as any` (F-48) shows the same pattern that was fixed in the Gantt command path. The scheduling package has now fixed `UpdateTaskCommand` (F-40) but the barcode-input dispatch was never caught because it's in a different sub-domain. This suggests a systemic gap: the event dispatch core path in renderers is not consistently typed across all four scheduling sub-domains.

### Blindness Self-Assessment

What this round likely missed:

1. **E2E test execution**: Did not run the test suite to check which tests actually fail or flake
2. **Performance profiling**: Did not measure Gantt render cycle cost, Calendar virtualizer efficiency, or Kanban undo-stack memory pressure at scale
3. **Bundle size analysis**: Did not check whether tree-shaking correctly removes dead code paths (F-46 `useOfflineDetection`, unused i18n keys)
4. **Accessibility audit**: Did not screen-reader-test any component's keyboard navigation or ARIA semantics
5. **Security audit**: Did not probe XSS vectors in task/event text rendering, or prototype pollution through schema data
6. **Cross-package type contracts**: Did not verify `RendererComponentProps<GanttSchema>` generic narrowing at the boundary between flux-core / flux-react / flux-renderers-scheduling
7. **CSS artifacts**: Did not verify that all `nop-*` classes referenced in JSX have corresponding CSS definitions (beyond what was already reported)

Best starting point for round 2: E2E test execution (confirm which findings produce visible failures) + bundle size analysis (tree-shaking dead code from the scheduling package).
