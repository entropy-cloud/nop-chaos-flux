> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: scheduling
> Remediation Plans: `docs/plans/2026-07-21-2100-2-scheduling-package-hardening.md` (S14-01, S14-02, S14-03, S01-01, S13-01, S15-01), `docs/plans/2026-07-21-2100-1-dead-module-cleanup-scheduling-content.md` (S01-02)

# Multi-Dimensional Audit Report: `scheduling` Mission

## Scope

- **Target package**: `@nop-chaos/flux-renderers-scheduling` (`packages/flux-renderers-scheduling/`)
- **Components audited**: Gantt, Kanban, Calendar, BarcodeInput
- **Total source files**: ~87 (excluding tests)
- **Total test files**: ~55+
- **Verification baseline**: `pnpm typecheck` ✅, `pnpm build` ✅, `pnpm lint` (0 errors, 2 warnings), `pnpm test` ✅ (with coverage)
- **Automated tools consumed**: `pnpm check:audit-suspects`, `pnpm check:audit-runtime-raw-schema-reads`, `pnpm check:audit-missing-renderer-markers`, `pnpm check:audit-styling-suspects`, `pnpm check:audit-performance-suspects`, `pnpm check:audit-fieldframe-bypasses`

---

## Dimension 01: Dependency Graph & Package Boundaries

### [S01-01] Direct `form.store.getState()` bypasses standard runtime hooks

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:21`
- **Evidence**:
  ```ts
  const state = form.store.getState() as { values?: Record<string, unknown> };
  return (state.values?.[name] as string) ?? '';
  ```
- **Severity**: P2
- **Status**: BarcodeInput reads `form.store.getState()` directly and performs `as` type casting instead of using `useScopeSelector` with path-based subscription.
- **Risk**: Bypasses `useScopeSelector`'s per-path subscription optimization; re-renders on any `form.values` change rather than just the subscribed field path. The `as` cast bypasses type checking on the store shape.
- **Suggestion**: Replace with `useScopeSelector(scope, (s) => s?.values?.[name])` for path-granular subscriptions and type-safe access.
- **Calibration check**: This is not a dynamic-boundary exception — a direct path selector exists in the runtime API.
- **Tooling**: Confirmed by `pnpm check:audit-suspects` (`broad-scope-selector` bucket).

### [S01-02] Internal Gantt type re-exports pollute the root index.ts

- **File**: `packages/flux-renderers-scheduling/src/index.ts:3,21`
- **Evidence**:
  ```ts
  import type { GanttTaskData, GanttLinkData } from './gantt/gantt.types.js';
  export type { GanttTaskData, GanttLinkData };
  ```
- **Severity**: P3
- **Status**: `GanttTaskData` and `GanttLinkData` are internal gantt renderer types re-exported from the root index. These are implementation details of the gantt component (runtime data shapes with computed layout fields), not authored schema types.
- **Risk**: Minimal — they are type-only exports. But they widen the public API surface with types that consumers should not need.
- **Suggestion**: Remove these from the root index export; they are already exported from `schemas.ts` via `GanttSchema.tasks` / `GanttSchema.links` typing.
- **Package dependencies**: Package.json depends on `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui` — all compliant with the renderer-layer dependency rules.

---

## Dimension 02: Module Responsibilities & File Boundaries

### [S02-01] No oversized files detected

- **Evidence**: Largest files are `calendar.tsx` (421 lines), `kanban-board.tsx` (412 lines), `barcode-scanner-overlay.tsx` (346 lines) — all under 500 lines.
- **Severity**: N/A (clean)
- **Status**: The package is well-structured with subdirectories per component (gantt/, kanban/, calendar/, barcode-input/), each with `components/`, `hooks/`, `utils/` sub-directories. No `>700` line files exist. No `>500` files with mixed ownership.

### [S02-02] 87 source files is moderate but organization is clean

- **Status**: File count per module (gantt: 30, kanban: 17, calendar: 24, barcode: 8) is well-optimized through subdirectory decomposition. No single module has >30 files at the top level.
- **Index.ts**: Clean — only re-exports and the `registerSchedulingRenderers` function. No implementation logic.

---

## Dimension 09: Renderer Contract Compliance

### [S09-01] All 4 renderers use `RendererComponentProps<Schema>` — compliant

- **Evidence**:
  - `Calendar: RendererComponentProps<CalendarSchema>` (calendar.tsx:47)
  - `Gantt: forwardRef<GanttHandle, RendererComponentProps<GanttSchema>>` (gantt.tsx:44)
  - `KanbanBoard: RendererComponentProps<KanbanSchema>` (kanban-board.tsx:55)
  - `BarcodeInputRenderer: RendererComponentProps<BarcodeInputSchema>` (barcode-input.tsx:12)
- **Status**: All compliant. No `props.schema` reads — compile-once principle held.

### [S09-02] All 4 renderers correctly destructure `props.props`, `props.meta`, `props.regions`, `props.events`

- **Evidence**: Each renderer destructures `{ props: resolved, meta, regions, events }` from props. Standard hooks used where needed (`useCurrentForm`, `useInputComponentHandle`).
- **Status**: Compliant.

### [S09-03] Gantt and Kanban create per-instance Zustand stores outside the standard runtime contract

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:54`
- **Evidence**:
  ```ts
  const [store] = useState(() => createInitialStore(resolved));
  ```
