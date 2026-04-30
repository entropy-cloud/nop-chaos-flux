# 136 CRUD Workflow Completion Plan

> Plan Status: completed
> Last Reviewed: 2026-04-24
> Source: `docs/components/crud/design.md`, `docs/components/table/design.md`, `docs/components/form/design.md`, `docs/components/dialog/design.md`, `docs/components/data-source/design.md`, `docs/architecture/action-interaction-state.md`, `docs/architecture/node-level-compile-time-transforms.md`, `docs/architecture/renderer-runtime.md`, `docs/plans/114-crud-component-implementation-plan.md`, live repo audit of `packages/flux-renderers-data`, `packages/flux-compiler`, `apps/playground`, and `c:/can/nop/amis-react19`
> Related: `docs/plans/114-crud-component-implementation-plan.md`

## Purpose

这份计划用于把当前已经存在的 `crud` thin shell，推进到“可作为 Flux 正式 CRUD workflow 基线”的完整能力状态：

- 接通 CRUD 主工作流，而不是只停留在 schema 契约和基础外壳。
- 让当前支持范围内的 AMIS `crud` 配置可以较低心智成本迁移到 Flux JSON。
- 让文档、示例、playground、focused tests 与 live behavior 一致，并明确区分“已实现能力”和“仅契约已定义能力”。

注意：本计划的 closure 目标是“CRUD workflow 主路径基线可用”，不是单计划内一次性完成与 AMIS CRUD 的全部 feature parity。最终要做到与 AMIS CRUD 完全对齐，仍需要本计划之后的 successor plans 继续收口 table-heavy parity、editing/runtime parity，以及更完整的迁移/兼容验证。

## Current Baseline

- `docs/components/crud/design.md` 已把 CRUD 正式 schema 收敛到 `queryForm`、`listActions`、`columns`、`columnSettings`、`responsive`、`clientMode`、`pageField`、`pageSizeField` 等 Flux 命名，并补了 AMIS 映射表、迁移示例和特性对比列表。
- `packages/flux-renderers-data/src/crud-schema.ts` 已声明大量 CRUD 契约字段，`packages/flux-renderers-data/src/index.tsx` 也注册了 `crud` 的 prop contracts、scope export contract 和 `authoringTransform`，可把 legacy `bulkActions` lower 到 canonical `listActions`。
- `packages/flux-renderers-data/src/crud-renderer.tsx` 已不再是单纯 thin shell：query submit/reset、refresh params、`footerToolbar`、`toolbarLayout`、selection-driven `listActions`、`$crud/statusPath` 摘要发布，以及 `refresh/getSelection/clearSelection` component methods 都已有 live runtime 语义与 focused tests。
- 当前 CRUD 基线仍主要围绕数组型 `source` 与内部 query/pagination/sort/filter/selection 参数流；更完整的请求 owner 协作、地址栏同步、一次性加载模式等仍不在本计划 closure 范围。
- 当前 `$crud` 摘要已发布并被 tests/examples 消费：`query/pagination/sort/filters/selection` 已接通，`visibleColumnNames` 仍未接线。
- `packages/flux-renderers-data/src/schemas.ts` 与 table renderer 已有分页、排序、过滤、selection、expandable 的基础能力；`operation` 列按钮、left/right fixed columns，以及 `columnSettings` 的最小 live baseline（列显隐 + ordered-column ownership + move up/down）均已 landed，但更完整的 table-heavy parity 仍未全部收口。
- `CrudStatusSummary.visibleColumnNames` 虽然已在类型表面存在，但它依赖 column settings / visible-column ownership；该字段不在本计划 closure 范围内。
- `packages/flux-renderers-data/src/__tests__/data-crud.test.tsx` 当前只覆盖 shell markers、基础 queryForm 渲染、selection summary、empty state 和 component handles；还没有覆盖真实的 CRUD 查询、刷新、分页/排序/过滤摘要发布、selection-driven list actions、迁移 alias 等关键行为。
- `docs/plans/114-crud-component-implementation-plan.md` 已完成首版“注册 CRUD + thin shell + 基础测试”的 slice，但其中不少 baseline 已被后续设计更新，例如 `bulkActions` 已改为 canonical `listActions`，且 114 号计划不应再被解读为“CRUD 已彻底完成”。
- 当前 owner 归属已经可明确写死：
  - CRUD owner scope: `queryForm` 提交/重置到 refresh 参数流、`source`/table 协作、`footerToolbar`/`toolbarLayout` 的组合渲染、`$crud` 摘要发布、selection-driven `listActions` 工作流、迁移 alias canonicalization。
