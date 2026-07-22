# Round 01: Ad-hoc React Context & Cross-Cutting Convention Violations

> **Status**: Complete
> **Method**: Code reading + sub-agent parallel exploration
> **Sources**: AGENTS.md, react19-best-practices-review.md, renderer-runtime.md, styling-system.md

## Summary

Round 01 focuses on the most impactful convention violation in the scheduling package: ad-hoc React Context usage in Gantt, and cross-cutting patterns of convention drift across all four renderers.

---

## Finding 1.1 — Ad-hoc React Context in Gantt (NEVER Rule Violation)

**Where**: `packages/flux-renderers-scheduling/src/gantt/gantt-context.tsx:12`

**What**: `const GanttStoreContext = createContext<GanttStore | null>(null)` creates an ad-hoc React Context. AGENTS.md §"MANDATORY: Renderer Component Contract" states: **"NEVER create ad-hoc React contexts or prop-drilling chains for data these hooks already provide."**

The file includes a rationale comment (lines 1-8) explaining why it was chosen ("deeper tree, more inter-component subscriptions"). This is a deliberate override of a project-hard rule.

**Why care**: This is not a minor style preference. The project has established standard hooks in `@nop-chaos/flux-react` (`useRendererRuntime()`, `useRenderScope()`, `useScopeSelector()`) that are the sanctioned data-access channels. Bypassing them means:

- This pattern will be copied to new renderers ("Gantt does it, so can I")
- The Gantt's state cannot benefit from scope-selector-based fine-grained reactivity
- Two competing data-access conventions now live in the same package

**Confidence**: Determinate

---

## Finding 1.2 — Pattern: Unused Standard Hook Calls in All Three Main Renderers

**Where** (3 files):

1. `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:54` — `const _runtime = useRendererRuntime();` (unused)
2. `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:51` — `const _runtime = useRendererRuntime();` (unused)
3. `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:52` — `const _scope = useRenderScope();` (unused, then called again at line 95)
4. `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:14` — `const _runtime = useRendererRuntime();` (unused)
5. `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:15` — `const _scope = useRenderScope();` (unused)

**What**: Every single main renderer in the scheduling package imports and calls standard hooks (`useRendererRuntime()`, `useRenderScope()`) but never uses the result. The underscore prefix signals intent, but the calls still register subscriptions to the runtime/scope stores.

In calendar.tsx, `useRenderScope()` is called twice (lines 52 and 95) — the first is dead, the second is live.

**Why care**: These are unnecessary store subscriptions. Each call creates a subscription that will cause re-renders when the scope changes, even if no component logic depends on it. For calendar.tsx specifically, the dead `_scope` at line 52 combined with live `scope` at line 95 means double subscription cost.

**Confidence**: Determinate

---

## Finding 1.3 — Pattern: Raw HTML Elements Instead of @nop-chaos/ui Components

**Where** (cross-cutting, 4 sub-packages):

