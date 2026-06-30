# Newly-Landed Renderer Responsive Follow-Ups (grid / list / cards)

> Plan Status: completed
> Last Reviewed: 2026-06-25
> Mission: components
> Work Item: responsive successors for M3b (grid) + M4b (cards/list) + M0.1 hairline migration
> Source: `docs/components/mobile-roadmap.md` (M3b/M4b Deferred But Adjudicated), `docs/plans/2026-06-23-0410-1-m3-container-and-layout-responsive-plan.md:179`, `docs/plans/2026-06-23-0410-2-m4-data-display-responsive-plan.md:158-170`, `docs/plans/2026-06-22-2057-1-m01-mobile-infrastructure-plan.md:185-191`
> Related: `docs/plans/2026-06-24-2358-2-crud-cards-list-rendering-mode-plan.md` (CRUD cards/list mode consumes these renderers; this plan runs first so the row renderers are mobile-complete)

## Purpose

把主组件 wave（W1c `list` / W2a `cards` / W3a `grid`）落地后**显式 deferred** 的三组移动端响应式 successor 一次性收口：grid 断点列数切换、list 触摸滚动 + hairline 分隔线迁移、cards 列数 schema 化 + hairline 迁移。三者共享同一结果面（新落地 renderer 的小屏响应式行为）、同一验证路径（`useIsMobile()` 运行时分支 / Tailwind 断点 + Playwright 双视口 + focused 单测），按 plan guide §22/§24/§26 合并为单一 owner plan。

## Current Baseline

> live repo 核查结论（非旧日志引用）：

- **grid**（`packages/flux-renderers-layout/src/grid-renderer.tsx`，W3a `done`）：`buildGridStyle()` L36-61 把 `columns`（number/string）一次性写入 `style.gridTemplateColumns`，**无 `useIsMobile()`、无断点切换**。`GridSchema` 字段为 `columns/gap/items/autoFlow/alignItems/justifyItems`（`schemas.ts`），无 per-breakpoint 字段。`grid/design.md` 无「响应式行为」小节。
- **list**（`packages/flux-renderers-data/src/list-renderer.tsx`，W1c `done`）：根 `className` 硬编码 `divide-y divide-border overflow-hidden rounded-md border border-border`（L371），**无 `useIsMobile()`、无 `data-responsive` marker**。list 本身已是单列堆叠，M4b「小屏单列」诉求天然满足；真实 gap = 触摸滚动体验 + hairline 分隔线迁移 + 响应式 marker。`list/design.md` 无「响应式行为」小节。
- **cards**（`packages/flux-renderers-content/src/cards-renderer.tsx`，W2a `done`）：根 `className` 硬编码 `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`（L182）—— **列数不可 schema 配置、断点阈值写死**。`CardsSchema`（`schemas.ts:148-167`）**无 `columns` 字段**。小屏单列已由 Tailwind 默认（mobile=1col）满足，但作者无法调整列数。`cards/design.md` 无「响应式行为」小节。
- **hairline 基础设施已就绪**：M0.1d `done`，`nop-hairline` / `nop-hairline--top|right|bottom|left` 已落地于 `packages/ui/src/styles/mobile.css`（`docs/architecture/styling-system.md` Mobile Infrastructure Helper Classes）。M0.1 plan L185-191 把「list/cards/cell 分隔线 border→hairline 迁移」显式路由到 W1c/W2a successor（本 plan）。
- **既定响应式范式**：M1–M4（全 `done`）已建立两种范式——(a) 运行时分支 `useIsMobile()` + `data-responsive` marker（crud/chart，`docs/plans/2026-06-23-0410-2-...`），(b) Tailwind 响应式类（flex/container `responsiveDirection`/`responsiveWrap`，`docs/plans/2026-06-23-0410-1-...`）。本 plan 两者并用。
- **deferred 依据**：M3b plan `2026-06-23-0410-1` L179 `Successor Required: yes` / `Successor Path: 主 roadmap W3a（grid renderer 落地后…）`；M4b plan `2026-06-23-0410-2` L162-163 + L169-170 `Successor Required: yes` / `Successor Path: 主 roadmap W1c（list）/ W2a（cards）renderer 落地后…`。三项依赖（W1c/W2a/W3a）现已全部 `done`。

## Goals

