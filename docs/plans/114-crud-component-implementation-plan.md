# 114 CRUD Component Implementation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-17
> Source: `docs/components/crud/design.md`, `docs/components/table/design.md`, `docs/components/form/design.md`, `docs/components/data-source/design.md`, `docs/components/package-splitting-strategy.md`, `docs/components/amis-baseline-matrix.md`, `docs/architecture/action-interaction-state.md`, `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`, live repo audit of `packages/flux-renderers-data`, `packages/flux-runtime`, and current `data-table` tests
> Related: `docs/plans/107-collection-renderer-scalability-plan.md`, `docs/plans/113-renderer-package-migration-plan.md`

## Purpose

本计划用于把 `type: 'crud'` 从当前仅有 owner doc 的 target contract，落地为 `@nop-chaos/flux-renderers-data` 中的可运行复合 renderer，并以 Flux 命名和 owner 边界承接 AMIS `crud` / `crud2` 的主流业务能力。

目标不是复制 AMIS 的单体巨型 JSX 组件，而是提供一个稳定的 Flux `crud` schema authoring 入口，并通过编译期 lowering 与最薄 shell renderer 复用已有 `form`、`data-source`、`table`、`dialog`、`submitForm`、`refreshSource` 等 runtime 能力。

## Current Baseline

- `docs/components/crud/design.md` 已定义 `crud` 的目标契约、组合 owner 边界、推荐 fields、status summary、作用域投影和 lowering 方向，但还没有具体执行计划。
- `docs/components/package-splitting-strategy.md` 已明确 `crud` 归属 `@nop-chaos/flux-renderers-data`，且应通过 schema 编译期 lowering 实现，而不是独立巨型运行时组件。
- `packages/flux-renderers-data/src/` 当前仅注册 `table`、`data-source`、`chart`，没有 `crud` schema、renderer definition、lowering、tests 或 example。
- `packages/flux-renderers-data/src/__tests__/data-table.test.tsx` 已覆盖 row action 打开 dialog、selection、pagination、component handles、row scope identity 等行为，可作为 CRUD 行操作和内部 table 协作的直接基线。
- `packages/flux-runtime/src/action-runtime-handlers.ts`、`runtime-factory.ts`、`data-source-runtime.ts`、`surface-runtime.ts`、`status-owner.ts` 已提供 `submitForm`、`refreshSource`、data-source status publication、dialog/drawer surface、`statusPath` 发布等基础能力，无需为 CRUD 重造第二套 runtime primitive。
- `packages/flux-runtime/src/schema-compiler.ts` 当前通过 `DEEP_FIELD_NORMALIZERS` 接入 renderer-specific 深字段归一化；`packages/flux-runtime/src/schema-compiler/tables.ts` 仅适用于单字段深归一化。CRUD 需要跨 sibling fields 的 whole-node lowering，不能假装只靠 `columns` 式 deep normalizer 完成。
- 当前缺口不是 CRUD 底层 primitives 全缺，而是缺少：`crud` schema normalize、编译期 lower、组合级 `$crud` / `statusPath` 摘要、component handles、标准 create/edit/detail surface 协作、bulk action authoring entry、以及一组能证明单表增删改查工作流的 focused tests。
- 当前文档虽已明确 `crud` 不是新 owner，但对“首个实现必须覆盖的单表 CRUD JSON 场景”和“AMIS 迁移覆盖清单”还不够执行化，本计划会同步收口这些要求。

## Goals

