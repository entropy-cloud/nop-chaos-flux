# [card] page:w4b-process-display

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w4b-process-display` ｜ **载体**: domain demo 页（`apps/playground/src/pages/w4b-process-display-family-demo.tsx` + `flux-renderers-layout/src/{steps,timeline}-renderer.tsx`）
- **矩阵裁剪**: simplified（控件 demo 页；执行 light+dark × 1280/800、元素态抽样（steps/timeline 可点击项 aria/current、Tab 焦点）、中间态必查：steps 三种 valueOwnership 点击、timeline scope/controlled 点击 seek、unmatched 降级；裁掉：glass 皮肤、键盘 Enter/Space 触发路径（renderer 有 onKeyDown，抽查点击路径即可）、横向 timeline orientation 变体（demo schema 未含，属组件单测覆盖））

## 1. 截图清单

| 状态                            | light                                                                                | dark                      |
| ------------------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| 默认 1280×800                   | `_tmp/visual-inspection-2026-09-23/r2-1d/w4b-process-display/default-light-1280.png` | `default-dark-1280.png`   |
| 默认 ~800 宽                    | `default-light-800.png`                                                              | `default-dark-800.png`    |
| steps vertical 点击 Step B 后   | `steps-vertical-click-b-light-1280.png`                                              | —                         |
| timeline 区（scope 点击 t3 后） | `timeline-scope-click-t3-light-1280.png`                                             | —                         |
| timelines 区滚动态              | `timelines-light-1280.png`                                                           | `timelines-dark-1280.png` |
| hover/active                    | —（cursor:pointer/aria-current 程序化判定）                                          | —                         |

## 2. A–H 维度勾选表

- A 交互：A1 pass（可点 timeline 项 cursor:pointer） A2 pass（interactive 项 `focus-visible:outline-2 outline-ring` 源码契约 + 按钮 focus 环） A3 pass（steps 指示钮整行为热区、timeline 项 60px 高） A4 n/a A5 n/a A6 n/a A7 n/a A8 pass（点击 seek 均有键盘等价：tabIndex+Enter/Space） A9 **pass（steps scope 写回 vstep、timeline scope seek t3、controlled 只置 touched 不改值、unmatched 无 active）**
- B 颜色：B1 pass（dark 标题 rgb(248,250,252)） B2 pass（focus 环 ring 令牌） B3 pass（success 绿/primary 蓝语义正确） B4 pass（色值走 --primary/--success 令牌） B5 pass（dark 圆点/环/文本均适配） B6 pass
- C 布局：C1 pass（800 视口无溢出） C2 **warn(C2-30：末步 connector 悬空线)** C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass（item 间 24px 节奏；title/detail 2px 为紧凑配对惯例） D2–D8 pass
- E 排布：E1 pass E2 **warn(E2-30 steps 现态区分弱、E2-31 timeline 现态高亮弱)** E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1 pass（steps/timeline 同构 valueOwnership） F4 pass（文案统一中文）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-C2-30] 水平步骤条最后一段 connector 悬空延伸至容器右缘

- **页面/路由**: `#/w4b-process-display`（demo-steps、demo-steps-local 两个水平实例；demo-steps-vertical 纵向不受影响）
- **主题/视口/状态**: light+dark / 1280 / 默认（dark 下同证：default-dark-1280.png "3 Done"/"2 Two" 右侧悬空线）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w4b-process-display/default-light-1280.png`
- **目视描述**: 末个步骤圆点右侧拖出一段灰色连接线直达容器内容右缘，无对应步骤，形似未闭合边框。
- **程序化证据**: 探针几何（3 实例）：steps#1 末圆点 right=511.3 而末 connector right=583（悬空 72px）；steps#3 468.5 vs 583（悬空 114px）；`connectors = items-1` 数量正确，越界来自末项 connector `left:50%; width:100%` 覆盖整格宽度。源码 `steps-renderer.tsx` L240–253：`orientation==='horizontal' && index>0` 即渲染，末项无豁免。
- **对照基准**: C2 无意外重叠/多余元素；antd/elastic steps 惯例 = connector 仅存在于相邻圆点之间。
- **严重程度**: P3
- **用户影响**: 视觉噪音，步骤条看起来"断了半截"；高频表单/流程页复用 steps 时普遍可见。
- **修复方向**: `steps-renderer.tsx` 末项（index === items.length-1）不渲染 connector，或将 connector 限宽为相邻圆点间距（`w-[calc(100%-2rem)]` 类）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-E2-30] steps 当前步（process）与已完成步（finish）指示器同色，区分仅 ✓/数字

- **页面/路由**: `#/w4b-process-display`（全部 steps 实例）
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w4b-process-display/default-light-1280.png`（Draft ✓ 与 Review 2 均为实心蓝圆）
- **目视描述**: 当前步与已完成步的 28px 圆点底色/边框/字色完全一致（实心 primary），仅圆内内容（✓ vs 数字）不同；当前步标题靠深浅色差区分。
- **程序化证据**: 探针 `data-status` + computed：`finish` 与 `process` 的 bg/border 均 `rgb(28,110,242)`、字色均 `rgb(255,255,255)`；aria-current="step" 正确落在 process。源码 `steps-renderer.tsx` L153–158：`process` 与 `finish` 映射同一类串 `border-primary bg-primary text-primary-foreground`。
- **对照基准**: E2 视觉层级与重要性一致；antd/Element 步骤条惯例——process 与 finish 有别（process 实心/描边强调、finish 浅底 ✓）。
- **严重程度**: P3
- **用户影响**: 快速扫视时当前所处步骤与已完成步骤易混淆；语义可由 aria-current 补足，视觉区分依赖小尺寸图标。
- **修复方向**: `STATUS_INDICATOR_CLASS.process` 增加区分（如 `ring-2 ring-primary/30` 外环或 process 用 primary 实心 + finish 用 `bg-primary/10 text-primary border-transparent`），一次改动全实例生效。
- **归族**: watch-only → 台账（视觉惯例裁定项）
- **复核状态**: 未复核

### [R2-1d-E2-31] timeline v2 当前事件高亮弱：仅 12px 圆点外 2px 环，标题无实差

- **页面/路由**: `#/w4b-process-display`（demo-timeline-v2-scope / v2-controlled / v2-reverse-active）
- **主题/视口/状态**: light+dark / 1280 / 默认与点击后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w4b-process-display/timelines-light-1280.png`（受控二带环）、`timelines-dark-1280.png`
- **目视描述**: 当前事件与普通事件的标题字重字号一致、颜色一致，唯一差异是 12px 圆点外圈 2px 蓝环，一屏多事件时需找点辨态。
- **程序化证据**: 探针：active 项 dot `outline solid/2px/rgb(28,110,242)`，非 active dot `none`；**active 标题 rgb(2,8,23) 与非 active 标题 rgb(2,8,23) 完全相同**——`timeline-renderer.tsx` L367 `isActive && 'text-foreground'` 对默认继承 foreground 的标题是 no-op。点击 seek 后环随 `data-state="active"` 正确迁移（A9 通过）。
- **对照基准**: E2 视觉层级（当前态标识为波特定检查点）；antd timeline 无 active 概念，但本组件 demo 文案自述「value 驱动 data-state="active" 高亮」，高亮强度与自述不符。
- **严重程度**: P3
- **用户影响**: 用户难以快速辨认"当前进行到哪个事件"，尤其时间线较长/横向模式时。
- **修复方向**: active 标题改 `text-primary` 或加 `font-bold`；非 active 标题基线改 `text-muted-foreground`，让 `text-foreground` 产生实差；一行 class 改动。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**族注（记录）**: ①A9 正例——steps scope 点击 Step B 写回 `steps:b` + aria-current 迁移；timeline scope 点击 t3 → `tl-active:t3 | touched:yes`；controlled 点击仅 `touched:yes` 值保持 c2（onChange 派发不 mutate 语义正确）；unmatched value 无 active 不回退首项（设计声明一致）。②已知族确认——timeline 缺省 level 回退渲染 primary 蓝点而显式 `level:'default'` 为灰点，同组件两种"默认"点色（antd 惯例 default=蓝可辩护），watch 记录不立项。③误报排除——溢出扫描零命中；GAP 扫描唯一 2px 命中为 timeline title/detail 紧凑文本对（styling-system 惯例 4px 档内），不立项。④steps 指示钮 28×28 且整步热区（源码注释 G1-R4-视角8-02），A3 合规正例。

## 4. 台账回写

- 本卡完成后：ledger.md `w4b-process-display` 行 status → `carded`；findings 归族后 → `digested`。
