# 448 CRUD loadAction 与 Picker 重构

> Plan Status: completed
> Last Reviewed: 2026-06-29
> Source: `docs/discussions/2026-06-29-crud-loadaction-picker-design.md`（设计讨论全文）、`docs/analysis/crud-data-flow-analysis.md`（amis vs flux CRUD/Picker 数据流分析）、live-repo audit（`crud-renderer.tsx`、`crud-renderer-state.ts`、`crud-schema.ts`、`crud-renderer-ownership.ts`、`picker-renderer.tsx`、`composite-schemas.ts`）
> Related: `2026-06-21-1345-2-e1d-crud-data-lifecycle-plan.md`（E1d 已完成，本 plan 是其后继，聚焦 loadAction 数据获取层）、`2026-06-21-1345-1-x4-data-source-request-layer-enhancement-plan.md`（X4 已完成，action 引擎支持 ajax dispatch）

## Purpose

把 roadmap 中 CRUD 的数据获取从 `source` + `data-source` + `onRefresh` 事件三件套，重构为 **CRUD 内置 `loadAction`** 自包含模式。同时把 Picker 从静态 `options` 列表，重构为 **Dialog + 内部 CRUD + loadAction + labelResolveAction** 模式。两端共享 CRUD scope + 内置联动 + 显式声明三大原则。

## Current Baseline

经 live-repo audit（2026-06-29）：

### CRUD 现状

- **Schema**（`packages/flux-renderers-data/src/crud-schema.ts:133-181`）：`source?: SchemaValue`、`quickSaveAction?: ActionSchema`、`quickSaveItemAction?: ActionSchema`、`onRefresh?: ActionSchema`。**无** `loadAction`、**无** `loadAllData`。
- **Renderer**（`crud-renderer.tsx:101-104`）：`normalizeCrudSourceValue(schemaProps.source)` 从 scope 读数据，结果通过 `applyQueryToRows` 做客户端筛选。翻页/查询变更走 `handleRefresh()` → `onRefresh?.()` 事件（fire-and-forget，无 await、无错误处理回执）。
- **Scope**（`crud-renderer-ownership.ts:48-65`）：owner state 写在 `$_crud.<id>/{query,pagination,sort,filters,selection}`。其中 `query` 结构为 `{ values: Record, refreshCount: number }`（`crud-renderer-state.ts:37-40`），`refreshCount` 暴露在 scope 中。
- **数据规范化**（`crud-renderer-state.ts:201-231`）：`normalizeCrudSourceValue` 只提取 `rows` + `total`，丢弃后端 PageBean 中的 `page`、`pageSize`、`totalPages` 等字段。
- **事件接线负担**（`data-crud-request-owned.test.tsx:42-45,117-119,185-187`）：每个服务端驱动的 CRUD 都需要手动绑 `onRefresh`/`onQuerySubmit` → `refreshSource`。
- **E1d 已完成**：polling orchestration、可折叠查询区、infinite scroll 已落地，本 plan 不重复。

### Picker 现状

- **Schema**（`composite-schemas.ts:165-173`）：`options?: SchemaValue`、`valueKey?`、`labelKey?`、`multiple?`、`pickerDialog?`、`onPick?`。**无** `loadAction`、**无** `labelResolveAction`、**无** 内部 CRUD 集成。
- **Renderer**（`picker-renderer.tsx:1-350`）：Dialog 内是 `<ul><li>` 简单列表（L269-293），无分页、无表格列、无 CRUD 集成。搜索是客户端 `filter` on label（L176-182）。只支持静态 `options`，不支持服务端数据。
- **Label 解析**（`option-normalize.ts:125-150`）：`resolveSelectedLabel` 从已加载的 `options` 数组中线性查找，如果 options 不含已选值则 fallback 到 value 字符串。

### 通用基础设施

- **Action 引擎**（X4 已完成）：`props.helpers.dispatch(action, ctx)` 支持 ajax/formula/custom 等 actionType，`evaluationBindings` 可注入表达式上下文。
- **`uploadAction` 先例**（`upload-field.tsx:204`）：`props.helpers.dispatch(uploadAction, {...})` 已在 upload-field 中落地，可作为 loadAction 的模式参考。

