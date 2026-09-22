# [card] page:cal-booking

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/cal-booking` ｜ **载体**: complex-page（外部应用复刻 · Cal.com Booker）
- **矩阵裁剪**: full（glass 皮肤未抽查，本波口径为 classic；拖拽/异步 loading 本页无）

## 1. 截图清单

| 状态                      | light                                                                                         | dark                                        |
| ------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 默认 1280×800             | `_tmp/visual-inspection-2026-09-23/r2-1a/cal-booking/cal-booking-default-1280x800-light.png`  | `.../cal-booking-default-1280x800-dark.png` |
| 默认 800×900              | `.../cal-booking-default-800x900-light.png`                                                   | `.../cal-booking-default-800x900-dark.png`  |
| slot hover（真实鼠标）    | `.../cal-booking-slot-hover-1280x800-light.png`                                               | —（同探针值复用 light）                     |
| focus-visible（Tab 3 次） | `.../cal-booking-focus-visible-1280x800-light.png`                                            | —                                           |
| 时长 tab 45 分钟          | `.../cal-booking-tab-45min-1280x800-light.png`                                                | —                                           |
| 12h 切换                  | `.../cal-booking-12h-toggle-1280x800-light.png`                                               | —                                           |
| 周视图 / 日视图           | `.../cal-booking-week-view-1280x800-light.png` / `...cal-booking-day-view-1280x800-light.png` | —                                           |
| 窄视口复验                | （复用默认 800 light）                                                                        | `.../cal-booking-narrow-800x900-dark.png`   |

探针脚本：`_tmp/r2-1a-probes/cal-booking-interact.mjs`（phase1: `phase1-defaults.mjs`）。

## 2. A–H 勾选

- A 交互：A1 ✓ A2 ✓ A3 warn(A3-01) A4 n/a A5 n/a（骨架为静态样本）A6 n/a A7 n/a（无弹层）A8 n/a A9 fail(A9-01)
- B 颜色：B1 fail(B1-02) B2 ✓ B3 ✓ B4 ✓ B5 fail(B5-01) B6 ✓
- C 布局：C1 ✓（时区 select 容器 sw205/cw201 4px 溢出，overflow visible 无裁切，列误报排除）C2 ✓ C3 ✓ C4 fail(C4-01) C5 ✓ C6 n/a
- D 间隔：D1 ✓（16×25/8×4/4×2/12×1 全在栅格）D2 ✓ D3 n/a D4 ✓ D5 ✓ D6 n/a D7 ✓（<4px 命中均为 playground 侧栏 chrome 与日历头部/滚动区贴边解剖，白名单）D8 ✓
- E 排布：E1 ✓ E2 ✓ E3 ✓ E4 ✓ E5 ✓ E6 ✓
- F 一致性：✓（replica 豁免；B3/A2/B5 横切已查）
- G 设计器：n/a
- H 弹层：n/a（时区为原生 select，无 Dialog/Sheet）

## 3. 发现条目

### [R2-1a-A9-01] 视图切换器选中态交互后不可读

- **页面/路由**: `#/complex-pages/cal-booking` 月/周/日分段控件
- **主题/视口/状态**: light / 1280×800 / 点击 周→月→日 后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/cal-booking/cal-booking-day-view-1280x800-light.png`（日视图，"日"钮白字几乎不可见）
- **目视描述**: 首载时选中"月"为蓝底白字清晰；任意点击切换视图后，选中项变成浅灰底+白字，标签几乎消失。
- **程序化证据**:
  - 探针: 遍历分段按钮读 `getComputedStyle` 的 bg/color（fresh → click 周 → click 月 → click 日 各读一次）
  - 输出: fresh = `bg oklab(0.571 -0.036 -0.209/0.85), color #fff`；click 后选中项 = `bg rgb(241,245,249), color rgb(255,255,255)` → 对比度 ≈1.06:1（WCAG 1.4.3 需 4.5:1）
- **对照基准**: WCAG 1.4.3 文本对比度；A9 交互反馈可见性
- **严重程度**: P2（视图切换为页面主控件，切换后状态感知丢失）
- **用户影响**: 用户切换周/日视图后无法从控件上分辨当前视图，只能靠日历形态猜测。
- **修复方向**: 复刻页分段控件选中样式统一复用首载的蓝色选中档（`oklab` 主色 pill），或选中文字改深色；删除"点击后选中=gray-100+白字"的样式分支。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-B5-01] dark 下卡面钉白与 dark 令牌泄漏混搭

