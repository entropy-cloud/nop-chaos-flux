# E3.1 — ECharts 高级图表类型落地（sankey/treemap/tree/boxplot/gauge/funnel/radar）

> Plan Status: completed
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/echarts-integration-roadmap.md`（E3.1）, `analysis/echarts-migration-analysis.md`（rev 3, §1.2/§二）
> Related: 前置 `docs/plans/2026-09-13-2343-echarts-e1-1-renderer-skeleton-plan.md`、`docs/plans/2026-09-13-2350-echarts-e2-1-dataset-binding-theme-plan.md`（均 completed）；后续 E4.1/E5.1

## Purpose

让 roadmap E3.1 列出的高级图表类型（sankey、treemap、tree、boxplot、gauge、funnel、radar 共 7 种 series）在 `echarts` 渲染器下达到「可验证可用」：经原生 option 透传 + dataset 绑定的组合，每种类型有真实编译链 fixture 证明组合 option 正确到达 setOption，并在 playground lab 提供可交互场景。

## Current Baseline

- E1.1：`echarts-setup.ts` 已注册全部 22 类 chart 与通用组件（含 `RadarComponent` 坐标系、`VisualMapComponent`、`TransformComponent`）；option 原生透传使任意已注册 series 类型理论可用——但**无任何专项验证**（E1.1 仅验证骨架生命周期）。
- E2.1：dataset/encode 表达式绑定、`empty` 插槽、事件桥接、`flux` 注册主题已落地；`echarts-dataset-binding.test.tsx` 已有 bar/line/pie/scatter 的 dataset 形态断言。
- 高级类型的 idiomatic 数据形态差异：sankey/tree/treemap 直接在 series 内声明 `data`/`links`（图结构，非 dataset+encode 形态）；boxplot 惯用二维数组 dataset 或预先计算的 statistics；radar 需要 option 级 `radar` 坐标系 + series `data`（value 数组）；gauge/funnel 为单 series 标量形态。这些差异未被任何文档/场景记录。
- roadmap E3.1 交付面为「桑基图 (sankey)、树图 (treemap/tree)、箱线图 (boxplot)、仪表盘 (gauge)、漏斗图 (funnel)、雷达图 (radar)」。

## Goals

- 7 种高级 series 类型各有真实编译链 fixture：schema → 编译 → 渲染器 → setOption 收到结构正确的组合 option（含 dataset 绑定场景），测试全绿。
- boxplot 提供二维数组 dataset 绑定的 idiomatic 示例（E2.1 数据映射在图结构类图表上的边界记录在案：sankey/tree/treemap/radar 走 series 内嵌数据，不适用 dataset+encode）。
- playground lab page 新增 7 个高级图表场景，route-matrix 等 playground 测试全绿。
- 渲染器/定义/schema 代码零改动（除非 fixture 揭示真实缺陷——若有，按 Fix 记录处理）。

## Non-Goals

- E4.1 类型（map/candlestick/graph/sunburst/themeRiver/custom）→ E4.1。
- dataset+encode 对图结构类（sankey/tree/treemap/radar）的强制适配层：echarts 原生语义即 series 内嵌数据，不做包装（Follow-up 记录）。
- 包体裁剪、成体系文档、e2e → E5.1。

## Scope

### In Scope

- `echarts-advanced-charts.test.tsx`（新建，真实编译链 + mocked echarts-setup）：sankey（nodes/links）、treemap（data 层级）、tree（children 层级）、boxplot（二维数组 dataset 绑定，预计算五数概括统计行）、gauge（单系列标量）、funnel（data 标签值）、radar（option 级 `radar` 坐标系 + indicator）各至少一例，断言 setOption 收到的 series type / 结构 / dataset（如适用）。
- lab page 新增 7 个场景（每类型一个，含 dataset 或事件组合至少一处）。
- 若 fixture 揭示 setup 注册缺失或渲染器缺陷 → Fix 项处理并记录。

### Out Of Scope

- 渲染器行为变更（预期零改动）。
- 22 类中属 E4.1 的其余类型。
- 新 schema 字段。

## Failure Paths

> 不适用：本计划为验证与场景交付，无新错误处理路径。若 fixture 揭示失败，按 Fix 项以既有 Failure Paths（option-invalid/empty/load-failed）语义归档。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`。理由：E3.1 的交付物本身就是「可验证可用」的证明物（真实编译链 fixture），Proof 即交付。

## Execution Plan

