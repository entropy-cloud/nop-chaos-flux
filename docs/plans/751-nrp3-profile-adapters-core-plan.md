# 751 NRP-3 profile adapters core：field source + field drop + inspector schema（nop-report）

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/report-designer-nop-report-roadmap.md`（NRP-3 work item）、`docs/plans/640-nop-report-profile-plan.md` Phase 3/4（设计种子，superseded）、`docs/architecture/report-designer/nop-report-profile.md` §5/§6/§7
> Related: `docs/plans/749-...`（NRP-1，completed）、`docs/plans/750-...`（NRP-2，completed）

## Purpose

落地 `nop-report` profile 的三个核心 adapter 面：数据集→字段树的 `FieldSourceProvider`、字段 drop→`cellMeta['nop-report'].model` patch 的 `FieldDropAdapter`、以及 cell Basic + cell XPT + sheet/workbook 级的 inspector schema 生成器。全部为纯逻辑 + focused 单测；装配（`createNopReportProfile`）与端到端消费归 NRP-5。

## Current Baseline

- `FieldSourceProvider` 契约（`adapters.ts:19-25`）+ 消费链：`runtime/field-sources.ts` 的 `loadFieldSources` 只加载 `config.fieldSources[].provider` 命中且 `selectedFieldSourceIds` 含其 id 的 provider（`selectedFieldSourceIds` 来自 `profile.fieldSourceIds`，`core.ts:93-97`）。快照形状 `FieldSourceSnapshot{id,label,groups[{id,label,fields[{id,label,path?,fieldType?,meta?}],expanded}],provider?}`（`types.ts:71-91`）。
- `FieldDropAdapter` 契约（`adapters.ts:27-39`）+ 消费链：`core-dispatch.ts:84-132` `report-designer:dropFieldToTarget` 按 `allowedFieldDropIds`（= `profile.fieldDropIds`）过滤后取第一个 `canHandle` 的 adapter，`mapDropToMetaPatch` 产 patch → `mergeMetadata` → `updateMetadata` 写入 `semantic.*Meta`。无 adapter 时走 `applyFieldDrop` 兜底。`createMetaPatchDropAdapter`（`adapters.ts:141-155`）是通用工厂。
- inspector schema 解析：`runtime/inspector-panels.ts` `resolveInspectorSchemaForTarget`——`profile.inspectorSchemaId` 命中 `config.inspector.byProfile[schemaId][kind]` 优先，其次 `byTarget[kind]`，最后 `inspector.body`。inspector 渲染走 `report-designer-inspector.tsx`（`helpers.render(resolvedSchema)`）。
- host action 通道：`@nop-chaos/report-designer-renderers` 的 host action 通道，`report-designer:updateMeta` 命令（`commands.ts:28-32`，需显式 `target` + `patch`）经 `host-action-provider.ts` 以 `report-designer:updateMeta` NamespacedAction（`namespace`+`method`+`args`）暴露给 schema。
- drag payload：`@nop-chaos/report-designer-renderers` 的 `report-field-panel.tsx:22` MIME `application/x-nop-report-field`；`FieldDragPayload{type,sourceId,fieldId,data}`。
- `packages/report-designer-nop-report` 已有 codec（NRP-2）与 `*Like` 类型；无 profile adapter。

## Goals

- `createNopReportDatasetProvider(options)`：数据集数组（静态或工厂函数）→ `FieldSourceSnapshot[]`（每数据集一个 source，groups=字段树，字段 meta 携带 `dataset`/`path`/`valueType`）；支持 abort 语义。
- `createNopReportCellBindingDropAdapter()`：drop 到单 cell → patch `{ 'nop-report': { model: { field: <path>, ds: <dataset> } } }`；range drop 首版不支持——通用工厂 `createMetaPatchDropAdapter` 的 canHandle 只匹配 fieldType、表达不了 target.kind 判定，故本 adapter 写自定义 `canHandle`（`target.kind==='cell'`），显式 deferred 见 Deferred 节。
- `createNopReportInspectorSchemas()`：生成 cell（Basic 段 + XPT 段）/sheet/workbook 三个 Flux schema；XPT 段覆盖 13 个 model 字段（`field/ds/expandType/expandExpr/valueExpr/formatExpr/styleIdExpr/linkExpr/rowParent/colParent/exportFormula/editorId/viewerId`）；`*Expr` 五字段带 expression-kind 标记（供 NRP-4 expression editor adapter 消费）；提交动作为 `report-designer:updateMeta` namespaced action（`args.target = ${selectionTarget}`）。
- 三者 focused 测试覆盖契约与消费链（provider 经 `loadFieldSources`、drop 经 `dropFieldToTarget` 命令链、schema 经 `resolveInspectorSchemaForTarget` byProfile 解析）。

## Non-Goals

- 不做 profile 总装配（`createNopReportProfile`/`registerNopReportAdapters`，NRP-5）。
- 不实现 expression editor / reference picker adapter（NRP-4；本 plan 只产出标记）。
- 不做 demo/e2e（NRP-5）。
- 不改通用 core 契约（`referencePickerId?` 加法归 NRP-4）。

## Scope

### In Scope

- `packages/report-designer-nop-report/src/field-source.ts`、`field-drop.ts`、`inspector-schema.ts` + `__tests__` 三个测试文件 + `index.ts` 导出。
- `nop-report-profile.md` §5/§6/§7 与实现的收敛（如措辞与 live 不符就地收敛）；roadmap §5 NRP-3 状态回写；daily log。

### Out Of Scope

- renderer/demo/e2e、preview adapter、profile 装配。

## Failure Paths

| 可测场景编号            | 触发                                            | 行为（含错误码）                                                                                                 | 可重试 | 用户可见表现   |
| ----------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| provider-load-aborted   | `loadFieldSources` 传入 aborted signal          | 返回空数组，不调用 provider                                                                                      | 是     | 字段面板为空   |
| provider-dataset-error  | 工厂函数抛错                                    | `load` rejects（命令链 `{ok:false,error}`），不产 partial snapshots                                              | 是     | 错误提示       |
| drop-unsupported-target | drop 到 range / fieldType 不匹配                | `canHandle=false` → 无 patch、无副作用                                                                           | 是     | drop 无效果    |
| inspector-no-schema     | target kind 无 schema 且 byTarget/body 均未配置 | `resolveInspectorSchemaForTarget` 返回 undefined → 整侧隐藏（既有行为；测试 config 不得配置 byTarget/body 兜底） | 是     | inspector 空态 |

## Test Strategy

本档选择：`必须自动化`。

- Proof 先于 Fix：provider/drop/schema 三组 focused 测试先红后绿。
- drop 判别机制：不产生标准化 patch（直接改 document 或写错命名空间）的实现必挂 `cellMeta['nop-report'].model` 断言；range 收放失控必挂 `canHandle(range)=false` 断言。
- 命令链测试：drop 经 `createReportDesignerCore().dispatch({type:'report-designer:dropFieldToTarget'})` 后 `cellMeta` 落 `field`/`ds`。

## Execution Plan

### Phase 1 - field source provider + field drop adapter

Status: completed
Targets: `packages/report-designer-nop-report/src/field-source.ts`、`field-drop.ts`、`__tests__/field-source.test.ts`、`__tests__/field-drop.test.ts`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：provider focused 测试——数据集→快照映射、字段 meta 携带 dataset/path、abort 返回空、工厂抛错 reject；并经 `loadFieldSources`（report-designer-core 消费链）集成断言。
- [x] Proof（先红）：drop adapter focused 测试——cell 命中 patch 形状、range `canHandle=false`；并经 `dropFieldToTarget` 命令链断言 `semantic.cellMeta[sheetId][address]['nop-report'].model` 落 `field`/`ds`。
- [x] Fix（实现 provider 与 drop adapter。

Exit Criteria:

- [x] 两组测试存在且通过；命令链断言可指认（drop 只产生标准化 designer command patch，不直接改 document）。
- [x] `pnpm --filter @nop-chaos/report-designer-nop-report test` 全绿。

### Phase 2 - inspector schema

Status: completed
Targets: `packages/report-designer-nop-report/src/inspector-schema.ts`、`__tests__/inspector-schema.test.ts`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：schema 生成测试——cell schema 含 Basic 段（value/type/styleId/comment/linkUrl/protected）与 XPT 段（13 字段）；5 个 `*Expr`/`expandExpr` 字段带 expression-kind 标记；sheet/workbook schema 存在；`resolveInspectorSchemaForTarget` 以 `byProfile[NOP_REPORT_INSPECTOR_SCHEMA_ID]` 解析出对应 schema；无 schema 的 kind 返回 undefined。
- [x] Fix（实现 `createNopReportInspectorSchemas()` + `NOP_REPORT_INSPECTOR_SCHEMA_ID`；提交按钮为 `report-designer:updateMeta` namespaced action（args 携带 `target=${selectionTarget}` 与 patch）。

Exit Criteria:

- [x] schema 测试存在且通过；expression-kind 标记断言可指认（NRP-4 消费前提）。
- [x] `pnpm --filter @nop-chaos/report-designer-nop-report typecheck`/`test` 全绿。

### Phase 3 - owner-doc 回写与收口

Status: completed
Targets: `docs/architecture/report-designer/nop-report-profile.md`、`docs/backlog/report-designer-nop-report-roadmap.md`、`docs/logs/2026/10-26.md`

- Item Types: `Fix`

- [x] Fix（`nop-report-profile.md` §5/§6/§7 与 live 实现对齐（provider 形态、drop 单 cell 裁定、schema 生成器落点）；`index.ts` 导出新面。
- [x] Fix（daily log 记录；roadmap §5 NRP-3 随 closure 回写 `done`。

Exit Criteria:

- [x] owner doc 与 live 一致；本 plan 全部 Phase completed。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 3 Minor）
- Rounds: 1
- Findings addressed: Minor 1（inspector-no-schema 失效路径须以无 byTarget/body 兜底的 config 构造，已改）、Minor 2（report-field-panel/host-action-provider 归属包名已补 `@nop-chaos/report-designer-renderers`）、Minor 3（canHandle(range)=false 机制已写明为自定义 canHandle，已改）。

## Closure Gates

- [x] 所有 in-scope confirmed live defect 已修复（profile adapter 三面缺失 → 落地）。
- [x] 所有 in-scope confirmed contract drift 已收敛（nop-report-profile.md §5/§6/§7）。
- [x] 行为/契约结果已达成：provider/drop/schema 契约 + 消费链 focused 证明。
- [x] 必要 focused verification 已完成。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增 red）

## Deferred But Adjudicated

### range drop 批量 patch

- Classification: `watch-only residual`
- Why Not Blocking Closure: roadmap §6 NRP-3 已裁定"range drop 首版单 cell（range 显式 deferred 或实现批量 patch，二者取一）"；本 plan 取 deferred，单 cell 绑定覆盖主要路径。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: 2026-10-26 收口。三个 profile adapter 面落地并通过独立子 agent closure audit（`approved`，0 Blocker / 0 Major / 3 Minor；Minor 1/2 为回写项，已随本回写修复）。roadmap §5 NRP-3 随本回写翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-26）
- Evidence: verdict `approved`——逐文件核阅 field-source/field-drop/inspector-schema 实现与 3 个测试文件；drop 命令链测试断言 `semantic.cellMeta[sheetId].B2['nop-report'].model`（语义落地非接口壳）；abort 测试实证工厂未被调用；包内 43/43 tests 全绿 + typecheck 干净；向后兼容加法（`resolveInspectorSchemaForTarget` 导出、`@nop-chaos/flux-core` 依赖）确认无 core 行为变更。

Follow-up:

- NRP-4/NRP-5 归 roadmap 队列，无剩余 plan-owned work。
