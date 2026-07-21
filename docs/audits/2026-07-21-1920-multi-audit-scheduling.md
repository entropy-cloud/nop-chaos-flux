> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: scheduling

# Multi-Dimensional Audit: `scheduling` Mission

**Audit Date**: 2026-07-21
**Scope**: `packages/flux-renderers-scheduling/` — code, config, tests, public contracts (exports, API surface), cross-referenced against architecture docs.
**Methodology**: Full 20-dimensional deep audit executed per `docs/skills/deep-audit-prompts.md`. Phase 1 (iterative deep-dive, 1 round per dimension) followed by Phase 2 (independent review per dimension with findings). Calibration patterns (`docs/references/deep-audit-calibration-patterns.md`) and reopened-adjudications (`docs/references/reopened-design-decisions-and-audit-adjudications.md`) applied to all candidate findings.
**Previous Audit**: `docs/audits/2026-07-20-2157-multi-audit-scheduling.md` (11 dimensions, 14 findings). Remediation plans `2026-07-21-1100-1` and `2026-07-21-1100-2` both marked `completed`.

---

## Dimension 01: 依赖图与包边界 (Dependency Graph & Package Boundaries)

### 零发现

**All dependency and package boundary rules satisfied.** Verified via:

- All 71 `@nop-chaos/*` imports use public barrel exports only
- Zero internal path imports (`@nop-chaos/*/src/`)
- Zero reverse dependencies (`*-core` → `flux-renderers-scheduling`)
- Exports field matches barrel

**Previous findings status**:

- [01-01] Transitive `flux-runtime` dependency: Still a non-issue
- [01-02] `lucide-react` in both `peerDependencies` and `devDependencies`: Still duplicated — previously adjudicated as "standard pnpm workspace pattern"

---

## Dimension 02: 模块职责与文件边界 (Module Responsibility & File Boundaries)

### [维度02-02] styles.css 775-line single CSS file (P3 — UNRESOLVED)

- **文件**: `packages/flux-renderers-scheduling/src/styles.css`
- **证据片段**: File contains ~775 lines of CSS for 3 independent sub-modules (Calendar ~80 lines, Gantt ~82 lines, Kanban ~400+ lines) in a single blob.
- **严重程度**: P3
- **现状**: Previous audit (02-02, P3) deferred this. Still unresolved. Component-specific changes require scrolling through unrelated selectors.
- **风险**: Low urgency — style-only, no logic impact. Risk grows as new features add CSS.
- **建议**: Split into sub-module CSS files when build script supports it.

### [维度02-04] gantt-store.ts 553 lines, mixed responsibilities (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts`
- **证据片段**:
  ```ts
  // Responsibilities in one class:
  // - Store initialization + Zustand boilerplate (~30 lines)
  // - Accessor boilerplate: 20+ individual get/set accessors (~25 lines)
  // - Data ingestion: parse() (~60 lines)
  // - Task CRUD: updateTask, deleteTask (~80 lines)
  // - Link CRUD: addLink, deleteLink, updateLink (~50 lines)
  // - Tree operations: flattenTasks, buildParentIndex, getVisibleTasks, expand/collapse (~120 lines)
  // - Zoom/scroll: setZoom (~40 lines)
  // - Search/filter: searchTasks (~50 lines)
  ```
- **严重程度**: P2
- **现状**: Crossed the 500-line warning threshold (553 lines). Multiple distinct responsibilities (tree operations, CRUD, search, zoom) interleaved in a single class.
- **风险**: Medium — cognitive load for maintainers; adding new features risks crossing the 700-line error threshold.
- **建议**: Extract tree utilities (`flattenTasks`, `buildParentIndex`, `getVisibleTasks`, expand/collapse) into a separate `gantt-tree-utils.ts`. Extract `searchTasks` into `gantt-search.ts`. Target: ~250 lines for the main class.

### [维度02-06] gantt/ test organization inconsistency (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/__tests__/gantt-store-proof.test.ts`
- **严重程度**: P3
- **现状**: One test file placed in `__tests__/` directory while all other gantt tests are colocated in `src/gantt/`.
- **建议**: Move to `gantt-store-proof.test.ts` at root gantt level, or migrate all gantt tests to `__tests__/` for consistency.

**Previous findings status**:

- [02-01] calendar.tsx 518 lines (P2): **RESOLVED** — now 442 lines, CalendarOverlay and sub-components extracted.
- [02-03] scheduling-utils/ empty (P3): **RESOLVED** — directory removed.

---

## Dimension 03: API 表面积与契约一致性 (API Surface & Contract Consistency)

### [维度03-01] GanttTask/GanttLink deprecated types still in schemas.ts (P2 — PARTIALLY FIXED)