- Table owner scope: fixed columns、column settings、responsive more-columns expansion、header search/filter UI；其中 fixed columns 作为 CRUD 主工作流可观察依赖，纳入本计划协同收口。
  - Editing/runtime extension scope: `quickEdit`、`quickSaveAction`、`quickSaveItemAction`、`clientMode.loadDataOnce`、`syncLocation`。
- 本计划明确只收口 CRUD workflow 主路径，并把 `operation` 列稳定性与 fixed columns 这两个直接影响 CRUD 主列表可用性的依赖一并收口；执行过程中额外落下了 `columnSettings` 最小可用 baseline，但更完整的 table-heavy parity 与 editing-heavy parity 仍保留给 successor plans。

## Goals

- 让 `crud` 成为可用的完整数据工作流 renderer，而不只是表格外壳。
- 建立清晰的 CRUD runtime ownership：`crud` 只做工作流编排与 summary publication，不偷建第二套 canonical state/store。
- 让 `docs/components/crud/design.md`、`docs/components/crud/example.json`、`docs/components/crud/migration-example.json`、playground 示例和 focused tests 一起构成 repo-observable baseline。
- 用 compiler-level `authoringTransform` 承接与本计划同 scope 的 AMIS/legacy sugar，避免 runtime renderer 再做 ad hoc normalize。
- 让 CRUD 场景下的 `operation` 列与 left/right fixed columns 都具备 repo-observable live behavior，而不是停留在 schema surface。

## Non-Goals

- 不把 CRUD 做成巨型单体 JSX 组件，也不复制 AMIS 的内部实现结构。
- 不在本计划中收口更完整的 column settings parity（拖拽、overlay、持久化策略等）、responsive more-columns expansion、header search/filter UI。
- 不在本计划中收口 `quickEdit`、`quickSaveAction`、`quickSaveItemAction`、`clientMode.loadDataOnce`、`syncLocation`。
- 不引入与现有 `table`、`form`、`dialog`、`data-source` 平行的 CRUD 私有 canonical state owner。
- 不把迁移工具 CLI 本身纳入本计划；本计划只负责让当前支持范围内的 schema、authoring transform、示例和 runtime 具备迁移落点。

## Scope

### In Scope

- `packages/flux-renderers-data/src/crud-*` 中与 query/refresh/summary/toolbar workflow 直接相关的实现补齐
- `packages/flux-renderers-data/src/table-renderer/*` 中与 `operation` 列稳定性和 fixed columns 直接相关的实现补齐
- `packages/flux-compiler/src/schema-compiler/authoring-transform.ts` 与 `crud` authoring transform 中仅与本计划同 scope 的迁移 alias 补齐
- `apps/playground` 中的 CRUD workflow 示例页
- `docs/components/crud/*`、`docs/architecture/node-level-compile-time-transforms.md`、daily log 的同步更新
- focused tests：renderer tests、compiler tests、playground-facing focused verification

### Out Of Scope

- 更完整的 column settings parity（拖拽、overlay、持久化策略等）、responsive more-columns expansion、header search/filter UI
- `quickEdit`、`quickSaveAction`、`quickSaveItemAction`、`clientMode.loadDataOnce`、`syncLocation`
- 通用 AMIS JSON 批量迁移 CLI
- cards mode、tree mode、多视图切换
- saved queries、用户级列配置持久化、导入导出编排、离线缓存等后续扩展

## Execution Plan

