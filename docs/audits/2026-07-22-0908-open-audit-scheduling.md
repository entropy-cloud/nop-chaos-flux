> Audit Status: closed
> Audit Type: open-ended
> Mission: scheduling

# Open-Ended Adversarial Audit — Scheduling Mission

**Date**: 2026-07-22
**Examiner**: AI agent following `docs/skills/open-ended-adversarial-review-prompt.md`
**Scope**: `packages/flux-renderers-scheduling/` — Gantt, Kanban, Calendar, BarcodeInput

**Prior analysis consulted**: None (`docs/analysis/` directory did not exist prior to this execution)
**Reopened decisions consulted**: `docs/references/reopened-design-decisions-and-audit-adjudications.md` — no overlaps found; the scheduling package issues do not match previously adjudicated patterns (declarative surface double-state, wrapped secondary actions, or scope-projection chain interruption).

---

## 1. Gantt — Ad-hoc React Context (Explicit Convention Violation)

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-context.tsx:12`

**Problem**: `createContext<GanttStore | null>(null)` creates an ad-hoc React Context.
AGENTS.md states: **"NEVER create ad-hoc React contexts."**

The file includes a rationale comment (lines 1-8) explaining "Gantt has a deeply nested component tree where prop drilling would be impractical." This is a deliberate override of a hard project rule.

**Impact**: This creates a second data-access convention alongside the sanctioned `@nop-chaos/flux-react` hooks (`useRendererRuntime()`, `useRenderScope()`, `useScopeSelector()`). The pattern is copyable — next renderer author will legitimately ask: "Gantt uses context, why can't I?" The Context-based subscription also bypasses the fine-grained selector-based reactivity that Zustand + `useSyncExternalStore` enables; `u`seGanttStoreSnapshot` subscribes to any state change (`store.subscribe` fires unconditionally), so all consumers re-render together.

**Confidence**: Determinate

---

## 2. Pattern: Unused Standard Hook Calls Across All Renderers

**Locations**:

- `gantt/gantt.tsx:54` — `const _runtime = useRendererRuntime()` (unused)
- `calendar/calendar.tsx:51` — `const _runtime = useRendererRuntime()` (unused)
- `calendar/calendar.tsx:52` — `const _scope = useRenderScope()` (unused; then called again at line 95)
- `barcode-input/barcode-input.tsx:14-15` — Both `_runtime` and `_scope` unused

**Impact**: These are dead store subscriptions that still cause re-renders when the scope changes. In calendar.tsx, `useRenderScope()` is called twice (once dead, once live) — unnecessary overhead. The pattern suggests copy-paste boilerplate rather than intentional hook usage. `_helpers` is also destructured but unused in `gantt.tsx:53`, `calendar.tsx:50`, and `barcode-input.tsx:13`.

**Confidence**: Determinate

---

## 3. Pattern: Raw HTML Elements Instead of `@nop-chaos/ui` Components

**Scope**: 17 locations across all 4 sub-packages. Summary:

| Renderer                   | Raw HTML                                                                       | Should use                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Gantt grid                 | `<table>`, `<thead>`, `<tr>`, `<th>`, `<tbody>`, `<td>`, `<button>`, `<input>` | `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`, `Button`, `Input` |
| Gantt scheduler-config     | `<select>` (×2)                                                                | `NativeSelect`                                                                               |
| Kanban column-header       | `<button>`                                                                     | `Button`                                                                                     |
| Kanban activity-log        | `<button>`                                                                     | `Button`                                                                                     |
| Kanban tag-filter          | `<button>` (×2)                                                                | `Button`                                                                                     |
| Kanban card-tags           | `<img>`                                                                        | `Avatar`                                                                                     |
| Calendar batch-scheduler   | `<input type="checkbox">`, `<input type="radio">`, `<label>`                   | `Checkbox`, `RadioGroup`/`RadioGroupItem`, `Label`                                           |
| Calendar overlay           | `<div role="dialog">`                                                          | `Dialog`                                                                                     |
| Calendar timezone-selector | `<button>` (×2)                                                                | `Button`                                                                                     |
| Calendar resource-group    | `<button>`                                                                     | `Button`                                                                                     |
| Barcode input              | `<span>×</span>`, `<div>` spinner                                              | lucide `X` icon, `Spinner`                                                                   |

**Impact**: AGENTS.md mandates checking `packages/ui/src/index.ts` before writing raw HTML. The UI package provides theme-compatible, accessible, keyboard-enabled components. This pattern of raw HTML bypasses the entire design system. The kanban board (`kanban-board.tsx`) proves the imports work — it already uses `Button`, `Input`, `Label` correctly — but sub-components don't follow suit.

