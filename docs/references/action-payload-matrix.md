# Action Payload Matrix

## Purpose

这份文档只回答一个窄问题：当前 live repo 中，各类 action 到底读取哪些 author-visible 字段，以及哪些字段属于：

1. payload
2. targeting
3. control-flow / execution control
4. specialized built-in payloads

它是 `ActionSchema` 收敛、action precompile、`args` 统一化工作的参考矩阵，不单独拥有执行语义规范。执行语义仍以 `docs/architecture/action-algebra-formal-spec.md` 为准。

## Source Of Truth

- `packages/flux-core/src/types/actions.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-runtime/src/action-runtime-handlers.ts`

## Top-Level Field Families

### Payload Fields

- `args`
- `value`
- `values`

### Targeting Fields

- `_targetCid`
- `_targetTemplateId`
- `targetId`
- `componentId`
- `componentName`
- `componentPath`
- `formId`
- `dialogId`

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

| Action | Current payload field(s) | Current targeting field(s) | `args` usage | Notes |
| --- | --- | --- | --- | --- |
| `showToast` | `args` | none | canonical | 推荐写 `args` |
| `navigate` | `args` | none | canonical | 推荐写 `args` |
| `ajax` | `args` | none | canonical | `args` 必须是 `ApiSchema` |
| `submitForm` | `args` | implicit `ctx.form` | canonical | `args` 必须是 `ApiSchema` |
| `openDialog` | `args` | implicit `ctx.surfaceRuntime` | canonical | `args` 承载 dialog surface payload |
| `openDrawer` | `args` | none | canonical | `args` 承载 drawer surface payload |
| `closeDialog` | none | `dialogId` optional | no payload | 主要是无 payload + optional targeting |
| `closeDrawer` | none | `dialogId` optional, else current context | no payload | 当前实现实际也复用了 `dialogId` carrier |
| `refreshTable` | none | implicit `ctx.page` | no payload | 更像 semantic entry，不需要 `args` |
| `refreshSource` | none | `targetId` / `componentId` / `componentPath` | no payload | targeting 仍独立存在 |
| `setValue` | `value` | `componentPath` / `componentId` / `formId` | specialized | 保留单值 carrier |
| `setValues` | `values` | `formId` optional | specialized | 保留 patch map carrier |

## Non-Built-In Matrix

| Action family | Current payload field(s) | Current targeting field(s) | `args` status | Notes |
| --- | --- | --- | --- | --- |
| `component:<method>` | `args` | `_targetCid` / `componentId` / `componentName` / internal target carrier | already aligned | payload 与 targeting 已分离 |
| `namespace:method` | `args` | lexical `ActionScope` | already aligned | 这是推荐的 namespaced payload surface |

## Current Runtime Rules

### `args` Evaluation Rule

当前 `evaluateActionArgs(action, ctx, input)` 的规则是：

1. schema compiler / dispatch entry 先把 raw action lowering 成 `CompiledActionProgram`
2. 若存在 `args`，则在 compiled action node 上直接求值 `payload.args`
3. 对内置 action，执行器只读取该求值结果或专用 `value` / `values` carrier

非 built-in namespaced action 之外，公开 authoring 仍建议显式写 `args`。例如：

```json
{
  "action": "showToast",
  "level": "success",
  "message": "Saved"
}
```

推荐写法：

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

当前 `ajax` / `submitForm` / `openDialog` / `openDrawer` 都只通过 `args` 读取 payload：

1. `ajax` / `submitForm` 使用 `args: ApiSchema`
2. `openDialog` / `openDrawer` 使用 `args` 承载 surface payload
3. `action: 'dialog'` / `action: 'drawer'` 不是正式 contract

### `setValue` / `setValues` Are Structurally Different

