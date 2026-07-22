> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: scheduling

# Multi-Dimensional Audit: Mission `scheduling`

> **Date**: 2026-07-22  
> **Scope**: `packages/flux-renderers-scheduling` — code, config, tests, public contracts  
> **Method**: Cross-reference of live code vs `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` (previous P0/P1 findings), architecture docs (`design.md` files), and automated tooling (`typecheck`, `build`, `lint`, `test`).  
> **Baseline**: v1 / no transitional main-path allowances per audit calibration.

---

## Summary

The scheduling package has undergone substantial repair since the `2026-07-22-scheduling-display-operability-deep-analysis.md` report. **All 12 previously identified P0 defects** and **~90% of P1 defects** have been remediated. The package passes `typecheck`, `build`, and `test` (600+ tests). Key remaining issues: missing `@zxing/library` ponyfill (B-DISP-06, P1), dead components/hooks with test coverage, and React Compiler compatibility warnings.

---

## Code Quality — Previously Reported P0/P1 Verification

### 1. Gantt — All Previously Reported P0 Fixed

| ID        | Finding                           | File                                     | Status                                                                                  |
| --------- | --------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| G-DISP-01 | zoomLevels not passed to store    | `gantt.tsx:38-42`                        | ✅ Fixed — defaults provided                                                            |
| G-DISP-02 | Row height misalignment           | `gantt-grid.tsx:126`                     | ✅ Fixed — `style={{height: rowHeight}}`                                                |
| G-DISP-03 | Task bar off-by-one               | `layout.ts:45`                           | ✅ Fixed — `Math.max(durDays*cellWidth, cellWidth)`                                     |
| G-DISP-04 | Link type routing                 | `layout.ts:93-99`                        | ✅ Fixed — reads `type` param                                                           |
| G-DISP-05 | Format tokens V/W/q               | `date.ts:80-86`                          | ✅ Fixed — formatters implemented                                                       |
| G-DISP-06 | Milestone not interactive         | `gantt-bars.tsx:118-152`                 | ✅ Fixed — positioned, `pointer-events:auto`, link handles                              |
| G-DISP-07 | taskBar region not rendered       | `gantt.tsx:321`                          | ✅ Fixed — `taskBarRegion={regions.taskBar}`                                            |
| G-DISP-08 | Grid custom columns               | `gantt-grid.tsx:82,165`                  | ✅ Fixed — `(task as any)[column.name]` fallback                                        |
| G-DISP-11 | Weekend UTC/local                 | `gantt-cellgrid.tsx:32`                  | ✅ Fixed — `getUTCDay()`                                                                |
| G-OPS-01  | scrollTo wrong element            | `gantt.tsx:184-202`                      | ✅ Fixed — `timelineRef.scrollLeft`                                                     |
| G-OPS-02  | `_dirty` parse guard              | `gantt-store.ts:117`                     | ✅ Fixed — guard removed                                                                |
| G-OPS-04  | Events not dispatched             | `gantt.tsx:88-94`                        | ✅ Fixed — `onCommit` callbacks                                                         |
| G-OPS-06  | ArrowLeft/Right semantics         | `use-gantt-keyboard.ts:54-74`            | ✅ Fixed — Left=collapse, Right=expand                                                  |
| G-OPS-07  | Keyboard focus                    | `use-gantt-keyboard.ts:50`               | ✅ Fixed — `updateRowAria` calls `.focus()`                                             |
| G-OPS-08  | Top-level chevron                 | `gantt-grid.tsx:140`                     | ✅ Fixed — `getVisibleDescendantCount > 0`                                              |
| G-OPS-11  | treeRevision not subscribed       | `gantt-grid.tsx:33`, `gantt-bars.tsx:24` | ✅ Fixed — `useGanttTreeSnapshot()`                                                     |
| G-OPS-12  | toggleOpen no coordinate recalc   | `gantt-store.ts:269-272`                 | ✅ Fixed — calls `computeCoordinates()` + bumps `layoutRevision`                        |
| G-OPS-13  | updateTask no layoutRevision bump | `gantt-store.ts:223`                     | ✅ Fixed — bumps `layoutRevision`                                                       |
| G-OPS-14  | ArrowUp/Down conflict             | `gantt-bars.tsx:83-85`                   | ✅ Fixed — per-bar stops propagation for ArrowUp/Down, container handles selection only |