- **Severity**: P2
- **Status**: Gantt creates a local `GanttStore` instance (a Zustand-based class) in `useState`. This is a valid pattern for a complex widget with its own transient UI state (zoom, scroll, selection, drag state). The design docs explicitly document this choice.
- **Risk**: The store is disconnected from the Flux runtime scope — data changes from other renderers won't automatically propagate. The `useEffect` with `JSON.stringify` fingerprint (gantt.tsx:68-74) manually syncs task/link/resource changes from props.
- **Suggestion**: Accept as-is given the documented rationale (complex timeline canvas with cross-component subscriptions). The `JSON.stringify` fingerprint sync is a known pattern for this widget type.

### [S09-04] Kanban uses dual-state pattern (controlled/uncontrolled) for board data

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:66-76`
- **Evidence**:
  ```ts
  const isControlled = rawData != null;
  const [localBoardData, setLocalBoardData] = useState<BoardData>(rawData ?? fallbackBoard);
  const boardData: BoardData = isControlled ? rawData : localBoardData;
  ```
- **Severity**: P2
- **Status**: Dual-state pattern for `boardData` — reads from `props.props.data` when controlled, otherwise from local state. This is a known and documented trade-off pattern (see reopened-design-decisions.md adjudication #4).
- **Risk**: If external `data` prop changes frequently, uncontrolled consumers get stale data until local state is updated. The `useCallback` wrapping `setBoardData` correctly skips mutations in controlled mode.
- **Suggestion**: Mark as accepted tradeoff per prior adjudication. No user-visible failure mode documented.

---

## Dimension 10: Styling System Compliance

### [S10-01] Calendar CSS is 469 lines — large but justified by 3 view variants

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.css`
- **Severity**: P3
- **Status**: Calendar has month, week, and day views + event blocks + print styles total 469 lines of CSS. This is a complex scheduling widget with its own UI surface.
- **Risk**: Styling is self-contained within the calendar component namespace (`.nop-calendar-*` markers). No BEM naming detected. Uses CSS variables for theme compatibility (`--color-calendar-shift`, etc.).
- **Suggestion**: Consider splitting by view once it exceeds 600 lines.

### [S10-02] CSS variables used for calendar colors — theme-compatible

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:41-44`
- **Evidence**:
  ```ts
  { type: 'shift', label: t('scheduling.calendar.morningShift'), color: 'var(--color-calendar-shift, #4ade80)' },
  ```
- **Status**: Calendar uses CSS custom properties with fallback values — compliant with theme independence requirement. No React ThemeProvider dependency.

### [S10-03] All scheduling components use proper `nop-*` marker classes

- **Evidence**:
  - Gantt: `.nop-gantt` (root), `.nop-gantt-grid`, `.nop-gantt-row`, `.nop-gantt-bar-ghost`
  - Kanban: `.nop-kanban`, `.nop-kanban-columns`, `.nop-kanban-column`, `.nop-kanban-card`
  - Calendar: `.nop-calendar`, `.nop-calendar-month-view`, `.nop-calendar-week-view`, `.nop-calendar-day-view`
  - BarcodeInput: `.nop-barcode-input`
- **Status**: All compliant with the renderer marker protocol. No BEM naming detected.

---

## Dimension 11: UI Component Usage Compliance

### [S11-01] Kanban uses `Button`, `Input`, `Label` from `@nop-chaos/ui` — compliant

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:12`
- **Evidence**: `import { cn, Button, Input, Label } from '@nop-chaos/ui';`

### [S11-02] BarcodeInput uses `Button`, `InputGroup` from `@nop-chaos/ui` — compliant

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:5`
- **Evidence**: `import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, Label, cn } from '@nop-chaos/ui';`

### [S11-03] Gantt drag uses raw DOM for ghost elements — acceptable for canvas surface

- **File**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts:28-36`
- **Evidence**:
  ```ts
  const ghost = (() => {
    const g = target.cloneNode(true) as HTMLElement;
    g.classList.add('nop-gantt-bar-ghost');
    g.style.position = 'fixed';
    document.body.appendChild(g);
    return g;
  })();
  ```
