# Action Payload Matrix

## Purpose

这份文档只回答一个窄问题：当前 live repo 中，各类 action 到底读取哪些 author-visible 字段，以及哪些字段属于：

1. payload
2. targeting
3. control-flow / execution control
4. compatibility residue

它是 `ActionSchema` 收敛、action precompile、`args` 统一化工作的参考矩阵，不单独拥有执行语义规范。执行语义仍以 `docs/architecture/action-algebra-formal-spec.md` 为准。

## Source Of Truth

- `packages/flux-core/src/types/actions.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-runtime/src/action-runtime-handlers.ts`

## Top-Level Field Families

### Payload Fields

- `args`
- `api`
- `dialog`
- `drawer`
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

| Action | Current payload field(s) | Current targeting field(s) | `args`-ready? | Notes |
| --- | --- | --- | --- | --- |
| `showToast` | `args` or top-level payload fallback | none | yes | 当前最接近标准 `action + args` |
| `navigate` | `args` or top-level payload fallback | none | yes | 当前要求 `args.url` 或 `args.back` |
| `ajax` | `api` | none | migratable | 推荐迁移为 `args: ApiSchema` |
| `submitForm` | `api` | implicit `ctx.form` | migratable | 可评估迁移到 `args: ApiSchema` 或 submit DTO |
| `openDialog` / `dialog` | `dialog` | implicit `ctx.surfaceRuntime` | migratable | 推荐迁移为 `args: DialogOpenArgs` |
| `openDrawer` / `drawer` | `drawer` | none | migratable | 推荐迁移为 `args: DrawerOpenArgs` |
| `closeDialog` | none | `dialogId` optional | low-value | 主要是无 payload + optional targeting |
| `closeDrawer` | none | `dialogId` optional, else current context | low-value | 当前实现实际也复用了 `dialogId` carrier |
| `refreshTable` | none | implicit `ctx.page` | low-value | 更像 semantic entry，不需要 `args` |
| `refreshSource` | none | `targetId` / `componentId` / `componentPath` | partial | 可改成 `args.targetId`，但 targeting family 需先决策 |
| `setValue` | `value` | `componentPath` / `componentId` / `formId` | hard | 需要新的 DTO，如 `{ path, value }` |
| `setValues` | `values` | `formId` optional | hard | `values` 是 patch map，不等同普通 payload DTO |

## Non-Built-In Matrix

| Action family | Current payload field(s) | Current targeting field(s) | `args` status | Notes |
| --- | --- | --- | --- | --- |
| `component:<method>` | `args` or top-level payload fallback | `_targetCid` / `componentId` / `componentName` / internal target carrier | already aligned | payload 与 targeting 已分离 |
| `namespace:method` | `args` or top-level payload fallback | lexical `ActionScope` | already aligned | 这是推荐的 namespaced payload surface |

## Current Runtime Rules

### `args` Evaluation Rule

当前 `evaluateActionArgs(action, ctx, input)` 的规则是：

1. schema compiler / dispatch entry 先把 raw action lowering 成 `CompiledActionProgram`
2. 若存在 `args`，则在 compiled action node 上直接求值 `payload.args`
3. 否则保留 legacy top-level payload fallback，并在 lowering 阶段把提取后的 payload map 编译进 `payload.args`

这意味着当前仍兼容：

```json
{
  "action": "showToast",
  "level": "success",
  "message": "Saved"
}
```

但收敛方向应优先改成：

```json
{
  "action": "showToast",
  "args": {
    "level": "success",
    "message": "Saved"
  }
}
```

### `api` Is Not Yet `args`

当前 `ajax` / `submitForm` 仍保留独立 `api` carrier，但它们已经在 lowering 阶段进入 compiled action payload：

1. raw authoring surface 仍可写 `action.api`
2. action compiler 将其 lowering 到 `CompiledActionNode.payload.api`
3. executor 只从 compiled payload 读取并求值，不再在执行期首次编译 `api`

