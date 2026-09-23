# [card] page:kanban

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/kanban` ｜ **载体**: domain demo 页（`apps/playground/src/pages/kanban-demo.tsx` + `flux-renderers-scheduling/src/kanban/`）
- **矩阵裁剪**: full（列拖/卡拖/加卡/搜索/undo 中间态全查；glass 抽查裁剪同 gantt 卡理由）

## 1. 截图清单

| 状态                                              | light                                                                                                 | dark                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 默认 1280×800                                     | `_tmp/visual-inspection-2026-09-23/r2-1d/kanban/default-light-1280.png`                               | `default-dark-1280.png`                                                                   |
| 默认 ~800 宽                                      | `default-light-800.png`                                                                               | `default-dark-800.png`                                                                    |
| hover（卡片：阴影 + 操作钮浮出）                  | `card-hover-light-1280.png`                                                                           | —（同源类，token 适配）                                                                   |
| focus-visible（卡片 tabIndex=0，UA 默认 outline） | —（computed `outline: auto/1px`，程序化判定）                                                         | —                                                                                         |
| selected（卡片点击无持久选中态，见 G1 注）        | `card-selected-light-1280.png`                                                                        | —                                                                                         |
| 弹层打开                                          | n/a（本页无 Dialog/Sheet 流；加卡为行内输入，见 `addcard-input-light-1280.png`）                      | n/a                                                                                       |
| 拖拽进行中（列拖 A6 / 卡拖 A6）                   | `coldrag-mid-light-1280.png` / `carddrag-mid-light-1280.png` / `carddrag-end-light-1280.png`          | `coldrag-mid-dark-1280.png` / `carddrag-mid-dark-1280.png` / `carddrag-end-dark-1280.png` |
| loading/empty/error                               | `addcard-input-light-1280.png`（empty 列「拖拽卡片到此处」虚线区在 `default-light-1280.png` 第 4 列） | —                                                                                         |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（卡片 UA outline 可见，弱但存在） A3 **warn(A3-01 族：16 处 20×20 卡片操作钮)** A4 pass（redo 禁用 op 0.5） A5 pass（空列虚线「拖拽卡片到此处」+ 添加卡片兜底） A6 **pass（源卡 50% 透明 + 目标列蓝框高亮 + 落后计数即时更新；warn 见 A6-01）** A7 n/a A8 **pass（Space 拾起 → ←/→ 跨列移动 → Esc 取消 + aria-live 播报；列拖柄 ←/→ 可移列）** A9 pass（计数、undo 栈、行内加卡即时反馈）
- B 颜色：B1 pass B2 pass B3 pass（色彩点/标签色语义稳定） B4 pass B5 **fail(B5-01 载体头部)** B6 pass
- C 布局：C1 pass（列横滚为有意；800 宽三列半 + 横滚合理） C2 pass C3 pass C4 pass C5 pass（列体独立滚动不产生双滚动条） C6 n/a
- D 间隔：D1 pass（卡间距/列间距 12px 栅格一致，GAP_SNIPPET 0 命中） D2–D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 pass（空列有引导）
- F 一致性：F1 pass（与 linear-board 复刻页语义近似但 replica 豁免） F4 warn（「+ 添加列/卡片」zh 与 demo 卡片文案 zh 一致，本页混用程度低） F3 pass（空列态与 kanban-perf 一致）
- G 设计器（画布类，看板按拖拽面套用）：G1 **warn（拖拽目标列蓝框高亮清晰；卡片点击无持久选中态——demo 语义为 onCardClick 事件，非缺陷）** G2 pass（拖柄 cursor） G3 pass（见 A6） G4 pass（空列引导） G8 pass
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-B5-01] Demo 载体头部 `bg-white` 在 dark 下标题/返回钮不可见（本波 8 页系统性）

- **页面/路由**: `#/kanban`（+ gantt / gantt-states / scheduling-calendar / barcode-input / gantt-perf-scale / kanban-perf-scale / calendar-perf-scale 全部 8 页，demo 载体同款写法）
- **主题/视口/状态**: dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/kanban/dark-header-strip.png`（决定性证据）；`scheduling-calendar/dark-header-strip.png`（全宽版）
- **目视描述**: dark 下头部条仍为白底，页面标题与返回箭头以近白色渲染在白底上，肉眼不可见。
- **程序化证据**: 6 个 demo 载体源码（如 `kanban-demo.tsx` L141）`<div className="… border-b bg-white shrink-0">`；dark computed：header bg = `rgb(255,255,255)`（字面白，不随主题），h1 color = `rgb(230,236,243)`（主题前景，dark 近白）→ 白底白字；返回钮 ghost variant 同前景色同样不可见。探针输出与截图一致。
- **对照基准**: styling-system.md B4 令牌口径（字面色）；theme-compatibility.md dark 规约；R2-4 已裁定 dark 平价族。
- **严重程度**: P1
- **用户影响**: dark 主题下所有 scheduling/perf demo 页标题不可读、无法辨认返回按钮位置；属高频入口 chrome。
- **修复方向**: 8 个 demo 页 `bg-white` → `bg-card`（或 `bg-background`），一行/页；如需在 R2-4 批统一处理，可按「demo 载体字面底色」归族。
- **归族**: systemic → R2-4 批（dark 增量，本波 8 页 + 其他波 demo 载体可能同款）
- **复核状态**: 未复核

### [R2-1d-A6-01] 卡片拖拽缺槽位级落点指示

- **页面/路由**: `#/kanban`
- **主题/视口/状态**: light + dark / 1280 / 卡拖进行中
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/kanban/carddrag-mid-light-1280.png`、`carddrag-mid-dark-1280.png`
- **目视描述**: 拖卡悬停目标列时仅整列蓝框高亮，列内不显示将插入的具体槽位（Trello/Linear 均显示灰色插入槽）。
- **程序化证据**: 拖拽中 DOM 扫描：源卡 opacity=0.5（lifted ✓）、目标列 border 高亮 ✓；列体内无 placeholder/insertion-indicator 元素（`placeholders` 扫描仅命中加卡输入框误报）。落点只能在 drop 后由计数变化确认。
- **对照基准**: NN/g 拖放指南「落位必须有清晰 drop-target 反馈」；kanban-dnd-integration.test.tsx 功能层已绿，视觉层缺槽位指示。
- **严重程度**: P3
- **用户影响**: 同列内多卡排序时用户无法预判落点，需试错。
- **修复方向**: dndkit 碰撞点处渲染占位条（复用空列虚线样式），或至少高亮相邻卡片间隙。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**本页正例（记录）**: A8 键盘拖拽替代完整（`use-kanban-board-effects.ts`：Space 拾起/方向键跨列/Esc 取消 + `setDndAnnouncement` aria-live）；列拖有虚线落点占位（`coldrag-mid-light-1280.png` 右缘）；行内加卡输入「新卡片」带 × 取消（`addcard-input-light-1280.png`）；搜索实时过滤。dark 下列 `rgb(31,42,61)` / 卡 `rgb(2,8,23)` 适配正常。**A3 族实例**：16 处 20×20 卡片操作钮 + 列头 20px 钮 → 并入 R2-1a-A3 族（watch），不单独立项。

## 4. 台账回写

- 本卡完成后：ledger.md `kanban` 行 status → `carded`；findings 归族后 → `digested`。