### 2. Kanban — All Previously Reported P0/P1 Fixed

| ID        | Finding                            | File                       | Status                                                                                                                |
| --------- | ---------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| K-OP-01   | Controlled mode blocks mutations   | `kanban-board.tsx:101-105` | ✅ Fixed — three-tier ownership model, default=local                                                                  |
| K-OP-02   | DnD adapters rebuilt per render    | `kanban-board.tsx:278-292` | ✅ Fixed — `useMemo(wipOverLimitColumns)`, per-component DnD registration                                             |
| K-DISP-03 | CSS dragging selector              | `kanban-board.tsx:509-512` | ✅ Fixed — `data-dragging` on specific card element                                                                   |
| K-DISP-04 | No drop indicator                  | `kanban-board.tsx:641-642` | ✅ Fixed — `dropTargetCardIndex` + `dropClosestEdge` passed                                                           |
| K-DISP-05 | Regions not passed to column       | `kanban-board.tsx:634-638` | ✅ Fixed — all 4 region props passed                                                                                  |
| K-OP-04   | Tag filter not applied             | `kanban-board.tsx:638-639` | ✅ Fixed — `selectedTagIds` + `filterCardFn` passed                                                                   |
| K-OP-05   | Column drag no drop zone           | `kanban-board.tsx:325,645` | ✅ Fixed — `registerBoardDropZone` called per column                                                                  |
| K-OP-06   | filterCard expression not compiled | `kanban-board.tsx:252-274` | ✅ Fixed — `runtime.expressionCompiler.compileValue`                                                                  |
| K-OP-07   | Add column was non-interactive     | `kanban-board.tsx:650-702` | ✅ Fixed — interactive input + confirm                                                                                |
| K-DISP-02 | configMap rendering path           | `kanban-board.tsx:62`      | ⚠️ Partially fixed — `configMap` accepted but `config.render` SchemaInput compilation not verified at a runtime level |

### 3. Calendar — All Previously Reported P0 Fixed

| ID        | Finding                           | File                                                     | Status                                                                                      |
| --------- | --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| C-OPS-01  | View switching reads schema value | `calendar.tsx:142-160`                                   | ✅ Fixed — `useCalendarState` hook drives rendering                                         |
| C-DISP-01 | Event width 25%                   | `calendar-layout-utils.ts:118-124`                       | ✅ Fixed — `widthPerEvent = 100/visibleCount`                                               |
| C-DISP-02 | Month view 42 columns             | `calendar-month-view.tsx:64-67`                          | ✅ Fixed — `getMonthStartEnd` + `getDateRange`                                              |
| C-DISP-03 | Virtualizer no position:absolute  | `calendar-month-view.tsx:187-192`                        | ✅ Fixed — `position:absolute` on rows                                                      |
| C-DISP-05 | Timezone UTC/local mix            | `calendar-date-utils.ts`                                 | ✅ Fixed — all `getUTC*` methods                                                            |
| C-DISP-08 | Conflict detection wrong          | `calendar-month-view.tsx:74-87`                          | ✅ Fixed — calls `detectConflicts`                                                          |
| C-OPS-04  | exportPNG no handle               | `calendar.tsx:195`                                       | ✅ Fixed — `exportToPNG` attached to `useImperativeHandle`                                  |
| C-OPS-07  | No resources = empty              | `calendar.tsx:426-428`, `calendar-layout-utils.ts:50-55` | ✅ Fixed — fallback `{id:'_default'}` with `normalizeResourceId`                            |
| C-OPS-08  | ownership not consumed            | `calendar.tsx:98-137`                                    | ✅ Fixed — `viewOwnership`/`dateOwnership`/`viewStatePath`/`dateStatePath` read and applied |

### 4. Barcode — All Previously Reported P0 Fixed

