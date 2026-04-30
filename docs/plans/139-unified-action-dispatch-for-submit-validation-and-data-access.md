# 139 Unified Action Dispatch for Submit, Validation, and Data Access

> Plan Status: completed
> Last Reviewed: 2026-04-25
> Source: `docs/architecture/api-data-source.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-scope-and-imports.md`, `docs/plans/126-runtime-effect-channel-convergence-plan.md`
> Related: `docs/plans/38-action-api-source-convergence-migration-plan.md`, `docs/plans/126-runtime-effect-channel-convergence-plan.md`

## Purpose

删除 schema 中的 `api` 属性和 runtime 中绕过 action dispatch 的 `ApiSchema` 旁路。所有远程调用统一走 `{ action: "ajax", args: { url, method, ... } }`。`ApiSchema` 保留为 `ajax` action 的内部传输描述类型，用户不再直接接触。

项目从未发布，不需要兼容层。

## Current Baseline

### Submit Flow（`form-runtime-submit-flow.ts`）

当前 submit 有三条执行路径：

```
submitAction（用户自定义 action）→ 直接执行
api: ApiSchema                    → submitApiCall(api) → executeApiSchema → fetcher  （旁路）
都没有                            → 返回 form values
```

`submitApiCall` 在 `runtime-factory.ts:333-352` 注入，内部调 `executeApiSchema` + `executeApiRequest`，与 `ajax` action 走的底层相同，但绕过了 action dispatch。

### Async Validation（`validation.ts`）

```typescript
{ kind: 'async'; api: ApiSchema; debounce?: number; message?: string }
```

async 校验规则直接持有 `ApiSchema`，执行时调 `executeApiSchema`，不经过 action dispatch。这意味着：

- 无法用自定义 action 实现校验逻辑
- 无法复用 action 的拦截/重试/日志中间件
- 本地 JS 校验和远程 ajax 校验走不同机制

### Data-Source

`DataSourceSchema` 当前仍支持 `api` 字段作为独立执行入口。已基本收敛的 action-backed path 通过 `createSourceExecutor → executeAction → runtime.dispatch` 执行。需要删除 `api` 字段，统一用 `action: "ajax"` 写法。

### Action Dispatch 现状

- `ActionRuntimeAdapter` 已统一承接 built-in / component / namespace 三类 action
- `ajax` action 已存在，内部消费 `ApiSchema` 格式构造 HTTP 请求
- `reaction.actions` 和 action-backed `source` 已通过 `runtime.dispatch(...)` 复用 adapter

### 真正剩余的 Gap

1. Form submit 的 `submitApiCall(api)` 旁路
2. Async validation 的 `{ kind: 'async', api: ApiSchema }` 旁路
3. Data-source schema 上的 `api` 字段
4. Schema 中所有 `api: ApiSchema` 写法需要替换为 `{ action: "ajax", args: ... }`

## Goals

- 删除 schema 上的 `api: ApiSchema` 属性（form、data-source、validation 等所有位置）
- Form submit 只走 `submitAction` 一条路径
- Async validation 规则改为 `{ kind: 'async', action: ActionSchema }`
- Data-source 用 `action: "ajax", args: { url, method, ... }` 替代 `api` 字段
- 所有远程调用统一经过 `runtime.dispatch(...)` → `ActionRuntimeAdapter`
- `ApiSchema` 保留为 `ajax` action 的内部传输描述，不从类型系统中删除

## Non-Goals

- 不重新设计 action dispatch 本身的架构
- 不改动 `ActionRuntimeAdapter` 或 `ActionScope` 的现有接口
- 不在本计划中实现新的可视化 action 编辑器
- 不改动 `executeApiSchema(...)` 作为 `ajax` action 内部实现的地位
- 不移除 `ApiSchema` 类型定义本身

## Scope

### In Scope

- `packages/flux-core/src/types/validation.ts` — async validation rule 类型
- `packages/flux-core/src/types/runtime.ts` — `FormLifecycleHandlers` 类型
- `packages/flux-core/src/types/schema.ts` — `DataSourceSchema` 等含 `api` 字段的类型
- `packages/flux-runtime/src/form-runtime-submit-flow.ts` — submit 执行路径
- `packages/flux-runtime/src/form-runtime.ts` — `submit()` 入口和 `submitApiCall` 注入
- `packages/flux-runtime/src/runtime-factory.ts` — `submitApi` 工厂注入
- `packages/flux-renderers-form/src/renderers/form.tsx` — schema event 到 lifecycle 的映射
- 所有受影响的测试文件和示例

### Out Of Scope

- `executeApiSchema(...)` 内部实现（它是 `ajax` action 的内部细节，不删）
- reaction 执行路径（已收敛）
- `Operation Control` 的 retry / timeout / dedup 实现
- visual action designer

## Execution Plan

### Phase 1 - 删除 Async Validation 的 api 旁路

Status: completed
Targets: `packages/flux-core/src/types/validation.ts`, `packages/flux-runtime/src/`, `packages/flux-compiler/`

将 async validation rule 从 `{ kind: 'async', api: ApiSchema }` 直接改为 `{ kind: 'async', action: ActionSchema }`。