## Goals

### CRUD 侧

- `CrudSchema` 新增 `loadAction?: ActionSchema` 和 `loadAllData?: boolean`。
- CRUD 定义独立 scope（虚拟作用域），结构为 `pagination.currentPage`/`pagination.pageSize`/`query.*`（扁平，无 `values` 包装）/`sort.column`/`sort.direction`/`filters.*`/`selection`。`refreshCount` 不暴露。
- `loadAction` 表达式从 CRUD scope 解析；CRUD scope 变量通过命名空间（`pagination.*`、`query.*` 等）与父 scope 隔离，`evaluationBindings` 会与父 scope 合并求值，约定上避免命名冲突（非运行时硬隔离）。
- 翻页/查询提交/排序/筛选/显式刷新 自动触发 `loadAction`，零手工事件接线。
- `loadAction` 响应通过 `normalizeCrudSourceValue` 消化为内部数据；后端返回的 `page`/`pageSize` 同步覆盖 CRUD 分页状态。
- `loadAction` 失败时保持当前数据 + `env.notify('error', msg)`；`onError` 事件可覆盖默认行为。
- `loadAllData: true` 时首次加载获取全部数据，后续分页/排序/筛选前端完成。
- `includeScope: "*"` 仅包含 CRUD 自身 scope 变量。

### Picker 侧

- `PickerSchema` 新增 `loadAction?: ActionSchema`、`labelResolveAction?: ActionSchema`、`columns?`、`searchable?`、`autoFill?`。
- Picker Dialog 内嵌 CrudRenderer（Phase 2 完成后支持 loadAction），不再用简单 `<ul><li>`。
- 默认 `extractValue: true`（只存 valueKey 到表单字段）。
- Label 缓存：选中时从行数据捕获 `labelKey`，组件未卸载 reopen 直接读缓存，重新挂载走 `labelResolveAction`。
- 打开 Dialog 时已选 value 传给内部 CRUD `selection`，逐行匹配勾选状态。
- Picker 内部 CRUD 独立 scope，与父 form/CRUD scope 隔离。

## Non-Goals

- 不移除 `source` 路径 —— 保留为降级兼容，无 `loadAction` 时使用。
- 不移除现有 `data-source` 组件 —— `source` 模式仍需要它。
- 不做 `labelResolveAction` 的自动推导 —— flux 层面不做 entity/URL 推断，nop-entropy 层处理。
- 不实施 `loadDataOnce` 的旧字段名 —— 用 `loadAllData` 新命名。
- 不重构现有 `onRefresh`/`onQuerySubmit`/`onPageChange` 事件 —— `loadAction` 模式下它们变为可选副作用钩子，不再是数据管线。
- 不做 cards/list 模式（归主 roadmap W1c/W2a）。
- 不做 `syncLocation`（design.md 已标不采纳）。

## Scope

### In Scope

- `CrudSchema` + `PickerSchema` 新增字段
- CRUD 独立 scope 定义与表达式解析
- CRUD `loadAction` 内置联动（翻页/查询/排序/筛选/刷新 → 自动 dispatch）
- CRUD `loadAllData` 模式
- CRUD `loadAction` 响应处理（normalize + 后端 page/total 同步）
- CRUD `loadAction` 错误处理（保持数据 + toast + onError 覆盖）
- Picker 重构：Dialog + 内部 CRUD + loadAction + labelResolveAction
- Picker label 缓存机制
- Picker 多选跨页勾选状态同步
- `query.*` 扁平化（去掉 `values` 包装，隐藏 `refreshCount`）
- focused 单测
- `docs/components/crud/design.md` + `docs/architecture/` 同步

### Out Of Scope

- `source` 模式的任何改动（保持现状）
- `data-source` 组件改动
- cards/list 模式
- `syncLocation`
- `autoGenerateQueryForm`
- `clientMode.matchFunc`

## Failure Paths