- **Severity**: N/A (clean)
- **Status**: Gantt timeline is a highly interactive canvas surface. Raw DOM cloning, fixed positioning, and `document.body.appendChild` for drag ghost are standard DnD UX patterns. Properly cleaned up on pointerup via `document.body.removeChild`.

---

## Dimension 13: Type Safety & Dynamic Boundaries

### [S13-01] BarcodeInput uses `any` type cast on form store values

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:21`
- **Evidence**:
  ```ts
  const state = form.store.getState() as { values?: Record<string, unknown> };
  return (state.values?.[name] as string) ?? '';
  ```
- **Severity**: P2
- **Status**: Double `as` casting — first to an inline type, then `as string`. This erases the actual `FormStore` type signature. Combined with the direct `getState()` call (S01-01), this creates a weak type boundary.
- **Risk**: If the form store shape changes, this cast will silently produce `undefined` or wrong types. The error is invisible until runtime.
- **Suggestion**: Use `useScopeSelector` which preserves the store's generic type parameter.

---

## Dimension 14: Test Coverage & Quality

### [S14-01] Gantt hooks have critically low coverage (< 30%)

- **File**: Various in `packages/flux-renderers-scheduling/src/gantt/hooks/`
- **Coverage data** (from `pnpm test` output):
  - `useGanttDrag`: 9.87% statements
  - `useGanttKeyboard`: 29.41% statements
  - `useGanttLinkDraw`: 26.02% statements
  - `useGanttScroll`: 48.48% statements
- **Severity**: P1
- **Status**: The core interactive hooks (drag, keyboard, link drawing, scroll synchronization) have minimal test coverage. These are the most likely integration failure points — drag interactions, keyboard navigation, and link drawing.
- **Risk**: Regressions in interactive behavior (drag positioning, keyboard focus, link polyline computation) would not be caught by existing tests.
- **Suggestion**: Add integration tests for each hook's primary interaction path (drag start/move/end, keyboard arrow navigation, link anchor drag).

### [S14-02] Kanban export utility has very low coverage (14.28%)

- **File**: `packages/flux-renderers-scheduling/src/kanban/utils/kanban-export.ts`
- **Coverage**: 14.28% statements
- **Severity**: P2
- **Status**: `boardDataToJson`, `boardDataFromJson`, and `downloadBlob` functions are largely untested.
- **Risk**: Export/import of board data (JSON round-trip) could produce corrupted output without test detection.
- **Suggestion**: Add round-trip tests (export board → import JSON → verify structure equality).

### [S14-03] Global `fetch` patches in `prepare-wasm.test.ts` rely on `vi.restoreAllMocks()` without explicit afterEach cleanup

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.test.ts:11,17,24,32,37,44`
- **Evidence**: All 6 tests patch `globalThis.fetch` with `vi.fn()`. Cleanup relies on `beforeEach` calling `vi.restoreAllMocks()`.
- **Severity**: P3
- **Status**: `vi.restoreAllMocks()` in `beforeEach` does reset spies created with `vi.fn()`, but only if no test errors prevent `beforeEach` from running. Tests that fail before completing could leave `globalThis.fetch` mocked in subsequent test files within the same file scope.
- **Risk**: Low — Vitest isolates test files. But the pattern is fragile if `beforeEach` setup fails.
- **Suggestion**: Add explicit `afterEach(() => { vi.restoreAllMocks(); })` as defense-in-depth. Or use `vi.stubGlobal('fetch', ...)` / `vi.unstubAllGlobals()` which is Vitest's idiomatic global patching API.

---

## Dimension 15: Security & Performance Red Lines

### [S15-01] Two React Compiler compatibility warnings

- **Files**:
  - `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts` (ESLint warning at declaration)
  - `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-virtualizer.ts:18`
- **Evidence**:
  ```
  Compilation Skipped: Use of incompatible library
  This API returns functions which cannot be memoized without leading to stale UI.
  ```
- **Severity**: P2
- **Status**: Two hooks using TanStack React Virtual's `useVirtualizer()` and `@tanstack/react-virtual` patterns are incompatible with React Compiler's automatic memoization. The Compiler skips memoization for these components, falling back to pre-Compiler behavior.
- **Risk**: These components will not benefit from Compiler optimization. In large views (thousands of rows), performance may regress compared to manually memoized alternatives. This is a known TanStack limitation.
- **Suggestion**: Add `eslint-disable-next-line react-compiler/react-compiler` with a documented rationale mentioning TanStack's incompatible API. Consider wrapping the virtualizer to stabilize returned function references.