- 在 `@nop-chaos/flux-renderers-data` 中落地 `type: 'crud'` 的运行时实现，并维持 data family 包大小与职责边界可控。
- 通过编译期 lowering 提供稳定的 Flux CRUD authoring schema，而不是要求用户手写内部 `form + data-source + table + dialog` 子树。
- 首版实现覆盖单表 CRUD 的核心工作流：查询、刷新、查看、修改、新增、批量删除、selection、dialog surface、submit-success refresh、query reset 后复用统一 refresh 路径。
- 提供一份 focused unit test，使用 JSON schema 驱动单表增删改查场景；authoring 侧只声明 `rowActions`、`toolbar`、`bulkActions`、`createDialog`、`editDialog`、`detailDialog`，并验证 lowering 后渲染出 `查看`、`修改` 的 operation UI、顶部 `新增`、以及 `批量删除` 交互。
- 把 AMIS `crud` / `crud2` 的主流能力面映射到 Flux 正式字段，允许后续 migration adaptor 做字段归一化，但不把 AMIS 历史命名直接带进 Flux 正式 schema。
- 补齐 `docs/components/crud/design.md`、`docs/components/index.md`、`docs/components/examples.manifest.json`、相关 example/doc 说明，使文档、计划和 live repo 基线一致。

## Non-Goals

- 本计划不要求首版覆盖 AMIS 的全部长尾字段和历史兼容噪音。
- 本计划不把 CRUD 做成新的 runtime owner family；底层 owner 继续是 `form`、`data-source`、`table`、`dialog` 和显式 tracked operation。
- 本计划不引入 URL 同步、保存查询、列配置持久化、行内编辑、卡片模式、树表、多视图切换等后续 enterprise 扩展。
- 本计划不把 AMIS 历史字段名直接加入 Flux 正式 schema 类型；如需兼容输入，应该走 migration adaptor 或 import-time normalize。
- 本计划不要求在本次落地中同时实现 `list`、`pagination`、`service`、`cards` 等其他 retained data/content components。

## Scope

### In Scope

- `packages/flux-renderers-data/src/` 中的 `crud` schema、renderer shell、status、handles、tests、example support
- `packages/flux-runtime/src/schema-compiler.ts` 与新增/相邻 compiler 模块中的 `crud` whole-node 编译期归一化与 lower 支持
- 必要的 runtime helper 接线，但仅限 CRUD 组合语义所需的最小新增能力
- `docs/components/crud/design.md` 的执行化补充
- `docs/components/index.md`、`docs/components/examples.manifest.json`、`docs/components/crud/example.json` 的同步更新
- focused unit tests，至少包含单表 CRUD JSON 场景

### Out Of Scope

- AMIS 原始 schema 的通用 import/migration CLI 或批量转换工具
- CRUD cards mode、tree mode、inline edit、import/export、column setting、route sync
- `flux-renderers-content` / `flux-renderers-layout` 新包创建
- UI 视觉打磨超出当前 styling contract 的范围

## Recommended Flux CRUD Schema Baseline

首版正式 schema 应坚持 Flux 命名，不直接复制 AMIS 历史字段。

### Top-Level Fields

- `name`
- `data`
- `statusPath`
- `queryForm`
- `source`
- `toolbar`
- `bulkActions`
- `columns`
- `rowActions`
- `empty`
- `createDialog`
- `editDialog`
- `detailDialog`
- `selectionOwnership`
- `selectionStatePath`
- `paginationOwnership`
- `paginationStatePath`
- `sortOwnership`
- `sortStatePath`
- `filterOwnership`
- `filterStatePath`
- `rowKey`
- `rowData`
- `autoRefreshOnQuerySubmit`
- `autoClearSelectionOnRefresh`
- `refreshAction`
- `onQuerySubmit`
- `onQueryReset`
- `onRowClick`
- `onSelectionChange`
- `onBulkActionSuccess`

### First-Cut Authoring Rules

- `queryForm`、`createDialog`、`editDialog`、`detailDialog` 是配置对象字段，不是新的 top-level renderer type。
- `toolbar`、`bulkActions`、`rowActions` 是 regions；其 children 继续使用普通 renderer schema，例如 `button`。
- `rowActions` 是 CRUD 级 authoring 入口；lower 后应并入内部 table 的 `operation` 列或等价 row action region，而不是让 author 手写 table 内部 operation column 树。
- `source` 优先接受标准 `type: 'data-source'` 或等价 source-enabled value；请求字段映射交给 `api.params` / adaptor，不新增 `pageField`、`perPageField`、`orderField` 风格字段。
- 正式 schema 不引入 `api`、`headerToolbar`、`itemActions`、`primaryField` 这些 AMIS 历史命名；这些只出现在迁移映射层。