因此 live repo 里，`ajax` 还不是严格的 `action + args`，但已经不再依赖运行时懒编译。

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
| `args` | 通用 payload map | **canonical** — 推荐的 author-visible payload 载体 |
| `api` | ApiSchema carrier for `ajax`/`submitForm` | **migratable** — 推荐迁移到 `args: ApiSchema` |
| `dialog` | DialogOpenArgs carrier | **migratable** — 推荐迁移到 `args: DialogOpenArgs` |
| `drawer` | DrawerOpenArgs carrier | **migratable** — 推荐迁移到 `args: DrawerOpenArgs` |
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

### `ajax` → `args: ApiSchema` (DECIDED: YES)

**Decision**: `ajax` 应收敛为 `action: 'ajax' + args: ApiSchema`

**Rationale**:
- `api` 是 payload，不是 targeting 或 control-flow
- `ApiSchema` 结构已经定义清楚，可直接作为 `args` 值
- 迁移后 `ajax` 完全符合 `action + args` 模式

**Migration Path**:
1. 当前写法 (legacy): `{ action: 'ajax', api: { url, method, data } }`
2. 推荐写法 (target): `{ action: 'ajax', args: { url, method, data } }`
3. Runtime 兼容: 若 `args` 存在且为 ApiSchema，优先使用 `args`；否则回退到 `api`

### `submitForm` → `args: ApiSchema` (DECIDED: YES)

**Decision**: `submitForm` 跟随 `ajax` 统一到 `args: ApiSchema`

**Rationale**:
- `submitForm` 的 `api` 用途与 `ajax` 相同
- 表单数据来自 `ctx.form`，不需要额外 wrapper
- 统一后减少 author 心智负担

**Migration Path**:
1. 当前写法 (legacy): `{ action: 'submitForm', api: { url, method } }`
2. 推荐写法 (target): `{ action: 'submitForm', args: { url, method } }`
3. Runtime 兼容: 同 `ajax`

### `openDialog`/`openDrawer` → `args` (DECIDED: YES)

**Decision**: `openDialog`/`openDrawer` 推荐迁移到 `args`

**Rationale**:
- `dialog`/`drawer` 是 payload，不是 targeting
- 迁移后符合 `action + args` 模式

**Migration Path**:
1. 当前写法 (legacy): `{ action: 'openDialog', dialog: { ... } }`
2. 推荐写法 (target): `{ action: 'openDialog', args: { ... } }`
3. Runtime 兼容: 若 `args` 存在，优先使用 `args`；否则回退到 `dialog`/`drawer`

### `setValue`/`setValues` (DECIDED: KEEP SPECIALIZED)

**Decision**: `setValue`/`setValues` 保留专用字段 `value`/`values`

**Rationale**:
- `setValue` 的 payload 是单值，且与目标路径分离（`componentPath` + `value`）
- `setValues` 的 payload 是 patch map，key 本身就是路径语义
- 若强推 `args`，需要定义 `{ path, value }` DTO，增加 author 负担
- 当前形式语义清晰，不需要为了统一而统一

**Status**: 保留 `value`/`values` 作为 narrower built-in carriers

### `closeDialog`/`closeDrawer`/`refreshTable` (DECIDED: LOW-PRIORITY)

**Decision**: 这些 action 保持现状，不优先迁移

**Rationale**:
- `closeDialog`/`closeDrawer` 几乎无 payload，主要是 targeting（`dialogId`）
- `refreshTable` 无 payload，只有 implicit targeting（`ctx.page`）
- 迁移收益极低，不值得增加 migration noise

## Immediate Conclusions

1. 当前 live repo 中，天然已经满足 `action + args` 的主要是：
   - `showToast`
   - `navigate`
   - `component:<method>`
   - `namespace:method`
2. 已决定迁移到 `args` 的 built-in action：
   - `ajax` → `args: ApiSchema`
   - `submitForm` → `args: ApiSchema`
   - `openDialog` → `args: DialogOpenArgs`
   - `openDrawer` → `args: DrawerOpenArgs`
3. 决定不迁移的 action：
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