- [x] 在 `validation.ts` 中将 `{ kind: 'async'; api: ApiSchema; ... }` 替换为 `{ kind: 'async'; action: ActionSchema; debounce?: number; message?: string }`
- [x] 在 runtime validation 执行中，`kind: 'async'` 统一走 `runtime.dispatch(action)` 而非直接调 `executeApiSchema`
- [x] 更新所有使用 `kind: 'async'` + `api` 的测试，改为使用 `action: { action: 'ajax', args: { url, method } }` 或自定义 action
- [x] 更新 `docs/architecture/form-validation.md` 中 async validation 相关描述

Exit Criteria:

- [x] `validation.ts` 中不再有 `{ kind: 'async'; api: ApiSchema }` 变体
- [x] 所有 async validation 走 `runtime.dispatch(...)` 执行
- [x] 所有 validation 相关测试通过

### Phase 2 - 删除 Form Submit 的 submitApiCall 旁路

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-submit-flow.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-renderers-form/src/renderers/form.tsx`

删除 form submit 中的 `api` 参数和 `submitApiCall` 路径。

- [x] 从 `SubmitFormInput` 接口中删除 `submitApiCall` 字段
- [x] 从 `form-runtime-submit-flow.ts` 的 `executeFormSubmit` 中删除 `api` 参数和 `submitApiCall` 分支，只保留 `submitAction` 和 fallback-to-values 两条路径
- [x] 从 `form-runtime.ts` 的 `submit()` 中删除 `api` 参数
- [x] 从 `runtime-factory.ts` 中删除 `submitApi` 工厂注入和相关 lambda
- [x] 从 `form-runtime-types.ts` 中删除 `submitApi` 相关类型
- [x] 更新 form renderer（`form.tsx`）中的 lifecycle handler 映射
- [x] 更新所有 submit 相关测试，从 `form.submit(api)` 改为通过 `submitAction` 配置 ajax action

Exit Criteria:

- [x] `executeFormSubmit` 不再有 `api` 参数
- [x] `form.submit()` 不再接受 `api` 参数
- [x] submit flow 只有 `submitAction`（有就用）和 return-values（没有就返回）两条路径
- [x] 所有 submit 相关测试通过

### Phase 3 - 删除 DataSourceSchema 等类型中的 api 字段

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/`, `packages/flux-renderers-data/src/`

删除 `DataSourceSchema`、`ActionDataSourceSchema` 等类型中的 `api` 字段，统一用 `action` + `args`。

- [x] 从 `ActionDataSourceSchema` 中删除 `api: ApiSchema` 字段
- [x] 从 `DataSourceSchema` 的其他承载位置删除 `api`
- [x] 从 `FormLifecycleHandlers` 相关的 runtime factory input 中删除 `submitApi` 字段
- [x] 更新 data-source renderer 和相关 runtime 代码，不再处理 `api` 字段
- [x] 更新所有 data-source 测试，从 `api: { url }` 改为 `action: "ajax", args: { url }`
- [x] 更新所有 playground 示例和 docs 中的 `api` 写法

Exit Criteria:

- [x] schema 类型中不再有 `api: ApiSchema` 字段（`ApiSchema` 类型定义本身保留）
- [x] 所有 data-source 测试通过
- [x] playground 示例使用 `action: "ajax"` 写法

### Phase 4 - 文档和类型清理

Status: completed
Targets: `docs/`, `packages/flux-core/src/`

最终清理，确保所有文档和公开类型与实现一致。

- [x] 更新 `docs/architecture/flux-runtime-module-boundaries.md` 中 form-runtime 的模块描述
- [x] 确认 `docs/architecture/api-data-source.md` 中所有示例使用 `action` 写法，无残留 `api` 属性
- [x] 确认 `docs/architecture/form-validation.md` 中 async validation 描述使用 `action` 写法
- [x] 确认 `docs/components/*/design.md` 中无残留 `api` 属性引用
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过

Exit Criteria:

- [x] 所有公开类型中不再有 `submitApi` / `submitApiCall` / schema-level `api` 字段
- [x] `ApiSchema` 不再出现在 submit / validation / data-source 的公开 API 签名中
- [x] 所有文档示例使用 `action` 写法
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过

## Validation Checklist

- [x] Form submit 走 action dispatch 一条路径，无旁路
- [x] Async validation 走 action dispatch，本地/远程统一
- [x] Data-source 不再有 `api` 字段，统一用 `action: "ajax"`
- [x] `ApiSchema` 只被 `ajax` action 内部消费
- [x] 所有 runtime 测试通过
- [x] 所有 form-renderer 测试通过
- [x] 所有 data-source 测试通过
- [x] 所有文档示例与实现一致
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test`
- [x] 独立子 agent closure-audit 已完成并记录证据

## Closure

Status Note: Completed on 2026-04-25. All four phases executed successfully. Schema-level `api: ApiSchema` fields removed from async validation, form submit, and data-source schemas. All remote calls now unified through `runtime.dispatch(...)` → `ActionRuntimeAdapter`. `ApiSchema` retained as internal transport description type for the `ajax` action.

Closure Audit Evidence:

- Reviewer / Agent: opencode agent
- Evidence: All phases verified — `validation.ts` uses `{ kind: 'async', action: ActionSchema }`, form submit has only `submitAction` + fallback-to-values paths, `DataSourceSchema` uses `action` + `args`, all examples in docs use `action: "ajax"` pattern, full verification suite passes.

Follow-up:

- None remaining in scope. `ApiSchema` type definition retained in `packages/flux-core` as internal ajax action transport contract.