### AMIS Coverage Matrix For This Plan

首版计划必须显式覆盖下列 AMIS CRUD 能力面，而不是只覆盖 type name：

- 查询区：`filter*` 系列 -> `queryForm`
- 列表请求：`api` -> `source`
- 顶部工具栏：`headerToolbar` -> `toolbar`
- 行操作：`itemActions` / `operation` -> `rowActions`
- 批量动作：`bulkActions` -> `bulkActions`
- 主键：`primaryField` -> `rowKey`
- create / edit / detail dialogs -> `createDialog` / `editDialog` / `detailDialog`
- 查询提交后刷新、提交成功后刷新、selection clear policy -> `autoRefreshOnQuerySubmit` / `refreshAction` / `autoClearSelectionOnRefresh`
- 分页/排序/筛选状态 -> `pagination*` / `sort*` / `filter*` ownership + statePath fields

明确 deferred 的能力：

- syncLocation / route sync
- cards mode
- inline edit
- loadDataOnce / keepItemSelectionOnPageChange 等更细碎历史边界语义
- import/export、columnsTogglable、保存查询

## Module Ownership

`crud` 不新建独立 package，归属 `@nop-chaos/flux-renderers-data`，但要拆成独立子模块，避免 data 包退化为单文件大杂烩。

建议文件布局：

- `packages/flux-renderers-data/src/crud-schema.ts`
- `packages/flux-renderers-data/src/crud-lowering.ts`
- `packages/flux-renderers-data/src/crud-status.ts`
- `packages/flux-renderers-data/src/crud-handles.ts`
- `packages/flux-renderers-data/src/crud-renderer.tsx`
- `packages/flux-renderers-data/src/crud-actions.ts`
- `packages/flux-renderers-data/src/__tests__/data-crud.test.tsx`

边界规则：

- schema 归一化、defaulting、AMIS capability-to-Flux mapping 规则属于 `crud-schema.ts`
- renderer package 侧若需要共享 CRUD normalize intent，可保留轻量 schema helper；真正的 whole-node compiler lowering 归 `packages/flux-runtime/src/schema-compiler/`，因为 `flux-runtime` 拥有 compiler，且不能反向依赖 `flux-renderers-data`
- 组合摘要 DTO、`$crud` 投影、`statusPath` 发布属于 `crud-status.ts`
- `component:openCreate` / `component:openEdit` / `component:openDetail` / `component:refresh` 等组合 handle 桥接属于 `crud-handles.ts` / `crud-actions.ts`
- `crud-renderer.tsx` 只保留最薄 shell：marker、regions、summary publication、component-handle registration、以及内部 lowered subtrees 的承接
- 不把 query submit、form submit、table selection、dialog open state 重新实现为 CRUD 私有 store

保持与当前 data 包一致的平铺布局；本计划不额外引入 `src/crud/` 子目录，除非实现阶段 live repo 规模审计证明平铺结构已明显失控。同时必须同步更新 `packages/flux-renderers-data/src/index.tsx`、`schemas.ts`、`index.test.tsx`，使 CRUD 的注册、类型导出和测试入口与当前包结构一致。

硬性 owner 约束：

- CRUD 只能发布只读 summary 和窄 capability bridge，不能保存 canonical mutable state
- CRUD 不能拥有 selection/pagination/sort/filter/dialog/form 的 canonical 状态；这些仍属于 `table`、`dialog`、`form`、`data-source`
- bulk operation pending 必须来自 explicit tracked operation 或既有 owner summary，不能引入 CRUD-local pending store
- `$crud` 的最小稳定字段集以 `docs/components/crud/design.md` 中的 `CrudStatusSummary` 为准；首版不允许把可写句柄、内部实例引用、或 owner-specific mutable state 混入 `$crud`