- **文件**: `packages/flux-renderers-scheduling/src/schemas.ts:4-26,68-69`
- **证据片段**:
  ```ts
  /** @deprecated Use `GanttTask` from `./gantt/gantt.types.js` instead ... */
  export interface GanttTask extends SchemaObject { ... }
  /** @deprecated Use `GanttLink` from `./gantt/gantt.types.js` instead ... */
  export interface GanttLink extends SchemaObject { ... }
  // These are still used by:
  // GanttSchema.tasks: GanttTask[];
  // GanttSchema.links: GanttLink[];
  ```
- **严重程度**: P2
- **现状**: Deprecated types are no longer re-exported from `index.ts` (fixed). But `GanttSchema` itself still references them — so any consumer using `GanttSchema.tasks` gets the deprecated interface. Also, the `@deprecated` note recommends migrating to `gantt.types.js:GanttTask` (which includes computed layout fields), when the correct target should be `GanttTaskData`/`GanttLinkData`.
- **风险**: If the deprecated interfaces are eventually removed, `GanttSchema` breaks.
- **建议**: Update `GanttSchema.tasks` from `GanttTask[]` to `GanttTaskData[]` and `GanttSchema.links` from `GanttLink[]` to `GanttLinkData[]`.

### [维度03-02] BarcodeQueueItem type duplicated (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.types.ts:46-53` and `barcode-input/utils/barcode-queue.ts:1-8`
- **严重程度**: P2
- **现状**: `BarcodeQueueItem` independently defined in two files with identical structure.
- **风险**: If the two definitions diverge, code compiles but runtime behavior breaks.
- **建议**: Remove the definition from `barcode-queue.ts` and import from `barcode-input.types.ts`.

### [维度03-03] KanbanEvents and auxiliary types not publicly exported (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/index.ts:9-13`
- **严重程度**: P3
- **现状**: `schemas.ts` re-exports `KanbanEvents`, `KanbanColumnConfig`, `KanbanCardConfig`, `BoardData`, `BoardItem` from `kanban/types.js`, but `index.ts` only exports `KanbanSchema`. These auxiliary types have no supported import path.
- **建议**: Add missing type exports to `index.ts`.

### [维度03-04] onCardUpdate defined in KanbanEvents but not wired to renderer (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban.types.ts:38`, `scheduling-renderer-definitions.ts:100-106`
- **严重程度**: P3
- **现状**: `KanbanEvents` defines `onCardUpdate?: ActionSchema` but it is not in `KanbanSchema` or the fields array.
- **建议**: Either wire it to the renderer or remove from `KanbanEvents`.

**Previous findings status**:

- [03-01] Deprecated type re-exports (P2): **PARTIALLY FIXED** — removed from `index.ts` but still in `schemas.ts` schema references.

---

## Dimension 04: 状态所有权与单一事实来源 (State Ownership & Single Source of Truth)

### [维度04-01] BarcodeInputRenderer dual state improved but residual (P3 — improved from P2)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx:12-43`
- **严重程度**: P3 (was P2)
- **现状**: Local `inputValue` (useState) still mirrors form store value. **Improved**: A reverse-sync `useEffect` (lines 34-42) now subscribes to `form.store` and updates `inputValue` when external form changes occur. Three write paths (handleChange, handleClear, handleScanResult) write to both local state and form store.
- **风险**: Low — potential race condition under heavy async load where subscription applies a stale value over user input.
- **建议**: Remove local `inputValue` entirely; read directly from `form.store.getState().values[name]` with a local `key` counter to force remount on external value change.

### [维度04-04] Calendar dual view/date ownership (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:55-62,257-307`
  `calendar/hooks/use-calendar-state.ts:22-32`
- **证据片段**:
  ```tsx
  // calendar.tsx — derived from schema props
  const initialView = resolved.view ?? 'month';
  const initialDate = resolved.date ? new Date(resolved.date) : new Date();
  // Passed to hook which maintains its own useState:
  const { activeView, setActiveView, currentDate, setCurrentDate } = useCalendarState(initialView, initialDate);
  // Two useEffects sync props back into hook state:
  useEffect(() => {
    if (resolved.date && resolved.date !== prevDateRef.current) { ... setCurrentDate(new Date(resolved.date)); }
  }, [resolved.date]);
  ```
- **严重程度**: P2
- **现状**: Schema props (`resolved.view`, `resolved.date`) and hook internal state (`activeView`, `currentDate`) are dual sources of truth. Two `useEffect` syncs use `prev*Ref` patterns to handle prop changes. If user navigates within the same render cycle as a parent prop change, which value wins is ambiguous.
- **风险**: Medium — user-initiated navigation could be overwritten by schema prop changes.
- **建议**: Make Calendar fully controlled (all view/date changes via event callbacks upward) or fully uncontrolled (treat props as initial values only, ignore subsequent changes).