- **页面/路由**: `#/complex-pages/cal-booking`
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/cal-booking/cal-booking-default-1280x800-dark.png`
- **目视描述**: 整卡保持白底（内容可读），但"可预约"可用性条周末格变成深藏青色斑马纹，与亮底冲突。
- **程序化证据**:
  - 探针: `document.documentElement[data-mode=dark]` 下读 `.nop-page.cal-root` bg 与周末格（`aria-label*="weekend"`）bg；对照 light
  - 输出: root tokens 已是 dark（`--background: 222 84% 5%`），`.cal-root` bg = `rgb(255,255,255)`（硬钉白）；周末格 light `rgb(241,245,249)` → dark `rgb(31,42,61)`（dark 变体在亮底上生效）
- **对照基准**: B5 dark 平价（dark 专有缺陷单独登记）；replica 风格豁免不适用于横切 B5
- **严重程度**: P2（无信息丢失但视觉呈现"破损感"；同根因波及 cal-confirm 更重）
- **用户影响**: dark 用户看到白卡上突兀的黑条，感知为渲染错误。
- **修复方向**: `.cal-root` 钉白时，内部所有 `dark:` 变体与语义令牌应一并钉 light（如根上加 `data-theme` 作用域隔离或移除内部 `dark:` 类）；或补全整卡 dark 适配。
- **归族**: systemic → R2-3 批（cal-confirm / cal-success 同根因，见各卡）
- **复核状态**: 未复核

### [R2-1a-C4-01] 800px 视口双栏不收缩，右栏被裁切且无滚动

- **页面/路由**: `#/complex-pages/cal-booking`
- **主题/视口/状态**: light、dark / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/cal-booking/cal-booking-default-800x900-light.png`、`...-narrow-800x900-dark.png`
- **目视描述**: 右侧"选中日槽位"栏被裁出卡外，仅剩残影；无横向滚动条。
- **程序化证据**:
  - 探针: 800px 下统计 `.cal-root` 内 `getBoundingClientRect().right > innerWidth+1` 的元素；读 `document.documentElement.scrollWidth`
  - 输出: 62 个元素越界（`.nop-container.max-w-5xl` right=1100 vs innerWidth=800）；`scrollWidth=800=clientWidth`（overflow 被 hidden 吞掉，无滚动逃生口）
- **对照基准**: C4 视口弹性（~800 不塌不挤、表格滚动合理）；状态矩阵必查窄视口
- **严重程度**: P2
- **用户影响**: 窄窗口用户完全看不到可预约槽位区，预约任务被阻断。
- **修复方向**: `.cal-root` 双栏 grid 在 `<1024px` 断点改单列堆叠（右栏换行到下方）；至少给根容器 `overflow-x:auto` 兜底。
- **归族**: systemic → R2-3 批（本波 5 个复刻页同根因：cal-confirm 594/480、notion 596/480、airtable 586/480、stripe 733/480）
- **复核状态**: 未复核

### [R2-1a-B1-02] dark 下 showcase 头部特性 chips 文本不可读

- **页面/路由**: 全部 complex-pages 共用头部（本页复现）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `.../r2-1a/cal-booking/cal-booking-default-1280x800-dark.png`（顶部 5 枚淡紫空 pill）
- **目视描述**: light 下 chips 有深色文字；dark 下变成无字淡紫胶囊。
- **程序化证据**:
  - 探针: dark 下定位"复刻样式/月历/时长 tabs"chip，读 color/bg
  - 输出: `color rgb(178,206,251)` on `bg rgb(203,186,252)` → 对比度 ≈1.10:1
- **对照基准**: WCAG 1.4.3；B1
- **严重程度**: P2（次级 chrome 但完全不可读；跨全部 complex-pages → 系统性）
- **用户影响**: dark 用户看不到页面特性标签。
- **修复方向**: showcase chips 的 `dark:` 文本色改深色（或 chips 底色改 dark 档）；属 playground showcase chrome 一处修复全局生效。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-A3-01] 可用性条日期格与开关目标 <24px

- **页面/路由**: `#/complex-pages/cal-booking`
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `.../cal-booking-default-1280x800-light.png`
- **目视描述**: "可预约"条日期列极窄；24 小时制开关矮小。
- **程序化证据**:
  - 探针: 遍历可交互元素 `getBoundingClientRect()` 取短边
  - 输出: 日期格 `13.8×47`（aria-label "Tuesday, September 1, 2026"）；`nop-switch 32×18.4`
- **对照基准**: WCAG 2.5.8 最小 24×24
- **严重程度**: P3（日期格密度为 Cal.com 对标形态，属受限场景）
- **用户影响**: 触屏/粗指针用户误触率高。
- **修复方向**: 日期格保持视觉窄列但扩大热区（`::after` 铺满列高宽 ≥24px 或 padding 扩展）；开关外套 24px 高热区。
- **归族**: watch-only → 台账（与其他页 A3 命中合并观察）
- **复核状态**: 未复核

## 4. 误报排除记录

- phase1 dark 截图中"日"钮蓝色描边：a2Focus 探针残留焦点，已改探针 blur 后复验，非页面缺陷。
- C1 命中 `sr-only`（"正在查看month视图…"）：屏幕阅读器专用元素，误报。
- D7 <4px 命中均为 playground 侧栏（`w-[240px]` nav）与 `nop-calendar` 头部/滚动区贴边：日历解剖性贴边 + 宿主 chrome，白名单。
- 45 分钟切换后标题仍为"30 分钟"：watch-only（复刻 schema 静态文案，非样式缺陷）。
- 点击可用性条其他日期无反馈：watch-only（疑似静态选中样本 Sep 3）。

## 5. 台账回写提示

ledger.md 本行 status → `carded`；C4-01/B5-01/B1-02 归族 R2-3 后 `digested`。