**Confidence**: Determinate

---

## 4. Pattern: `useCallback`/`useMemo` Overuse (React Compiler Redundancy)

**Scope**: 15+ memoization sites across the package (Gantt: 6 `useCallback`, Kanban: 2 `useCallback` + 3 `useMemo`, Calendar: 7 `useMemo` + 1 `useCallback`, Barcode scanner: 5 `useCallback`/`useMemo`).

**Impact**: Per `docs/skills/react19-best-practices-review.md` §"React Compiler 自动记忆化": React Compiler at error level handles all memoization automatically. Manual `useCallback`/`useMemo` are redundant. They add dependency-array maintenance burden and signal pre-React-19 coding patterns. The project guideline specifically says: "不要为新代码引入手写 useCallback" and "禁止为了'显式表达意图'而手写 memo."

Not a correctness issue, but a code-style convergence concern across the whole scheduling package.

**Confidence**: Determinate

---

## 5. Gantt: 15+ Declared Fields Not Implemented (Contract Drift)

**Location**: `scheduling-renderer-definitions.ts:9-63` vs `gantt/gantt.tsx`

**Unwired events**: `onTaskClick`, `onTaskDoubleClick`, `onLinkClick`, `onEmptyCellClick`, `onZoomChange`, `onScroll`
**Unwired props**: `draggable`, `editable`, `linkable`, `progressBarHeight`, `childrenField`, `initiallyExpanded`, `calendar`, `startDate`, `endDate`
**Unwired regions**: `body`, `empty`, `loading`
**Unapplied className props**: `toolbarClassName`, `taskBarClassName`, `editorClassName`, `emptyClassName`

**Impact**: Roughly one-third of the Gantt's declared public API is non-functional. Most critically, `draggable`/`editable`/`linkable` are silently ignored — there is no programmatic way to disable Gantt interaction. Events like `onZoomChange` and `onScroll` are declared for schema authors but never fire. The `loading` and `empty` regions are declared but never rendered.

**Confidence**: Determinate

---

## 6. Kanban: `columnDraggable` Silently Ignored (Bug)

**Location**: `scheduling-renderer-definitions.ts:88`, `kanban/kanban.types.ts:59`, `kanban/kanban-board.tsx:63`

**Problem**: The schema declares `columnDraggable` as a separate prop, allowing independent control of column vs. card drag. The renderer only reads `draggable`. A user configuring `columnDraggable: false, draggable: true` gets no column-drag disabling — the setting is silently ignored.

Additionally, 7 state-path fields (`columnsOrderStatePath`, `collapsedStatePath`, `kanbanOwnership`, `statusPath`, etc.) are declared but never consumed — planned controlled-mode support that never landed.

**Impact**: An actual user-facing bug: the schema accepts configuration that has no effect.

**Confidence**: Determinate

---

## 7. Calendar: `statusPath` Unwired + `exportToPrint` Missing from `useImperativeHandle`

**Location**: `scheduling-renderer-definitions.ts:154`, `calendar/calendar.tsx:32-40,167-181`

**Problems**:

1. `statusPath` is registered in definitions but never read by any calendar code
2. `CalendarHandle` interface promises `exportToPrint?: () => void` but `useImperativeHandle` doesn't expose it — callers who type against `CalendarHandle` will see `exportToPrint` at compile time but calling it does nothing
3. Deprecated components (`CalendarBatchScheduler`, `CalendarTimezoneSelector`, `CalendarResourceGroup`, `useCalendarICal`) still have their events registered in definitions, creating a cluttered API surface

**Confidence**: Determinate

---

## 8. BarcodeInput: onMount/onUnmount `kind` Mismatch

**Location**: `barcode-input-schemas.ts:30-31` (declares `kind: 'meta'`) vs `barcode-input.tsx:29-34` (reads from `events`)

**Problem**: Field rules declare `onMount`/`onUnmount` as `kind: 'meta'` but the renderer accesses them via `events.onMount?.({})`. If the framework enforces kind-based routing, these lifecycle hooks silently fail.

**Confidence**: Likely (depends on framework enforcement)

---

## 9. Global Mutable State Across Kanban Instances