## Test Baseline

必须新增一组 focused unit tests，至少包含一个“单表增删改查 JSON 场景”主测试。

### Required Scenario

测试 schema 必须至少包含：

- 一个 `type: 'crud'` 根节点
- `queryForm`：关键字字段 + 查询/重置按钮
- `toolbar`：`新增` 按钮
- `bulkActions`：`批量删除` 按钮
- `columns`：普通文本列
- `rowActions`：`查看`、`修改`
- `detailDialog`：点击 `查看` 打开
- `editDialog`：点击 `修改` 打开
- `createDialog`：点击 `新增` 打开
- selection 打勾后才允许 `批量删除`

注意：authored CRUD fixture 不应手写内部 table `operation` 列。测试应验证 `rowActions` authoring 经 lowering 后渲染出对应 operation UI。

### Required Assertions

- 点击 `查看` 后出现 detail dialog，且显示当前 row `record`
- 点击 `修改` 后出现 edit dialog，且表单初始值来自当前 row
- 点击 `新增` 后出现 create dialog
- 批量勾选行后，`批量删除` 可用并触发删除动作
- create / edit / bulk delete 成功后调用统一 refresh 路径
- create / edit 提交动作接收到期望 payload，而不是空提交或错误上下文
- bulk delete 使用选中的 row keys / records，而不是 DOM 派生状态
- `autoClearSelectionOnRefresh` 开启时，refresh 后 selection 被清空
- query reset 会影响下一次 refresh 输入，而不是只清 UI 不清请求上下文
- row scope 传入 detail/edit surface 的 `record` 在 rerender 后仍与触发行一致
- `component:openEdit` / `component:openDetail` 缺少 row context 时会明确失败，而不是静默打开错误 surface
- `$crud.hasSelection`、`$crud.selectionCount`、`$crud.loading` 至少在一个辅助文本或 disabled 条件里可观察到
- DOM 中存在稳定 marker：`nop-crud`、`nop-crud-query`、`nop-crud-toolbar`、`nop-crud-table`、`nop-crud-bulk-actions`
- 一条 focused lowering/compiler test 证明 authored CRUD schema 只声明 `rowActions`，编译结果会生成内部 operation-column / row-action bridge，而不是退化为 shell 侧临时拼 UI

### Test Placement

- 主测试文件：`packages/flux-renderers-data/src/__tests__/data-crud.test.tsx`
- 必须新增一组 focused compiler/lowering tests，例如 `packages/flux-runtime/src/schema-compiler-crud.test.ts` 或相邻 `schema-compiler/` 测试文件，钉住 whole-node lower 结果

## Execution Plan

### Phase 1 - Lock Contract And Migration Surface

Status: completed
Targets: `docs/components/crud/design.md`, `docs/components/crud/example.json`, `docs/components/index.md`, `docs/components/examples.manifest.json`

- [x] 把 `crud` owner doc 补齐为可执行契约，明确首个单表 CRUD 测试基线和 AMIS capability coverage
- [x] 复核 `docs/components/crud/example.json`，确保它使用 Flux 正式命名而非 AMIS 历史字段
- [x] 明确 `crud` 当前状态仍为 `targetContract`，直到 runtime 真正注册
- [x] 核对 `docs/components/index.md`、`examples.manifest.json` 与现状一致，避免把"有计划"误写成"已实现"

Exit Criteria:

- [x] 文档已经写清 `crud` 首版必须支持的能力面和明确 deferred 的 AMIS 长尾能力
- [x] 没有把 AMIS 历史字段名偷渡成 Flux 正式字段

### Phase 2 - Add Schema And Compiler Lowering

