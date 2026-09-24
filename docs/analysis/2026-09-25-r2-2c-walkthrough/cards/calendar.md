# [card] control:calendar

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/calendar` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：C9 host-cal-load——calendar 位于 openDialog surface 内，loadAction 挂载触发 + onEventClick dispatch probe；2 事件 × 2 资源 Team A/B）。注意：scheduling-calendar demo **页面**已在 R2-1d 走查（`docs/analysis/2026-09-23-r2-1d-walkthrough/cards/scheduling-calendar.md`）；本卡为 **lab 载体控件面**首查，独立台账单元
- **矩阵裁剪**: full（任务口径 FULL 项全做：视图切换 月/周/日、当前态/选中态、拖拽创建 mid + 类型选择弹层（light+dark）、事件点击、dark 全套（真 data-mode）、~800 窄视口、A6/A8 专项；裁掉并注明：①事件**编辑**弹层——本 fixture onEventClick 为 dispatch-only 契约，无编辑 UI（R2-1d demo 页同口径）；②既有事件拖拽**移动**确认弹层（confirmMove）未捕获——月视图事件块仅 12px 宽、周视图 2px 高，拖拽既有事件在载体上不可操作（该不可操作性本身已立案 R2-2c-A3-84），确认弹层面由 `calendar-confirm-dialog` 单测与类型选择弹层（同为 CalendarOverlay surface）旁证；③glass 皮肤（波次统一））
- **探针**: `_tmp/r2-2c-probes/w3-calendar.mjs`、`w3-calendar2.mjs`、`w3-calendar3.mjs` → `out-w3-calendar*.json`；像素采样 `_tmp/r2-2c-probes/w3-pixels.mjs`（calendar 段）→ `out-w3-pixels-calendar.json`

## 1. 截图清单

| 状态                                     | light                                                                  | dark（真 data-mode）                     |
| ---------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| 月视图默认 1280×800（弹层内）            | `…/calendar/month-default-1280-light.png`                              | `…/calendar/month-dark-1280.png`         |
| 周视图（视图切换）                       | `…/calendar/week-view-1280-light.png` / `week-scrolled-1280-light.png` | `…/calendar/week-dark-1280.png`          |
| 日视图（视图切换，真点击「日」）         | `…/calendar/day-view-real-click-1280-light.png`                        | —                                        |
| 事件点击后（probe dispatch，无视觉反馈） | `…/calendar/event-clicked-1280-light.png`                              | —                                        |
| 拖拽创建 mid（长按拖拽中）               | `…/calendar/dragcreate-mid-1280-light.png`                             | —                                        |
| 拖拽创建 → 班次类型选择弹层              | —                                                                      | `…/calendar/type-selector-dark-1280.png` |
| 弹层关后                                 | `…/calendar/after-dragcreate-1280-light.png`                           | —                                        |
| 月视图 ~800 宽                           | `…/calendar/month-800-light.png`                                       | —                                        |
| 周视图 ~800 宽                           | `…/calendar/week-800-light.png`                                        | —                                        |

（`…` = `_tmp/visual-inspection-2026-09-25/r2-2c`）

## 2. A–H 维度勾选表

- A 交互：A1 n/a（事件块为色块面，hover 无独立态——demo 页同口径） A2 pass（事件块 role=button tabIndex=0，focus UA outline `rgb(0,95,204)` 1px 可见（弱但在，demo 卡口径）） **A3 fail(R2-2c-A3-84：周视图事件块 61×2px 不可点目标)** A4 n/a A5 pass（空日/空列有栅格与表头结构，无空白页） **A6 pass（拖拽创建链路：长按拖拽 → 类型选择弹层（含「取消」）→ 选择后建卡；mid 帧见 dragcreate-mid）** A7 pass（类型选择弹层有关闭钮（取消）、遮罩点击/Esc 可关、焦点困于 overlay（useFocusTrap）） **A8 warn（键盘创建/移动路径在载体上不可达：`[data-slot="calendar-cell"]` 全部无 tabindex、`kbCellFocus:null`——单元测试 `calendar-keyboard-move/-drag-confirm` 覆盖键盘路径，但载体面事件块外无键盘入口；[needs-confirm] 挂 watch 复核）** A9 pass（事件点击 → probe `ce1|Morning shift` 正确解析（A9 数据面正确）；无视觉反馈为 dispatch-only 契约，demo 卡同口径不另立）
- B 颜色：B1 **warn（家族引用：事件白字于绿/琥珀底 light 2.45–2.59:1 / dark 1.75–1.94:1——R2-1d 事件字 2.13:1 同族（R2-4 dark 平价族），新 dark 数值见 §4）** B2 pass B3 pass（shift 绿 / maintenance 琥珀语义稳定、dark 档提亮 `rgb(38,217,157)`/`rgb(237,175,69)`） B4 pass B5 **warn（家族引用：dark 下弹层面不翻转（宿主 `--popover` 亮底族）+ 控件内周末格翻成深藏青 → 混合态，见 §4 集中引用）** B6 pass（选中格 `primary/10%` 底、今日格高亮走令牌）
- C 布局：C1 pass（docOverX=0；周视图纵向滚动在 dialog-body 内，H8 口径） C2 pass（未发现意外重叠） C3 pass（弹层内五区：导航/视图切换/资源列/网格/滚动条可辨） **C4 fail(R2-2c-C4-83：月视图 30 日列压至 ~12px 宽，事件标题不可读)** C5 pass（弹层纵向滚动无双滚动条） C6 n/a
- D 间隔：D1 pass（列头/资源行间距均一） D2–D8 pass/n-a
- E 排布：E1 pass（「正在查看day视图，2026-09-24，2 个事件」状态行可答三问） E2 pass（视图切换当前档 default variant、其余 ghost） E3 pass E4 pass（资源列/网格左缘对齐） E5 pass E6 n/a
- F 一致性：F4 **warn(R2-2c-F4-85：事件渲染 `shiftMorning shift` 类型键与标题无分隔拼接)** + **warn（家族引用：weekday 头 EN（Mon/Tue）+ chrome zh（今日/月/周/日/正在查看\*视图）混排——R2-2a-F4-11 zh-CN 回退族 + R2-1d-F4-01 族实例）** F1/F3 pass
- G 设计器：n/a
- H 弹层：H1 pass（Calendar host 弹层 560px 落 plan490 阶梯 md 档，800 视口不溢出） H2 n/a H3 pass（周视图内容 1242px 高时滚动发生在 `[data-slot="dialog-body"]`（sh1306/ch738），弹层壳不超视口） H4 pass（标题/关闭钮无重叠） H5 n/a（类型选择弹层为按钮组无 footer 语义；「取消」 ghost 位次正确） H6 n/a H7 pass（overlay 面板 padding 均一） H8 pass（长内容滚动在 body 区、header 固定） H9 pass（800 宽弹层 560 不溢出、按钮组不折行）

## 3. 发现条目

### [R2-2c-C4-83] 月视图在 ~480px 载体内把整月 30 日列压成 ~12px：事件块塌缩为 12×43px 竖条，标题全部不可读

- **页面/路由**: `#/lab/calendar`（C9 host-cal-load；一切宽度受限容器内的资源型月视图同险——弹层宿主、窄分栏、移动端）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 弹层开 · 月视图默认
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/calendar/month-default-1280-light.png`、`month-dark-1280.png`、`month-800-light.png`
- **目视描述**: 月视图在弹层内只剩 480px 可用宽，仍按整月 30 列渲染：每格 ~12–13px 宽、表头星期挤成单字，两条事件压成 12px 宽竖色条（绿/琥珀），标题「Morning shift」「Maintenance」完全不可读，仅隐约见一个字母。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-calendar.mjs`（monthDefault）、`w3-calendar2.mjs`（narrowGeom）
  - 输出: `calRect {w:480, h:170}`、`cellCount:60`（30 日 × 2 资源）、事件块 `rect {w:12, h:43}`、事件文本 `"shiftMorning shift"`；~800 视口下同样 `cal {w:480}`、事件 `w:12`——**列数不随容器宽度降级（无最少可读宽约束/无横向滚动兜底），直接等比压扁**；`overflowLight.docOverX=0`（无滚动可救）。