**Location**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-adder.ts:14`

```typescript
let idCounter = 0; // module-level — shared across ALL Kanban boards
```

**Impact**: Two Kanban boards on the same page share `idCounter` for ID generation. While `Date.now()` in the prefix makes collisions unlikely, this is a cross-instance state leak that would be catastrophic in SSR. The counter should use `useRef` per-hook-instance instead.

Additionally, `useKanbanAdder` and `useKanbanCollab` are exported from the kanban index but never used by the main renderer — dead exports that still have bugs.

**Confidence**: Determinate

---

## 10. Dead Code

**Gantt**:

- `gantt-store.ts:29` — `_dirty` flag set in every mutation method but never read
- `gantt-utils.ts` — `flattenTree`, `toggleOpen`, `expandAll`, `collapseAll` exported but unused (gantt-tree-utils.ts provides equivalent functions)

**Kanban**:

- `kanban-board.tsx:289-296` — `_handleCardRemove` defined but never called
- `kanban-undo-stack.ts:84-90` — `shouldMerge` exported, tested, but never invoked by any command
- `useKanbanAdder` and `useKanbanCollab` hooks exported from index but unused by main renderer

**Calendar**:

- `calendar-month-view.tsx:252` — `{!isCurrentMonth ? null : null}` — dead ternary that always renders null

**Confidence**: Determinate

---

## 11. Error Handling Gaps

**Kanban silent catch**: `kanban-board.tsx:179-181` — `catch { /* bad expression */ }` silently swallows expression compilation errors. User provides malformed `filterCard` → no warning, no console, no error event. In a low-code platform where schema is often AI-generated or hand-authored, silent expression failure makes debugging extremely hard.

**Test false positive**: `barcode-scanner-overlay.test.tsx:86-97` — test "should call onClose when close button clicked" creates mock, queries button, but never clicks it and never asserts it was called — passes vacuously.

**Confidence**: Determinate

---

## 12. Framework Anti-Patterns

**Gantt Zustand class wrapper** (`gantt-store.ts:26`): `GanttStore` is a class wrapping a Zustand vanilla store. The class exposes getters that call `this.store.getState()` on every access, preventing fine-grained subscriptions. The revision-counter pattern (`revision`, `taskRevision`, `linkRevision`, `layoutRevision`, `treeRevision`) is a manual reactivity system duplicating what Zustand's selector-based subscriptions provide.

**Gantt keyboard effect deps** (`use-gantt-keyboard.ts:110`): The dependency array includes `store` (the full GanttStore class instance). As a class, it's a new reference after every mutation, causing the keyboard listener to be re-registered on every store change — a performance bug.

**Calendar hardcoded locale**: All calendar views default to `locale = 'en-US'`. `CalendarSchema` has no `locale` field. Non-English users cannot localize the calendar.

---

## Total Assessment

**Total unique findings**: 12

| Category                           | Count | Critical items                                                                                     |
| ---------------------------------- | ----- | -------------------------------------------------------------------------------------------------- |
| Convention violations (hard rules) | 3     | Ad-hoc Context, raw HTML elements, unused hook calls                                               |
| React 19/Compiler redundancy       | 1     | 15+ useCallback/useMemo sites                                                                      |
| Contract drift                     | 4     | Gantt 15+ fields, Kanban columnDraggable, Calendar statusPath/exportToPrint, Barcode kind mismatch |
| Dead code                          | 4     | `_dirty`, `_handleCardRemove`, `shouldMerge`, dead ternary                                         |
| Concrete bugs                      | 2     | Global idCounter, columnDraggable silently ignored                                                 |
| Error handling                     | 2     | Silent catch, false-positive test                                                                  |
| Framework anti-patterns            | 3     | Zustand class wrapper, store-in-keyboard-deps, no locale                                           |

---

## Blind Spots Self-Assessment

This audit focused on source-code patterns, convention compliance, and contract consistency. It did NOT:

1. **Run the test suite** — Some findings (like the false-positive test) were identified statically, but a full test run might reveal additional failures or confirm that contract-drifted code has compensating tests elsewhere.
2. **Test runtime behavior** — Could not confirm whether `kind: 'meta'` vs. reading from `events` actually fails; depends on framework enforcement not visible in source alone.
3. **Check build artifacts** — Did not verify whether `dist/` contains stale outputs from earlier builds.
4. **Accessibility audit beyond code patterns** — Did not test with screen reader or keyboard navigation.
5. **Performance profiling** — Did not measure whether the Zustand class-wrapper pattern or the full-subscription issue causes actual user-perceptible lag.

The highest-leverage next audit would be: **run `pnpm test` + `pnpm lint` on the scheduling package and verify which of these findings match lint-level detection vs. requiring code changes.** Second priority: a runtime audit of the Gantt's store subscription model to measure re-render overhead.

---

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