| 场景编号           | 触发                                              | 行为                                                                                                         | 可重试                   | 用户可见表现                            |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------ | --------------------------------------- |
| load-fail          | `loadAction` dispatch 抛错或返回 `{ ok: false }`  | 保持当前 rows + total 不变；调用 `env.notify('error', msg)`；如有 `onError` 事件则 dispatch 它替代默认 toast | 是（显式刷新触发重试）   | 表格数据不变，顶部/角落出现红色错误提示 |
| label-resolve-fail | `labelResolveAction` 失败                         | trigger 显示 value 本身作为 fallback；不阻塞 Dialog 打开                                                     | 否                       | trigger 显示 valueKey 字符串而非 label  |
| validate-fail      | queryForm `validate()` 返回 `{ ok: false }`       | 不收集值、不更新 query scope、不 dispatch loadAction                                                         | 是（用户修正后重新提交） | queryForm 字段显示校验错误              |
| load-empty         | `loadAction` 成功但返回 `{ items: [], total: 0 }` | 正常渲染空态（table empty slot）                                                                             | 是                       | 表格区域显示空态文案                    |

## Test Strategy

档位选择：**必须自动化**

理由：本 plan 改变 CRUD/Picker 的核心数据获取契约，涉及外部 API 调用、分页状态同步、错误处理。

> **执行顺序说明**：各 Phase 的 checklist 中 `Proof` 项虽列在末尾，但执行时采用 TDD 顺序——先写失败测试（Proof），再实现功能（Fix），最后确保测试通过。

## Execution Plan

### Phase 1 - CRUD Scope 与 query.\* 扁平化

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer-state.ts`、`crud-renderer-ownership.ts`、`crud-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] 重构 `CrudQueryState`（`crud-renderer-state.ts:37-40`）：去掉 `values` 包装层，改为 `query.*` 直接扁平字段值；`refreshCount` 保留为内部状态，不暴露到 CRUD scope
- [x] 重构 `useCrudRuntimeState`（`crud-renderer-state.ts:290-384`）：scope 读写适配新的扁平 `query.*` 结构
- [x] 重构 `useCrudQueryBridge`（`crud-renderer-ownership.ts:120-273`）：`submitQueryValues` 写入扁平 `query.*` 而非 `query.values.*`
- [x] 更新 `crud-renderer.tsx` 中四处硬编码 `{ values, refreshCount }` 形状的写入/读取点：`handleRefresh`（L146-149）、`handleLoadMore`（L216-219）、effectiveQuery 读取（L103）、owner-state mirror（L84-90）
- [x] 新增 `createCrudEvaluationBindings()` 工具函数：将 CRUD 内部状态（pagination/query/sort/filters/selection）组装为 `evaluationBindings` 对象，供后续 loadAction 求值使用。注意：`evaluationBindings` 会与父 scope 合并求值（`renderer-helpers.ts:108`），因此 CRUD scope 变量名（`pagination.*`、`query.*` 等）采用命名空间隔离，避免与父 scope 变量冲突；但本 plan **不实现** 硬隔离的子 scope——"无父 scope 回退"是约定层面的命名空间隔离，不是运行时强制隔离
- [x] `source` 模式兼容：`refreshCount` 从 scope 移除后，`source` 模式的 `applyQueryToRows` 重新计算依赖改为直接依赖 `query.*` 字段值的变化（React 自然重渲染），不依赖 `refreshCount` 作为 reactivity 信号
- [x] Proof：单测验证 `query.keyword` 直接可读，`query.values` 不再存在，`refreshCount` 不在 bindings 中

Exit Criteria:

- [x] CRUD scope 中 `query.*` 扁平化，无 `values` 中间层
- [x] `refreshCount` 不出现在 evaluationBindings 中
- [x] `createCrudEvaluationBindings()` 导出可测
- [x] `crud-renderer.tsx` 四处 `{ values, refreshCount }` 硬编码点全部适配
- [x] `source` 模式 CRUD 功能不回归（现有测试全过）
- [x] 现有 CRUD 单测（`crud-query-and-pagination.test.tsx`、`crud-binding-and-status.test.tsx`）适配新结构后全过

### Phase 2 - CrudSchema loadAction 字段 + 内置联动

Status: completed
Targets: `packages/flux-renderers-data/src/crud-schema.ts`、`crud-renderer.tsx`、`crud-renderer-state.ts`