### [S15-02] `JSON.stringify` used for change detection in Gantt

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:68-74`
- **Evidence**:
  ```ts
  const dataFingerprintRef = useRef('');
  useEffect(() => {
    const newData = {
      tasks: resolved.tasks,
      links: resolved.links,
      resources: resolved.resources,
      assignments: resolved.assignments,
    };
    const fp = JSON.stringify(newData);
    if (fp === dataFingerprintRef.current) return;
    dataFingerprintRef.current = fp;
    store.parse(newData.tasks ?? [], newData.links ?? [], newData.resources, newData.assignments);
  }, [store, resolved.tasks, resolved.links, resolved.resources, resolved.assignments]);
  ```
- **Severity**: P3
- **Status**: `JSON.stringify` is used as a cache-key comparator for fingerprinting. This is not a hot-path change detection pattern (it runs in a `useEffect`, not during render).
- **Risk**: Only if `tasks`/`links` arrays are extremely large (thousands+) and change frequently. Current usage is acceptable as a fingerprint cache-key.
- **Suggestion**: Mark as acceptable — not a hot-path pattern. Monitor if perf issues arise with large datasets.

### [S15-03] No `eval`/`new Function`, no O(n^2), no direct store mutation

- **Status**: Clean. ESLint hard gates passed. No direct store mutation patterns detected.

---

## Dimension 16: Documentation-Code Consistency

### [S16-01] All 14 scheduling design docs match current code structure

- **Evidence**:
  - `docs/components/roadmap-scheduling.md`: All phases S0-S10 marked `done`. Code structure matches stated deliverables.
  - `docs/components/calendar/design.md`: 415 lines describing resource × date matrix. Implementation in `calendar.tsx` (421 lines) with hooks matches described hook architecture.
  - `docs/components/kanban/design.md`: 608 lines describing flat `BoardData` dictionary. Implementation in `kanban-board.tsx` matches.
  - `docs/components/gantt/design.md`: 749 lines. Full Gantt architecture matches implementation.
  - `docs/components/barcode-input/design.md`: 359 lines. Camera lifecycle, decode loop, scanner overlay all match.
- **Status**: No documented contract drift found between scheduling design docs and implementation.

### [S16-02] Calendar inline comment explicitly documents state management rationale

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:1-10`
- **Evidence**: The opening comment documents why Calendar uses hooks-based state (vs Gantt's Zustand + Context, vs Kanban's useState + imperative).
- **Status**: Good practice — helps future readers understand the architectural choice.

---

## Summary

### Deep Findings Count

| Dimension          | Findings | Retained | Notes                                            |
| ------------------ | -------- | -------- | ------------------------------------------------ |
| 01 (Deps)          | 2        | 2        | Direct store access, internal type export        |
| 02 (Modules)       | 0        | 0        | Clean — no oversized files                       |
| 09 (Renderer)      | 4        | 3        | Dual-state in Kanban (accepted tradeoff)         |
| 10 (Styling)       | 2        | 1        | Calendar CSS size noted                          |
| 11 (UI)            | 0        | 0        | Clean                                            |
| 13 (Type Safety)   | 1        | 1        | Double `as` casting                              |
| 14 (Tests)         | 3        | 3        | Low hook coverage, export coverage, global patch |
| 15 (Security/Perf) | 2        | 2        | React Compiler warnings, JSON.stringify          |
| 16 (Docs)          | 0        | 0        | Clean — docs match code                          |
| **Total**          | **14**   | **12**   | 2 calibration-excluded                           |

### Findings by Severity

| Severity | Retained | Description                                                                                                                              |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | 1        | Gantt hooks <30% test coverage                                                                                                           |
| P2       | 6        | Direct store access, per-instance Zustand store, React Compiler warnings, double `as` casting, Kanban dual-state, Kanban export coverage |
| P3       | 5        | Internal type re-export, Calendar CSS size, JSON.stringify fingerprint, `globalThis.fetch` test cleanup                                  |

### Key Systemic Patterns

1. **Component-Isolated State** — Each scheduling component uses a different state management strategy (Gantt: Zustand store, Kanban: useState + callbacks, Calendar: custom hooks, Barcode: form hooks). This is documented and intentional, but creates cognitive overhead for cross-component integration.
2. **Test Coverage Asymmetry** — Gantt's interactive hooks (<30%) are severely undertested while the lower-risk data structures (gantt-store: ~90%) and pure utilities are well-tested.
3. **React Compiler Friction** — 2 warnings from TanStack React Virtual integration. This is an upstream library incompatibility, not a code defect.

### Status

Overall assessment: The scheduling package is well-structured with thorough documentation matching implementation. Key action items are around test coverage for interactive hooks and migrating one `form.store.getState()` pattern to `useScopeSelector`.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