| ID        | Finding                     | File                                        | Status                                                                |
| --------- | --------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| B-DISP-02 | Video mounted conditionally | `barcode-scanner-overlay.tsx:264-271`       | ✅ Fixed — `<video>` always rendered with `hidden` CSS                |
| B-DISP-01 | Overlay not portal          | `barcode-scanner-overlay.tsx:369`           | ✅ Fixed — `createPortal(document.body)`                              |
| B-OP-08   | start() error swallowed     | `barcode-scanner-overlay.tsx:93-97,118-124` | ✅ Fixed — `camera.error` effect + catch block both set phase='error' |

---

## Remaining Issues

### Issue 1: Missing zxing ponyfill — B-DISP-06 (P1)

- **File**: `barcode-input/utils/barcode-detector-utils.ts:38-43`
- **Evidence**:
  ```ts
  return {
    detect: async () => {
      throw new Error(
        'This browser does not support barcode scanning. Please use Chrome, Edge, or a Chromium-based browser.',
      );
    },
    supportsSkewRetry: false,
  };
  ```
- **Status**: When no native `BarcodeDetector` (Firefox/Safari), returns a stub that throws an error. `BARCODE_FORMAT_TO_ZXING` map exists (line 48-61) but is unused. No `@zxing/library` dependency in `package.json`. design §11 requires a zxing ponyfill for cross-browser support.
- **Risk**: Firefox/Safari/PDA users get a camera overlay that opens but immediately errors with no fallback scanning path.
- **History**: Previously reported as B-DISP-06, listed in S18.2 (`done`), but code still shows only native API support.

### Issue 2: Dead components/hooks with test coverage (P2)

- **Evidence**:
  - `kanban-wip-badge.tsx`: 9 test cases, 0% production imports, literal `grep` shows zero importers outside its own test file.
  - `useKanbanAdder` (hooks/use-kanban-adder.ts): 100% line coverage, 30% branch, exported via `kanban/index.ts` but never called from `kanban-board.tsx`.
  - `useKanbanCollab` (hooks/use-kanban-collab.ts): 35% coverage, 0% branch, exported but unused.
  - `getMonthDays` in `calendar-date-utils.ts:110-117`: Exported but not used by any renderer (month view uses `getMonthStartEnd` + `getDateRange`).
- **Risk**: Dead code with maintained tests creates a "test count inflation" problem — 600+ tests sound impressive but multiple files test code that ships to zero users. Maintainers may add more dead code around these patterns.
- **Recommendation**: Either wire into production or delete + delete tests.

### Issue 3: React Compiler warnings (P3)

- **Evidence**: `pnpm lint` output — 3 `react-hooks/incompatible-library` warnings from TanStack Virtual's `useVirtualizer()`.
- **Files**: `gantt-grid.tsx:41`, `use-kanban-virtualizer.ts:20`
- **Risk**: Low — React Compiler skips memoizing these components, which may cause marginal re-render overhead. No functional impact.
- **Recommendation**: Suppress with eslint-disable comment and document as known TanStack Virtual compatibility gap.

### Issue 4: Coverage gaps in interactive code (P2)

- **Evidence**: Coverage report shows critical interactive paths with low coverage:
  - `kanban-board.tsx`: 57.62% line, 43.56% branch
  - `use-kanban-dnd.ts`: 58.57% line, 35.13% branch
  - `use-column-dnd.ts`: 32.43% line, 12.5% branch
  - `use-gantt-drag.ts`: Not verified but prior analysis noted partial coverage
- **Risk**: DnD interactions are the most user-visible failure surface. Low branch coverage means edge cases (mid-drag cancellation, multi-touch, boundary conditions) are untested.

### Issue 5: `handleChange` no longer blocks input (B-OP-09, Fixed)

- **File**: `barcode-input.tsx:105-113`
- **Status**: ✅ Fixed. `handleChange` unconditionally calls `form.setValue(name, val)`. No minLength/pattern guard before setValue. The previous bug (minLength blocking keyboard input) is resolved.

### Issue 6: WASM cache abort safety (B-OP-02, Partially Mitigated)

- **File**: `prepare-wasm.ts:7-36`
- **Status**: ⚠️ Partially fixed. `fetchWithRetry` no longer accepts an AbortSignal, so abort requests during overlay close don't interrupt in-flight fetches. The cache self-heals via `.catch()` that deletes the URL entry. However, retry delays (up to ~6s total with exponential backoff) are not interruptible.
- **Risk**: Low — the promise self-heals, and concurrent abort no longer poisons the cache.