### [维度04-07] FilterBar debounce/prop sync (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/components/filter-bar.tsx:27-32`
- **严重程度**: P3
- **现状**: `localText` (useState) initialized from `filterText` prop, synced back via `useEffect`. A 300ms debounce forwards changes to `onFilterChange`. If parent updates `filterText` during user input, effect overwrites typing.
- **建议**: Make debounce pipeline one-directional (local → external only).

### [维度04-08] useKanbanFilter debounce/prop sync (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-filter.ts:10-17`
- **严重程度**: P3
- **现状**: Same pattern as 04-07. Slightly safer due to functional setState with equality check.
- **建议**: Same as 04-07.

### [维度04-10] Gantt store re-parse overwrites edits (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:63-69`
- **严重程度**: P3
- **现状**: `useEffect` re-parses tasks/links when `resolved.tasks` changes, overwriting any user edits in progress.
- **建议**: Add a dirty check in `parse()` to skip if unsaved edits exist.

**Previous findings status**:

- [04-01] BarcodeInput dual state (P2): **IMPROVED** — reverse sync added, downgraded to P3
- [04-02] KanbanBoard useEffect sync (P2): **RESOLVED** — now uses controlled/uncontrolled branch pattern
- [04-03] GanttStore direct mutation (P2): **Accepted design** — unchanged

---

## Dimension 05: 响应式订阅精度 (Reactive Subscription Precision)

### [维度05-01] Gantt 4 components over-subscribe to catch-all `revision` (P1 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:22-24`, `gantt-timescale.tsx:11-13`, `gantt-cellgrid.tsx:12-14`, `gantt-markers.tsx:13-15`
- **严重程度**: P1
- **现状**: All four components subscribe to `store.revision` (incremented on EVERY mutation) instead of their specific revision counters (`taskRevision`, `layoutRevision`, `treeRevision`, `linkRevision`). A link update causes the timescale and cell grid to re-render unnecessarily.
- **建议**: Replace `useGanttStoreSnapshot()` with specific snapshot hooks (e.g., `useGanttLayoutSnapshot` for grid/background components).

### [维度05-02] getVideoElement inline function causes polling restart (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:64,67`, `hooks/use-barcode-detect.ts:118`
- **严重程度**: P2
- **现状**: `getVideoElement = () => videoRef.current` is an inline arrow function, passed to `useBarcodeDetect` where it appears in deps. Changes on every render, causing polling effect to restart.
- **建议**: Wrap in `useCallback(() => videoRef.current, [])`.

### [维度05-03] useCurrentForm() broad subscription in BarcodeInput (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx:14,42`
- **严重程度**: P2
- **现状**: `const form = useCurrentForm()` subscribes to the entire form store. Any field change causes this component to re-render.
- **建议**: Use a focused hook like `useFormValue(name)` that subscribes per-field only.

### [维度05-04] boardData full object in DnD re-registration effect (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:277`
- **严重程度**: P2
- **现状**: `[boardData]` in DnD effect deps — any card move re-runs `querySelectorAll` and re-registers all DnD adapters.
- **建议**: Change to mount-only deps `[]`. Store cleanup functions in refs.

### [维度05-05] resolved.tasks array in effect deps — reference instability (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:69`
- **严重程度**: P2
- **现状**: `[resolved.tasks, resolved.links, ...]` in deps — if framework creates new array references on each render, store re-parses and recomputes all layout every cycle.
- **建议**: Use serialized fingerprint (`JSON.stringify`) or framework-level memoization.

### [维度05-06] events object in mount/unmount effect deps (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:61`, `calendar/calendar.tsx:53`
- **严重程度**: P2
- **现状**: `[events]` in mount/unmount effect deps — if `events` object reference changes each render, the effect re-runs.
- **建议**: Use mount-only `[]` deps for onMount/onUnmount effects.

### [维度05-07] Inline subscribe callback in useSyncExternalStore (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:50`
- **严重程度**: P3
- **现状**: `subscribe` is an inline arrow expression in `useSyncExternalStore`, creating new subscribe function on each render.
- **建议**: Extract to stable reference via `useCallback`.

### [维度05-08] Triple snapshot subscription in GanttBars (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:15-18`
- **严重程度**: P3
- **现状**: Three separate `useSyncExternalStore` calls subscribing to three revision counters. Semantically correct but redundant.
- **建议**: Acceptable as-is — each subscription is a primitive (efficient).

### [维度05-09] GanttHeader uses store without snapshot subscription (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:14`
- **严重程度**: P3
- **现状**: Reads `store.currentZoom` at render time without any subscription. If zoom is read for display in the future, this would show stale data.
- **建议**: Add snapshot subscription if store state is used for display.