- Item Types: `Fix | Proof`

- [x] `CrudSchema`（`crud-schema.ts:133-181`）新增 `loadAction?: ActionSchema`、`loadAllData?: boolean`、`onError?: ActionSchema`
- [x] 增强 `normalizeCrudSourceValue`（`crud-renderer-state.ts:201-231`）：返回类型从 `{ rows, total }` 扩展为 `{ rows, total, serverPagination? }`，其中 `serverPagination = { currentPage?, pageSize? }` 从响应的 `page`/`currentPage`/`pageSize` 字段提取
- [x] 新增 `useCrudLoadAction` hook（`crud-renderer-state.ts`）：封装 `loadAction` dispatch + 响应 normalize（含新增的 `serverPagination` 提取）+ 后端 page/total 同步 + 错误处理（保持数据 + toast + onError 覆盖）
- [x] `CrudRenderer`（`crud-renderer.tsx`）接入 `useCrudLoadAction`：当 `loadAction` 存在时，翻页/查询提交/排序/筛选/显式刷新 自动调用 `loadAction`，不再依赖 `onRefresh`/`onQuerySubmit`/`onPageChange` 事件作为数据管线
- [x] queryForm 校验门控：`useCrudLoadAction` 在查询提交路径中保持 `useCrudQueryBridge` 的 `validate()` → `getValues()` → dispatch 顺序——验证失败不 dispatch
- [x] `useCrudLoadAction` 在 dispatch 时传入 `evaluationBindings`（来自 `createCrudEvaluationBindings()`），使 `${pagination.currentPage}` 等表达式可解析（参考 `upload-field.tsx:204` / `dynamic-renderer.tsx:125` 的 dispatch 先例）
- [x] `loadAllData: true` 时首次 dispatch 后缓存全部 rows，后续翻页/排序/筛选前端完成，不再 dispatch
- [x] `loadAction` 响应中的 `serverPagination.currentPage`/`serverPagination.pageSize`（如果存在）同步覆盖 CRUD 分页状态（信任后端）
- [x] Proof：单测验证 (1) mount 时自动 dispatch loadAction；(2) 翻页触发 loadAction 且 `${pagination.currentPage}` 正确传入；(3) 响应 `page` 字段覆盖 CRUD currentPage；(4) loadAllData 模式下翻页不发请求；(5) queryForm 验证失败时不 dispatch

Exit Criteria:

- [x] `loadAction` 存在时，翻页/查询/排序自动 dispatch，无需手工事件接线
- [x] `normalizeCrudSourceValue` 返回 `serverPagination`
- [x] `loadAction` 响应的 `page`/`total` 正确同步到 CRUD 状态
- [x] `loadAllData: true` 时仅首次 dispatch
- [x] queryForm 验证失败时不 dispatch loadAction
- [x] loadAction 失败时保持当前数据 + toast 错误
- [x] focused 单测全过

