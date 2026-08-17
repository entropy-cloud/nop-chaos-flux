# 456 Flux 渲染器改进：responsive 结构断点 + collapse/checkbox/chart 增强

> Plan Status: completed
> Last Reviewed: 2026-08-16
> Source: `docs/discussions/2026-08-16-flux-renderer-improvements-design.md`（设计定稿）、`docs/analysis/sundial-ui-reproduction-analysis.md` §5 G1/G2/G4/G7
> Related: 无

## Purpose

把 Sundial 复刻暴露的四个 flux 渲染层 gap（G7 responsive 结构断点、G1 collapse trigger 语义化、G2 checkbox shape 透传、G4 chart 逐点上色）全部落地为 schema 可用的渲染器能力，并让 Sundial 复刻页改用新能力（验证端到端）。

## Current Baseline

- `flex.responsiveDirection` / `responsiveWrap` 已存在（样式层响应式，Tailwind 断点类）：`packages/flux-renderers-basic/src/schemas.ts:18,296` + `flex.tsx:53`
- `page.aside` 移动端自动转 Sheet 已存在（结构层先例）：`packages/flux-renderers-basic/src/page.tsx:95,260`
- `ResponsiveBreakpoint` 类型在 `flux-renderers-basic/src/schemas.ts:17`（未共享到 core）
- `collapse` trigger 外观 baked（`px-4 py-3 border rounded-lg`）：`packages/flux-renderers-layout/src/collapse-renderer.tsx:189-204`
- `Checkbox`（ui）支持 `shape?: 'square' | 'circle'`：`packages/ui/src/components/ui/checkbox.tsx:9`；flux `checkbox` 渲染器未透传：`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:445-481`
- `ChartSchema.colors: string[]` 按 series 顺序取色，无逐点上色：`packages/flux-renderers-data/src/chart-schemas.ts:42-64,5-12`
- Sundial 复刻页已用 CSS 覆盖 + 多 series 近似绕过上述 gap：`apps/playground/src/sundial-replica/sundial-replica.css`（`.sd-section` 内部 DOM 覆盖、`.sd-checkbox`）、`page-schemas/sundial-analytics.json`（压力图 4 series）
- `useIsMobile` 已从 `@nop-chaos/ui` 导出（`packages/ui/src/hooks/use-mobile.ts:12`，`index.ts:59` 以 `.js` ESM specifier 导出），matchMedia 封装先例成立
- `check:schema-prop-coverage`（`scripts/check-schema-prop-coverage.mjs`）rendererFiles 为 hardcoded 清单（:326-343），含 basic/index、form 系列、data/index.tsx、form-advanced、code-editor；**不含 flux-renderers-layout 与 data-renderer-definitions.ts**（chart 定义所在）——collapse/chart/responsive 的新增字段不被该门禁扫描
- `input-time` steppers 模式本日已落地（`input-time-renderer.tsx`），不在本计划范围

## Goals

- 新增 `responsive` 渲染器：schema 声明多断点变体，视口命中时整树切换（结构级响应式原语）
- `collapse` 支持 `tone`/`count`/`leading` 语义化 trigger（渲染器发 marker，视觉归宿主 CSS）
- `checkbox` 透传 `shape: 'circle'`
- `chart` series 支持 `colors`（定长色板）与 `colorRegionKey`（数据驱动逐点上色）
- Sundial 复刻页改用新能力（`sundial-detail` 圆形 checkbox、`sundial-analytics` 单 series 压力图、workbench 折叠分组 marker 化），验证端到端
- 覆盖义务（Decision 已裁定，见 Phase 1）：`check:schema-prop-coverage` 脚本当前仅扫描 hardcoded 清单（basic/form/data-index/form-advanced/code-editor），**collapse/chart/responsive 不在扫描内**——这四个渲染器的新增字段以 focused 测试为覆盖载体（Proof 先于 Fix 强制）；`checkbox` 在扫描内，其 `shape` 字段必须满足门禁。扩展脚本纳入 layout/data 定义列为 deferred 治理项