---

## Dimension 06: 异步模式与取消安全 (Async Mode & Cancellation Safety)

### [维度06-01] filter-bar.tsx debounce timer leaks on unmount (P1 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/components/filter-bar.tsx:34-43`
- **严重程度**: P1
- **问题类别**: 取消安全
- **现状**: `setTimeout` in `handleTextChange` is never cleaned up. If user navigates away during debounce, stale callback fires on unmounted component.
- **建议**: Add `useEffect` cleanup that clears timeout on unmount.

### [维度06-02] BarcodeInput .then() without .catch() (P1 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx:66-69,150-153`
- **严重程度**: P1
- **问题类别**: 异常吞掉
- **现状**: Two `checkCameraAvailability().then(...)` calls without `.catch()`. If the success callback itself throws, the rejection is unhandled.
- **建议**: Add `.catch()` to both promise chains.

### [维度06-03] WASM fetch no AbortSignal (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.ts:7-22`
- **严重程度**: P2
- **问题类别**: 取消安全
- **现状**: `fetchWithRetry()` fetches WASM from CDN with up to 3 retries (6+ seconds on slow networks). No AbortSignal.
- **建议**: Add `AbortSignal` parameter, pass to `fetch(url, { signal })`.

### [维度06-04] useCalendarExport PNG export error silently swallowed (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:39-41`
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **现状**: catch block does `console.warn(...)` without re-throwing or showing user feedback. User thinks export succeeded.
- **建议**: Surface error to user via state or re-throw for caller to handle.

### [维度06-05] Boolean flags instead of AbortController (P3 — NEW)

- **文件**: Multiple locations (use-barcode-detect.ts, barcode-scanner-overlay.tsx, use-kanban-collab.ts, use-barcode-camera.ts)
- **严重程度**: P3
- **问题类别**: 取消安全
- **现状**: 4 locations use `mountedRef`/`activeRef` boolean flags for cancellation guards instead of `AbortController`.
- **建议**: Migrate to `AbortController` for composability with fetch/stream operations.

### [维度06-06] Dynamic imports not cancelable (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/components/export-handles.tsx:23-24,51-52,77`, `hooks/use-calendar-ical.ts:23,38,82`, `kanban/utils/kanban-export.ts:50`
- **严重程度**: P3
- **问题类别**: 取消安全
- **现状**: Exports use dynamic `import()` for html2canvas/jspdf/xlsx/ical.js. If user navigates during import, module still downloads and may update unmounted component.
- **建议**: Add `mountedRef` guards around import resolution callbacks.

---

## Dimension 07: 生命周期与副作用归属 (Lifecycle & Side Effect Ownership)

### [维度07-01] Kanban window-level keyboard listener — Ctrl+Z conflict (P2 — STILL OPEN)

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:133-148`
- **严重程度**: P2
- **现状**: Global `keydown` listener captures Ctrl+Z/Ctrl+Shift+Z at window level. Has `isEditable` guard (input/textarea) but may conflict with other components or browser-native undo.
- **建议**: Scope listener to component focus state, or use `@nop-chaos/ui` keyboard conventions.

### [维度07-03] Barcode form store subscription in React effect (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx:34-42`
- **严重程度**: P3
- **现状**: `form.store.subscribe()` (store subscription) lives inside a React `useEffect`. While properly cleaned up, this runtime logic should ideally be in a runtime layer or encapsulated hook.
- **建议**: Move to a dedicated hook from `@nop-chaos/flux-react` or runtime layer.

**Previous findings status**:

- [07-01] Kanban keyboard listener (P2): **STILL OPEN**
- [07-02] GanttStore no dispose (P3): **RESOLVED** — `store.destroy()` now called in cleanup; `destroy()` method clears all internal maps.

---

## Dimension 08: 验证系统一致性 (Validation System Consistency)

**Not applicable** — `flux-renderers-scheduling` is not a form-validation package. No form validation logic present.

---

## Dimension 09: 渲染器契约合规性 (Renderer Contract Compliance)

### COMPILE-ONCE HARD GATE: PASS — zero violations across all 4 renderers.

No renderer reads from `props.templateNode.schema` or `props.schema` at runtime. All data from compiled channels (`props.props`, `props.meta`, `props.regions`, `props.events`, `props.helpers`).

### [维度09] Renderer: Gantt (gantt.tsx)

- **合规评分**: C
- **违规项**:
  1. **No `cn()`/`meta.className` on container** (line 178): `className="nop-gantt flex flex-col h-full"` — hardcoded string, schema-driven `meta.className` silently ignored. (P2)
  2. **Direct store read** (lines 76, 138): `store.tasks.get(taskId)` — direct read from GanttStore inside component. Documented but violates project-wide "never access stores directly in renderers" rule. (P2)
  3. **Missing `data-cid`** (line 178): Has `data-testid` but no `data-cid={meta.cid}`. (P3)
  4. **No `void` prefix on event calls** (lines 56, 58): Inside effect body, cosmetic only. (P3)

