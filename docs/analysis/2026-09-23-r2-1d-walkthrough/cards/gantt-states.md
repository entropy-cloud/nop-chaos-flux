# [card] page:gantt-states

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/gantt-states` ｜ **载体**: domain demo 页（`apps/playground/src/pages/gantt-states-demo.tsx`）
- **矩阵裁剪**: full（状态矩阵页本体即状态枚举：empty×2 / loading / baselines / toolbar-region / taskbar-region / default-zoom / column-region 七个 gantt 实例逐节走查；弹层/拖拽与 gantt 主卡同源不重复，理由：组件交互面一致，引用 gantt 卡 G3/A7 结论）

## 1. 截图清单

| 状态                          | light                                                                                                          | dark                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 默认（首屏 1280）             | `_tmp/visual-inspection-2026-09-23/r2-1d/gantt-states/default-dark-top-1280.png` 对应 light 首屏               | `default-dark-top-1280.png`        |
| empty（基础/自定义区）        | `sec-empty-light-1280.png`                                                                                     | `sec-empty-dark-1280.png`          |
| loading（skeleton）           | `sec-loading-light-1280.png`                                                                                   | `sec-loading-dark-1280.png`        |
| baselines（偏差条/标签）      | `sec-baselines-light-1280.png`                                                                                 | `sec-baselines-dark-1280.png`      |
| toolbar/taskbar/column region | `sec-toolbar-region-light-1280.png` / `sec-taskbar-region-light-1280.png` / `sec-column-region-light-1280.png` | —（region 结构与主题无关部分同源） |
| ~800 宽                       | `default-light-800.png` / `band-baselines-light-800.png`                                                       | —                                  |

（注：`band-*-light-1280.png` 为窗口滚动误拍作废，有效证据为 `sec-*` 系列。）

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 引用 gantt 卡 A2-01 A3 引用 gantt 卡 A3-01 A4 n/a A5 **pass（empty 文案非空、skeleton DOM 存在）** A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 **fail(B1-03)** B2 pass B3 **pass（晚=红 / 早=琥珀语义正确）** B4 pass（baseline 条/线走 token） B5 pass（skeleton `rgb(31,42,61)`、empty 字 `rgb(175,189,207)` 已适配） B6 pass
- C 布局：C1 pass C2 **warn(C2-01)** C3 pass（分区标题+图清楚） C4 pass C5 pass（内滚容器正常） C6 n/a
- D 间隔：D1 warn（节标题 mt-4/mb-1 = 16/4 栅格，合规；各 gantt 实例间距 24px 一致） D2–D8 pass/n-a
- E 排布：E1 pass（每节三问可答） E2 pass E3 pass E4 pass E5 pass（标题/图分节清晰） E6 **pass（empty 有文案引导）**
- F 一致性：F4 **warn（zh 默认空态「暂无任务」 vs EN 自定义空态/EN 节标题，语言割裂实例更多）** F1/F2/F3/F5 pass/n-a
- G 设计器：G1–G3 引用 gantt 卡；G4 **pass（empty 态非空白，有「暂无任务」/自定义区）** G8 pass
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-B1-03] 基线偏差标签 9px 且低对比

- **页面/路由**: `#/gantt-states`（`#/gantt` 若配 baselines 同样复现）
- **主题/视口/状态**: light + dark / 1280 / baselines 节
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/gantt-states/sec-baselines-light-1280.png`（+3d/-2d 标签）、`sec-baselines-dark-1280.png`
- **目视描述**: 偏差标签「+3d」（红）「-2d」（琥珀）小到难以辨认，琥珀那条几乎隐形。
- **程序化证据**: `baseline-bars.tsx`：`fontSize={9}`；computed fill light = `rgb(239,67,67)`（红）/ `rgb(245,159,10)`（琥珀）。琥珀 #F59F0A 对白底 ≈**2.2:1**、红 ≈3.9:1（9px 字要求 4.5:1）；dark 红 `rgb(217,38,38)` 对暗底 ≈3.4:1。探针输出与截图一致。
- **对照基准**: WCAG 1.4.3；MS Project/对照产品基线标签 ≥10px 且随主题换色。
- **严重程度**: P2
- **用户影响**: 偏差天数是 baselines 节的核心信息，light 琥珀标签在实际使用中不可读。
- **修复方向**: `baseline-bars.tsx` fontSize 9→11；标签色在 light 下用深变体（如 `color-mix(in srgb, var(--color-warning) 70%, black)`）。
- **归族**: systemic → R2-3 批（gantt 系列）
- **复核状态**: 未复核

### [R2-1d-C2-01] 基线条侵入下一行车道（几何越界风险）

- **页面/路由**: `#/gantt-states`
- **主题/视口/状态**: light / 1280 / baselines 节
- **截图**: `sec-baselines-light-1280.png`
- **目视描述**: 基线灰条画在任务条下方同一行内，与下一行任务条端部几乎相接。
- **程序化证据**: `baseline-bars.tsx`：`by = task.$y + taskBarHeight + 2`，高 `taskBarHeight*0.6`=17px → 占用 $y+30..47；行高 40px → 越入下一行车道 7px。本 demo 数据 x 范围错开未显性重叠（Late baseline 右缘 582 = Early bar 左缘 582），属几何必然风险。
- **对照基准**: MS Project 基线同行下置但行高预留；C2「无意外重叠」。
- **严重程度**: P3
- **用户影响**: 数据密集时基线与下行任务条粘连/遮挡。
- **修复方向**: 行高随 baseline 存在自动 +8px，或基线条高压缩至剩余车道（40-28-2=10px）内。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**本页正例（记录）**: 状态枚举呈现完整——empty 基础态「暂无任务」居中、自定义 empty region 生效、loading 三段 skeleton（dark `rgb(31,42,61)` 适配）、baselines 偏差连线红/琥珀语义正确、toolbar/taskbar/column 三个自定义 region 均正确替换默认渲染（`Host toolbar region`、`◆Region Bar◆`、`≔ 2026-08-02`）。A5 判据全部程序化通过。

**跨页引用**: 载体 `bg-white` 头部 dark 不可见 → R2-1d-B5-01（kanban 卡）；zh/EN 混用 → R2-1d-F4-01 族（本页「暂无任务」vs「No tasks yet」是最直观实例）；时间轴刻度字面灰 → R2-1d-B5-02（gantt 卡）。

## 4. 台账回写

- 本卡完成后：ledger.md `gantt-states` 行 status → `carded`；findings 归族后 → `digested`。
