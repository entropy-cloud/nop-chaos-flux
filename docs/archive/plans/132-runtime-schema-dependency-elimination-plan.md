# 132 Runtime Schema Dependency Elimination Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/logs/2026/04-23.md`, runtime schema-usage audit, `docs/plans/285-deep-audit-2026-05-14-plan-baseline-normalization-plan.md`
> Related: `docs/plans/131-static-analysis-optimization-plan.md`

## Purpose

收口 runtime 对 data-source / reaction 原始 schema 读取的已确认依赖，使这两类运行时路径改为只消费编译产物，并把未纳入本 plan closure 的后续优化显式移出 scope。

## Current Baseline

- `packages/flux-runtime/src/async-data/source-registry.ts`、`data-source-runtime.ts`、`reaction-runtime.ts` 的 live baseline 已按 `docs/logs/2026/04-23.md` 落地到 compiled-source / compiled-reaction 输入。
- 历史文本曾把 `RendererComponentProps.schema` 移除、DevTools conditional schema storage、文档补写和已完成核心迁移混写在同一份已 `completed` plan 内，导致顶部 `completed` 与内部 deferred / unchecked checklist 并存。
- 本次规范化不重开代码实现；只把已闭合的核心 scope 和已裁定移出的 residual scope 用当前 guide 语义写清。

## Goals

- 用当前 plan guide 语义准确记录：runtime 的 data-source / reaction 路径已经不再依赖 raw schema。
- 把 `RendererComponentProps.schema` 去除、DevTools schema strip、后续 owner-doc 完善显式改写为非本 plan closure 前置条件。

## Non-Goals

- 不新增或回滚任何 runtime/compiler 代码。
- 不在本 plan 内继续推进 `RendererComponentProps.schema` 全量移除。
- 不在本 plan 内推进 production-only schema strip / debugger 存储方案。

## Scope

### In Scope

- `packages/flux-core/src/types/{compilation.ts,node-identity.ts,renderer-core.ts}`
- `packages/flux-compiler/src/{source-compiler.ts,reaction-compiler.ts,schema-compiler.ts}`
- `packages/flux-runtime/src/async-data/{source-registry.ts,data-source-runtime.ts,reaction-runtime.ts,data-source-runtime-utils.ts}`
- 与上述落地对应的 focused tests、daily-log evidence、plan closure text

### Out Of Scope

- 全仓 renderers 对 `props.schema` 的静态配置消费审计与移除
- DevTools / debugger schema 保留策略优化
- 单纯为补模板而重开新的代码或文档设计工作

## Execution Plan

### Phase 1 - Define Compiled Types

