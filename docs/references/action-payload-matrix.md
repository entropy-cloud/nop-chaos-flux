# Action Payload Matrix

## Purpose

这份文档只回答一个窄问题：当前基线中，各类 action 到底读取哪些 author-visible 字段，以及哪些字段属于：

1. payload
2. targeting
3. control-flow / execution control
4. action-specific narrow payload DTOs

它是 `ActionSchema` 收敛、action precompile、`args` 统一化工作的参考矩阵，不单独拥有执行语义规范。执行语义仍以 `docs/architecture/action-algebra-formal-spec.md` 为准。

## Source Of Truth

- `packages/flux-core/src/types/actions.ts`
- `packages/flux-action-core/src/action-core.ts`
- `packages/flux-action-core/src/action-dispatcher.ts`

## Top-Level Field Families

### Payload Fields

- `args`

### Targeting Fields

- `_targetCid`
- `_targetTemplateId`
- `targetId`
- `componentId`
- `componentName`
- `formId`
- `dialogId`
- `surfaceId`
- `dataPath`

### Control-Flow And Execution-Control Fields

- `when`
- `parallel`
- `then`
- `onError`
- `onSettled`
- `continueOnError`
- `control`
- `timeout`
- `retry`
- `debounce`

## Built-In Action Matrix

| Action          | Current payload field(s)  | Current targeting field(s)                                                      | `args` usage | Notes                                                                                                                                                                                 |
| --------------- | ------------------------- | ------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showToast`     | `args`                    | none                                                                            | canonical    | 推荐写 `args`                                                                                                                                                                         |
| `navigate`      | `args`                    | none                                                                            | canonical    | 推荐写 `args`                                                                                                                                                                         |
| `ajax`          | `args`                    | `dataPath` optional                                                             | canonical    | `args` 必须是 `ApiSchema`；`dataPath` 属于 targeting                                                                                                                                  |
| `submitForm`    | none                      | implicit `ctx.form`; `formId` resolves through component registry when provided | no payload   | When `formId` is provided, resolves through component registry. When not provided, uses `ctx.form`. Failure to resolve returns explicit error.                                        |
| `openDialog`    | `args`                    | implicit `ctx.surfaceRuntime`                                                   | canonical    | `args` 承载 dialog surface payload                                                                                                                                                    |
| `openDrawer`    | `args`                    | none                                                                            | canonical    | `args` 承载 drawer surface payload                                                                                                                                                    |
| `closeDialog`   | none                      | `dialogId` optional                                                             | no payload   | 主要是无 payload + optional targeting                                                                                                                                                 |
| `closeDrawer`   | none                      | `dialogId` optional, else current context                                       | no payload   | 当前实现实际也复用了 `dialogId` carrier                                                                                                                                               |
| `closeSurface`  | none                      | `surfaceId` optional, else current context                                      | no payload   | 显式 surface close builtin                                                                                                                                                            |
| `refreshTable`  | none                      | implicit `ctx.page`                                                             | no payload   | 更像 semantic entry，不需要 `args`                                                                                                                                                    |
| `refreshSource` | none                      | `targetId`                                                                      | no payload   | runtime-owned source entry，targeting 独立存在                                                                                                                                        |
| `setValue`      | `args: { path?, value }`  | `componentId` / `formId`                                                        | canonical    | When `formId` is provided and resolves, targets that form. When `formId` is provided but doesn't resolve, returns error. When `formId` is not provided, writes to `ctx.scope.update`. |
| `setValues`     | `args: { path?, values }` | `formId` optional                                                               | canonical    | Same `formId` resolution as `setValue`. `args.path` makes `values` keys relative.                                                                                                     |

## Non-Built-In Matrix

| Action family        | Current payload field(s) | Current targeting field(s)                                               | `args` status   | Notes                                 |
| -------------------- | ------------------------ | ------------------------------------------------------------------------ | --------------- | ------------------------------------- |
| `component:<method>` | `args`                   | `_targetCid` / `componentId` / `componentName` / internal target carrier | already aligned | payload 与 targeting 已分离           |
| `namespace:method`   | `args`                   | lexical `ActionScope`                                                    | already aligned | 这是推荐的 namespaced payload surface |

## Current Runtime Rules

### `args` Evaluation Rule

当前 `evaluateActionArgs(action, ctx, input)` 的规则是：

1. schema compiler / dispatch entry 先把 raw action lowering 成 `CompiledActionProgram`
2. 若存在 `args`，则在 compiled action node 上直接求值 `payload.args`
3. 对内置 action，执行器读取 `args` 或无 payload builtin 的 targeting/control 字段

公开 authoring 显式写 `args`。例如：

```json
{
  "action": "showToast",
  "args": {
    "level": "success",
    "message": "Saved"
  }
}
```

### Request And Surface Payloads Use `args`

当前 request / surface payload 读取规则是：

1. `ajax` 使用 `args: ApiSchema`
2. `openDialog` / `openDrawer` 使用 `args` 承载 surface payload
3. `submitForm` 是语义型 form submit command，不要求业务 payload；若要显式指定目标 form，优先使用 `component:submit` 与 targeting
4. `action: 'dialog'` / `action: 'drawer'` 不是正式 contract

### `setValue` / `setValues` Use Narrower `args` DTOs

`setValue` 与 `setValues` 现在也统一走 `args`，但它们不是普通自由形态 payload map，而是更窄的 write DTO：

1. `setValue` 使用 `args: { path?, value }`
2. `setValues` 使用 `args: { path?, values }`
3. `setValues.args.path` 存在时，`values` key 是相对路径；否则 `values` key 直接是目标路径
4. 二者仍然与 `formId`、`componentId` 等 targeting / ownership 语义相关

因此：

1. payload 已统一到 `args`
2. 但不应把它们误解为“任意 map payload action”；它们有单独的 write DTO 语义

## Field Boundary Contract (Frozen)

本节定义 `ActionSchema` 字段的正式边界，用于指导 action precompile 和 args 统一化工作。

### 原则

1. `args` 只承载 **payload**，不吞并 targeting 或 control-flow 字段
2. targeting 字段保留独立字段族
3. control-flow / execution control 字段保留独立字段族
4. 对于语义特殊的 write action，可以使用更窄的 `args` DTO，而不是退回顶层专用 payload carrier

### Payload Fields

| Field  | Scope                                              | Contract Status                                  |
| ------ | -------------------------------------------------- | ------------------------------------------------ |
| `args` | 通用 payload carrier；对 write action 可承载窄 DTO | **canonical** — 正式 author-visible payload 载体 |

### Targeting Fields

| Field               | Scope                          | Contract Status                              |
| ------------------- | ------------------------------ | -------------------------------------------- |
| `_targetCid`        | 编译期注入的目标组件 cid       | **internal** — runtime-only，不暴露给 author |
| `_targetTemplateId` | 编译期注入的目标模板 id        | **internal** — runtime-only，不暴露给 author |
| `targetId`          | 通用目标 id (refreshSource 等) | **stable** — 保留独立字段                    |
| `componentId`       | 目标组件 id                    | **stable** — 保留独立字段                    |
| `componentName`     | 目标组件 name                  | **stable** — 保留独立字段                    |
| `formId`            | 目标表单 id                    | **stable** — 保留独立字段                    |
| `dialogId`          | 目标 dialog id (close 操作)    | **stable** — 保留独立字段                    |
| `surfaceId`         | 目标 surface id (close 操作)   | **stable** — 保留独立字段                    |
| `dataPath`          | 响应写回目标路径               | **stable** — 保留独立字段                    |

### Control-Flow And Execution-Control Fields

| Field             | Scope        | Contract Status                     |
| ----------------- | ------------ | ----------------------------------- |
| `when`            | 条件守卫     | **stable** — control-flow primitive |
| `parallel`        | 并行聚合     | **stable** — control-flow primitive |
| `then`            | 成功分支     | **stable** — control-flow primitive |
| `onError`         | 失败分支     | **stable** — control-flow primitive |
| `onSettled`       | 完成分支     | **stable** — control-flow primitive |
| `continueOnError` | 失败继续     | **stable** — control-flow modifier  |
| `control`         | 操作控制配置 | **stable** — execution control      |
| `timeout`         | 超时时间     | **stable** — execution control      |
| `retry`           | 重试配置     | **stable** — execution control      |
| `debounce`        | 防抖时间     | **stable** — execution control      |

## Convergence Decisions

### `ajax` → `args: ApiSchema` (LANDED)

**Decision**: `ajax` 应收敛为 `action: 'ajax' + args: ApiSchema`

**Rationale**:

- 请求配置属于 payload
- `ApiSchema` 可直接作为 `args` 值
- `ajax` 完全符合 `action + args` 模式

**Authoring**:

1. `{ action: 'ajax', args: { url, method, data } }`

### `submitForm` (SEMANTIC COMMAND)

**Decision**: `submitForm` 保持无 payload 的语义型 built-in action。

**Rationale**:

- 它的职责是触发当前 `ctx.form` 的 submit 流程，而不是承载一份新的 request payload
- 表单数据、校验与 `submitAction` 选择都属于 `FormRuntime` 语义
- 若 schema 需要显式 targeting 某个表单实例，更合理的长期路径是 `component:submit`，而不是把 `submitForm` 机械改造成 `ajax` 风格 payload action

**Current live baseline**:

1. `SubmitFormActionSchema` 只要求 `action: 'submitForm'`
2. `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts` 对 `submitForm` 生成无 payload invocation
3. `packages/flux-runtime/src/action-adapter.ts` 对 `submitForm` 直接调用 `ctx.form.submit(...)`

**Authoring**:

1. `{ action: 'submitForm' }`

### `openDialog`/`openDrawer` → `args` (LANDED)

**Decision**: `openDialog`/`openDrawer` 使用 `args`

**Rationale**:

- surface 打开配置属于 payload
- 迁移后符合 `action + args` 模式

**Authoring**:

1. `{ action: 'openDialog', args: { ... } }`
2. `{ action: 'openDrawer', args: { ... } }`

### `setValue`/`setValues` → `args` Narrow DTO (LANDED)

**Decision**: `setValue`/`setValues` 的 author-visible payload 统一到 `args`

**Rationale**:

- `setValue` 适合表达为 `args: { path?, value }`
- `setValues` 适合表达为 `args: { path?, values }`
- 这样 payload 仍然统一为 `args`，同时保留 write action 的窄语义
- `path` 比 `dataPath` 更贴近现有 scope/path 术语，也避免与 ajax response `dataPath` 混淆

**Status**: `args` 为唯一 payload baseline

**Authoring**:

1. `{ action: 'setValue', args: { path: 'user.name', value: 'Alice' } }`
2. `{ action: 'setValues', args: { values: { 'user.name': 'Alice', 'user.role': 'admin' } } }`
3. `{ action: 'setValues', args: { path: 'user', values: { name: 'Alice', role: 'admin' } } }`

### `closeDialog`/`closeDrawer`/`refreshTable`

**Decision**: 这些 action 保持现状

**Rationale**:

- `closeDialog`/`closeDrawer` 几乎无 payload，主要是 targeting（`dialogId`）
- `refreshTable` 无 payload，只有 implicit targeting（`ctx.page`）

## Immediate Conclusions

1. 当前 live repo 中，天然已经满足 `action + args` 的主要是：
   - `showToast`
   - `navigate`
   - `component:<method>`
   - `namespace:method`
2. 已收敛到 `args` 正式 contract 的 built-in action：
   - `ajax` → `args: ApiSchema`
   - `openDialog` → `args: DialogOpenArgs`
   - `openDrawer` → `args: DrawerOpenArgs`
3. `submitForm` 是无 payload 的语义型 built-in action，不应再按 `ajax` 的 `args: ApiSchema` 路线理解。
4. 无 payload 的 built-in action 仍然存在，例如 `closeDialog`、`closeDrawer`、`closeSurface`、`refreshTable`。
5. write action 的 payload baseline 已统一为 `args`，但它们仍使用窄 DTO，而不是自由 map payload。

## Related Documents

- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/action-graph-authoring.md`
- `docs/references/flux-json-conventions.md`
- `docs/plans/119-action-precompile-and-args-unification-plan.md`