## Non-Goals

- `input-date` 行触发/对话框承载形态与 Sundial 样式令牌（G3 剩余）——优化项，移入 Deferred
- 移动端 Sundial Shell 完整复刻页（P8）
- `page.aside` 既有移动端行为改造
- 容器查询（ResizeObserver 级）响应式
- Sundial 复刻页 `.sd-section`/`.sd-checkbox` CSS 覆盖的清理（保留，宿主可选）

## Scope

### In Scope

- flux-core：`ResponsiveBreakpoint`/`ResponsiveVariantSchema` 类型上移共享（若需要）
- flux-renderers-layout：`responsive` 渲染器 + definition
- flux-renderers-form：`checkbox` shape 透传
- flux-renderers-layout：`collapse` tone/count/leading
- flux-renderers-data：chart series 逐点上色
- flux-renderers-basic：`ResponsiveBreakpoint` 从本地导出改为共享（不破坏导出）
- 测试：4 个改进各含 focused 单测；覆盖载体按 Goals 裁定（checkbox.shape 经 schema-prop-coverage 门禁，collapse/chart/responsive 以 focused 测试覆盖）
- Sundial 复刻页端到端改用（3 个页面小改）
- owner docs：`docs/architecture/styling-system.md`（marker 契约新增 collapse 语义 marker）、`docs/references/quick-reference.md`（新渲染器/字段条目）、`docs/architecture/renderer-runtime.md`（responsive 运行时语义，如需要）、`docs/discussions/2026-08-16-flux-renderer-improvements-design.md` → 实现后按最终设计重写为 `docs/architecture/` 文档

### Out Of Scope

- 其他渲染器的响应式特判
- chart 的 pie 逐点上色（已有 sector 上色）
- `page.aside` 重构为 responsive 变体

## Failure Paths

不适用：本计划为渲染器内部能力扩展，无鉴权/外部集成/错误码契约；错误面集中在 matchMedia 缺失环境（SSR/测试），设计已规定回退默认变体，属测试覆盖点而非用户可见错误路径。

## Test Strategy

档位：`必须自动化`

- renderer 契约变更（新渲染器 + 3 个字段扩展），Proof 先于 Fix：各 Phase 先写 focused 测试（先红后绿）
- 覆盖载体：`checkbox.shape` 经 `check:schema-prop-coverage` 门禁（扫描内）；collapse/chart/responsive 新增字段以 focused 测试为覆盖载体（脚本不扫描 layout/data definitions，见 Goals 裁定）
- matchMedia 缺失环境回退默认变体是核心行为，必须有测试；mock 模式采用仓库既有先例（`vi.mock('@nop-chaos/ui')` 假 hook，见 `packages/flux-renderers-basic/src/__tests__/page-responsive.test.tsx:5-11`）
- 端到端：Sundial 复刻页测试断言新能力生效（checkbox shape、压力图单 series、collapse marker）

## Execution Plan

### Phase 1 - responsive 渲染器（G7）

Status: completed
Targets: `packages/flux-core/src/types/`、`packages/ui/src/hooks/`、`packages/flux-renderers-layout/src/`、`packages/flux-renderers-basic/src/schemas.ts`

- Item Types: `Decision | Proof | Fix`