- **对照基准**: 检查提示词 C4（视口弹性：~800 与受限容器下不塌不挤）、C1（无意外溢出——本例是「不溢出但塌缩」的镜像缺陷）；NN/g 数据密集面最小可读档位惯例
- **严重程度**: P1（默认打开弹层即此状态：月视图核心信息「哪天有什么班」不可读，事件不可点（12px 宽 < 24px 目标下限））
- **用户影响**: 在弹层宿主（本 fixture 即集成测试宿主形态）中月视图不可用；用户只能切周/日视图补救，无任何塌缩提示。
- **修复方向**: `calendar-month-view.tsx` 为日列设最小可读宽（如 `minmax(96px, 1fr)` 或 CSS `min-width`），容器不足时切换为横向滚动（同 gantt timeline 模式）或提示「容器过窄，请使用周/日视图」；事件块设 min-width 并以省略号截断。回归用例：480px 容器内事件块宽度 ≥ 64px 或出现滚动。
- **归族**: systemic → R2-3 批（与「窄视口 flex/固定壳层族」同域但机制独立：月视图网格缺最小列宽契约，修复面在 calendar 月视图一处，可收弹层/窄栏全体载体）
- **复核状态**: 已复核（保留 P1，review-a 2026-09-25）

### [R2-2c-A3-84] 周视图零时长事件渲染为 61×2px：视觉不可见、命中目标 2px，事件在周视图不可操作