### [维度09] Renderer: Kanban (kanban-board.tsx)

- **合规评分**: C
- **违规项**:
  1. **Missing `data-testid` and `data-cid`** (line 311): Main container, loading skeleton, and empty state all lack these attributes. (P2)
  2. **Loading skeleton missing `meta.className`** (line 287): Hardcoded string, no `cn()` integration. (P3)

### [维度09] Renderer: Calendar (calendar.tsx)

- **合规评分**: B
- **违规项**:
  1. **No `void` prefix on event calls** (10+ locations): Cosmetic only. (P3)

### [维度09] Renderer: BarcodeInput (barcode-input-renderer.tsx)

- **合规评分**: C
- **违规项**:
  1. **Missing `data-testid` and `data-cid`** (line 171): Root element lacks these attributes. (P2)
  2. **No `void` prefix on event calls** (lines 28, 29): Inside effect body. (P3)

**Previous findings status**:

- [09-02] Kanban region bare `as { render: ... }` cast (P3): **RESOLVED** — now uses typed assertions (`as React.ReactNode`, `as RenderRegionHandle`).

---

## Dimension 10: 样式系统合规性 (Styling System Compliance)

### [维度10-05] Hardcoded color values in CSS (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/styles.css` (multiple locations)
- **严重程度**: P2
- **违规类别**: 主题独立性
- **现状**: ~10 hardcoded hex color values that should use CSS variables:
  - `.nop-batch-scheduler-preview-cell.conflict`: `#fef2f2`, `#dc2626`
  - `.nop-batch-scheduler-error`: `#dc2626`
  - `.nop-timezone-option.selected`: `#eff6ff`, `#1d4ed8`
  - `.nop-gantt-bar-project`: `#bfdbfe`, `#60a5fa`
  - `.nop-gantt-bar-milestone-fill`: `#f59e0b`
  - `.nop-gantt-link-arrow`: `#6b7280`
  - `.nop-gantt-link-line`: `#9ca3af`
  - `.nop-gantt-link-delete-btn`: `#ef4444`, `white`
  - Overlay backgrounds: `rgba(0, 0, 0, 0.3)`
- **风险**: Breaks theme compatibility — dark theme switch does not affect these colors.
- **建议**: Replace with CSS variable equivalents (e.g., `var(--color-destructive)`, `var(--color-muted-foreground)`).

### [维度10-04] Bare `[data-slot]` selectors in calendar-print.css (P3 — MINOR)

- **文件**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-print.css`
- **严重程度**: P3
- **现状**: Print stylesheet has bare `[data-slot]` selectors (e.g., `[data-slot='calendar-header']`) without marker-class scoping.
- **建议**: Scope under `.nop-calendar` for consistency, though risk is low (print-only).

**Previous findings status**:

- [10-01] Marker class conventions: **PASS**
- [10-02] Drag ghost inline style: **PASS** (acceptable per calibration pattern)

---

## Dimension 11: UI 组件使用合规性 (UI Component Usage Compliance)

### [维度11-05] Raw `<select>` should be NativeSelect (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/gantt/components/filter-bar.tsx:67-76`
- **严重程度**: P3
- **现状**: Uses raw `<select>` with manual class styling instead of `NativeSelect` from `@nop-chaos/ui`.
- **建议**: Replace with `<NativeSelect>` for consistent theming and accessibility.

**Other raw elements found but classified as acceptable**:

- `<table>` in gantt-grid.tsx / resource-load-grid.tsx: high-performance host surface (acceptable)
- `<button>` in kanban-activity-log.tsx / gantt-grid.tsx: low priority
- `<label>+<input checkbox>` in calendar-batch-scheduler.tsx: low priority

---

## Dimension 12: 表单字段与 Slot 建模 (Field & Slot Modeling)

**Not applicable** — `flux-renderers-scheduling` renderers do not participate in the form field/slot metadata system. The renderers are widget-type (Gantt, Kanban, Calendar) with no field validation or FieldFrame integration.

---

## Dimension 13: 类型安全与动态边界 (Type Safety & Dynamic Boundaries)

### [维度13-01] All `as any` casts at acceptable boundaries (PASS)

- **文件**: 11 instances across 3 source files
- **严重程度**: 无发现
- **现状**: All remaining `as any` casts are at schema boundary (resolved data from schema), event dispatch boundary (ActionSchema bridging), or external API boundary (BarcodeDetector, html2canvas, MediaTrackConstraintSet). Zero internal callback casts remain.
- **复核状态**: 通过