- grid 支持按断点切换列数（schema 驱动），桌面行为不回归。
- list 小屏触摸滚动体验达标 + 分隔线迁移到 `nop-hairline` + `data-responsive` marker，桌面行为不回归。
- cards 列数可由 schema 配置（含响应式 per-breakpoint），消除硬编码 `sm:grid-cols-2 lg:grid-cols-3`，默认行为不回归。
- grid/list/cards 三份 design.md 各补「响应式行为」小节，引用 M0 基线。
- 三组件 playground 演示页 + e2e（双视口程序化断言）+ focused 单测交付。

## Non-Goals

- 不实现 CRUD 的 cards/list 渲染模式（归 `2026-06-24-2358-2-crud-cards-list-rendering-mode-plan.md`）。
- 不重构 grid/list/cards 的非响应式核心逻辑（selection/pagination/scope 模型不动）。
- 不新增 `*-mobile` 组件、不引入 `mobileUI` 标志位（遵循 mobile-roadmap 架构决策）。
- 不处理 D1a（designer-node-card/designer-edge-row）注册（受 host bridge 稳定性裁定约束，仍 deferred）。
- 不处理 O1 非 retained 可选项（需人确认 retained 决策后方可启动）。

## Scope

### In Scope

- `grid`：新增 per-breakpoint 列数 schema 字段 + renderer 断点映射（CSS Grid 自定义属性或运行时分支）+ design.md 响应式小节 + focused 单测 + e2e。
- `list`：小屏触摸滚动 + `nop-hairline` 分隔线迁移 + `data-responsive` marker + design.md 响应式小节 + focused 单测 + e2e。
- `cards`：`columns` schema 字段（number | responsive object）替换硬编码 Tailwind 列类 + `nop-hairline` 分隔线迁移 + design.md 响应式小节 + focused 单测 + e2e。
- 三组件共用 playground 演示页（或扩展现有 `/m4-data`、新增布局组演示页）。

### Out Of Scope

- CRUD cards/list 集成模式（successor plan 2）。
- table 响应式（M1b 已 `done`）。
- 任何 non-retained 可选组件（O1）。

## Failure Paths

> 不适用：本计划是纯前端渲染层响应式改进，无 API 契约/鉴权/外部集成。失败路径 = 桌面回归（列数/分隔线视觉变化）→ 由 focused 单测 + e2e 双视口断言守住。

## Test Strategy

档位选择：建议有测

本档选择：建议有测。理由：一般功能增强（响应式布局），非鉴权/对外 API/核心回归路径。但 Cross-Cutting 要求每个能力改进配 playground + e2e，故 proof 项仍含双视口 e2e。每个 renderer 的响应式分支配 focused 单测（`useIsMobile()` mock 或 `matchMedia` mock），与 M1–M4 既有范式一致。

## Execution Plan

### Phase 1 - grid 断点列数切换

Status: completed
Targets: `packages/flux-renderers-layout/src/schemas.ts`（GridSchema）、`packages/flux-renderers-layout/src/grid-renderer.tsx`、`packages/flux-renderers-layout/src/grid-renderer.test.tsx`、`docs/components/grid/design.md`

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：裁定 grid 响应式实现范式——(A) 运行时 `useIsMobile()` 分支切换 `gridTemplateColumns`，或 (B) per-breakpoint schema 字段（如 `responsiveColumns?: { sm?: number; md?: number; lg?: number }`）经 CSS 自定义属性 + Tailwind `@media` 映射。优先 (B) 以保持 grid 无运行时状态的设计原则（`grid/design.md §7`「grid 本身无复杂 owner 状态」）；若 (B) 在 CSS Grid 内联 style 下不可行（inline style 无法写 `@media`），回落 (A) 并在 design.md 记录裁定。
- [x] **Fix**：GridSchema 新增响应式列数字段（按 Decision 裁定形态）；`buildGridStyle()` / `GridRenderer` 按断点派生 `gridTemplateColumns`，缺省时保持现有 `columns` 单值行为（桌面零回归）。
- [x] **Fix**：grid 根节点补 `data-responsive` marker（与 crud/chart 范式对齐）。
- [x] **Proof**：`grid-renderer.test.tsx` 新增响应式用例（桌面列数不回归 + 小屏列数切换 / per-breakpoint 派生正确）。

Exit Criteria:

- [x] grid 支持按断点切换列数，桌面默认行为（`columns` 单值）与改动前逐字节一致（focused 单测断言 `gridTemplateColumns`）
- [x] `grid/design.md` 新增「响应式行为」小节，引用 M0 基线断点，记录 Decision 裁定
- [x] grid focused 单测全绿（含响应式分支 + 桌面回归）

