# [card] page:gantt

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/gantt` ｜ **载体**: domain demo 页（`apps/playground/src/pages/gantt-demo.tsx` + `flux-renderers-scheduling/src/gantt/`）
- **矩阵裁剪**: full（复杂控件 demo 页，无条件全矩阵：拖拽中间态已查、编辑弹层已查；glass 皮肤抽查裁剪——与本批其他页共享横切结论，理由：皮肤差异非本页重点）

## 1. 截图清单

| 状态                                 | light                                                                  | dark                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 默认 1280×800                        | `_tmp/visual-inspection-2026-09-23/r2-1d/gantt/default-light-1280.png` | `default-dark-1280.png` / `default-dark-1280-v2.png`                |
| 默认 ~800 宽                         | `default-light-800.png`                                                | `default-dark-800.png`                                              |
| hover（任务条）                      | `bar-hover-light-1280.png`                                             | —（hover 样式同源 token，dark 未单截）                              |
| focus-visible（任务条键盘焦点）      | —（ring 不可见，见 A2-01）                                             | —                                                                   |
| selected（行选中 + 端点手柄）        | `bar-selected-light-1280.png`                                          | dark 复检见 `default-dark-1280-v2.png`（Requirements 选中手柄可见） |
| 弹层打开（双击任务条 → 编辑 Dialog） | `editor-open-light-1280.png`                                           | `editor-open-dark-1280.png`                                         |
| 拖拽进行中（任务条 G3）              | `drag-mid-light-1280.png` / `drag-end-light-1280.png`                  | `drag-mid-dark-1280.png` / `drag-end-dark-1280.png`                 |
| loading/empty/error                  | n/a（本页无异步态；empty/loading 枚举见 gantt-states 卡）              | n/a                                                                 |

辅助取证：`dark-strip-clip.png` / `light-strip-clip.png`（时间轴刻度边框条带裁剪）。

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 **fail(A2-01)** A3 **warn(A3-01 族)** A4 pass（redo 禁用态可见） A5 n/a A6 **pass（拖拽全链路合格）** A7 pass（编辑弹层完整） A8 pass（键盘空格/方向键移动任务，use-gantt-keyboard） A9 pass（拖拽中左格 START 实时回显）
- B 颜色：B1 **fail(B1-01)** B2 pass B3 pass（关键路径红、里程碑黄语义正确） B4 **warn(B5-02 字面灰)** B5 **fail(B5-01 载体头 / B5-02 刻度)** B6 pass
- C 布局：C1 pass（scale 横向滚动为有意） C2 **warn(C2-01)** C3 pass C4 pass（800 宽网格 320px + 图表横滚，不塌） C5 pass C6 n/a
- D 间隔：D1 pass（行高 40 均一） D2 pass D3 pass D4 pass D5 n/a D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 pass E3 **warn(F4-01 中英混用)** E4 pass E5 pass E6 n/a
- F 一致性：F1 pass F2 n/a F3 pass F4 **warn(F4-01)**
- G 设计器（画布类）：G1 pass（选中行高亮 + 端点圆柄，双主题可辨） G2 pass（cursor-pointer） G3 **pass（ghost 虚线框 + 吸附参考线 + 日对齐）** G4 n/a G5 pass（−/+ 缩放后坐标跟随） G6 pass（undo 栈存在，句柄面） G7 n/a G8 **warn（见 B5-02，dark 刻度刺眼但可读）**
- H 弹层：H1 pass（编辑弹层 480px=sm 档） H2 n/a H3 pass（416px < 视口） H4 pass H5 pass（取消左/保存右、右对齐、primary 主位） H6 pass（label 顶对齐统一） H7 pass H8 n/a（内容不长） H9 pass（max-w calc(100%-2rem) 兜底）

## 3. 发现条目

### [R2-1d-B1-01] 项目汇总条标签白字浅底对比度不足

- **页面/路由**: `#/gantt`（gantt-perf-scale、gantt-states 同源组件复现面）
- **主题/视口/状态**: light + dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/gantt/default-light-1280.png`（Project Alpha/Project Beta 条）、`default-dark-1280-v2.png`
- **目视描述**: 项目汇总条（`.nop-gantt-bar-project`）为浅蓝底（light）+ 白色 10px 标签，字几乎看不见。
- **程序化证据**: 探针 `getComputedStyle`：bar bg = `color(srgb 0.955 0.971 0.997)`（近白）叠加进度层 primary/30%；txt = `rgb(255,255,255)`、`fontSize: 10px`。混合实底 ≈ #B2CEFA，对比度 **≈1.6:1（light）**；dark 下 projBg `color(srgb 0.484 0.512 0.556)` 对白字 **≈3.7:1**。均低于 WCAG 1.4.3 的 4.5:1（10px 小字）。
- **对照基准**: WCAG 1.4.3；styling-system.md B4 令牌口径（进度条 fill 已走 `--color-primary` 通道，文字色未随条底亮度切换）。
- **严重程度**: P1
- **用户影响**: 汇总条是项目层任务的唯一行内标识，light 下标签近乎不可读，用户只能靠左表格对照。
- **修复方向**: `gantt-bars.tsx` 项目条分支：按 fill 亮度切换文字色（如 `color-mix(in srgb, var(--color-primary) 60%, black)`）或加深汇总条 fill；标签字号 ≥11px。
- **归族**: systemic → R2-3 批（gantt 系列渲染器）
- **复核状态**: 未复核

### [R2-1d-B5-02] 时间轴刻度字面灰 `border-gray-200`/`text-gray-500` 不适配 dark

- **页面/路由**: `#/gantt`（全部 gantt 面：gantt-states / gantt-perf-scale 同源）
- **主题/视口/状态**: dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/gantt/dark-strip-clip.png`（刻度边框条带）
- **目视描述**: dark 下时间轴刻度单元格边框呈亮白/浅灰硬线，刻度文字灰暗。
- **程序化证据**: `gantt-timescale.tsx` L28：`className="flex-shrink-0 border-r border-gray-200 px-1 text-[10px] leading-6 text-gray-500 …"`；dark computed borderRightColor = `oklch(0.928 0.006 264.531)`（gray-200 字面），刻度字 `oklch(0.551 0.027 264.364)`（gray-500）对 dark 底 ≈4.1:1，10px 字号低于 4.5:1。
- **对照基准**: WCAG 1.4.3；styling-system.md B4「走令牌不走字面」；theme-compatibility.md dark 规约。
- **严重程度**: P2
- **用户影响**: dark 下时间轴是视觉最刺眼元素，刻度可读性压线；与 R2-4 已裁定的 dark 平价破损同族。
- **修复方向**: `gantt-timescale.tsx` L28 替换为 `border-border text-muted-foreground`（或其他 --nop-\* 令牌类）。
- **归族**: systemic → R2-4 批（dark 增量）
- **复核状态**: 未复核

### [R2-1d-A2-01] 任务条/里程碑键盘焦点环不可见

- **页面/路由**: `#/gantt`
- **主题/视口/状态**: light + dark / 1280 / Tab 遍历至任务条
- **截图**: [visual-only 辅助] `bar-hover-light-1280.png`（无焦点态截图，判定以 computed style 为准）
- **目视描述**: Tab 10 次后焦点落在任务条上，画面无任何可见焦点指示。
- **程序化证据**: 探针：Tab 遍历至 `.nop-gantt-bar-task`（`document.activeElement` 命中，元素有 `tabIndex=0`），computed `outline: none 1px`、`box-shadow: rgba(0,0,0,0) 0px…`（全透明）。元素类含 `focus:outline-none focus:ring-2 focus:ring-ring`，但 ring 未生效（ring 通道未输出非透明阴影）。程序化判定成立。
- **对照基准**: WCAG 2.4.7；R2-1b-A2-01（flow 画布节点无焦点环，watch-pool）同族。
- **严重程度**: P2
- **用户影响**: 键盘用户无法辨认当前选中/可操作任务条（gantt 声明了完整键盘操作面，焦点不可见直接阻断该能力）。
- **修复方向**: 排查 `focus:ring-ring` 在该元素上未输出的原因（Tailwind ring 变量链或类名生成），或补 `focus-visible:outline-2 outline-primary`；里程碑 12px 菱形同步。
- **归族**: systemic → R2-3 候选（与 R2-1b-A2-01 并族）
- **复核状态**: 未复核