### Phase 3 - Picker Schema + Dialog 内嵌 CrudRenderer 重构

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/picker-renderer.tsx`、`composite-field/composite-schemas.ts`、`picker-renderer.tsx` renderer definition、`packages/flux-renderers-form-advanced/package.json`

- Item Types: `Fix | Proof`

- [x] `PickerSchema`（`composite-schemas.ts:165-173`）新增 `loadAction?: ActionSchema`、`labelResolveAction?: ActionSchema`、`columns?: CrudColumnSchema[]`（复用 `flux-renderers-data` 的 `CrudColumnSchema`，不新建 `PickerColumnSchema`）、`searchable?: boolean`、`autoFill?: Record<string, string>`
- [x] `packages/flux-renderers-form-advanced/package.json`：将 `@nop-chaos/flux-renderers-data` 从 `devDependencies` 提升到 `dependencies`（当前仅在 devDependencies，Phase 3 需要运行时导入 `CrudRenderer`）
- [x] Picker Renderer 重构：当 `loadAction` 存在时，Dialog 内嵌 `CrudRenderer`（Phase 2 完成后已支持 `loadAction`），不再用 `<ul><li>` 列表。Picker 通过 `props.helpers.render()` 渲染 CrudSchema 子 schema（含 `loadAction`/`columns`/`selection`/`dataStatePath`），使 queryForm/footerToolbar 等 region 正确编译；静态 `options`（无 loadAction）保留原 `<ul><li>` 列表 UI
- [x] 内部 CrudRenderer 接收 Picker 的 `loadAction`，CRUD scope 独立于父 form scope（每个 CRUD 实例自带 scope，见 Phase 1 设计）
- [x] Picker 默认 `extractValue: true`；选中确认时提取 `valueKey` 写入表单字段
- [x] 打开 Dialog 时将表单字段当前 value 传入内部 CrudRenderer 的 `selection`（通过 `$_picker.<id>.selection` scope path），逐行匹配勾选
- [x] `searchable: true` 时 Dialog 内显示搜索框，搜索输入触发内部 CrudRenderer 的 `query.*` 更新 → loadAction 重载（内部 CRUD queryForm region 编译后生效）
- [x] Proof：单测验证 (1) 打开 Dialog 触发 loadAction 加载第一页；(2) 搜索触发 loadAction 重载；(3) 选中确认写入 valueKey；(4) reopen 时已选 value 在 Dialog 中正确勾选

Exit Criteria:

- [x] Picker Dialog 内嵌 CrudRenderer + loadAction 工作正常
- [x] `package.json` 依赖关系正确（`flux-renderers-data` 在 dependencies 中）
- [x] 单选/多选选中确认正确写入 valueKey
- [x] reopen 时勾选状态正确同步
- [x] 现有 Picker 单测（`picker-renderer.test.tsx`）中静态 `options` 模式仍通过

### Phase 4 - Picker labelResolveAction + Label 缓存

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/picker-renderer.tsx`、`option-normalize.ts`

- Item Types: `Fix | Proof`

- [x] Picker mount 时如果 `value` 非空且 `labelResolveAction` 存在：dispatch `labelResolveAction`（`${value}` 从父 scope 解析），从响应 `items` 中提取 `labelKey` 缓存到组件内部
- [x] Picker 选中确认时：从选中行数据中提取 `labelKey` 缓存到组件内部（CRUD 模式通过 `dataStatePath` 发布的 rows 提取；list 模式从 `option.raw` 提取）
- [x] trigger 显示逻辑：优先读缓存 label，缓存未命中且 `labelResolveAction` 未配置时 fallback 到 value 字符串
- [x] 组件未卸载 reopen Dialog：直接读缓存 label，不重新调 `labelResolveAction`
- [x] `labelResolveAction` 失败：trigger 显示 value 字符串，不阻塞 Dialog 打开
- [x] `autoFill` 选中后自动填充配置的表单字段（`${row.fieldName}` 表达式，通过 `lazyEval: true, params: ['row']` 编译，`helpers.evaluateCompiled` 在选中行 scope 求值）
- [x] Proof：单测验证 (1) mount 时 labelResolveAction 调用并缓存 label；(2) 选中后 label 从行数据捕获；(3) reopen 读缓存；(4) labelResolveAction 失败时 fallback；(5) autoFill 填充

Exit Criteria:

- [x] `labelResolveAction` 在 mount 时正确反查 label
- [x] 选中后 label 从行数据捕获并缓存
- [x] reopen 读缓存不重新请求
- [x] `labelResolveAction` 失败时 fallback 到 value
- [x] `autoFill` 正确填充表单字段
- [x] focused 单测全过

### Phase 5 - 文档同步与 Closure

Status: completed
Targets: `docs/components/crud/design.md`、`docs/architecture/`、`docs/logs/2026/06-29.md`

- Item Types: `Follow-up`