- **页面/路由**: `#/lab/calendar`（C9 host-cal-load；`start==end`（无时刻）的事件在周/日视图全险——跨天班次/全天事件常见形态）
- **主题/视口/状态**: light / 1280 / 弹层开 · 周视图（滚动至事件时刻）
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/calendar/week-scrolled-1280-light.png`（截图中部橙线即 2px 事件块现场）
- **目视描述**: 滚动到事件时段后，事件块是一条 61px 宽、**2px 高**的细线，白字完全不可见，肉眼几乎无法发现、无法点击。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-calendar2.mjs`（weekEventsAfterScroll）、`w3-calendar.mjs`（smallTargetsDark）
  - 输出: 事件块 `{w:61, h:2}` ×2；`smallTargetsDark` 命中 `[data-slot="calendar-event"] 60.9×2`；fixture 事件为 `start==end`（同日无时刻），渲染层按「时长≈0」计算高度且无 min-height/全天通道兜底。
- **对照基准**: WCAG 2.5.8（可点击目标 ≥24×24）；检查提示词 A3/A5（目标尺寸、信息可感知）；Google Calendar 对零时刻事件走「全天」行的行业惯例
- **严重程度**: P1（事件在周视图既看不见也点不到——onEventClick 契约在此形态下物理不可达；该事件形态（无时刻）是排班域常见输入）
- **用户影响**: 用户在周视图找不到班次（2px 细线），更无法点击触发详情/打卡动作；日视图同源代码同险。
- **修复方向**: `calendar-week-view.tsx`/`calendar-day-view.tsx` 对 `end<=start` 的事件给 min-height（如 ≥20px）或路由到 all-day 行渲染；零/负时长事件给一次 schema 校验警告（与「schema 动态响应性缺口族」观察相邻）。回归用例：`start==end` 事件在周视图高度 ≥20px 且可点击。
- **归族**: systemic → R2-3 批（周/日视图事件高度契约单点，一处修复收 week/day 两视图与全部宿主）
- **复核状态**: 已复核（保留 P1，表述修正，review-a 2026-09-25）："命中不可达"修正为"目标 2px 不可用"——center hitTest 实际可达，缺陷在可视尺寸与可操作性

### [R2-2c-F4-85] 事件文本渲染为「类型键+标题」无分隔拼接（`shiftMorning shift`），同页 zh/EN 混排

- **页面/路由**: `#/lab/calendar`（C9 host-cal-load；任意带 type 的事件）
- **主题/视口/状态**: light + dark / 1280 / 月视图（周视图 bodyText 同）
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/calendar/month-default-1280-light.png`（事件块文本）、`day-view-real-click-1280-light.png`（状态行「正在查看day视图」）
- **目视描述**: 事件 DOM 文本为 `shiftMorning shift`——type 原始键与标题直接连接；状态行「正在查看day视图」中英混排；月视图表头星期为 EN（Mon/Tue…）而导航按钮为 zh（今日/月/周/日）。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-calendar.mjs` → 实际落盘 `out-w3-calendar.json` `events[0].text: "shiftMorning shift"`；`w3-calendar3.mjs afterDayClick.bodyText: "正在查看day视图，2026-09-24…"`
  - 输出: 事件块未按 type 标签映射（fixture `shiftTypes` 注册的中文标签「早班」等仅在类型选择弹层使用，事件块本体裸拼 type 键）。