### Phase 1 - 高级类型 fixture（真实编译链）

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/echarts-advanced-charts.test.tsx`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：`echarts-advanced-charts.test.tsx` 覆盖 7 种 series：sankey/treemap/tree（series 内嵌 data[/links] 结构断言）、boxplot（二维数组 dataset 绑定 + boxplot series）、gauge/funnel（series 结构断言）、radar（option 级 `radar` 坐标系 + `radar.indicator` 断言）——全部经 `createDataSchemaRenderer` 真实编译链，断言 setOption 收到的组合 option。（先红语义：验证型交付，proof 工件本身为新增——此前全仓无任何 sankey/treemap/boxplot/gauge/funnel/radar/tree 测试命中，7/7 一次转绿证明「透传已可用、缺的是专项验证」的基线论断成立）
- [x] Fix（条件项）：fixture 若揭示 setup 注册缺失/渲染器缺陷，修复并在本 plan 记录；预期零改动。若 fixture 全绿未触发，本项以 not-triggered 勾选并在 Closure Status Note 记录。（**not-triggered**：7/7 一次通过，零代码改动）

Exit Criteria:

- [x] `echarts-advanced-charts.test.tsx` 全绿（7 tests，先红语义见执行项注记）。
- [x] 7 种类型各有 setOption 组合 option 结构断言；boxplot 场景覆盖 dataset 绑定。

### Phase 2 - lab 场景与收口

Status: completed
Targets: `apps/playground/src/component-lab/renderers/echarts-lab-page.tsx`

- Item Types: `Proof`

- [x] Proof：lab page 新增 7 个高级图表场景（sankey/treemap/tree/boxplot/gauge/funnel/radar），其中 boxplot 使用 dataset 绑定、至少一处组合事件（如 gauge onClick）；introDescription 更新高级类型清单。
- [x] Proof：playground 测试（route-matrix 等）与 flux-renderers-data 包测试全绿（playground 33 files / 347 tests）。

Exit Criteria:

- [x] lab page 场景可用且 playground 测试全绿。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，round 1）
- Verdict: `pass-with-minors`（零 Blocker/Major；4 Minor 已由起草者合并）
- Rounds: 1
- Findings addressed: Minor-1 `radar.coordinate` 记法修正（option 级 `radar` + `radar.indicator`）；Minor-2 条件 Fix 项补「未触发时以 not-triggered 勾选并在 Status Note 记录」；Minor-3 boxplot 数据形态措辞明确为预计算五数概括统计行；Minor-4 Phase 2 Targets 移除无对应执行项的文件；Minor-5（计划外观察）roadmap E2.1 行 todo 滑移已先于本计划执行修复。

## Closure Gates

- [x] 所有 in-scope 项已落地：7 种高级类型 fixture + lab 场景
- [x] 行为/契约结果已达成：每类型 setOption 组合 option 结构断言存在且全绿
- [x] 必要 focused verification 已完成：advanced-charts fixture（7）全绿；包级与 playground 测试全绿
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（roadmap E3.1 → done、daily log 收口记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（audit verdict: approved，5 Minor 观察均不阻塞，措辞类建议已吸收进 Closure 段）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（turbo eslint 37/37；i18n 既有 4 键红同前，零新增）
- [x] `pnpm test`（68/68 tasks，约 11,534 tests / 0 failed）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- dataset+encode 对图结构类（sankey/tree/treemap/radar）的包装适配层：echarts 原生语义即 series 内嵌数据，无已裁决需求（out-of-scope improvement）。

## Closure

Status Note: 2026-09-13 收口。7 种高级 series（sankey/treemap/tree/boxplot/gauge/funnel/radar）经真实编译链 fixture（7 tests）与 lab 场景证明可验证可用；条件 Fix 项 not-triggered（7/7 一次通过，渲染器/setup/schema 零代码改动）。仓库级验证：typecheck 37/37、build 37/37、turbo eslint 37/37、test 68/68 tasks（11,534 tests / 0 failed）。验证型交付的先红语义（proof 工件为新增、此前无 echarts series 专项验证命中）已在执行项注记与 audit 中确认诚实。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-13）
- Evidence: verdict `approved`。独立实跑：advanced-charts 7/7（逐类型结构断言核对）；contract-honesty 与包级 151 files / 1114 tests 全绿；playground 33 files / 347 tests、route-matrix 36/36；两受影响包 tsc --noEmit exit 0。「先红」grep 抽查确认全仓此前无 echarts series 专项验证命中（仅 4 处无关文本）；`git status` 证明渲染器源码零改动与 not-triggered 互证。5 Minor 观察（先红措辞字面收紧、前瞻性 gate 勾选的收口序列、Phase 1 Exit 措辞事后调整的披露、analysis/roadmap 分区差异以 roadmap 为准、sankey nodes 断言充分性）均不阻塞，处置见本段。

Follow-up:

- dataset+encode 对图结构类（sankey/tree/treemap/radar）的包装适配层：无已裁决需求（out-of-scope improvement，与 Non-Blocking Follow-ups 同项）。
- no remaining plan-owned work