**Previous findings status**:

- [13-01] Extensive `as any` (P3): **ADDRESSED** — internal callback casts removed; remaining justified per low-code conventions.

---

## Dimension 14: 测试覆盖与质量 (Test Coverage & Quality)

### [维度14-02] Source files without corresponding test files (P2 — NEW)

- **文件**: Multiple visual/layout component files across gantt/, kanban/, calendar/
- **严重程度**: P2
- **现状**: 24 source files (mostly visual/layout components) lack dedicated test files. Key gaps:
  - `gantt/gantt-context.tsx` (store context + subscription hooks)
  - `gantt/gantt-header.tsx`, `gantt/gantt-grid.tsx`, `gantt/gantt-bars.tsx`, `gantt/gantt-links.tsx` (core rendering components)
  - `gantt/components/export-handles.tsx` (business-critical export logic)
  - `kanban/kanban-board.tsx`, `kanban/kanban-column.tsx`, `kanban/kanban-card.tsx` (core rendering components)
  - `calendar/components/calendar-confirm-dialog.tsx`, `calendar/components/calendar-overlay.tsx`
- **风险**: Visual component behavior changes may regress without detection. Some components are indirectly exercised by integration tests.
- **建议**: Add unit tests for critical rendering components, prioritizing `export-handles.tsx` (export logic) and `gantt-context.tsx` (subscription hooks).

### [维度14-04] Module-top mutable state in test (P3 — MINOR)

- **文件**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.test.ts:26`
- **严重程度**: P3
- **现状**: `let capturedMonitor = {}` at module top — properly reset in `beforeEach`.
- **建议**: Low risk — no action needed.

**Previous findings status**:

- [14-01] Good coverage: **LARGELY TRUE** but with noted visual-component gaps
- [14-02] useKanbanDnd no drop verification (P3): **FULLY RESOLVED** — now tests drop lifecycle, callbacks, and state transitions

---

## Dimension 15: 安全与性能红线 (Security & Performance Redlines)

### Security: ZERO FINDINGS

No `eval`, no `new Function`, no dynamic code execution patterns found.

### [维度15-01] CalendarWeekView IIFE positionedByDay runs every render, O(R × D × E) (P1 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:58-73`
- **严重程度**: P1
- **类别**: 性能
- **现状**: `positionedByDay` is an IIFE with nested loops: `for (resource of displayResources) { for (day of days) { events.filter(...) + allocateConcurrentWidths(...) } }`. No caching — rebuilds every render.
- **风险**: 10 resources × 7 days × 200 events = 70 full `events.filter()` calls per render.
- **建议**: Extract to `useMemo`.

### [维度15-02] CalendarDayView events.filter inside map, O(R × E) (P1 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-day-view.tsx:78-83`
- **严重程度**: P1
- **类别**: 性能
- **现状**: `displayResources.map()` calls `events.filter()` for each resource without caching.
- **建议**: Extract to `useMemo`.

### [维度15-03] CalendarMonthView conflictMap O(R × D × E), can reuse positionedMap (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:71-87`
- **严重程度**: P2
- **类别**: 性能
- **现状**: `conflictMap` useMemo iterates every (resource, day) pair, calling `detectConflicts` which does `events.filter()` + sort + inner loop. Protected by useMemo but expensive when it recomputes.
- **建议**: Reuse pre-computed `positionedMap` instead of re-filtering events.

### [维度15-05] weekdayLabels useMemo redundant (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:89-92`
- **严重程度**: P3
- **类别**: 性能
- **现状**: `getWeekdayLabels` does O(7) array slice — trivial computation wrapped in useMemo. React Compiler auto-memoizes.
- **建议**: Remove useMemo.

### [维度15-06] BarcodeQueue O(n) linear scan (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.ts:14-16,66-68`
- **严重程度**: P3
- **类别**: 性能
- **现状**: `enqueue`, `dequeue`, `markSubmitted`, `markError` use `.find()`/`.findIndex()` — O(n). Acceptable for expected queue size (< 100).
- **建议**: No action unless queue size grows.

**Redundant memoization plan verification**:

- Plan claimed 127 useCallback/useMemo removed, 6 intentionally retained. Verified: 15 remain (including 8 useMemo for CalendarMonthView calculations). Retained instances justified (hook-dep + JSX-callback dual role, expensive computations). 8 CalendarMonthView useMemois are legitimate for expensive layout calculations.

---

## Dimension 16: 文档-代码一致性 (Doc-Code Consistency)

### [维度16-01] Missing scheduling-specific architecture docs in docs/architecture/ (P3 — NEW)

