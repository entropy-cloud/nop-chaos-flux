# 17 Report Designer Field Drag-Drop Shows Blank, Edit Not Exiting, Fill Handle Cursor Stuck

## Problem

Three related UX bugs in the Report Designer spreadsheet:

1. **Field drag-drop shows blank** — dragging a field from the left panel onto a cell displays empty content instead of the expected expression (e.g., `${orderId}`)
2. **Cell edit doesn't exit on outside click** — double-clicking a cell to edit, then clicking outside, leaves the cell in edit mode with the input still focused
3. **Fill handle cursor stuck as crosshair** — mouse cursor remains as `+` crosshair after fill drag ends, instead of reverting to default

## Diagnostic Method

### Bug 1: Field drag-drop blank

- Suspected the `handleFieldDrop` function was reading the wrong target cell
- Found that `onDragLeave` sets `dropTargetCell` to `null`, and `onDrop` fires after `onDragLeave` in some browsers — a classic race condition
- The handler fell through to a fallback branch that didn't produce the expected expression

### Bug 2: Edit not exiting on outside click

- `handleEditSave` was only called from `onBlur` of the input and `onKeyDown` Enter/Escape
- Clicking outside the input fires `onBlur` on the input, but if the click lands on the canvas `div` (not on another cell's `onClick`), nothing saves the edit
- The canvas `div`'s `onMouseDown` handler existed but had a stale closure over `editingCell`/`editValue` state

### Bug 3: Fill handle cursor stuck

- CSS `cursor: crosshair` was applied via `data-fill-dragging` attribute on `.spreadsheet-grid`
- The `useEffect` for fill handle used `{ once: true }` on the `mouseup` listener, which could be garbage collected or lost
- `querySelectorAll('td.cell')` used wrong class name — should be `td.ss-cell`

## Root Cause

1. **Race condition in drag-drop** — `onDragLeave` clears `dropTargetCell` state, but `handleFieldDrop` reads from state. Between `onDragLeave` and `onDrop`, the state is `null`.

2. **Stale closure in edit handlers** — `handleEditSave` and canvas `onMouseDown` captured `editingCell`/`editValue` from the closure at creation time. React state updates between renders caused these closures to reference outdated values.

3. **`{ once: true }` on `mouseup` + wrong querySelector class** — The `once: true` option removes the listener after first invocation, but if the listener was registered during a specific render, cleanup/removal timing could leave the `data-fill-dragging` attribute stuck as `true`. Additionally, `querySelectorAll('td.cell')` matched nothing (wrong class), so the mouseup handler never found the target cell to process.

## Fix

### Bug 1: Ref-based drop target

```typescript
const dropTargetCellRef = useRef<{ row: number; col: number } | null>(null);
// onDragOver: writes both state and ref
// onDragLeave: only clears state (ref preserved)
// handleFieldDrop: reads ref first, then state, then selectedCell
```

### Bug 2: Ref-based edit state

```typescript
const editingCellRef = useRef<{ row: number; col: number } | null>(null);
const editValueRef = useRef<string>('');
// All edit operations read from refs, not from state closures
// Canvas onMouseDown checks ref to decide if edit should be saved
```

### Bug 3: Fill handle effect cleanup

- Removed `{ once: true }` — use `useEffect` cleanup for proper listener lifecycle
- Fixed `querySelectorAll('td.ss-cell')` (correct class name)
- Added `fillHandleRef` for synchronous state access in mouseup handler

## Tests

- Covered by the fill series tests in `packages/spreadsheet-core/src/p1-features.test.ts` (see bug #15)
- Field drop and edit exit bugs are UI-level issues verified manually in the playground

## Affected Files

- `apps/playground/src/pages/ReportDesignerDemo.tsx` — refs for drop target, edit state, fill handle; canvas onMouseDown; handleFieldDrop fallback chain
- `apps/playground/src/styles.css` — fill drag cursor rules

## Notes For Future Refactors

1. **React 事件中的 state 闭包问题是 re-render 期间注册 callback 的经典陷阱** — 使用 `useRef` 保存需要在事件 handler 中实时访问的值。Ref 的 `.current` 始终是最新值，不受闭包捕获限制。
2. **`onDragLeave` → `onDrop` 竞态条件是 HTML5 DnD API 的已知行为** — 解决方案是用 ref 持久化 drop target，不在 `onDragLeave` 中清除 ref。
3. **`{ once: true }` 在 React `useEffect` 中不应使用** — 它与 React 的清理模型冲突。正确做法是在 `useEffect` 返回的 cleanup 函数中移除监听器。
4. **CSS 类名一致性** — 渲染层用 `ss-cell`，JS 查询也必须用 `ss-cell`。建议提取为常量避免拼写错误。