| File                                        | Line(s)  | Raw element                                             | Should use                                                                |
| ------------------------------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `gantt/gantt-grid.tsx`                      | 68-144   | `<table>`, `<thead>`, `<tr>`, `<th>`, `<tbody>`, `<td>` | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` |
| `gantt/gantt-grid.tsx`                      | 110-119  | `<button>`                                              | `Button`                                                                  |
| `gantt/gantt-grid.tsx`                      | 122-131  | `<input>`                                               | `Input`                                                                   |
| `gantt/resource-load-grid.tsx`              | 15-46    | `<table>`, `<thead>`, `<th>`, `<tr>`, `<td>`            | `Table`, etc.                                                             |
| `gantt/scheduler-config.tsx`                | 63-84    | `<select>` (×2)                                         | `NativeSelect`                                                            |
| `kanban/kanban-column-header.tsx`           | 95       | `<button>`                                              | `Button`                                                                  |
| `kanban/kanban-activity-log.tsx`            | 148      | `<button>`                                              | `Button`                                                                  |
| `kanban/kanban-tag-filter.tsx`              | 32, 51   | `<button>` (×2)                                         | `Button`                                                                  |
| `kanban/kanban-card-tags.tsx`               | 73       | `<img>`                                                 | `Avatar`                                                                  |
| `calendar/calendar-timezone-selector.tsx`   | 65, 78   | `<button>` (×2)                                         | `Button`                                                                  |
| `calendar/calendar-resource-group.tsx`      | 34       | `<button>`                                              | `Button`                                                                  |
| `calendar/calendar-batch-scheduler.tsx`     | 152, 157 | `<input type="checkbox">`                               | `Checkbox`                                                                |
| `calendar/calendar-batch-scheduler.tsx`     | 185-191  | `<input type="radio">`                                  | `RadioGroup` + `RadioGroupItem`                                           |
| `calendar/calendar-batch-scheduler.tsx`     | 151, 155 | `<label>`                                               | `Label`                                                                   |
| `calendar/calendar-overlay.tsx`             | 16-28    | `<div role="dialog">`                                   | `Dialog`                                                                  |
| `barcode-input/barcode-input.tsx`           | 188      | `<span>×</span>`                                        | lucide-react `X` icon                                                     |
| `barcode-input/barcode-scanner-overlay.tsx` | 250-253  | `<div className="w-8 h-8 border-2...">` spinner         | `Spinner`                                                                 |

**Why care**: AGENTS.md mandates: **"NEVER use raw HTML elements when @nop-chaos/ui provides a component."** The UI package exists specifically to ensure theme compatibility, keyboard accessibility, ARIA attributes, and consistent styling. Using raw elements bypasses all of this. The kanban board (`kanban-board.tsx`) proves these imports work — it already uses `Button`, `Input`, `Label` correctly. The sub-components simply don't follow the same pattern.

**Confidence**: Determinate

---

## Finding 1.4 — Pattern: useCallback/useMemo Overuse (React Compiler Redundancy)

**Where**: The entire scheduling package extensively uses `useCallback` and `useMemo`:

Key examples:

- `gantt/gantt.tsx:87,91,99,101,151,160` — 6 `useCallback` calls
- `kanban/kanban-board.tsx:110,125` — 2 `useCallback` + `useMemo` at lines 69, 162, 188
- `calendar/calendar-month-view.tsx:63,68,73,151,281,283,302` — 7 `useMemo` + 1 `useCallback`
- `barcode-input/barcode-scanner-overlay.tsx:46,53,65,70,162` — 5 `useCallback`/`useMemo`

**Why care**: Per `docs/skills/react19-best-practices-review.md` §"React Compiler 自动记忆化": The project has React Compiler at error level. Hand-written `useCallback`/`useMemo` are redundant — Compiler handles this automatically. The docs state: "不要为新代码引入手写 useCallback" and "已有的手写 memo 不需要立即删除" but also "禁止为了'显式表达意图'而手写 memo."

This isn't a correctness bug, but it creates maintenance overhead: every dependency array must be manually kept in sync, and it signals that developers are writing pre-React-19 patterns. The cumulative effect across 15+ memoization sites is real codebase drag.

**Confidence**: Determinate

---

## Finding 1.5 — Pattern: useEffect for Prop-to-Store Sync (Anti-Pattern)

**Where**:

1. `gantt/gantt.tsx:79-85` — `useEffect` watches `resolved.tasks`, `resolved.links`, etc., computes a JSON fingerprint, and calls `store.parse()` when changed
2. `kanban/kanban-board.tsx:74-75` — `useEffect` mirrors `setBoardData` into a ref (setBoardData is stable, so this is a no-op)
3. `kanban/kanban-board.tsx:77-78` — `useEffect` mirrors `boardData` into `prevBoardRef` asynchronously (after paint), introducing a race where `prevBoardRef.current` is stale during the render where it's read (line 100)

**Why care**: AGENTS.md says: **"Prefer render-time derivation over `useEffect` + `setState` mirrors. Use `useEffect` only for external synchronization."** The Gantt pattern at lines 79-85 is prop-to-store sync — exactly the discouraged pattern. The kanban ref-mirror at lines 77-78 is worse: it uses `useEffect` (async, after paint) but the result is read synchronously during render (line 100's `handleSetBoardData`), meaning it reads a stale value from the previous render.

For the Kanban specifically: `prevBoardRef.current` should be assigned directly in render: `prevBoardRef.current = boardData;` This pattern is a latent bug that surfaces when multiple state updates batch.

**Confidence**: Determinate (Kanban issue is a concrete bug; Gantt issue is a convention violation)

---

## Round Assessment

**Round coverage**: 5 findings, all convention violations with evidence in source code.

**Best follow-up direction**: Deep-dive on contract drift between `scheduling-renderer-definitions.ts` and actual implementation. The definitions file declares 80+ fields across 4 renderers; a spot-check suggests many are unwired.