### Phase 1 - Wire Query Submit Reset And Refresh Flow

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-data/src/crud-schema.ts`, `packages/flux-renderers-data/src/__tests__/data-crud.test.tsx`

- [x] 让 `queryForm` 提交和重置真正驱动 CRUD refresh 参数，而不是仅渲染内部 form shell
- [x] 让 refresh 路径统一消费 query/default params/`pageField`/`pageSizeField`，而不是只刷新本地数组 table
- [x] 明确并实现本计划内的最小数据工作流基线：至少支持数组型 `source` 加上 CRUD 内部 query/pagination/sort/filter 参数流，并用 focused tests 证明 refresh 输入会随之变化
- [x] 补齐 query submit、query reset、refresh 的 focused tests

Exit Criteria:

- [x] 至少一条 focused test 证明 query submit 会影响下一次 refresh 输入
- [x] 至少一条 focused test 证明 query reset 会清理下一次 refresh 输入，而不是只清 UI

### Phase 2 - Publish Workflow Summary And Toolbar Semantics

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-data/src/__tests__/data-crud.test.tsx`, playground CRUD example

- [x] 打通 `source`、分页、排序、过滤、selection 与 `$crud/statusPath` 摘要的联动发布
- [x] 补齐 `footerToolbar`、`toolbarLayout`、`listActions` 的 live render 与标准块协作
- [x] 让 selection-driven list actions 的 enable/disable 与 refresh 后清理策略具备 focused tests
- [x] 确认 `operation` 列在 CRUD 场景下继续保持 live behavior，并补充 focused regression coverage

Exit Criteria:

- [x] `$crud` 能稳定发布 query/pagination/sort/filters/selection 摘要，并能被 toolbar/listActions 消费
- [x] `footerToolbar` 不再只是 schema 字段，而是 live render behavior
- [x] `toolbarLayout` 至少有一条 focused test 或 playground-observable 结果，证明标准 toolbar block 已能稳定渲染
- [x] 至少一条 focused test 证明 CRUD 表格中的 `operation` 列按钮仍可稳定渲染与交互