- [x] 决策：`ResponsiveBreakpoint` 上移 flux-core 共享（`flux-renderers-basic/src/schemas.ts:17` 改从 core 导入，保持 re-export 兼容）；core 新增 `ResponsiveVariantSchema`（key/min/max/body）
- [x] 决策：`useBreakpoint(query: string): boolean | null` 定死为单 query 契约（true=命中/false=未命中/null=环境无 matchMedia）；responsive 渲染器内部为每个变体断点建独立订阅，多断点监听是渲染器实现细节，不进 hook API
- [x] Proof：写 `responsive-renderer.test.tsx`，mock 模式采用 `vi.mock('@nop-chaos/ui')` 假 `useBreakpoint`（仓库既有先例 page-responsive.test.tsx:5-11，不注入 window.matchMedia）：默认变体渲染 / min 断点命中 / max 断点命中 / 无匹配回退默认 / 断点跨越整树重建 / scope 数据切换后保持
- [x] `packages/ui` 新增 `useBreakpoint(query)`（matchMedia 封装，unsubscribe 清理，无 matchMedia 返回 null）
- [x] `packages/flux-renderers-layout` 新增 `responsive-renderer.tsx`（订阅断点 → 按序匹配变体 → `RenderNodes` 渲染 body）+ `layout-renderer-definitions.ts` 注册 `responsive` 类型
- [x] Sundial 验证：`sundial-workbench.json` 外层加 `responsive` 变体，**采用方案 A：默认变体 = 桌面树（侧边栏+主区，既有断言零改动），移动树用显式 `max: 'lg'` 变体**；断点变体断言用 vi.mock 验证
- [x] `sundial-replica.test.tsx` 增加 responsive 变体切换断言（vi.mock useBreakpoint）
- [x] `docs/references/quick-reference.md` 增加 `responsive` 条目；`docs/architecture/renderer-runtime.md` 补响应式运行时语义（如需）

Exit Criteria:

- [x] `responsive` 渲染器注册并可渲染：`nop-responsive` marker + 默认变体 body 渲染
- [x] focused 测试全绿（默认/命中/回退/重建/scope 保持 5 类行为，vi.mock 模式）；checkbox 门禁项不受影响
- [x] Sundial workbench 页面测试全绿（原断言保留或经同步调整后全绿），新增断点变体断言通过

> 执行偏差记录（2026-08-16）：① 实际新增了 `useBreakpoints(queries)` 多查询 hook（ui 包），单 query `useBreakpoint` 也一并提供；renderer 用多查询版避免 hooks-in-loop。② 测试 mock 方式从 `vi.mock('@nop-chaos/ui')` 调整为 **window.matchMedia 注入**——vi.mock 在 flux-renderers-layout 测试链路中导致 `page.scope` undefined（实测复现，原因未深究，隔离验证后确认与 mock 本身相关）；layout 包 responsive 测试与 playground 端到端断言均改用 matchMedia 注入，行为覆盖等价。③ 新增 renderer 类型触发的 route inventory/lab registry 门禁（layout-renderer-routes.ts + renderer-lab-registry.ts + responsive-lab-page.tsx）已补齐。④ `ResponsiveBreakpoint` 上移 flux-core 并按计划 re-export。

### Phase 2 - collapse trigger 语义化（G1）

Status: completed
Targets: `packages/flux-renderers-layout/src/`、`apps/playground/src/complex-pages/page-schemas/sundial-workbench.json`

- Item Types: `Proof | Fix | Follow-up`

- [x] Proof：`collapse-renderer.test.tsx` 扩展（tone marker / count 渲染 / leading region / 无新字段时行为不变）
- [x] `CollapseItemSchema` 增加 `tone?: 'brand'|'info'|'warning'|'danger'|'success'|'neutral'`、`count?: SchemaValue`、`leading?: SchemaInput`
- [x] `layout-renderer-definitions.ts` collapse 定义（:264 附近）接线：fieldRules/propContracts 新增 `tone`/`count` 条目；`leading` 声明为 region（`leading → leadingRegionKey`，复用现有 `title → titleRegionKey` 机制，collapse-renderer.tsx:166-176 读取路径无冲突）
- [x] `collapse-renderer.tsx` trigger 输出 `[data-slot="collapse-tone-bar"]`（tone 时）、`[data-slot="collapse-count"]`（count 时）、`[data-slot="collapse-leading"]`（leading region）；trigger 根 `data-tone` 属性（`data-open` 在 collapse-item 根，不改动）；样式沿用现有 baked 类（marker 视觉由宿主 CSS）
- [x] `docs/architecture/styling-system.md` 记录 collapse 语义 marker 契约（渲染器发 marker，视觉归宿主）
- [x] Sundial 验证：`sundial-workbench.json` 折叠分组改用 `tone`/`count`（替换 `.sd-section-title-tone-*` + 手工计数），CSS 相应简化或保留双轨；测试断言 marker 存在

