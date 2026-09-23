# [card] page:scheduling-calendar

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/scheduling-calendar` ｜ **载体**: domain demo 页（`apps/playground/src/pages/calendar-demo.tsx` + `flux-renderers-scheduling/src/calendar/`）
- **矩阵裁剪**: full（事件点击/拖拽/视图切换/窄视口全查；A7 弹层：demo 主路径无模态面，键盘移动确认弹层未能以简单按键序列触发，标注为裁剪——组件单测已覆盖 calendar-confirm-dialog，理由记入 trims）

## 1. 截图清单

| 状态                           | light                                                                                | dark                          |
| ------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------- |
| 默认 1280×800（月视图）        | `_tmp/visual-inspection-2026-09-23/r2-1d/scheduling-calendar/default-light-1280.png` | `default-dark-1280.png`       |
| 默认 ~800 宽                   | `default-light-800.png`                                                              | `default-dark-800.png`        |
| hover（事件块 brightness 1.1） | —（computed filter 程序化判定）                                                      | —                             |
| focus（事件块 tabIndex=0）     | —                                                                                    | —                             |
| 视图切换（周/日）              | `view-week-light-1280.png` / `view-day-light-1280.png`                               | —                             |
| 弹层打开                       | n/a（见 trims）                                                                      | n/a                           |
| 拖拽进行中（事件跨格拖动）     | `eventdrag-mid-light-1280.png`                                                       | `eventdrag-mid-dark-1280.png` |
| loading/empty/error            | n/a（demo 静态数据即渲染）                                                           | n/a                           |

辅助：`dark-header-strip.png`（B5-01 全宽证据）、`event-click-toast-light-1280.png`（点击后无 toast，见 A9 注）。

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover brightness(1.1)，弱但可感） A2 pass A3 **warn（18.6px 宽 split 事件块命中区；76 钮中 38×28 为主，split 块并入族注）** A4 n/a A5 n/a A6 **pass（拖拽 ghost `nop-calendar-drag-ghost` + 目标格高亮描边，见 A6 注）** A7 warn（无模态，trim 说明） A8 pass（键盘移动面存在：calendar-keyboard-move/drag-confirm 单测，demo 未触发） A9 **warn（点击/拖放后无可见反馈，toast 未挂载——demo 接线问题）**
- B 颜色：B1 **fail(B1-02)** B2 pass B3 **pass（四类型语义色与页头图例一致且跨主题稳定）** B4 pass（`[data-event-type]` → success/destructive/primary/warning 令牌映射，calendar.css） B5 **fail(B5-01 载体头部)；事件底色 dark 自适配（红 `rgb(217,38,38)`）但白字问题加深（并入 B1-02）** B6 pass
- C 布局：C1 pass（事件块 truncate 为有意；800 宽格内截断合规） C2 pass（overlap 徽标不压相邻块） C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass（行高/格距均匀） D4 pass D5–D8 n/a/pass
- E 排布：E1 pass（图例+今日+视图三问可答） E2 pass E3 pass E4 pass（网格对齐） E5 pass E6 n/a
- F 一致性：F1 pass F4 **warn(F4-01：星期头 Mon/Tue EN vs 控件 月/周/日/今日 zh——渲染器 i18n locale 未贯通到星期名)** F3 pass
- G 设计器：G1–G8 n/a（资源月网格非画布；拖拽反馈按 A6 记）
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-B1-02] 事件块白字 12px 在 success/warning 底上对比度不足（双主题）

- **页面/路由**: `#/scheduling-calendar`（calendar-perf-scale 同源复现）
- **主题/视口/状态**: light + dark / 1280 / 月视图默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/scheduling-calendar/default-light-1280.png`（绿色早班/琥珀维保块）、`default-dark-1280.png`
- **目视描述**: 白字压在绿/琥珀底的事件块上几乎读不出（巡检/系统维护/早班等）。
- **程序化证据**: 探针 `getComputedStyle` + WCAG 对比度：light — shift `rgb(16,183,127)` 白字 **2.59:1**、maintenance `rgb(245,159,10)` 白字 **2.13:1**、leave `rgb(239,67,67)` 白字 3.78:1、appointment 4.6:1；dark — shift `rgb(38,217,157)` **1.83:1**、maintenance `rgb(237,175,69)` **1.94:1**、appointment `rgb(77,141,245)` 3.26:1、leave 4.93:1。四处类型三处不达 4.5:1（12px）。
- **对照基准**: WCAG 1.4.3；calendar.css `[data-event-type]` 令牌映射 + 组件固定白字（`calendar-event-block.tsx` 无随底色换字逻辑）。
- **严重程度**: P1
- **用户影响**: 排班场景 4 类事件中 2 类（班次/维保）在两主题下标题均不可读；高频数据面。
- **修复方向**: `calendar-event-block.tsx`/calendar.css：success/warning 底换深字（`color-mix(... 60%, black)`）或改「浅底+类型色文字」模式；dark 同规则复算。
- **归族**: systemic → R2-3 批（calendar 系列）
- **复核状态**: 未复核

**正例与族注（记录）**: A6 拖拽正例——`eventdrag-mid-light-1280.png` 中拖拽块半透明 + 目标日期格高亮描边，跨日格移动流畅；split 并发事件（29/59）37px 宽显示类别前缀 + title 提示 + 红点冲突徽标，符合 Google Calendar 式并发收窄惯例（P3 观察不立项）。A9 注——demo `env.notify` 仅 console.log 且未挂载 Toaster，`onEventClick/onEventChange` 的 toast action 无可见出口（点击/拖放静默），属 demo 接线缺省，随 B5-01 载体整改一并补 Toaster（不单独立项，P3 watch）。**跨页引用**: 载体 `bg-white` 头部 → R2-1d-B5-01（kanban 卡，本页 dark-header-strip.png 为全宽决定性证据）；中英混用星期头 → R2-1d-F4-01 族（本页为渲染器侧实例：星期名未走 i18n locale）。

## 4. 台账回写

- 本卡完成后：ledger.md `scheduling-calendar` 行 status → `carded`；findings 归族后 → `digested`。

### trims

- A7 弹层：demo 主路径无 Dialog/Sheet/Popover（事件点击=toast action）；键盘移动确认弹层（calendar-confirm-dialog）以聚焦事件块+方向键未能触发（触发序列更特殊），组件单测覆盖存在 → 本页 H 维度按 n/a 处理，实际弹层面留待 R2-2 控件卡。