---

## Public API Surface

### Exports (from `src/index.ts`)

| Export                        | Kind     | Notes                            |
| ----------------------------- | -------- | -------------------------------- |
| `GanttSchema`                 | type     | ✅ Complete, matches definitions |
| `GanttResource`               | type     | ✅ Re-exported from schemas      |
| `GanttAssignment`             | type     | ✅ Re-exported from schemas      |
| `KanbanSchema`                | type     | ✅                               |
| `KanbanEvents`                | type     | ✅                               |
| `KanbanColumnConfig`          | type     | ✅                               |
| `KanbanCardConfig`            | type     | ✅                               |
| `BoardData`                   | type     | ✅                               |
| `BoardItem`                   | type     | ✅                               |
| `CalendarSchema`              | type     | ✅                               |
| `CalendarEvent`               | type     | ✅                               |
| `CalendarResource`            | type     | ✅                               |
| `BarcodeInputSchema`          | type     | ✅                               |
| `SchedulingRendererSchema`    | type     | ✅ — Union of all 4              |
| `registerSchedulingRenderers` | function | ✅ Standard registration pattern |

**API Surface Assessment**: Clean, no internal modules leaked. All exports are public schema types or the standard registration function. No `internal`, `util`, `helper` exports.

### Package Config (`package.json`)

| Field              | Status                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `exports` map      | ✅ types + default dual condition                                                                                                       |
| `dependencies`     | ✅ `@atlaskit/pragmatic-dnd`, zustand, tanstack-virtual, flux-core, flux-react, flux-i18n, ui — all reasonable for scheduling renderers |
| `peerDependencies` | ✅ html2canvas, ical.js, jspdf, lucide-react, react, react-dom, xlsx — all optional where appropriate                                   |
| `sideEffects`      | ✅ `*.css`                                                                                                                              |
| `scripts`          | ✅ build, typecheck, test, lint all present                                                                                             |

---

## Test Quality Assessment

- **Total tests**: 600+ across ~65 test files (per scheduling package)
- **Test runner**: Vitest ✅
- **P0-specific regression coverage**: Store-level tests comprehensively cover gantt-store, calendar-layout-utils, etc. but **integration-level tests** (rendering real `<Gantt>`, `<KanbanBoard>`, `<Calendar>`) with DOM assertions remain limited.
- **Assert-the-bug patterns**: Previously identified in `calendar-layout-utils.test.ts` (title=full width, assert=25) — needs re-verification after fix. The `calendar-timezone.test.ts` file added post-fix shows proper non-UTC timezone testing.
- **Dead code with tests**: See Issue 2 above.

---

## Build Artifacts

- `pnpm typecheck`: ✅ Passes
- `pnpm build`: ✅ Passes (with CSS asset copy)
- `pnpm lint`: ⚠️ 3 warnings (React Compiler + TanStack Virtual), 0 errors
- `pnpm test`: ✅ Passes (full coverage report generated)
- No `.js`/`.d.ts` artifacts in `src/` ✅

---

## Conclusions

### Previously Reported Defects (vs `2026-07-22-scheduling-display-operability-deep-analysis.md`)

| Severity | Total | Fixed | Remaining                        |
| -------- | ----- | ----- | -------------------------------- |
| P0       | 12    | 12    | 0                                |
| P1       | ~35   | ~33   | 2 (B-DISP-06, K-DISP-02 partial) |
| P2       | ~15   | ~10   | 5 (dead code, coverage)          |

### Pattern-Level Observations

1. **Dead code with tests** is a recurring pattern — `KanbanWipBadge`, `useKanbanAdder`, `useKanbanCollab`, `getMonthDays` all have test suites but no production consumers. This matches the `docs/bugs/71-scheduling-deep-audit-blind-spot-display-operability-test-effectiveness.md` warning about "死代码带测试" (dead code with tests).
2. **Integration test gap** persists — no single test renders a full `<Gantt>`, `<KanbanBoard>`, or `<Calendar>` and asserts DOM output. All P0 fixes were verified by source inspection, not test regression.
3. **React Compiler warnings** from TanStack Virtual are project-wide and not scheduling-specific.