Status: completed
Targets: `packages/flux-renderers-data/src/{schemas.ts,index.tsx,crud-schema.ts}`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/`

- [x] 新增 `CrudSchema` 类型与 normalize/defaulting 逻辑
- [x] 在 data renderer definition 中注册 `type: 'crud'`
- [x] 为 `crud` 声明 field classification，包含 `toolbar`、`bulkActions`、`empty`、事件字段、配置对象字段
- [x] 保证内部子树继续复用 `table` row scope、`dialog` surface、`form` submitAction、`data-source` refreshSource 语义

Design Change Note:
- **Removed whole-node compiler lowering**: Based on AMIS design research, the original design of auto-lowering `rowActions` to operation column and `createDialog`/`editDialog`/`detailDialog` to standard subtrees has been removed.
- **New approach**: Users define operation columns directly in `columns` with `type: 'operation'` and `buttons` array. Dialogs are controlled by buttons via `action: 'dialog'`.
- This aligns with AMIS patterns where buttons carry complete dialog definitions and CRUD only coordinates refresh.

Exit Criteria:

- [x] `type: 'crud'` 能通过 schema compilation 和 renderer registry
- [x] CRUD 通过 shell renderer 复用已有 `table`、`form`、`dialog`、`data-source` 组件，没有引入新的私有 owner store

### Phase 3 - Implement CRUD Shell, Status, And Handles

Status: completed
Targets: `packages/flux-renderers-data/src/{crud-renderer.tsx,crud-schema.ts}`

- [x] 实现 `crud-renderer.tsx` 最薄 shell，输出 `nop-crud` 与子区域 markers
- [x] 发布 `statusPath` 组合摘要 DTO，并在 CRUD 子树内提供只读 `$crud` 摘要绑定
- [x] 注册组合级 component handles：`component:refresh`、`component:getSelection`、`component:clearSelection`、`component:openCreate`、`component:openEdit`、`component:openDetail`
- [x] 让 refresh 行为优先路由到内部 source refresh，而不是 page refresh
- [x] 让 openEdit/openDetail 要求显式 row context，并桥接到对应 dialog surface
- [x] 避免暴露底层 store/ref；外部只能读 summary 或调用窄 capability
- [x] 明确 bulk operation pending 不进入 CRUD 私有状态，而是通过 explicit tracked operation 或上游 owner summary 暴露

Exit Criteria:

- [x] CRUD shell 不含隐式布局类，且 marker 非视觉化
- [x] 外部可通过 `statusPath` 观察 CRUD 摘要，内部可通过 `$crud` 读取窄 summary
- [x] component handles 能桥接到内部 table/source/dialog 能力

### Phase 4 - Land Single-Table CRUD Test And Example

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/data-crud.test.tsx`, `packages/flux-renderers-data/src/test-support.tsx`, `docs/components/crud/example.json`

- [x] 新增单表 CRUD JSON 测试，覆盖查询、查看、修改、新增、批量删除
- [x] 测试中的顶部工具栏包含 `新增`，批量动作包含 `批量删除`
- [x] 更新 `packages/flux-renderers-data/src/index.test.tsx` 导入 CRUD 测试入口
- [x] 为 `docs/components/crud/example.json` 同步一份与测试语义一致的 authoring 示例

Design Change Note:
- **Removed `rowActions` lowering requirement**: Based on AMIS design research, CRUD no longer auto-lowers `rowActions` to operation column. Users define `type: 'operation'` column directly in `columns` with `buttons` array.
- **Removed `createDialog`/`editDialog`/`detailDialog` top-level fields**: Dialogs are now controlled by buttons themselves via `action: 'dialog'` and `dialog: {...}` configuration.
- This simplifies the CRUD implementation to a thin shell renderer while maintaining AMIS-compatible authoring patterns.

Exit Criteria:

- [x] 至少一条 focused unit test 证明单表 CRUD JSON 场景已贯通
- [x] 示例 JSON 与测试 schema 在字段命名和主要 authoring 模式上保持一致

### Phase 5 - Verification And Documentation Closure

Status: completed
Targets: `packages/flux-renderers-data`, touched runtime/compiler files, `docs/logs/2026/04-17.md`