### [R2-1d-A3-01] 里程碑/折叠/连线小目标（族实例确认）

- **页面/路由**: `#/gantt`
- **主题/视口/状态**: 双主题 / 1280 / 默认
- **截图**: `default-light-1280.png`
- **目视描述**: 里程碑菱形 12×12、任务条连线手柄 8×8（hover 才出现）、左格折叠箭头 16×16。
- **程序化证据**: TARGET_SNIPPET：`short: 12`（milestone div）、`short: 16`（chevron button）、`short: 20`（polyline 命中区）。<24px 实例坐实。
- **对照基准**: WCAG 2.5.8；R2-1a-A3-01/02/03/05/06 族（watch-pool）。
- **严重程度**: P3
- **用户影响**: 触屏/精确指针困难用户命中难；连线手柄 hover 才出现（可供性弱）。
- **修复方向**: 并入 A3 触控目标契约族统一处理（命中区扩大至 ≥24，视觉不变）。
- **归族**: watch-only → 台账（A3 族并入）
- **复核状态**: 未复核

### [R2-1d-F4-01] 页面 chrome 中英混用（族实例）

- **页面/路由**: `#/gantt`
- **主题/视口/状态**: 双主题 / 1280
- **截图**: `default-light-1280.png`
- **目视描述**: 工具栏「适应/今日」、图例「关键路径」为中文，列头 Task Name/Start/End 为 demo schema 英文。
- **程序化证据**: DOM 文案抽样（toolbar textContent=「适应今日」、th=Task Name…）。渲染器 i18n 默认 zh，schema 作者写 EN。
- **对照基准**: F4 术语一致；R2-1b-F4-03（taskflow 中英混用，watch-pool）同族。
- **严重程度**: P3
- **用户影响**: 轻微割裂感，不影响任务。
- **修复方向**: 族级处理：demo schema 统一语言或渲染器 locale 跟随宿主。
- **归族**: watch-only → 台账（F4 族）
- **复核状态**: 未复核

**跨页引用（本页确认，详见主卡）**: 载体 `bg-white` 头部 dark 不可见 → 见 kanban 卡 R2-1d-B5-01（本页 `default-dark-1280.png` 顶部白带同证）；「缺 0」调试 chip 压头部/工具栏 → 已知 chip 遮挡族（R2-1c-C2-01），不另立项。**A7/H 弹层正例**：双击任务条编辑弹层（480px sm 档、取消/保存右对齐、焦点落输入框）双主题结构完好；dark 弹层亮底 = 宿主 --popover 已知，不重复立项。**G3 拖拽正例**：ghost 虚线框（原位）+ 拖拽参考线 + 左格 START 实时回显 + 日格吸附，双主题通过（`drag-mid-*.png`）。

## 4. 台账回写

- 本卡完成后：ledger.md `gantt` 行 status → `carded`（card 列填本路径）；findings 归族后 → `digested`。