- [x] `docs/components/crud/design.md` 更新：§2 决策表新增 loadAction 行（从"不开组件级 api"改为"开 loadAction action 入口"）；§3 非目标"不把 crud 定义成新的请求 owner"需修订为"crud 通过 loadAction 成为自身数据的获取者，但请求语义仍由 action 引擎统一处理"；§6.1 补 `loadAction`/`loadAllData` 字段；§7 补 loadAction 内置联动说明
- [x] `docs/components/crud/design.md` 更新迁移映射表：`amis.api` → `loadAction`（而非仅 `source`）；补注 `loadAllData` 与现有 `clientMode.loadDataOnce` 的关系（`loadAllData` 是 `loadAction` 模式下的等价配置，`clientMode.loadDataOnce` 仅用于 `source` 模式，两者不互改）
- [x] `docs/architecture/` 相关文档（如 `api-data-source.md`、`data-domain-owner.md`）补 loadAction 作为 CRUD 数据获取入口的说明
- [x] `docs/logs/2026/06-29.md` 记录本 plan 执行结果

Exit Criteria:

- [x] `design.md` §2 决策表 + §6.1 + §7 + 迁移映射表 已更新
- [x] `docs/architecture/` 相关文档已同步
- [x] `docs/logs/` 已记录

## Draft Review Record

- Reviewer / Agent: ses_0ee0eaa0effebFNzPxvrJfF3Qt（fresh session，general agent）
- Verdict: `revised` → 修订后待复审
- Rounds: 1
- Findings addressed:
  - B1（Phase 3 组件名错误）：Phase 3 从嵌入 `TableRenderer` 改为嵌入 `CrudRenderer`（Phase 2 完成后已支持 loadAction），统一内部引用
  - M1（normalizeCrudSourceValue 增强）：Phase 2 新增显式 item 增强 `normalizeCrudSourceValue` 返回 `serverPagination`
  - M2（crud-renderer.tsx 四处硬编码点）：Phase 1 新增 item 枚举 `handleRefresh`/`handleLoadMore`/effectiveQuery/owner-mirror 四处
  - M3（scope 隔离机制）：Phase 1 `createCrudEvaluationBindings` item 补注 evaluationBindings 合并语义，明确"无父 scope 回退"是命名空间约定而非运行时硬隔离
  - M4（package.json 依赖）：Phase 3 新增 item 提升 `flux-renderers-data` 到 dependencies
  - m1（design.md §3 矛盾）：Phase 5 补 §3 非目标修订
  - m3（loadAllData 与 loadDataOnce 关系）：Phase 5 迁移映射表补注两者关系
  - m4（PickerColumnSchema 未定义）：Phase 3 改为复用 `CrudColumnSchema`
  - m5（queryForm 校验门控）：Phase 2 新增 item 保持 validate → getValues → dispatch 顺序

### Round 2

- Reviewer / Agent: ses_0ee05970fffemgQn3RAN6QoGt9（fresh session，general agent）
- Verdict: `revised` → 修订后待终审
- Rounds: 2
- Findings addressed:
  - M1-r2（Goals L52 + Closure Gates L251 仍写 TableRenderer）：已改为 CrudRenderer
  - m1-r2（createSchemaRenderer 不适合就地嵌入）：Phase 3 改为参考 crud-renderer.tsx:370-390 构造 RendererComponentProps 直接渲染
  - m2-r2（Proof 应先于 Fix）：Test Strategy 补 TDD 执行顺序说明
  - m3-r2（Goals scope 隔离措辞过硬）：Goals L42 改为命名空间约定措辞，与 Phase 1 注释一致

### Round 3 (Final)

- Reviewer / Agent: ses_0edfe8cf5ffe1io5B3rj1AgKlZ（fresh session，general agent）
- Verdict: `pass-with-minors`
- Rounds: 3
- Findings addressed:
  - m1-r3（Non-Blocking Follow-ups L297 仍写 TableRenderer）：已改为 CrudRenderer
- Result: 零 Blocker、零 Major，达成共识，Plan Status 升级为 `active`

## Closure Gates

