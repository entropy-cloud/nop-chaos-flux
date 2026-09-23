# [card] page:kanban-perf-scale

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/kanban-perf-scale` ｜ **载体**: perf fixture 页（`apps/playground/src/pages/kanban-perf-scale-demo.tsx`，20 列 × 300 卡）
- **矩阵裁剪**: simplified（地板：light+dark、1280+~800、渲染正确性；拖拽/加卡/搜索中间态引用 `#/kanban` 卡同源结论，不重复取证）

## 1. 截图清单

| 状态          | light                                                                              | dark                    |
| ------------- | ---------------------------------------------------------------------------------- | ----------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/r2-1d/kanban-perf-scale/default-light-1280.png` | `default-dark-1280.png` |
| ~800 宽       | `default-light-800.png`                                                            | —（同源横滚，裁剪）     |
| 横向滚动后    | `hscrolled-light-1280.png`                                                         | —                       |

## 2. 维度勾选（地板口径）

- 渲染正确性 **pass**：20 列/6000 卡 DOM，空白卡=0；列头计数 300×5 可见列全部一致；列体独立滚动（overflow-y auto，26416px）；搜索/undo/redo chrome 正常。
- C1 pass（列横滚 5352px 为有意看板模式；~800 宽三列半 + 横滚合理）；C5 pass（仅列体纵向滚动，无双滚动条）；A5 pass（无空态）。
- B5 **fail(引用 R2-1d-B5-01：载体头部 `bg-white` dark 标题不可见，本页 dark 截图同证)**。
- A3 引用 R2-1d-A3-01 族（20×20 卡钮 ×6040 实例，族口径不变）。

## 3. 发现条目

无本页新增发现（渲染正确性全绿；dark 头部/小目标均为已归族引用）。

**正例记录**: 大数据量下列头/计数/卡片排版零漂移，拖拽把（gantt/kanban 卡）在本规模下的可用性由列体独立滚动保障。

## 4. 台账回写

- ledger.md `kanban-perf-scale` 行 status → `carded`；B5-01 引用归族后 → `digested`。
