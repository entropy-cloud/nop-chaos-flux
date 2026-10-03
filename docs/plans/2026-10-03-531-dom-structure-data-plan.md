# 531 flux-renderers-data 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W4）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-data 全部 renderer type 的 DOM 结构收口到契约 6 维。本包 `data-cid`/`data-slot` 基线最好（全覆盖、普遍），重点是 crud toolbar 纯布局层等少数包装裁定与 chart/echarts 引擎挂载层归因，并冻结包级契约测试。

## Current Baseline

> **执行记录（2026-10-03）**：td data-field 裁定为补实现——ui TableCell 透传 props（ui/table.tsx:65-73 零改动），DataRowView 循环（table-body-row-rendering.tsx:298）6 个数据列分支各加 `data-field={column.name ?? undefined}`（:298 循环外的 leading/empty/expanded/group/summary 单元格不打标）；非数据列不标。chart/echarts 引擎挂载层归因：chart-canvas div（role=img+键盘+sr-only 摘要，D6 超额）、echarts-canvas div（role=img+i18n label，D6 达标）。

- 组件清单（type 注册聚合于 `data-renderer-definitions.ts` 等）：crud → `crud-renderer.tsx`（canvas 容器）、table → `table-renderer.tsx`、tree、list、query-filter、batch-bar、pagination、statistics、stat-tile、chart、echarts、sparkline（chart/echarts/sparkline 偏 leaf/composite）、data-source → `data-source-renderer.tsx`（:94 return null，null-render 豁免登记）。
- `data-cid` 全覆盖（crud:551、table:515、tree:594、list、pagination、chart、echarts、stat-tile:171 等）；`data-slot` 30+ 文件普遍使用。
- 已点名包装嫌疑：
  - `crud-renderer.tsx:548-669`（4 层）：root `nop-crud` → query 区 → collapse 行 → toolbar 区内 `nop-crud-toolbar`(:605) → 纯布局 `div.flex-wrap`(:606)（无 data-slot，目的仅 gap）→ 两个 slot div(:608,611)
  - `statistics-renderer.tsx:10`：纯文本"共 N 条"包一层 div（有 data-slot/data-total，弱辩护）
  - `sparkline-renderer.tsx:71`：`div.nop-sparkline` 包 svg（状态属性挂 div）
- 合规参照：`table-renderer.tsx:511-565` 根 → header-region → `data-slot="table-container"` 滚动容器 → table，各层职责明确。
- **confirmed contract drift（owner-doc ↔ live）**：owner doc 承诺 table 单元格 `<td data-field={column.name}>`（`renderer-markers-and-selectors.md:110`），live 的 flux-renderers-data 与 packages/ui 均无 `data-field` 输出——本包必须显式裁定（补实现 = Fix，或修订 owner doc），不得当作既有有效契约绕开。
- 盘点未发现本包自带 frame；D6：crud/table 容器是否属"scene-graph 引擎画布"待逐卡判定（echarts canvas 挂载归因到引擎挂载点职责）。

## Goals

- 全部 type 六维判定落卡（含 data-source null-render 豁免）；crud/statistics/sparkline 三处包装裁定并整改或豁免登记
- chart/echarts 引擎挂载层在结构图中归因（引擎挂载点职责），并判定 D6 适用性
- `<td data-field>` contract drift 显式裁定并落地（补实现或修订 owner doc，二选一留痕）
- `dom-structure` 契约测试冻结

## Non-Goals

- 功能契约 18 维审计；crud 数据流/分页行为变更
- echarts/recharts 库内部 DOM 与数据请求/排序/筛选行为
- 其它包的结构问题

## Scope

### In Scope

- `packages/flux-renderers-data/src/` 全部 renderer type 的审计卡、整改、契约测试

### Out Of Scope

- echarts/recharts 库内部 DOM
- 数据请求、排序、筛选行为

## Test Strategy

档位选择：`建议有测`——crud toolbar 整改与引擎挂载归因为必测断言；其余以卡面 + 契约测试覆盖。

## Execution Plan

### Phase 1 - 逐组件审计卡

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 13 张已落盘）

- Item Types: `Proof`

- [x] 逐 type 落卡（13 张，六维判定齐全）；crud toolbar 行、statistics/sparkline 单元素根复核归因
- [x] chart/echarts 引擎挂载层归因（chart-canvas/echarts-canvas div）+ D6 判定（chart 超额、echarts 达标+增强项 follow-up）
- [x] Decision：td data-field 裁定为**补实现**（owner doc :110 契约成立，live 缺失为 drift）

Exit Criteria:

- [x] 全部 type 落卡且六维判定齐全（13/13）
- [x] td data-field 裁定留痕（卡面 + plan 本节）

### Phase 2 - 整改

Status: completed
Targets: `table-renderer/table-body-row-rendering.tsx`、`crud-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] td data-field 六分支落地（test-first：契约测试断言每行列恰一 + 文本对应）
- [x] crud toolbar 纯布局层补 `data-slot="crud-toolbar-row"`（审计裁定补 slot 不合并：blocks 行并存、合并破坏布局）
- [x] statistics/sparkline 复核裁定为合规（根即壳承担 slot+锚，非冗余，无需整改）

Exit Criteria:

- [x] 每个 fix 项落地且有 focused 断言
- [x] 既有包测试无回归（data 1204/1204 + 4 契约用例）

### Phase 3 - 契约测试冻结

Status: completed
Targets: `src/__tests__/dom-structure-contract.test.tsx`（4 用例）

- Item Types: `Proof`

- [x] 契约测试冻结：table 根三件套 + td[data-field] 每行列恰一、crud 根 + toolbar-row slot、statistics/sparkline 根、data-source null-render（使用 527 helper，createDataSchemaRenderer harness）

Exit Criteria:

- [x] 契约测试落位并通过（4/4）
- [x] roadmap W4 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R2（fresh session）
- Verdict: pass（Round 1 issues → 1 项 Major 已修订：`<td data-field>` 改判为 confirmed contract drift 并入裁定流程；Round 2 复核通过）
- Rounds: 2
- Findings addressed: ①td data-field 从"既有契约"改判 drift + Decision/Fix 流程 ②清单补 data-source（null-render 豁免）③table-renderer 引用范围扩至 :511-565

## Closure Gates

- [x] 全部 type 审计卡六维收口（13/13）
- [x] 全部 in-scope fix 已落地并有 focused proof（td data-field 六分支 + crud-toolbar-row）
- [x] `dom-structure` 契约测试冻结（4 用例）
- [x] 不存在被静默降级的 in-scope live defect
- [x] owner docs 同步核对完成（owner doc :110 与实现一致）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；data 1208/1208 = 1204 + 4）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- echarts 数据派生可访问名与 sr-only 数据等价物（对齐 chart 的 chart-data-equivalent 模式；D6 最低要求已达标，属增强）

## Closure

Status Note: 2026-10-03 收口。td data-field owner-doc drift 按"补实现"裁定落地（六分支 + 契约冻结）；crud-toolbar-row 补章；13 卡落盘；statistics/sparkline 复核合规；echarts D6 达标（增强项入 Follow-ups）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_391d5a5a）
- Evidence: approved——td data-field 恰 6 处逐行核实、行保存条不打标、crud-toolbar-row :606、契约 4 用例、data 独立直跑 1208/1208；审计提出的 echarts follow-up 留痕已在收口时补登本节。
