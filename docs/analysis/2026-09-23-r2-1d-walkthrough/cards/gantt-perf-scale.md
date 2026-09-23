# [card] page:gantt-perf-scale

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/gantt-perf-scale` ｜ **载体**: perf fixture 页（`apps/playground/src/pages/gantt-perf-scale-demo.tsx`，500 tasks / 2000 links）
- **矩阵裁剪**: simplified（perf 变体按波次地板：light+dark、1280+~800、渲染正确性聚焦；拖拽/弹层/元素态抽样裁剪，理由：交互面与 `#/gantt` 同源组件，结论引用 gantt 卡，本页不度量性能数值）

## 1. 截图清单

| 状态              | light                                                                             | dark                             |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------- |
| 默认 1280×800     | `_tmp/visual-inspection-2026-09-23/r2-1d/gantt-perf-scale/default-light-1280.png` | `default-dark-1280.png`          |
| ~800 宽           | `default-light-800.png`                                                           | —（横滚结构与 light 同源，裁剪） |
| 垂直滚动后        | `scrolled-light-1280.png`                                                         | —                                |
| 适应（fit）点击后 | `after-fit-light-1280.png`                                                        | —                                |

## 2. 维度勾选（地板口径：A5/A9/C1/C3/E1/B5）

- A5/A9 pass（23 bar/4000 polyline/25 行 DOM 存在，无空态误示）；C1 pass（scale 横滚有意）；B5 **fail(引用 R2-1d-B5-01 载体头部 + R2-1d-B5-02 刻度字面灰，本页 dark 截图同证)**；C3/E1 **warn(C3-01)**。

## 3. 发现条目

### [R2-1d-C3-01] 初始视口落在时间轴范围起点，图表区整屏空白

- **页面/路由**: `#/gantt-perf-scale`
- **主题/视口/状态**: light + dark / 1280 / 打开即拍
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/gantt-perf-scale/default-light-1280.png`、`default-dark-1280.png`
- **目视描述**: 打开页面右侧图表区只有一条「2026/06」月刻度带，无任何任务条；左格任务列表正常。
- **程序化证据**: 探针：可视区内 bars（left>330 且 right<1280）= **0**；DOM bars=23、polylines=4000（均渲染在视口右侧远处）。点击工具栏「适应」后 visBars=18、月格宽 360-372px（`after-fit-light-1280.png`）——功能正常，仅初始滚动位置未对齐首个任务。
- **对照基准**: E1「首屏可答主内容在哪」；perf fixture 取舍口径（参照 R2-1c-D3-01 先例）。
- **严重程度**: P3（fixture 页 + 有「适应」一键缓解）
- **用户影响**: 打开即面对空图，需自行发现「适应」钮或横向长距离滚动。
- **修复方向**: 初始 scrollLeft 对齐最小任务日期（与 gantt 主管 Demo 行为一致化），或默认执行一次 fit。
- **归族**: watch-only → 台账（fixture 取舍）
- **复核状态**: 未复核

## 4. 台账回写

- ledger.md `gantt-perf-scale` 行 status → `carded`；C3-01 → watch；dark 头部/刻度引用 B5-01/B5-02 归族后 → `digested`。