Exit Criteria:

- [x] collapse 新字段渲染出 marker 节点（tone-bar/count/leading + data-tone）；无新字段时现有测试全绿（向后兼容）
- [x] definition 接线完成（region 编译通过）；Sundial workbench 分组头经 schema 语义驱动（tone/count），原页面测试全绿

### Phase 3 - checkbox shape 透传（G2）

Status: completed
Targets: `packages/flux-renderers-form/src/`、`apps/playground/src/complex-pages/page-schemas/sundial-*.json`

- Item Types: `Proof | Fix`

- [x] Proof：`input-choice-renderers` 测试扩展（shape='circle' 透传到 ui Checkbox）
- [x] `CheckboxSchema` 增加 `shape?: 'square' | 'circle'`（默认 'square'）
- [x] `CheckboxRenderer` 透传 shape 到 ui `Checkbox`
- [x] Sundial 验证：`sundial-workbench.json`/`sundial-detail.json` 任务行 checkbox 加 `shape: 'circle'`；`.sd-checkbox` CSS 保留或标注可选；测试断言 `data-shape="circle"`

Exit Criteria:

- [x] `shape='circle'` 渲染出 `data-shape="circle"` 的 ui Checkbox；缺省行为不变
- [x] Sundial 复刻页 checkbox 使用 shape='circle'，页面测试全绿

### Phase 4 - chart 逐点上色（G4）

Status: completed
Targets: `packages/flux-renderers-data/src/`、`apps/playground/src/complex-pages/page-schemas/sundial-analytics.json`

- Item Types: `Proof | Fix`

- [x] Proof：`chart-renderer` 测试扩展（bar 单 series + colors 定长色板按索引取色 / colorRegionKey 从记录取色；未声明时行为不变）
- [x] `ChartSeriesSchema` 增加 `colors?: string[]`、`colorRegionKey?: string`（互斥，均 optional）
- [x] chart 渲染：bar/scatter 用 recharts `Cell` 逐点着色；line/area 逐点 stroke/point 赋值（实现以 bar 为验收主路径）
- [x] Sundial 验证：`sundial-analytics.json` 压力图改为单 series + `colorRegionKey`（mock 数据 `Sundial__pressure` 的 items 记录加 `tone` 字段）；图例保持；测试断言单 series 渲染 + 颜色生效（通过 recharts 输出或 DOM 断言）

Exit Criteria:

- [x] 单 series 逐点上色在 bar 上按 colors/colorRegionKey 生效；未声明时与现状一致（现有 chart 测试全绿）
- [x] Sundial 压力图单 series 化后页面测试全绿

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_ff5a96d77ffebEEEKwydyel74H`（独立 sub-agent，round 1 + round 2）
- Verdict: `revised`（round 1）→ `pass-with-minors`（round 2，零 Blocker 零 Major）
- Rounds: 2
- Findings addressed:
  - Round 1 Major-1（schema-prop-coverage 门禁范围）→ Goals/Test Strategy/Phase Exit Criteria 修订为"checkbox 走门禁，collapse/chart/responsive 以 focused 测试为覆盖载体"；扩展脚本列为 Deferred 治理项
  - Round 1 Minor-1..7 → 全部修订（use-mobile.ts 路径、collapse definition 接线、Phase 1 Exit 兜底、vi.mock 模式、useBreakpoint 单 query 契约、data-open 措辞、既有登记红）
  - Round 2 Minor（R2-M1/R2-M2 措辞残留、R2-M3 默认变体二选一）→ 全部修订：Scope 覆盖载体表述、设计 §7 vi.mock/schema-prop-coverage 同步、Phase 1 采用方案 A（默认变体=桌面树，移动树显式 `max: 'lg'`）

## Closure Gates

- [x] 四个改进（responsive / collapse / checkbox / chart）全部落地且有 focused 测试
- [x] Sundial 复刻页端到端改用新能力且页面测试全绿
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步：`styling-system.md`（collapse marker）、`quick-reference.md`（responsive/新字段）、`renderer-runtime.md`（如改动）、设计文档按最终设计归档到 `docs/architecture/`
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` 无新增命中（既有登记红除外：wizard-renderer.tsx oversized、industrial event-dispatch-ctx 6 处，已登记于 `docs/logs/2026/08-15.md`/`08-16.md`）