Status: completed
Targets: `packages/flux-core/src/types/compilation.ts`, `packages/flux-core/src/types/node-identity.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Added `CompiledApiConfig`, `CompiledOperationControl`, `CompiledDataSource`, and `CompiledReaction` type surfaces.
- [x] Extended `TemplateNode` with compiled source/reaction storage so runtime no longer needs these contracts from raw schema.
- [x] Exported the new compiled contracts for compiler/runtime consumption.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Compiled source/reaction types exist in the live repo.
- [x] Template-node typing exposes compiled source/reaction fields.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] `docs/logs/2026/04-23.md` records the landing.

### Phase 2 - Compile Sources And Reactions

Status: completed
Targets: `packages/flux-compiler/src/{source-compiler.ts,reaction-compiler.ts,schema-compiler.ts}`

- Item Types: `Fix | Proof | Decision`

- [x] Added source compilation for API/formula data-source contracts.
- [x] Added reaction compilation for watch / when / action contracts.
- [x] Integrated compiled source/reaction production into the schema compiler.
- [x] Added focused compiler tests for the new compilation paths.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Source and reaction compiler paths exist and are wired into schema compilation.
- [x] Focused compiler proof covers the compiled source/reaction contracts.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] `docs/logs/2026/04-23.md` records the landing.

### Phase 3 - Migrate Runtime Consumption

Status: completed
Targets: `packages/flux-runtime/src/async-data/{source-registry.ts,data-source-runtime.ts,reaction-runtime.ts,data-source-runtime-utils.ts}`, `packages/flux-core/src/types/renderer-core.ts`

- Item Types: `Fix | Proof | Decision`

- [x] `registerDataSource()` and `createDataSourceController()` now require compiled inputs instead of raw schema.
- [x] `registerReaction()` now requires `CompiledReaction` rather than reading reaction schema at runtime.
- [x] Runtime API/config/result-mapping evaluation occurs from compiled values with the intended dependency-tracking behavior.
- [x] Public runtime type surfaces were aligned to the compiled-input contract.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Live runtime async-data paths consume compiled source/reaction contracts only for the in-scope feature family.
- [x] Focused runtime verification and recorded test evidence exist for the migration.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] `docs/logs/2026/04-23.md` records the landing.

### Phase 4 - Remove `RendererComponentProps.schema`

Status: cancelled
Targets: `packages/flux-core/src/types/renderer-core.ts`, renderer packages consuming `props.schema`

- Item Types: `Decision | Follow-up`

- [x] Re-audited the historical note and confirmed this work did not land as part of the closed core migration.
- [x] Explicitly removed this item from the closure-critical scope of Plan `132`.
- [x] Recorded successor ownership requirement instead of leaving the item as an unchecked deferred phase.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The plan no longer claims this work landed under Plan `132`.
- [x] Successor ownership is explicitly recorded in `Deferred But Adjudicated`.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] `docs/logs/2026/05-15.md` records the baseline normalization.

### Phase 5 - DevTools Schema Retention Optimization

Status: cancelled
Targets: debugger/devtools schema retention strategy

- Item Types: `Decision | Follow-up`

- [x] Re-audited the historical note and confirmed production-only schema stripping was not required for the core runtime closure already landed.
- [x] Explicitly removed this optimization from the closure-critical scope of Plan `132`.
- [x] Recorded the item as a non-blocking successor-owned optimization instead of leaving unchecked exit criteria in-file.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The plan no longer presents this optimization as unfinished in-scope work.
- [x] Non-blocking successor ownership is explicitly recorded.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] `docs/logs/2026/05-15.md` records the baseline normalization.

## Closure Gates

- [x] The in-scope runtime schema-dependency defects for data sources and reactions are fixed on the recorded live baseline.
- [x] No in-scope runtime access to raw source/reaction schema remains hidden as unchecked plan text.
- [x] Focused compiler/runtime verification exists for the compiled source/reaction migration.
- [x] Items that did not land under this plan (`RendererComponentProps.schema` removal, DevTools schema strip) are explicitly moved out of closure-critical scope rather than left as silent deferred debt.
- [x] No owner-doc update is required beyond the touched plan text and cited daily-log evidence.
- [x] Independent closure audit confirms the normalized plan text matches the live baseline.

## Deferred But Adjudicated

### RendererComponentProps Schema Removal

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Plan `132` closed the runtime data-source / reaction raw-schema dependency, but live renderers still had legitimate static-config `props.schema` consumers; that broader cleanup requires its own narrower owner plan.
- Successor Required: `yes`
- Successor Path: `TBD by future renderer schema-consumer audit`

### DevTools Conditional Schema Retention

- Classification: `optimization candidate`
- Why Not Blocking Closure: production-only schema stripping/debug retention is a post-closure optimization and not required to establish the supported runtime contract that sources/reactions run from compiled inputs.
- Successor Required: `yes`
- Successor Path: `TBD by future debugger/devtools optimization plan`

### Post-Landing Architecture Doc Sync

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: the core code path and log evidence were sufficient for the original landing; this normalization pass only corrects historical plan semantics and does not reopen architecture-doc ownership.
- Successor Required: `no`
- Successor Path: `None`

## Non-Blocking Follow-ups

- If a future plan removes `RendererComponentProps.schema`, it should start from a live audit of legitimate static-config consumers rather than assuming Plan `132` already closed that work.
- If a future plan optimizes schema retention for debugger/devtools, it should treat this as an independent perf/debuggability tradeoff, not as a blocker on the compiled source/reaction contract.

## Closure

Status Note: Completed. Plan `132` closed the runtime contract drift for data sources and reactions by compiling those schemas ahead of time and migrating runtime async-data consumers to compiled inputs. The historical residual items about renderer schema removal and DevTools schema stripping were never part of the landed closure baseline and are now explicitly recorded as successor-owned or optional optimizations instead of contradicting the completed status.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent closure audit on 2026-05-15
- Evidence: Fresh closure audit over Plan `132`, the plan-authoring guide, and the cited runtime/compiler/log evidence confirmed the normalized file no longer mixes `completed` with unchecked deferred work and that only the in-scope compiled source/reaction migration is treated as closed.

Follow-up:

- No remaining Plan `132`-owned work.
