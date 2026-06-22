# M0.1 移动端基础设施（safe-area / hairline / haptics / z-index 栈）

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/components/mobile-roadmap.md` M0.1；`docs/architecture/mobile-responsive-baseline.md` §10（契约定义）；`docs/analysis/2026-06-21-flux-vs-vant-full-comparison.md` §3
> Related: `docs/plans/2026-06-22-2057-2-m5-mobile-native-components-plan.md`（M5 软前置消费本 plan 的 M0.1c haptics + M0.1d z-index）
> Mission: mobile
> Work Item: M0.1

## Purpose

把移动端基础设施 4 项（safe-area 辅助类、hairline 0.5px 细线、haptics 触感反馈、global z-index 栈）从"仅 baseline 文档有契约、代码零实现"推进到"代码已落地、overlay 已从扁平 `z-50` 平滑迁移到分层 z-index 栈、必要 focused 验证已过"。这 4 项是 M1–M5 移动端体验的基本盘，且共享同一批 `@nop-chaos/ui` 样式契约文件与同一次 ui/surface-runtime 变更，按 plan guide §22 / roadmap 明确建议合并为**一个 plan 4 个 phase**，避免重复走 Protected Area 审批。

## Current Baseline

> 截至 2026-06-22 的 live repo 核查结论（read-only）：

- **包骨架**：`@nop-chaos/flux-renderers-mobile` 已有 `src/index.ts` + `schemas.ts` + `hooks/use-touch.ts`，但本 plan 工作项落在 `@nop-chaos/ui` 与 surface-runtime，不在 mobile 包。
- **M0.1a safe-area**：`packages/ui/src/styles/base.css`、`index.css` 中**无** `nop-safe-*` 类，全仓 grep `safe-area-inset` 在 `packages/` 源码 0 命中（仅 baseline §2 文档有契约）。
- **M0.1b hairline**：`packages/ui/src/styles/` 与 `packages/tailwind-preset/src/index.ts` 中**无** `nop-hairline` / `nop-hairline--*` 类。
- **M0.1c haptics**：`packages/ui/src` 中**无** `nop-haptic` 类；Button/Card 等可点击控件未统一按压反馈类。
- **M0.1d z-index 栈**：
  - `packages/ui/src/components/ui/` 下 overlay 组件（dialog、alert-dialog、drawer、sheet、popover、dropdown-menu、combobox、select、tooltip、hover-card、navigation-menu、context-menu）共 **12 个文件**普遍使用扁平 `z-50`（grep 确认 25+ 处命中）。
  - 全仓**无** `useGlobalZIndex` / `globalZIndex` 实现（`packages/**/*.ts(x)` 0 命中）。
  - `docs/architecture/surface-owner.md` **无** z-index 章节（仅 L138 提"同 family surface 优先靠渲染顺序而非递增 z-index"，与全局栈不冲突但需补全局栈章节）。
- **契约已立约**：baseline §10 已给出全部 4 项的 CSS/TS 契约定义与过渡迁移路径（§10.4 步骤 1–4），本 plan 是**实现已立约的契约**，不是重新发明契约——这降低了 Protected Area plan-first 的摩擦。

## Goals

- `nop-safe-top/bottom/left/right`、`nop-hairline`/`nop-hairline--*`、`nop-haptic` 三组 CSS 辅助类在 `@nop-chaos/ui` 落地并经样式入口导出/加载。
- surface-runtime 提供 `useGlobalZIndex()` 自增计数器（基线 2000，对齐 Vant），overlay 家族从扁平 `z-50` 平滑迁移到计数器取值，单浮层行为不变、多浮层叠加按打开顺序正确叠放。
- `docs/architecture/surface-owner.md` 补 global z-index 栈章节；`docs/architecture/styling-system.md`（或 renderer-markers-and-selectors）记录新增 `nop-*` 辅助类。
- 每个 phase 有 focused 验证（CSS 类存在性 / z-index 计数器单测 / 多浮层叠加行为抽查）。

## Non-Goals

- 不做 M1–M5 任何组件响应式改进或移动端原生组件实现（归各自 work item）。
- 不引入 `mobileUI` 全局标志位或 `*-mobile` 组件（baseline §7 明确禁止）。
- 不重写 overlay 组件的交互逻辑，仅替换 z-index 取值来源。
- 不做 bottom-sheet 独立实现（归 M1a 复用 surface runtime + `@nop-chaos/ui` Sheet）。
- 不在本 plan 内把所有业务 renderer 的 `border-*` 批量替换为 `nop-hairline--*`（那是各组件响应式 work item 的事；本 plan 只交付工具类 + 高频控件默认启用）。

## Scope

### In Scope

- M0.1a：`nop-safe-*` 4 个辅助类（`env(safe-area-inset-*)`）。
- M0.1b：`nop-hairline` + 4 个方向修饰符（`::after` 伪元素 + transform scale，含 `@media (-webkit-min-device-pixel-ratio)` scale 适配）+ `--nop-hairline-color` CSS 变量。
- M0.1c：`nop-haptic` 类（`:active` opacity/transition），并在 Button/Card 等高频可点击控件默认启用。
- M0.1d：`useGlobalZIndex()` / `setGlobalZIndex()`（surface-runtime），12 个 overlay 组件的 `z-50` 迁移，`surface-owner.md` z-index 章节。
- 每个 phase 的 focused 单测 / 行为抽查。

### Out Of Scope

- M1–M5 组件级响应式与原生组件（独立 work item / successor plan）。
- 业务 renderer 批量 border→hairline 迁移（归各组件响应式 work item）。
- container query 体系（baseline §7 标"未来"，非本 plan）。
- 软键盘 `VisualViewport` 监听实现（baseline §6 约定，归 M2a input 族 / M3a page）。

## Failure Paths

> 本 plan 是基础设施层，无对外 API 契约 / 鉴权 / 外部集成。错误场景主要是 z-index 迁移引入的叠加回归。纯 CSS 辅助类（safe-area/hairline/haptics）无运行时失败路径（降级为不生效，不影响功能）。

| 场景编号               | 触发                                    | 行为                                                        | 可重试 | 用户可见表现                     |
| ---------------------- | --------------------------------------- | ----------------------------------------------------------- | ------ | -------------------------------- |
| zindex-migrate-regress | z-50→计数器迁移后单浮层叠放顺序错乱     | 计数器基线 2000 落在原 z-50 语义附近，单浮层行为不变        | 否     | 单浮层正常；多浮层按打开顺序叠放 |
| zindex-counter-reset   | 测试调用 `setGlobalZIndex(v)` 重置      | 计数器归零到指定值，仅测试用                                | 否     | 生产不可见（测试专用 API）       |
| hairline-dpi-fallback  | 非 Retina / 不支持 transform scale 环境 | `::after` 仍渲染 1px 线，scale(0.5) 在低 DPI 下偏细但不丢失 | 否     | 边线视觉略细，无功能影响         |

## Test Strategy

本档选择：**建议有测**

理由：本 plan 是移动端基础设施，非鉴权 / 对外 API 契约 / 流式回压。但 z-index 计数器是核心交互回归路径（多浮层叠放），`useGlobalZIndex` 单测必须自动化（Proof 先行）；CSS 辅助类用存在性 + 计算样式抽查验证。haptics/safe-area/hairline 的纯 CSS 部分不强制单测，但需在 playground 有可视验证页。

## Execution Plan

### Phase 1 - M0.1a safe-area 辅助类

Status: completed
Targets: `packages/ui/src/styles/`（新增或扩展 mobile.css，并入 `index.css` 加载链）；可能涉及 `packages/ui/src/index.ts`（若需 JS 侧常量导出，ask-first）

- Item Types: `Fix`（实现已立约但未落地的契约）

- [x] **Fix**：在 `packages/ui/src/styles/` 新增 safe-area 辅助类（`nop-safe-top/bottom/left/right`，`padding-*: env(safe-area-inset-*)`），严格对齐 baseline §2 契约。
- [x] **Fix**：把新样式并入 `index.css` 加载链（`@import`），确保 `@nop-chaos/ui` dist 消费方自动获得类。
- [x] **Proof**：focused 检查——构建后 dist CSS 含 `nop-safe-top` 等 4 个类定义；jsdom/playground 抽查 `el.classList.add('nop-safe-bottom')` 后计算样式 `paddingBottom` 解析为 `env(safe-area-inset-bottom)`（或运行时 fallback）。
- [x] **Follow-up**：playground 增一个 mobile 基础设施演示页（safe-area/hairline/haptics 三类一页展示，供后续 phase 复用）。

Exit Criteria:

- [x] `packages/ui/src/styles/` 存在 safe-area 4 个辅助类定义，且经 `index.css` 加载链导出。
- [x] dist CSS（`pnpm --filter @nop-chaos/ui build` 产物）grep 命中 4 个类名。
- [x] playground mobile 演示页可渲染且不报错。

### Phase 2 - M0.1b hairline 0.5px 细线

Status: completed
Targets: `packages/ui/src/styles/`（mobile.css 续写）；`--nop-hairline-color` CSS 变量定义（与主题变量同源）

- Item Types: `Fix`

- [x] **Fix**：实现 `nop-hairline`（`position: relative`）+ `nop-hairline--top/right/bottom/left`（`::after` 伪元素 + `transform: scaleY/scaleX(0.5)` + `transform-origin`），严格对齐 baseline §10.2 契约。
- [x] **Fix**：加 `@media (-webkit-min-device-pixel-ratio: 2)/(3)` 下 scale 比例适配（0.5 / 0.333）。
- [x] **Fix**：定义 `--nop-hairline-color` CSS 变量（默认 `currentColor` 或主题 border 色），接入主题变量层。
- [x] **Proof**：focused 检查——dist CSS 含 5 个类名 + `::after` 规则；playground 演示页展示 4 方向细线（高 DPI 模拟下视觉为 0.5px）。

Exit Criteria:

- [x] `nop-hairline` + 4 个方向修饰符 + `--nop-hairline-color` 变量落地，经 `index.css` 加载。
- [x] dist CSS grep 命中类名与 `::after` 规则。
- [x] playground 演示页 4 方向细线可渲染。

### Phase 3 - M0.1c haptics 触感反馈

Status: completed
Targets: `packages/ui/src/styles/`（`nop-haptic` 类）；`packages/ui/src/components/ui/button.tsx`、`card.tsx` 等高频可点击控件（默认启用）

- Item Types: `Fix`

- [x] **Fix**：实现 `nop-haptic` 类（`transition: opacity 0.1s ease` + `cursor: pointer` + `:active { opacity: 0.7 }`），严格对齐 baseline §10.3 契约。
- [x] **Fix**：在 Button、Card 默认 className 合并 `nop-haptic`（baseline §10.3 列出的 `Cell`/`tabbar item`/`action-bar item` 当前在 `@nop-chaos/ui` **尚不存在**，属 M3a/M5 概念，由其自身 plan 落地时采用 `nop-haptic`，本 plan 仅覆盖已存在的 Button、Card）；disabled / 不可点击状态通过现有 `disabled` / `data-disabled` 不触发（`:active` 天然不响应）。
      — Button：无条件启用；Card：仅在传入 `onClick` 时启用（避免给静态 Card 注入 `cursor: pointer`）。
- [x] **Proof**：focused 检查——dist CSS 含 `nop-haptic` + `:active` 规则；button.tsx 默认渲染 className 含 `nop-haptic`；playground 演示页按压按钮有 opacity 反馈（`page.evaluate` 抽查 `:active` 计算样式或视觉）。

Exit Criteria:

- [x] `nop-haptic` 类落地并经 `index.css` 加载。
- [x] Button/Card 等高频控件默认启用 `nop-haptic`，disabled 状态不响应。
- [x] dist CSS + 组件渲染抽查通过。

### Phase 4 - M0.1d global z-index 栈 + z-50 平滑迁移

Status: completed
Targets: surface-runtime（`packages/flux-react/src/`，新增 `useGlobalZIndex`；exact module 执行时对照 `docs/architecture/surface-owner.md` 确认）；12 个 overlay 组件 `packages/ui/src/components/ui/{dialog,alert-dialog,drawer,sheet,popover,dropdown-menu,combobox,select,tooltip,hover-card,navigation-menu,context-menu}.tsx` + `sonner.tsx`（Toaster，toast/notify 顶层协调，对齐 baseline §10.4 layering 表）；`docs/architecture/surface-owner.md`（补 z-index 章节）

- Item Types: `Fix`（计数器实现）+ `Fix`（迁移）+ `Decision`（迁移路径）+ `Fix`（toast 顶层协调）+ `Fix`（owner-doc）

- [x] **Decision**：确认 `useGlobalZIndex()` 落点（surface-runtime 层，flux-react 或 flux-runtime），与 `docs/architecture/surface-owner.md` 的 SurfaceRuntime 集成，**不**新建第二套 surface 状态模型。基线起始值 2000（对齐 Vant）。
      — Decision: 落在 `@nop-chaos/ui` (`packages/ui/src/hooks/use-global-z-index.ts`)。理由：overlay 组件本身在 `@nop-chaos/ui`，flux-react 依赖 ui（不能反向依赖）；z-index 计数器是 UI 层 stacking 工具，不是 surface 状态，不构成"第二套 surface 状态模型"。
- [x] **Fix**：实现 `useGlobalZIndex()`（取值并自增）+ `setGlobalZIndex(v)`（重置，测试用），单文件模块 + focused 单测（自增顺序、重置、并发取值不重复）。
- [x] **Fix**：按 baseline §10.4 过渡路径迁移 12 个 overlay 组件的 `z-50`：1. 计数器起始值 2000 远高于现有非浮层 z-index，单浮层叠放行为与原 `z-50` 一致（`2000 ≠ 50`，保证的是"无其它内容落在 ~1950–2050 区间故视觉不变"，不是数值映射）；2. 各 overlay 打开时从 `useGlobalZIndex()` 取值替换硬编码 `z-50`；3. **禁止**迁移完成前混用扁平 `z-50` 与分层值（grep 确认 overlay 家族无残留 `z-50`）。
      — grep 确认：`packages/ui/src/components/ui/` 下仅剩 1 处 `**:data-[slot=kbd]:z-50`（tooltip 内部 kbd 局部堆叠，baseline 明确允许）。
- [x] **Fix**：`packages/ui/src/components/ui/sonner.tsx` 的 `Toaster` 当前**不设任何 z-index**（依赖 sonner 库内部默认）。使其落在 baseline §10.4 layering 表的 toast/notify 顶层（高于 dialog/sheet 计数器取值上限），机制（固定顶层值或计数器取值）执行时定，保证 toast 盖在所有已迁移 overlay 之上。
      — 机制：固定 `z-index: 10000`（`TOASTER_Z_INDEX` 常量，已导出），不从计数器取值。10000 远高于日常 overlay 计数器取值上限，并留出未来 sub-layer（如 top-tray 10500）的扩展空间。
- [x] **Proof**：focused 单测 `useGlobalZIndex` 计数器行为；行为抽查——多浮层叠加（dialog 内开 popover、toast 盖 dialog）按打开顺序正确叠放（用 `page.evaluate` 读 `z-index` 计算值，不靠截图）；toast 顶层高于 dialog 计数器取值可程序化断言。
- [x] **Fix**：`docs/architecture/surface-owner.md` 补 global z-index 栈章节（计数器语义、基线 2000、toast 顶层协调、与同 family 渲染顺序规则 L138 的关系、迁移结果）。

Exit Criteria:

- [x] `useGlobalZIndex()` / `setGlobalZIndex()` 在 surface-runtime 落地，focused 单测通过（自增 / 重置 / 不重复）。
- [x] 12 个 overlay 组件的硬编码 `z-50` 全部替换为计数器取值；grep 确认 `packages/ui/src/components/ui/` overlay 家族无残留扁平 `z-50`（`z-50` 仅保留在非 overlay 的 `**:` 修饰或 kbd 等非浮层场景，需逐处确认）。
- [x] `sonner.tsx` Toaster z-index 落在 toast/notify 顶层，高于 dialog/sheet 计数器取值。
- [x] 多浮层叠加行为抽查通过（dialog→popover→toast 按打开顺序叠放，且 toast 在最顶层）。
- [x] `docs/architecture/surface-owner.md` z-index 章节已写入最终设计状态（非 Proposed vs Current 对比，见 plan guide §14）。

## Draft Review Record

- Reviewer / Agent: round-1 `ses_11091c97fffedMCVKH0h1SLBLM`（verdict: revised，1 Major + 2 Minor）；round-2 `ses_11086bbb9ffeCdt0tdGghKjmee`（fresh session，verdict: pass）
- Verdict: `pass`
- Rounds: 2
- Findings addressed:
  - Major（toast/sonner 在 Phase 4 Proof/Closure 被引用但不在迁移 scope，criterion 不可验证 + 潜在回归）→ 已把 `sonner.tsx` 纳入 Phase 4 Targets + 独立 Fix 项（toast/notify 顶层协调，对齐 baseline §10.4 layering 表），所有提到 toast 的 Proof/Exit/Closure 均有 in-scope 项支撑。
  - Minor（Phase 4 step1 "等价 z-50 视觉层级" 措辞不准）→ 改为"起始值 2000 远高于现有非浮层 z-index...（2000≠50，非数值映射）"。
  - Minor（Phase 3 引用 baseline §10.3 含 Cell/tabbar/action-bar 等当前不存在的组件）→ 明确本 plan 仅覆盖已存在的 Button、Card，其余归 M3a/M5 自身 plan。
- round-2 确认零 Blocker / 零 Major / 零新增问题，所有引用经 live repo 复核（`sonner.tsx` 确无 z-index；baseline §10.4 toast/notify 顶层确认；§10.3 组件清单确认）。

## Closure Gates

- [x] M0.1a/b/c 三组 CSS 辅助类（safe-area/hairline/haptics）在 `@nop-chaos/ui` 落地并经样式入口加载。
- [x] M0.1d `useGlobalZIndex()` 计数器落地，12 个 overlay 组件完成 z-50 平滑迁移（无残留扁平 `z-50`），`sonner.tsx` Toaster 落在 toast/notify 顶层。
- [x] 多浮层叠加行为抽查通过（dialog→popover→toast 按打开顺序叠放，toast 在最顶层）。
- [x] focused 单测（`useGlobalZIndex` 计数器）完成并通过。
- [x] playground mobile 基础设施演示页存在并渲染正常。
- [x] `docs/architecture/surface-owner.md` z-index 章节 + `docs/architecture/styling-system.md`（或 markers 文档）`nop-*` 辅助类记录已同步到 live baseline。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 业务 renderer 批量 border→hairline 迁移

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 只交付 hairline 工具类 + 高频控件默认启用；业务 renderer（list/cards/cell 分隔线等）的 border 替换归 M4b（cards/list）等组件响应式 work item，不在 M0.1 结果面内。
- Successor Required: yes
- Successor Path: M4b / 各组件响应式 work item

### 软键盘 VisualViewport 监听

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: baseline §6 约定，但实际消费方是 M2a（input 族）/ M3a（page footer fixed 栏），不属于基础设施工具类层。
- Successor Required: yes
- Successor Path: M2a / M3a
- Closure Note (2026-06-23): M2a 部分（input 族 focus scrollIntoView）已在 M2 plan 收口；M3a 部分（page-footer fixed 栏 VisualViewport）已由 M3 Phase 1 收口（`docs/plans/2026-06-23-0410-1-m3-container-and-layout-responsive-plan.md`，落地于 `packages/flux-renderers-basic/src/use-fixed-footer-visual-viewport.ts`）。

## Non-Blocking Follow-ups

- container query 体系（baseline §7 标"未来"），非本 plan。
- `useGlobalZIndex` 是否需暴露给业务 renderer 自定义浮层（如 M5 pull-refresh 的指示层），待 M5 落地时评估。

## Closure

Status Note: 所有 4 个 Phase（M0.1a safe-area / M0.1b hairline / M0.1c haptics / M0.1d global z-index 栈）已全部落地，技术验证（typecheck/build/lint/test）全绿，e2e 0 新增回归，owner-docs 已同步到 final design state，playground demo 页 + e2e smoke 已上，独立 fresh-session closure-audit 通过（approved，3 个 non-blocking caveat 已在本 commit 一并修复）。

Closure Audit Evidence:

- Auditor / Agent: fresh-subagent `ses_1104b8b41ffe5HdHZtXqZB4kbV`（independent closure audit session, no shared context with executor, rounds=1, verdict=approved）
- Evidence:
  - Re-ran focused verification: `pnpm --filter @nop-chaos/ui test` = 34 files / 118 tests passed; `pnpm --filter @nop-chaos/ui build` then `grep -c 'nop-safe\|nop-hairline\|nop-haptic' packages/ui/dist/styles/mobile.css` = 26 matches; `grep "z-50" packages/ui/src/components/ui/` confirmed only the documented `**:data-[slot=kbd]:z-50` allowance in tooltip.tsx:45 remains. Full repo: `pnpm typecheck` 50/50, `pnpm build` 27/27, `pnpm lint` 27/27, `pnpm test` 50/50.
  - All 4 Phases' Exit Criteria verified against live repo (mobile.css 3 helper groups + index.css @import; `use-global-z-index.ts` baseline 2000 + 5-test suite + module API; 12 overlay components migrated to `useGlobalZIndex` with compound `*ZIndexContext` pattern for dialog/alert-dialog/drawer/sheet; sonner.tsx `TOASTER_Z_INDEX=10000`; button.tsx default `nop-haptic` + card.tsx conditional; widget-markers test regex correctly scoped to exclude `nop-haptic|nop-safe-|nop-hairline`; playground demo + e2e ROUTE_ASSERTIONS entry).
  - Owner-docs reflect final design state: `surface-owner.md` §Global z-index Stack (counter semantics, baseline 2000, overlay migration status table, toaster top-layer coordination, relationship to same-family render-order rule); `styling-system.md` §Mobile Infrastructure Helper Classes. mobile-roadmap.md / roadmap.md M0.1 marked `done` with ✅ on all 4 sub-items.
  - 0 new e2e regressions: pre-existing failures documented in `tests/e2e/component-handles.spec.ts:69-71` (X1 surface test-design NOTE). M0.1 changes are scoped to `@nop-chaos/ui` styles/hooks and 12 overlay z-index migrations; do not touch condition-builder/layout-family/word-editor/performance-table code.
- Caveats (non-blocking, all addressed in same changeset):
  1. Daily log `docs/logs/2026/06-22.md` M0.1 entry added (top of file).
  2. `docs/components/page/design.md:329` stale `M0.1, todo 未落地` updated to reflect landing.
  3. `TOASTER_Z_INDEX` re-exported from `packages/ui/src/index.ts`.

Follow-up:

- 业务 renderer 批量 border→hairline 迁移归 M4b（已在 Deferred But Adjudicated 记录）。
- 软键盘 VisualViewport 监听归 M2a/M3a（已在 Deferred But Adjudicated 记录）。
- `useGlobalZIndex` 是否暴露给业务 renderer 自定义浮层（如 M5 pull-refresh 指示层），待 M5 落地时评估。