- **对照基准**: 检查提示词 F4（术语与文案一致）；R2-2a-F4-11 zh-CN 回退族（混排部分）
- **严重程度**: P3（可读性噪声与文案不一致，不影响任务完成；12px 塌缩（C4-83）解决后此问题会更显性）
- **用户影响**: 用户读到无法分词的拼接文本；同一概念（视图/星期）在中英文间跳动。
- **修复方向**: `calendar-event-block.tsx` 渲染文本改为 `typeLabel ? typeLabel + ' · ' + title : title`（typeLabel 走 shiftTypes 映射）；「正在查看{view}视图」i18n 模板对 view 值做翻译映射（month/week/day → 月/周/日）。
- **归族**: local → R2-4 批（文案/映射单点）；混排部分挂 R2-2a-F4-11 族（宿主 initFluxI18n 收编）
- **复核状态**: 已复核（保留 P3，review-a 2026-09-25）

## 4. 已知族命中（引用，不另立项）

- **弹层 dark 亮底（宿主级 `--popover` 族 + R2-4 dark 平价族）— 本卡集中证据，不另立项**：dark 下 Calendar host 弹层壳保持亮底（`month-dark-1280.png`），而控件内部周末/非当月格用已翻转为深藏青的 `--color-*` 令牌 → **白壳上深藏青竖条的混合态**（像素采样：周末格 `rgb(31,42,61)` vs 相邻容器 `rgb(222,222,224)`，ΔL 13.83:1，`w3-pixels.mjs calDarkWeekendCell/calDarkContainerBg`）。根因 = playground `:root` 语义令牌（`--popover: 30 20% 98%` 等）在 dark 块不翻转（`apps/playground/src/styles.css`），控件自身令牌一半走 theme-tokens dark（翻转）、一半走宿主 surface（不翻）→ 混合态比全亮更刺眼。宿主令牌包修复后需回查本卡 B5/H。
- **R2-1d 事件字对比度族（2.13:1 先例，R2-4 dark 平价族）— 新 dark 数值**：白字/绿底 dark `rgb(38,217,157)` = **1.83:1**（DOM）/1.75（像素）、白字/琥珀底 dark `rgb(237,175,69)` = **1.94:1**；light 2.59/2.15（DOM 核心值）。类型选择弹层同色按钮组（早班/休假/预约/维保 168×32）同族：白/琥珀 1.94:1、白/绿 1.83:1（休假红 4.93:1 达标）。
- **R2-2a-F4-11 zh-CN 回退族 / R2-1d-F4-01 中英混用族**：状态行「正在查看day视图，2026-09-24，2 个事件今日」、月表头 EN + 按钮 zh——宿主 initFluxI18n 缺失同根因。
- **A3 小目标族（R2-1a-A3-01 族）**：视图切换钮 38×28、导航钮 38×28 达标（`smallTargetsLight` 除事件块外 0 命中）；事件块 12px/2px 已立案（R2-2c-C4-83/A3-84），不重复计族。
- 误报排除：①「日视图切换失效」为**探针自身 bug**——`button:has-text("日")`/`/日|day/` 先命中「今日」钮，精确匹配后 day 切换正常（`w3-calendar3.mjs afterDayClick: 日 pressed=true、正在查看day视图`）——首版探针结论作废，勿立此 finding；②事件点击无视觉反馈 = onEventClick dispatch-only 契约（probe 值 `ce1|Morning shift` 正确），demo 卡同口径；③周视图初始视口看不到事件 = 事件落在 08:00 前时刻格 + 弹层纵向滚动为有意（H8 通过），滚动后可达。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `calendar`（control/R2-2c）→ carded（card 列填本路径）；C4-83/A3-84 归族 R2-3、F4-85 归族 R2-4 后 → digested。