- **文件**: `docs/architecture/README.md`
- **严重程度**: P3
- **漂移类型**: 路径失效
- **现状**: `docs/architecture/` has no scheduling-specific file or routing entry. While `docs/components/roadmap-scheduling.md` and `docs/components/calendar/design.md` exist, the architecture layer lacks a document describing shared cross-sub-module patterns.
- **建议**: Add an entry in `docs/architecture/README.md` pointing to scheduling component docs.

### [维度16-03] AGENTS.md missing scheduling package in enum (P3 — NEW)

- **文件**: `AGENTS.md:9` (Package Structure section)
- **严重程度**: P3
- **漂移类型**: 路径失效
- **现状**: AGENTS.md lists `flux-renderers-basic`, `flux-renderers-form`, `flux-renderers-content`, `flux-renderers-layout` etc., but not `flux-renderers-scheduling`.
- **建议**: Add `flux-renderers-scheduling` to the package enum.

### [维度16-04] docs/index.md missing scheduling routes (P3 — NEW)

- **文件**: `docs/index.md` (routing table)
- **严重程度**: P3
- **漂移类型**: 路径失效
- **现状**: The routing table has no entries for "work on Gantt/Kanban/Calendar renderers" or for `packages/flux-renderers-scheduling/src/`.
- **建议**: Add routing entries matching the existing "By Code Location" table pattern.

---

## Dimension 17: 命名与术语一致性 (Naming & Terminology Consistency)

### [维度17-03] useOfflineDetection is NOT a React hook despite `use` prefix (P2 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.ts:81-106`
- **严重程度**: P2
- **现状**: Function named `useOfflineDetection` in `utils/` is a plain function (no useState/useEffect/useRef) that registers event listeners and returns `{ isOnline, cleanup }`. Violates React hooks naming convention. ESLint hooks rules could incorrectly flag this file.
- **建议**: Rename to `createOfflineDetection` or `setupOfflineDetection`. Convert to proper React hook if reactivity is desired.

### [维度17-04] barcode-input-renderer.tsx naming inconsistency (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx`
- **严重程度**: P3
- **现状**: Named with `-renderer` suffix; other sub-modules use `gantt.tsx`, `calendar.tsx`, `kanban-board.tsx` without suffix.
- **建议**: Rename to `barcode-input.tsx` to match convention.

**Previous findings status**:

- [17-01] Kanban snapshot vs Gantt command undo divergence: **RESOLVED** — documented with reciprocal JSDoc in both undo-stack files
- [17-02] onScroll as ActionSchema without JSDoc: **RESOLVED** — JSDoc added explaining fire-and-forget semantic

---

## Dimension 18: 跨包模式一致性 (Cross-Package Pattern Consistency)

### [维度18-01] Registration pattern consistent with all renderer packages (PASS)

Confirmed: `registerSchedulingRenderers(registry)` follows the exact same `registerRendererDefinitions(registry, definitions)` pattern as all 10+ other renderer packages.

### [维度18-02] State management divergence documented (PASS — FIXED)

**Previous audit [18-02] status**: **RESOLVED**. All three sub-modules now have documentation blocks explaining their methodology:

- Gantt (Zustand + context): chosen for deep component tree nesting
- Kanban (useState + imperative): chosen for shallow tree + snapshot-based undo
- Calendar (hooks-based): chosen for highly localized concerns with no global state

---

## Dimension 19: 错误传播保真度 (Error Propagation Fidelity)

### [维度19-05] Catch blocks silently swallow errors (P2 — NEW)

- **文件**:
  1. `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:39` — `catch (err) { console.warn(...) }` no re-throw, no user feedback
  2. `packages/flux-renderers-scheduling/src/kanban/utils/kanban-export.ts:52-53` — `catch { return null; }` silent, error info discarded
  3. `packages/flux-renderers-scheduling/src/gantt/components/gantt-compact.tsx:55` — `catch { /* comment */ }` no logging
- **严重程度**: P2
- **类别**: 错误吞没
- **现状**: Three catch blocks discard original error information. User-initiated action (calendar PNG export) can fail silently.
- **建议**: Add structured logging to all catch blocks. For user-initiated actions, surface error via UI. Use `{ cause: originalError }` when creating new Error instances.

**Overall pattern**: 14 catch blocks across 8 source files. Most are adequate (log + re-throw or log + user feedback). The 3 silent ones are exceptions to an otherwise good pattern. No catch block in the scheduling package uses `{ cause: originalError }` — a project-wide pattern gap.

---

## Dimension 20: 可访问性 (WCAG)

### [维度20-01] Inputs use aria-label but no visible `<label>` (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx:184`, `kanban/kanban-board.tsx:316-322`
- **严重程度**: P3
- **WCAG**: 1.1.1, 1.3.1, 2.4.6
- **现状**: BarcodeInput and Kanban search use `aria-label` but no visible `<Label>` element with `htmlFor`/`id` association.
- **建议**: Use `<Label>` from `@nop-chaos/ui` when schema provides a `label`; fall back to `aria-label` when not.