## Deferred But Adjudicated

### input-date 行触发/对话框承载形态与 Sundial 样式令牌（G3 剩余）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 核心月历点选交互已具备（popover Calendar single-mode）；行触发形态与 ±1h/±5m 步进（已由 input-time steppers 落地）属体验差异而非功能缺失；Sundial 复刻页已用声明式 dialog + input-date/steppers 组合达成视觉与交互近似
- Successor Required: no
- Successor Path: 无（进入 backlog，`docs/analysis/sundial-ui-reproduction-analysis.md` G3 跟踪）

### 扩展 check:schema-prop-coverage 脚本纳入 layout/data definitions

- Classification: `optimization candidate`
- Why Not Blocking Closure: 现有门禁对 collapse/chart/responsive 不扫描是既有事实，本计划的新增字段已由 focused 测试（Proof 先于 Fix）承担覆盖义务；扩展脚本会一次性暴露 layout/data 包全部既有 props 的覆盖缺口（grid/steps/timeline/wizard 等），属于独立治理面，混入本计划会扩大 scope
- Successor Required: no
- Successor Path: 无（backlog 治理项）

## Non-Blocking Follow-ups

- Sundial 复刻页 `.sd-section`/`.sd-checkbox` CSS 覆盖在 collapse/checkbox 新能力落地后可逐步替换为原生 marker（宿主自选，不阻塞）
- 容器查询（ResizeObserver 级）响应式作为 `responsive` 的后续扩展点（`useBreakpoint` 接口预留容器模式）

## Closure

Status Note: 4 个 Phase 全部 landing 并通过独立 closure audit（`ses_ff55651d1ffeK77aJTd65QzQNc`，approved，零 Blocker/Major）；全量验证 typecheck/build/lint/test 通过（test 全仓 0 失败：layout 124、data 870、form 809、playground 153 等），`pnpm check` 无新增命中（既有登记红不变）；owner docs 已同步（styling-system.md collapse marker 契约、quick-reference.md responsive/openDialog 条目、architecture/responsive-and-renderer-enhancements.md 最终设计归档）；audit 4 个 Minor 已全部处理（scope 保持注记、line/area 落地范围注记、文档指针改指归档文档 + discussion supersession 注记）。

Closure Audit Evidence:

- Auditor / Agent: `ses_ff55651d1ffeK77aJTd65QzQNc`（独立 fresh session closure audit，2026-08-16）
- Evidence: audit verdict `approved`（零 Blocker/Major）；4 项 Minor findings 已处理；逐 Phase landing 核验 + 关键包测试复跑（124/153/809/870 全绿）+ 接口 vs 语义抽查（测试断言真实行为）；记录于 `docs/logs/2026/08-16.md` 首条

Follow-up:

- line/area 逐点着色（recharts Cell 不适用，需自定义 dot/stroke 路径）——已记录于架构文档 §5.2，非阻塞
- Sundial 复刻页 `.sd-section`/`.sd-checkbox` CSS 覆盖可逐步替换为原生 marker（宿主自选）
- 容器查询（ResizeObserver 级）响应式作为 `responsive` 后续扩展点
