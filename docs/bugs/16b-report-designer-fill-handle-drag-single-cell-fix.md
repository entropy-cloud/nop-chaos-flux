# 16 Report Designer Fill Handle Drag — Only One Cell Filled and Value Not Incremented

## Problem

- Dragging the fill handle on cell `A3` (containing value "A3") only creates one additional `A3` cell below, instead of filling the entire drag range with `A4`, `A5`, etc.
- The fill range (multiple rows/columns) is not respected — only a single cell gets modified
- Fill handle mouse cursor occasionally flickered between crosshair and default cursor during drag

## Diagnostic Method

**诊断难度：中高。** 涉及 React 事件系统、闭包陈旧引用、以及两条不同的代码路径。

### 调查路径

1. **首先检查 `applyFillSeries` 核心逻辑** — 确认 `targetRange` 传参和循环范围正确，核心函数本身没有问题
2. **检查 `handleMouseUp` 中的两条分支** — 发现 Ctrl 拖拽路径 (`copyCells`+`pasteCells`) 只往 `endRow+1` 粘贴一个单元格
3. **追踪 `isCtrlPressed` 来源** — `e.ctrlKey || e.metaKey` 在 macOS 上 `metaKey` 对应 ⌘ 键，但用户报告时并没有按 Ctrl/⌘
4. **检查 `mousemove` 中 `currentRow`/`currentCol` 是否正确更新** — 发现旧代码使用 `querySelectorAll('td.ss-cell')` 遍历所有单元格做矩形命中检测，快速拖拽时可能丢失更新
5. **检查事件冲突** — 发现 `<td>` 上的 `handleCellClick` 和 `handleCellMouseDown` 在填充拖拽期间也会触发，可能重置选区

### 关键证据

- 旧代码 Ctrl 路径只 paste 到 `endRow + 1` 的单个单元格地址 — 完美匹配"只有一个新a3"的症状
- `querySelectorAll` 遍历 ~500 个 `<td>` 做 `getBoundingClientRect` 命中检测 — 快速拖拽时 `mousemove` 事件之间的位移可能导致跳过单元格
- `<td>` 的 `onClick` 在 `mouseup` 后触发 — 如果 `handleMouseUp` 设置的 `isFilling: false` 状态还没有生效，`click` 事件会重置 `selectedCell`

## Root Cause

**三个独立的 bug 叠加导致：**

1. **`mousemove` 使用低效的遍历方法检测悬停单元格** — `querySelectorAll('td.ss-cell')` + `getBoundingClientRect` 逐一比对。快速拖拽时 `currentRow` 可能没有更新到最终位置，导致 `currentRow <= endRow`，填充根本不触发或者只差一格。

2. **Ctrl 拖拽路径只粘贴一个单元格** — `copyCells` + `pasteCells` 的目标是 `cellAddress(endRow + 1, startCol)`，即源选区下方/右方的一个单元格。不管用户拖了多远，永远只多一个单元格。非 Ctrl 路径 (`fillSeries`) 虽然逻辑正确，但如果 `isCtrlPressed` 被误判为 true（macOS 上某些事件 `metaKey` 可能为 true），就会走错误路径。

3. **`handleCellClick`/`handleCellMouseDown` 在填充拖拽期间不设防** — 鼠标经过其他单元格时，这些 handler 可能被触发并重置 `selectedCell`/`dragState`，干扰填充逻辑。

## Fix

### 1. `mousemove` 改用 `document.elementFromPoint`

```typescript
const el = document.elementFromPoint(e.clientX, e.clientY);
const td = (el as HTMLElement).closest('td.ss-cell');
```

O(1) 定位替代 O(N) 遍历，快速拖拽也能准确追踪。

### 2. 移除 Ctrl 拖拽的 `copyCells`+`pasteCells` 路径

统一使用 `spreadsheet:fillSeries`。现在 `incrementSeriesValue` 已支持尾部数字模式，Ctrl 复制模式可以后续单独重新实现（如果需要的话）。原来两条路径的存在增加了不必要的复杂度和 bug 面。

### 3. 填充拖拽期间守卫 `handleCellClick`/`handleCellMouseDown`

```typescript
if (fillHandleRef.current.isFilling) return;
```

检查 ref 而非 state，避免闭包陈旧问题。

### 4. 增大填充手柄可点击区域

7×7px → 10×10px，加 `z-index: 5`，向外偏移 2px，更容易点中。

## Tests

- `packages/spreadsheet-core/src/p1-features.test.ts` — 6 个序列填充测试覆盖纯数字、尾部数字、零填充、非递增字符串（见 bug #15）

## Affected Files

- `apps/playground/src/pages/ReportDesignerDemo.tsx` — 重写填充手柄拖拽逻辑，添加事件守卫
- `apps/playground/src/styles.css` — 填充手柄尺寸和 z-index

## Notes For Future Refactors

1. **`document.elementFromPoint` 是 O(1) 的** — 任何基于鼠标位置的单元格检测都应该优先使用它，而不是遍历 DOM 列表。
2. **填充拖拽使用 ref 而非 state 追踪鼠标位置** — `fillHandleRef.current` 在 `mousemove` 中同步更新，`handleMouseUp` 中同步读取。如果用 state，React 批处理可能导致 `handleMouseUp` 读到旧值。
3. **填充手柄的 `e.stopPropagation()` 阻止了事件冒泡到 `<td>`** — 这确保了 `handleCellMouseDown` 不会被填充手柄的点击触发。但 `window` 级别的 `mousemove`/`mouseup` 不受影响。
4. **Ctrl 拖拽复制模式被移除** — 如果将来需要恢复，不应该用 `copyCells`+`pasteCells` 逐单元格操作。应该直接在 `spreadsheet-core` 中添加 `seriesType: 'copy'` 参数，让 `applyFillSeries` 在 copy 模式下重复源值。
5. **填充手柄必须始终在选中范围右下角的单元格上渲染** — `isFillHandleCell` 的判断条件是 `r === selectedRange.endRow && c === selectedRange.endCol`。如果选区逻辑改变，填充手柄位置也会跟着变。