`setValue` 与 `setValues` 当前不应被简单归类为“只是没迁移到 `args` 的普通 map payload action`：

1. `setValue` 的 payload 是单值，且与目标路径分离
2. `setValues` 的 payload 是 patch map，key 本身就是路径语义
3. 二者还与 `formId`、`componentPath`、`componentId` 等 targeting / ownership 语义纠缠

因此：

1. 它们可以未来迁移为 `args` DTO
2. 但不能只因为“`args` 是 map”就认定收敛没有语义成本

## Field Boundary Contract (Frozen)

本节定义 `ActionSchema` 字段的正式边界，用于指导 action precompile 和 args 统一化工作。

### 原则

1. `args` 只承载 **payload**，不吞并 targeting 或 control-flow 字段
2. targeting 字段保留独立字段族
3. control-flow / execution control 字段保留独立字段族
4. 对于语义特殊的 write action，可保留专用 payload carrier

### Payload Fields

| Field | Scope | Contract Status |
|-------|-------|-----------------|
| `args` | 通用 payload map | **canonical** — 正式 author-visible payload 载体 |
| `value` | 单值 carrier for `setValue` | **specialized** — 保留，因为语义特殊 |
| `values` | patch map carrier for `setValues` | **specialized** — 保留，因为语义特殊 |

### Targeting Fields

| Field | Scope | Contract Status |
|-------|-------|-----------------|
| `_targetCid` | 编译期注入的目标组件 cid | **internal** — runtime-only，不暴露给 author |
| `_targetTemplateId` | 编译期注入的目标模板 id | **internal** — runtime-only，不暴露给 author |
| `targetId` | 通用目标 id (refreshSource 等) | **stable** — 保留独立字段 |
| `componentId` | 目标组件 id | **stable** — 保留独立字段 |
| `componentName` | 目标组件 name | **stable** — 保留独立字段 |
| `componentPath` | 目标组件路径 (setValue/refreshSource) | **stable** — 保留独立字段 |
| `formId` | 目标表单 id | **stable** — 保留独立字段 |
| `dialogId` | 目标 dialog id (close 操作) | **stable** — 保留独立字段 |

### Control-Flow And Execution-Control Fields

| Field | Scope | Contract Status |
|-------|-------|-----------------|
| `when` | 条件守卫 | **stable** — control-flow primitive |
| `parallel` | 并行聚合 | **stable** — control-flow primitive |
| `then` | 成功分支 | **stable** — control-flow primitive |
| `onError` | 失败分支 | **stable** — control-flow primitive |
| `onSettled` | 完成分支 | **stable** — control-flow primitive |
| `continueOnError` | 失败继续 | **stable** — control-flow modifier |
| `control` | 操作控制配置 | **stable** — execution control |
| `timeout` | 超时时间 | **stable** — execution control |
| `retry` | 重试配置 | **stable** — execution control |
| `debounce` | 防抖时间 | **stable** — execution control |

## Convergence Decisions

### `ajax` → `args: ApiSchema` (LANDED)

**Decision**: `ajax` 应收敛为 `action: 'ajax' + args: ApiSchema`

**Rationale**:
- 请求配置属于 payload
- `ApiSchema` 可直接作为 `args` 值
- `ajax` 完全符合 `action + args` 模式

**Authoring**:
1. `{ action: 'ajax', args: { url, method, data } }`

### `submitForm` → `args: ApiSchema` (LANDED)

**Decision**: `submitForm` 跟随 `ajax` 统一到 `args: ApiSchema`

**Rationale**:
- 请求配置与 `ajax` 语义一致
- 表单数据来自 `ctx.form`，不需要额外 wrapper
- 统一后减少 author 心智负担

**Authoring**:
1. `{ action: 'submitForm', args: { url, method } }`

### `openDialog`/`openDrawer` → `args` (LANDED)

**Decision**: `openDialog`/`openDrawer` 使用 `args`

**Rationale**:
- surface 打开配置属于 payload
- 迁移后符合 `action + args` 模式

**Authoring**:
1. `{ action: 'openDialog', args: { ... } }`
2. `{ action: 'openDrawer', args: { ... } }`

### `setValue`/`setValues` (DECIDED: KEEP SPECIALIZED)

**Decision**: `setValue`/`setValues` 保留专用字段 `value`/`values`

**Rationale**:
- `setValue` 的 payload 是单值，且与目标路径分离（`componentPath` + `value`）
- `setValues` 的 payload 是 patch map，key 本身就是路径语义
- 若强推 `args`，需要定义 `{ path, value }` DTO，增加 author 负担
- 当前形式语义清晰，不需要为了统一而统一

**Status**: 保留 `value`/`values` 作为 narrower built-in carriers

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
   - `submitForm` → `args: ApiSchema`
   - `openDialog` → `args: DialogOpenArgs`
   - `openDrawer` → `args: DrawerOpenArgs`
3. 保留专用 payload carrier 的 action：
   - `setValue` — 保留 `value`
   - `setValues` — 保留 `values`
   - `closeDialog` — 保留 `dialogId` targeting
   - `closeDrawer` — 保留 `dialogId` targeting
   - `refreshTable` — 保留 implicit targeting

## Related Documents

- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/action-graph-authoring.md`
- `docs/references/flux-json-conventions.md`
- `docs/plans/119-action-precompile-and-args-unification-plan.md`