### Phase 2 - list 触摸滚动 + hairline 迁移

Status: completed
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`、`packages/flux-renderers-data/src/__tests__/`（list 测试现位于 `__tests__/list-pagination-infinite.test.tsx` / `data-list-rendering.test.tsx`，新增 `list-responsive.test.tsx` 或扩展现有文件）、`docs/components/list/design.md`

- Item Types: `Fix | Proof`

- [x] **Fix**：list 根节点 `divide-y divide-border` → `nop-hairline--bottom`（或等价 hairline 工具类，按 M0.1 baseline §10 收口 0.5px 高 DPI 细线），保留桌面视觉等价（focused 单测断言 class 变更）。
- [x] **Fix**：list 小屏触摸滚动——根容器补 `useIsMobile()` 分支：小屏 `-webkit-overflow-scrolling: touch`（或 Tailwind `touch-pan-y`）+ 触摸目标 padding 增强；`data-responsive` marker。
- [x] **Proof**：focused 单测覆盖 hairline class 迁移 + 小屏触摸滚动 marker（`data-responsive`）+ 桌面不回归。

Exit Criteria:

- [x] list 分隔线迁移到 `nop-hairline`，桌面视觉不回归（focused 单测）
- [x] list 小屏触摸滚动 + `data-responsive` marker 落地
- [x] `list/design.md` 新增「响应式行为」小节，引用 M0 基线 + hairline 迁移记录

### Phase 3 - cards 列数 schema 化 + hairline 迁移

Status: completed
Targets: `packages/flux-renderers-content/src/schemas.ts`（CardsSchema）、`packages/flux-renderers-content/src/cards-renderer.tsx`、`packages/flux-renderers-content/src/cards-renderer.test.tsx`、`docs/components/cards/design.md`

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：裁定 cards 列数派生范式——与 Phase 1 grid 同源的分叉：(A) inline `gridTemplateColumns`（但 `columns:{sm,md,lg}` 的 per-breakpoint 无法用 inline style 表达 `@media`，仅支持 number 单值），或 (B) 运行时 `useIsMobile()` 分支切换列数 + `data-responsive` marker（与 crud/chart 范式对齐）。优先 (B)（cards 列类已是 Tailwind 断点，改 schema 化后用运行时分支保持 `data-responsive` 语义一致），并记录 `columns` 接受 `number | { sm?: number; md?: number; lg?: number }`。
- [x] **Fix**：CardsSchema 新增 `columns` 字段（`number | { sm?: number; md?: number; lg?: number }`），缺省 = 现有行为（mobile 1 / sm 2 / lg 3）。
- [x] **Fix**：`cards-renderer.tsx:182` 删除硬编码 `sm:grid-cols-2 lg:grid-cols-3`，改为从 `columns` schema 派生 `gridTemplateColumns`（inline style，参考 grid 的 `buildGridStyle` 范式）或派生 Tailwind 列类；保留 `nop-cards` marker + `data-responsive`。
- [x] **Fix**：cards 卡片间分隔迁移到 `nop-hairline`（若当前 `gap-3` 即视觉分隔则记录无需迁移的裁定）。
- [x] **Proof**：focused 单测覆盖 `columns` 派生（number / responsive object / 缺省三种）+ 桌面默认不回归。

Exit Criteria:

- [x] cards 列数由 schema `columns` 驱动，硬编码 `sm:grid-cols-2 lg:grid-cols-3` 已移除，缺省行为不回归（focused 单测断言）
- [x] `cards/design.md` 新增「响应式行为」小节，记录 `columns` 字段语义 + 默认断点映射

### Phase 4 - playground 演示页 + e2e

Status: completed
Targets: `apps/playground/src/`（演示页）、`apps/playground/src/route-model.ts` / `App.tsx`（路由注册）、`tests/e2e/`（e2e spec）

- Item Types: `Fix | Proof`

- [x] **Fix**：新增（或扩展）playground 演示页，展示 grid/list/cards 桌面↔移动双视口切换效果，含可观测 testid（`*-desktop-root` / `*-mobile-root` 或 `data-responsive` 断言点）。
- [x] **Fix**：路由注册到 playground（route-model + App.tsx）。
- [x] **Proof**：e2e spec 用 Playwright `setViewportSize` 双视口程序化断言（不靠截图诊断，遵循 mobile-roadmap Cross-Cutting）：grid 列数切换、list hairline/marker、cards 列数派生。

Exit Criteria:

- [x] playground 演示页可访问且路由已注册（live repo 可见 testid + 路由条目）
- [x] e2e spec 双视口断言全绿（grid/list/cards 各覆盖关键响应式路径）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅子 agent 填写。

- Reviewer / Agent: opencode plan-review (fresh general subagent, round 1)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: (Major) none. (Minor→fixed) list 测试文件路径订正为 `__tests__/` 实际位置（list-renderer.test.tsx 不存在）；cards Phase 3 增补显式 `Decision` item（列数派生范式 inline-style vs useIsMobile 分叉，与 grid Phase 1 对齐）。引用准确性逐条经 live repo 核对通过（grid/cards/list 硬编码与无响应式断言、M3b/M4b/M0.1 deferred successor 引用、W1c/W2a/W3a done、nop-hairline 基础设施存在）。

## Closure Gates

> 关闭条件：本 section + 每个 Phase Exit Criteria 全 `[x]` 后，方可将 Plan Status 改 `completed`。closure-audit 必须由独立 fresh-session 子 agent 完成。

- [x] grid 断点列数切换落地 + 桌面零回归 + design.md 响应式小节
- [x] list hairline 迁移 + 小屏触摸滚动 + design.md 响应式小节
- [x] cards 列数 schema 化（硬编码移除）+ design.md 响应式小节
- [x] 三组件 playground 演示页 + e2e 双视口断言全绿
- [x] 必要 focused verification 已完成（grid/list/cards 各自响应式分支单测）
- [x] M3b/M4b/M0.1 deferred successor 在对应 plan 的 `Deferred But Adjudicated` 补 `Closure Note` 指向本 plan
- [x] mobile-roadmap M3b/M4b Phase Status 无遗留矛盾（M3b/M4b 已 `done`，本 plan 是其 successor 的落地，不回写 done 状态）
- [x] 受影响 owner docs（grid/list/cards design.md）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 起草时无新 deferred 项。执行中若发现非阻塞残留，按 guide 裁定后填入。

## Non-Blocking Follow-ups

- grid/list/cards 响应式断点阈值若后续需可配置（全局 token 而非 per-schema），归后续样式系统评估。
- list 虚拟滚动（长列表性能）归独立性能 plan（非响应式范畴）。

## Closure

Status Note: completed — 三组件（grid/list/cards）响应式 successor 全部落地。grid 经 `responsiveColumns` schema + `useIsMobile()` 断点列数切换（Decision A）；list `divide-y`→`nop-hairline` 迁移 + 小屏触摸滚动；cards `columns` schema 化（number|object）+ hairline 裁定（gap 间距无需迁移）。三份 design.md §13 响应式小节 + playground 演示页 + 双视口 e2e 全绿。桌面缺省行为逐字节零回归。M3b/M4b/M0.1 deferred successor 均补 Closure Note；roadmap M4b→✅。

Closure Audit Evidence:

- Auditor / Agent: opencode closure-audit (fresh-session general subagent, task `ses_1056de644ffewBUpm61eHJ5zOg`) — independent of the execution session.
- Verdict: `approved`.
- Evidence: 逐 Phase 核对 live repo——Phase 1 grid `schemas.ts:94,115` + `grid-renderer.tsx:98,119` + 5 responsive 单测 + `grid/design.md` §13；Phase 2 list `list-renderer.tsx:237,381,137,134,354,388` + `list-responsive.test.tsx` 4 cases + `list/design.md` §13；Phase 3 cards `schemas.ts:148,166` + `cards-renderer.tsx:205,69-105`（缺省 `sm:grid-cols-2 lg:grid-cols-3` 字节保留）+ 5 responsive 单测 + `cards/design.md` §13（hairline 裁定诚实，gap-3 非分隔线）；Phase 4 demo `m4-data-display-demo.tsx:9-10,20-21,234-251` + route 注册 + `m4-data.spec.ts` 6 双视口断言。focused 验证：typecheck 3 包 clean、grid 55 / list 526 / cards 152 单测全绿、e2e m4-data 11/11。Closure Gates 全部 PASS（含独立 audit gate，由本 fresh-session audit 授权）。

Follow-up:

- no remaining plan-owned work（grid/list/cards 响应式 successor 全部收口）。Non-blocking：全局响应式断点阈值 token 化、list 虚拟滚动归独立性能 plan（见 plan `Non-Blocking Follow-ups`）。