### Phase 3 - Land Fixed Columns For CRUD Main List Usability

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/*`, `packages/flux-renderers-data/src/schemas.ts`, `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`, `packages/flux-renderers-data/src/__tests__/data-crud.test.tsx`, playground CRUD example

- [x] 让 `table`/`crud` 真正消费 `columns[].fixed`，而不是只在 schema surface 暴露字段
- [x] 支持 left/right fixed columns 的 header/body 对齐、selection/expand 列并存场景，以及 operation 列作为 fixed right 常见用法
- [x] 增加 focused tests，证明左侧固定列和 operation 固定列在 CRUD 主列表中具备稳定 DOM/behavior 基线

Exit Criteria:

- [x] 至少一条 focused test 证明 `fixed: 'left'` 在 CRUD/table live DOM 中可观察成立
- [x] 至少一条 focused test 证明 `type: 'operation'` 列可与 fixed columns 共存而不回退成普通列
- [x] playground 或 example 能人工复核 fixed columns 在 CRUD 主列表中的可用性

### Phase 4 - Land Migration Aliases For Live Workflow Semantics

Status: completed
Targets: `packages/flux-renderers-data/src/index.tsx`, `packages/flux-compiler/src/schema-compiler/authoring-transform.ts`, compiler tests, CRUD docs/examples

- [x] 把 `filter -> queryForm`、`primaryField -> rowKey`、`perPageField -> pageSizeField` 加入 `crud` authoring transform
- [x] 只在本计划已具备 live workflow 语义的字段上增加 alias；不为未实现能力预埋误导性 canonicalization
- [x] 增加 focused compiler tests，证明 alias 输入会 lower 到当前 live canonical fields

Exit Criteria:

- [x] 常见 AMIS CRUD workflow 字段在当前支持范围内可直接 canonicalize 到 Flux schema
- [x] 迁移 alias 与 live runtime 支持范围严格一致

### Phase 5 - Playground And Docs Closure

Status: completed
Targets: `apps/playground`, `docs/components/crud/design.md`, `docs/components/crud/example.json`, `docs/components/crud/migration-example.json`, `docs/logs/2026/04-24.md`

- [x] 在 playground 增加可人工复核的 CRUD workflow 示例页，包括 `operation` 列和 fixed columns 的可观察结果
- [x] 重写 CRUD 设计文档中的特性对比表，只把本计划已真正落地的 workflow 项标成已实现
- [x] 同步 example 和 migration-example，使其与 live behavior 和 authoring transform 一致

Exit Criteria:

- [x] playground/examples/docs 能证明 CRUD workflow 主路径已可用，且包含 fixed columns / operation 列基线
- [x] 文档不再把 table-heavy parity 或 editing-heavy parity 误写成本计划已完成

### Phase 6 - Verification And Independent Closure Audit

Status: completed
Targets: touched CRUD/compiler files, focused tests, `docs/plans/136-crud-workflow-completion-plan.md`, `docs/logs/2026/04-24.md`

- [x] 扩充 CRUD focused tests，至少覆盖查询、重置、刷新、分页/排序/过滤摘要发布、selection-driven list actions、fixed columns、operation regression、migration alias
- [x] 运行完整验证并更新 daily log
- [x] 进行一次独立子 agent closure audit，确认“契约字段存在”与“语义真正落地”没有被混淆

Exit Criteria:

- [x] tests/docs/playground 与 live CRUD workflow baseline 一致
- [x] 本计划可以用独立 closure audit 证据回答“CRUD workflow 主路径什么时候算真正可用”

## Validation Checklist

- [x] CRUD 查询、刷新、分页、排序、过滤、selection 工作流具备 focused behavior tests
- [x] `operation` 列与 fixed columns 具备 focused behavior tests
- [x] `authoringTransform` 已承接关键 AMIS/legacy CRUD workflow alias，且有 compiler tests
- [x] `docs/components/crud/design.md`、`docs/components/crud/example.json`、`docs/components/crud/migration-example.json`、playground 示例已同步
- [x] 特性对比表已按 live behavior 重写，不再把“契约已定义”误写成“已实现”
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

- 最大风险是把 CRUD workflow 需求直接堆回 `crud-renderer.tsx`，让它重新长成一个新的巨型 owner 组件。
- 第二个风险是把 table feature parity 和 CRUD workflow parity 混在一起，导致计划再次失控。
- 第三个风险是迁移 alias 越加越多，却超出当前 live semantics 支持范围。
- 第四个风险是只看 schema/type/contract surface 就宣布 CRUD 已完成，而没有真正补齐 live behavior 和 focused verification。

Rollback:

- 若某个 parity slice 证据表明应该先落到 `table` 再回到 `crud`，允许把该 slice 显式拆到 successor plan，但不得在未说明剩余归属的情况下把本计划标记为完成。

## Closure

Status Note: completed; a fresh independent closure audit re-verified the live repo and confirmed that Plan 136's CRUD workflow baseline is now fully landed. Live code, focused CRUD/table/compiler tests, playground/docs/examples, and full workspace verification all match the plan scope, and no remaining plan-owned gaps were found.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent (`task_id: ses_23f9e92abffe671s4w7pEVjVCo`)
- Evidence: final closure audit returned `Decision: completed` after re-checking `packages/flux-renderers-data/src/crud-renderer.tsx`, focused CRUD/table tests, compiler alias tests, playground CRUD lab, CRUD docs/examples, and full workspace verification (`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`). The prior negative audit (`task_id: ses_23fe7053effe4xc26Paps0ZwsP`) remains recorded as the evidence trail for the last plan-owned gaps that were fixed before closure.

Follow-up:

- no remaining plan-owned work
- Successor plan A: table-heavy parity for CRUD dependencies beyond the minimum landed baseline (`columnSettings` richer parity, `responsive expansion`, `header search/filter UI`)
- Successor plan B: editing/runtime extensions (`quickEdit`, `quickSaveAction`, `quickSaveItemAction`, `clientMode.loadDataOnce`, `syncLocation`)
- Successor plan C: AMIS CRUD full-parity closure audit and remaining migration/runtime gaps after A+B land

## Supersession Note

- 本计划不是回滚或否定 `docs/plans/114-crud-component-implementation-plan.md` 已完成的首版落地；114 号计划记录的是“thin shell 注册与基础能力接线”这一已完成 slice。
- 本计划接管的是“CRUD workflow 主路径 completion”的剩余 owner-level 工作；table-heavy parity 与 editing-heavy parity 不再由本计划直接关闭。