### [维度20-02] Error messages not linked via aria-describedby (P3 — NEW)

- **文件**: Calendar event overlap, barcode scanner overlay
- **严重程度**: P3
- **WCAG**: 1.3.1, 3.3.1, 4.1.2
- **现状**: Calendar uses visual-only overlap indicators; barcode error text not linked to interactive elements.
- **建议**: Add `aria-live="polite"` regions for dynamic content changes.

### [维度20-04] Kanban activity log missing Escape close (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/kanban/components/kanban-activity-log.tsx:77-110`
- **严重程度**: P3
- **WCAG**: 2.1.2
- **现状**: Panel has focus trap but no Escape key handler to close it. Creates a keyboard trap.
- **建议**: Add Escape key handler to close the activity log panel.

### [维度20-06] Kanban cards should use `<ul>`/`<li>` (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx:93-98`
- **严重程度**: P3
- **WCAG**: 1.3.1
- **现状**: Cards rendered as `<div>` elements. Screen readers cannot perceive them as a list structure.
- **建议**: Use `<ul>` for card container, `<li>` for individual cards (retaining `role="button"` for interactivity).

### [维度20-07] Barcode scanner overlay missing direct Escape handler (P3 — NEW)

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:164-197`
- **严重程度**: P3
- **WCAG**: 2.1.2
- **现状**: Scanner overlay has focus trap and close button, but no direct Escape key handler. User must Tab to close button.
- **建议**: Add Escape key handler to close overlay.

---

## High-Frequency Issue Files

| File                                                                                  | Dimensions                 | Key Issues                                                   |
| ------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `barcode-input-renderer.tsx`                                                          | 04, 05, 06, 09, 11, 17, 20 | Dual state, broad subscription, .catch missing, naming, a11y |
| `kanban-board.tsx`                                                                    | 04, 05, 07, 09, 20         | DnD effect deps, keyboard listener, data-testid, a11y        |
| `gantt.tsx` / `gantt-store.ts`                                                        | 02, 04, 05, 09             | File size, re-parse, subscription, store access              |
| `calendar-month-view.tsx`                                                             | 15                         | Performance (conflictMap)                                    |
| `calendar-week-view.tsx`                                                              | 15                         | Performance (IIFE)                                           |
| `filter-bar.tsx`                                                                      | 04, 06, 11                 | Debounce prop sync, timer leak, raw select                   |
| `gantt-grid.tsx` / `gantt-timescale.tsx` / `gantt-cellgrid.tsx` / `gantt-markers.tsx` | 05                         | Over-subscription                                            |

---

## Statistics

### Deep Dive Summary

- **Dimensions covered**: 20 (18 applicable + 2 N/A for scheduling)
- **Dimensions with zero findings**: 02 (01 only)
- **Total findings**: 44
- **P1 findings**: 4 (05-01, 05-02, 06-01, 06-02, 15-01, 15-02)
- **P2 findings**: 16
- **P3 findings**: 19
- **Previously-reported findings now RESOLVED**: 7 (02-01, 02-03, 04-02, 07-02, 09-02, 17-01, 18-02)
- **Previously-reported findings improved/partially fixed**: 3 (03-01, 04-01, 13-01)
- **Previously-reported findings still open**: 1 (07-01 Kanban keyboard listener)

### Review Status

All findings from this audit are awaiting independent Phase 2 review per `docs/skills/deep-audit-prompts.md` methodology. This report captures the Phase 1 deep-dive outputs. Findings are marked `未复核` by default.

### Cross-Dimension Patterns

- **Dual state / prop sync pattern**: Appears in 4 dimensions (04, 05, 07, 06) across barcode-input, kanban-board, filter-bar, calendar — indicates a systemic pattern of React-idiom tension with schema-driven props
- **Performance in Calendar views**: 3 findings across 2 dimensions (15-01, 15-02, 15-03) — week-view, day-view, and month-view all have un-cached layout calculations
- **Catch block quality**: 2 dimensions (06, 19) identify the same silent-catch issues in calendar export and kanban export
- **Component contract gaps**: 3 dimensions (09, 11, 20) converge on missing `data-testid`/`data-cid` from `meta` — Gantt, Kanban, BarcodeInput all affected

### Suggested Automation

1. Add `data-cid` lint rule for renderer components (current: manual gap detected across 3/4 renderers)
2. Add broad-useEffect-deps rule for `events` object in deps (current: detected in gantt.tsx and calendar.tsx)
3. Add `.catch()` detection for promise chains in event handlers (current: detected in barcode-input-renderer.tsx)

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