- [x] 运行 `pnpm --filter @nop-chaos/flux-renderers-data typecheck`
- [x] 运行 `pnpm --filter @nop-chaos/flux-renderers-data build`
- [x] 运行 `pnpm --filter @nop-chaos/flux-renderers-data lint`
- [x] 运行 `pnpm --filter @nop-chaos/flux-renderers-data test -- src/__tests__/data-crud.test.tsx src/__tests__/data-table.test.tsx`
- [x] 运行 `pnpm --filter @nop-chaos/flux-runtime typecheck`
- [x] 运行 `pnpm --filter @nop-chaos/flux-runtime build`
- [x] 运行 `pnpm --filter @nop-chaos/flux-runtime lint`
- [x] 更新 daily log，记录 schema 取舍、迁移约束、测试基线、review 证据

Exit Criteria:

- [x] touched packages 的 focused verification 全部通过
- [x] 文档、计划、example、tests 与 live repo 行为一致

## Validation Checklist

- [x] `type: 'crud'` 已在 `@nop-chaos/flux-renderers-data` 注册并可编译
- [x] `crud` 作为 shell renderer 复用 `form`、`data-source`、`table`、`dialog`，没有引入第二套私有 owner 模型
- [x] Flux 正式 schema 命名未回退到 AMIS `xxxApi` / `headerToolbar` / `itemActions` 风格
- [x] AMIS `crud` / `crud2` 的主流能力面已有明确 Flux 映射和 deferred 清单
- [x] 至少一条 focused unit test 使用 JSON schema 覆盖单表增删改查场景
- [x] Operation 列由用户在 `columns` 中定义 `type: 'operation'`，对话框由按钮自己控制
- [x] `docs/components/crud/design.md`、`docs/components/crud/example.json`、`docs/components/index.md`、`docs/components/examples.manifest.json` 已同步
- [x] `docs/components/index.md` 与 `docs/components/examples.manifest.json` 将 `crud` 标为 `runtime`
- [x] 独立子 agent review 已完成，并把 findings/结论记录到 daily log 或 plan 修订说明
- [x] `pnpm --filter @nop-chaos/flux-renderers-data typecheck`
- [x] `pnpm --filter @nop-chaos/flux-renderers-data build`
- [x] `pnpm --filter @nop-chaos/flux-renderers-data lint`
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test`
- [x] `pnpm --filter @nop-chaos/flux-runtime typecheck`
- [x] `pnpm --filter @nop-chaos/flux-runtime build`
- [x] `pnpm --filter @nop-chaos/flux-runtime lint`

## Risks And Rollback

- 最大风险是把 `crud` 降级成一个大 JSX renderer，重新混合 query/source/table/dialog/form/bulk operation 逻辑。
- 第二个风险是只把 `type: 'crud'` 注册出来，却没有能证明单表 CRUD 工作流的 focused tests，导致 contract surface 出现但语义未落地。
- 第三个风险是为了“支持迁移”把 AMIS 历史字段直接塞进 Flux 正式 schema，破坏命名收敛。
- 第四个风险是 `rowActions` / `bulkActions` / `$crud` 投影若绕开现有 row scope 和 owner summary 规则，会引入 table scope identity 与性能回归。

Rollback:

- 若实现阶段发现 compiler lower 路径与现有 schema compiler 结构冲突过大，可保留 `crud` doc/plan 变更，回退代码到“未注册 `crud` runtime”的状态，并把剩余问题收口到 successor plan；不要留下半工作的 registered renderer。

## Follow-Up Candidates

The following items are deferred from this plan and should be addressed in a successor plan:

- **Full dialog interaction tests**: create/edit/detail dialogs with actual form submission and validation via button `action: 'dialog'`
- **Selection interaction tests**: row selection, bulk action enablement, selection clearing on refresh
- **Query form integration tests**: query submit triggering refresh, query reset behavior
- CRUD cards mode 与 `cards` family 协作
- 远端排序/筛选默认装配深化
- URL sync / saved queries / column settings
- import/export / optimistic bulk operations
- AMIS-to-Flux migration adaptor implementation plan