- [x] CRUD `loadAction` 内置联动（翻页/查询/排序/筛选/刷新）全部工作，无需手工事件接线
- [x] CRUD `loadAllData` 模式工作正常
- [x] CRUD `loadAction` 响应的 `page`/`total` 正确同步到 CRUD 状态
- [x] CRUD `loadAction` 失败时保持数据 + toast + onError 覆盖
- [x] CRUD scope `query.*` 扁平化，无 `values` 包装，`refreshCount` 不暴露
- [x] Picker Dialog 内嵌 CrudRenderer + loadAction 工作正常
- [x] Picker `labelResolveAction` mount 时反查 label 正确
- [x] Picker label 缓存（选中捕获 + reopen 读缓存）工作正常
- [x] Picker 多选跨页勾选状态同步正确
- [x] Picker `autoFill` 正确填充表单字段
- [x] 现有 `source` 模式 CRUD 和静态 `options` Picker 向后兼容（现有测试全过）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs（`design.md`、`docs/architecture/`）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### labelResolveAction 自动推导

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: flux 层面不做 entity/URL 推断；nop-entropy 层通过领域抽象处理
- Successor Required: no
- Successor Path: nop-entropy 层

### loadDataOnce 旧字段名

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 使用新命名 `loadAllData`；旧 `clientMode.loadDataOnce` 字段保持现状不改动
- Successor Required: no
- Successor Path: —

## Non-Blocking Follow-ups

- 现有 `source` 模式的 CRUD 在未来可考虑提供迁移工具（自动转换为 `loadAction`），但当前不阻塞 closure
- Picker 的 `modalMode: 'drawer'` 已在现有 schema 中声明，待 CrudRenderer 集成后验证

## Closure

Status Note: plan 448 全部 5 个 Phase 落地并通过独立 closure audit。CRUD 侧 `loadAction`/`loadAllData`/`onError` + 内置联动（翻页/查询/排序/筛选/刷新）+ `serverPaged` 表格语义；Picker 侧 `loadAction` 模式嵌入 CrudRenderer（经 `helpers.render`）、静态 options 保留列表 UI、`labelResolveAction` + label 缓存 + `autoFill`（`lazyEval`）。执行中发现并修复了 6 个真实缺陷（pagination.enabled 门控、clientSideQueryFiltering 门控、summary.total、Picker region 编译崩溃、Hooks 顺序违规、autoFill 渲染期求值 + 缺 row 数据路径）。`source` 模式 CRUD 与静态 options Picker 向后兼容。

Closure Audit Evidence:

- Auditor / Agent: ses_0ec556b81ffelTEnNcv95p5vqD（fresh session，general agent，独立 closure audit）
- Verdict: `approved`（零 Blocker、零 Major；1 Minor 文书项 = Phase 5 复选框未勾，已由执行者补勾）
- Evidence:
  - typecheck/lint 两包通过（lint 0 error，1 个 pre-existing 无关 tree 组件 warning）
  - focused 测试复跑：flux-renderers-data 6 文件 42 passed；picker-renderer 9 passed
  - 语义核对：`useCrudLoadAction` dispatch 带 `pagination.currentPage` bindings（crud-renderer-state.ts:553-569）；服务端分页 `serverPaged`+`total` 设值（crud-renderer.tsx:354-355）+ table 跳过切片（table-renderer.tsx:261）+ 用 server total 算 totalPages；错误路径保持数据 + notify/onError early-return（crud-renderer-state.ts:516-533）
  - Picker：静态 options 渲染 `<ul>`（picker-renderer.tsx:586-610）；loadAction 模式经 `props.helpers.render` 嵌入（L566）；所有 hooks 在 early return 之前（L517）；`autoFill` 用 `lazyEval:true,params:['row']`（definition L645）+ confirm 时 `evaluateCompiled`（L295/L438/L486）
  - owner-doc 一致：design.md §3/§4.1.1/§6.1/§7.2/§8 + data-domain-owner.md L39 与 live 代码行为一致
  - deferred 诚实：labelResolveAction 自动推导、loadDataOnce 改名均为 Out-of-Scope/Non-Goals，无 in-scope defect 被隐藏

Follow-up:

- 非阻塞说明：`crud-loadaction.test.tsx:335` 的 `notify('error','Server down')` 断言源自 action-engine 通用失败上报（`flux-action-core/.../action-execution.ts`），并非 CRUD 的 `reportError`（后者在有 `onError` 时正确 early-return）。CRUD 层 "onError 替代默认 toast" 契约成立；如需可后续在 design.md 注明 engine-level toast 是独立层。
- 无剩余 plan-owned work。
