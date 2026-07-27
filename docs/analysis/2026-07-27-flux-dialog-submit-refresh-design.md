# Dialog 提交后刷新外部 Table 的设计分析

> **创建日期**：2026-07-27
> **状态**：分析完成，待实现
> **范围**：flux-runtime / flux-action-core / flux-renderers-data / flux-renderers-form / flux-renderers-basic
> **背景**：nop-entropy flux-mode e2e 调试中发现"openDialog + form submit 后刷新外部 CRUD"链路不通。本文系统分析根因并提出设计方案。

---

## 0. TL;DR

**核心问题**：flux 当前**没有任何一条干净路径**能让"openDialog → form 提交成功 → 关闭 dialog → 自动刷新外部 CRUD（不知道 CRUD 的 id/name）"端到端跑通。

**根因（10 个 Gap，详见 §3）**：

1. `refreshSource` 的 scope 参数精确匹配，不沿 parent 链向上 traverse
2. `closeSurface` 之后的 `then` 不切换 ctx（仍在 dialog scope）
3. action-style openDialog 多创建一层中间 scope
4. form 的 onSubmitSuccess dispatch 时 ctx 残缺（无 componentRegistry / surfaceRuntime / page）
5. `SurfaceEntry` 有 `ownerScope` / `ownerNodeInstance` 字段但无 reader，回链不到 owner
6. CRUD 自身不注册为可被 refreshSource 命中的 source
7. `refreshTable` 只是 bump refreshTick，并不真的刷数据
8. `openDialog` 的 args 不接受 `onClose` / `onSubmitSuccess` / `onSubmitError` 钩子
9. `surfaceRuntime.close` 不调 `entry.onClose`
10. 没有"找最近 crud/data-source 父节点"的辅助 API

**提议方案**：方案 A + 方案 B + 方案 C，共约 350 行改动，覆盖 95% 业务场景。

| 方案 | 内容                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Surface Lifecycle Hooks：`openDialog`/`openDrawer` 的 args 加 `onClose` / `onSubmitSuccess` / `onSubmitError`（**机制完整保留**，业务方按需使用） |
| B    | 新增 `refreshNearest` action：沿 scope.parent 链向上找最近的 CRUD / data-source，不需要 id/name                                                   |
| C    | Surface 创建时保存 owner 完整 ctx（hook 触发时能在 owner scope dispatch）                                                                         |

---

## 1. 现状摘要 — flux 现有 API

### 1.1 Surface / Dialog 相关

| API / 概念                                               | 位置                                                                                                           | 说明                                                                                                                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openDialog` action                                      | `packages/flux-runtime/src/action-adapter.ts:185-218`                                                          | 通过 `surfaceRuntime.open` 注册 surface；args 整体作为 `surface` 对象存到 entry                                                                               |
| `openDrawer` action                                      | `packages/flux-runtime/src/action-adapter.ts:243-279`                                                          | 同上，kind='drawer'                                                                                                                                           |
| `closeDialog` / `closeDrawer` / `closeSurface` action    | `packages/flux-runtime/src/action-adapter.ts:220-241`                                                          | 优先级：`args.surfaceId` > `args.dialogId` > `args.drawerId` > `ctx.dialogId` > `closeTop()`                                                                  |
| `createSurfaceScope(kind, ctx, patch)`                   | `packages/flux-runtime/src/runtime-factory.ts:592-618`                                                         | 创建 **3 层链**：dialogScope → openingScope → ctx.scope(owner)                                                                                                |
| `surfaceRuntime.open({ kind, surface, scope, options })` | `packages/flux-runtime/src/surface-runtime.ts:120-157`                                                         | 把 `options.ownerScope`、`options.ownerNodeInstance`、`options.onClose`/`onOpen`/`onConfirm` 存到 `SurfaceEntry`                                              |
| `surfaceRuntime.close(surfaceId)`                        | `packages/flux-runtime/src/surface-runtime.ts:182-186`                                                         | 调 `disposeEntry` → 清 status、dispose validationOwner、dispose owned scope。**不调用 entry.onClose**                                                         |
| `disposeEntry(entry)`                                    | `packages/flux-runtime/src/surface-runtime.ts:102-116`                                                         | 关闭时的清理；**没有调用任何 onClose/onSubmitSuccess 回调**                                                                                                   |
| `SurfaceEntry` schema                                    | `packages/flux-core/src/types/runtime.ts:239-262`                                                              | 有 `ownerScope?`、`ownerNodeInstance?`、`onClose?`、`onConfirm?`、`onOpen?` 字段，但 openDialog action 只填 `ownerScope`/`ownerNodeInstance`，不填 onClose 等 |
| `OpenDialogActionSchema`                                 | `packages/flux-core/src/types/actions.ts:169-172`                                                              | `args: Record<string, SchemaValue>` — 完全开放，**无 onClose/onSubmitSuccess/onSubmitError 字段约束**                                                         |
| 表面组件声明式用法                                       | `packages/flux-react/src/dialog-host.tsx:192-370`、`packages/flux-renderers-basic/src/use-surface-renderer.ts` | declarative `<surface type="dialog" open=... onClose=...>` 走 `useSurfaceRenderer`，**才会**填 `options.onClose`；action-style openDialog 不走这条路          |
| `ownerScope` 字段实际用途                                | `packages/flux-runtime/src/surface-runtime.ts:39, 57`                                                          | **仅用于 status publication**（写到 ownerScope 的 statusPath）。没有任何 refresh / action 机制通过它反查 owner                                                |

### 1.2 Refresh 相关

| API                                        | 位置                                                                                                                         | 作用                                                                                                                                  | 限制                                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `refreshTable` action                      | `packages/flux-runtime/src/action-adapter.ts:357-363`                                                                        | 仅 `ctx.page?.refresh()` → 自增 `refreshTick`                                                                                         | **不会真的去刷新数据**，只触发订阅了 refreshTick 的组件（仅 `PageRenderer`）。dialog ctx 里 `page` 也是 undefined 或不对的 |
| `refreshSource` action                     | `packages/flux-runtime/src/action-adapter.ts:365-382`                                                                        | `runtime.refreshDataSource({ name: targetId, scope: ctx.scope })`                                                                     | **`scope` 是精确匹配，不向上 traverse**（`source-registry.ts:348-359`）                                                    |
| `component:refresh` action                 | `packages/flux-action-core/src/action-dispatcher/action-runners.ts:71-130` → `action-adapter.ts:392-471`                     | 调用 `componentRegistry.resolve(target)` → `handle.capabilities.invoke('refresh', payload, ctx)`。**registry 会沿 parent 链向上查找** | **必须知道 `componentId` 或 `componentName`**                                                                              |
| CRUD `refresh` capability                  | `packages/flux-renderers-data/src/crud-renderer-state.ts:319-377`（注册）、`crud-renderer.tsx:216-252`（handleRefresh 实现） | `refresh` → `loadResult.reload()`（重跑 loadAction）+ 触发 `onRefresh` event                                                          | CRUD 自身**不注册为 source**，所以 `refreshSource targetId="crudId"` 不工作                                                |
| `runtime.refreshDataSource({name, scope})` | `packages/flux-runtime/src/runtime-factory.ts:465-471` → `packages/flux-runtime/src/async-data/source-registry.ts:348-377`   | 按 scope.id 精确查找                                                                                                                  | **不沿 parent 链向上查找**。无 scope 时才全局扫描                                                                          |
| `ctx.page.refresh()`                       | `packages/flux-runtime/src/page-runtime.ts:93-95` → `page-store.ts:25-28`                                                    | 仅 `refreshTick += 1`；不会真的去刷新源                                                                                               | 唯一消费者是 `PageRenderer`                                                                                                |

### 1.3 Scope 链

| API                          | 位置                                                             | 说明                                                       |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `ScopeRef.parent`            | `packages/flux-runtime/src/scope.ts:430`                         | scope 有 parent 链                                         |
| `resolveScopePath` (read)    | `packages/flux-runtime/src/scope.ts:340-363`                     | 读 path 时会沿 parent 链向上找                             |
| `scope.update(path, value)`  | `packages/flux-runtime/src/scope.ts:475-499`                     | 写入 own snapshot（**不会冒泡到 parent**）                 |
| `buildScopeChain(scope)`     | `packages/flux-core/src/runtime-inspection.ts:20-39`             | 调试用，遍历 scope 到 root。**refreshDataSource 没有用它** |
| Component registry `resolve` | `packages/flux-runtime/src/component-handle-registry.ts:231-298` | 沿 `parent` + `__childRegistries` **双向遍历查找**         |

### 1.4 ajax 默认行为（关键背景，影响 hook 设计）

**a. `messages` 配置**（`packages/flux-core/src/types/actions.ts:125-132`）

```ts
export interface MessagesConfig {
  success?: string;
  failed?: string; // 注意是 "failed"，不是 "error" / "fail"
}

export interface ActionShapeFields extends SchemaObject {
  // ...
  messages?: MessagesConfig; // 任何 action 都可配（不止 ajax/submit）
}
```

处理逻辑（`packages/flux-runtime/src/runtime-action-helpers.ts:134-167`）：

- `result.ok && messages?.success` → `env.notify('success', evaluate(messages.success, scope))`
- `!result.ok && !cancelled && messages?.failed` → `env.notify('error', evaluate(messages.failed, scope))`

注释（`actions.ts:125-128`）明确："Processed by the runtime ajax handler after the request completes, **independent of `then`/`onError`**" — 与 `then`/`onError` 链独立触发。

**b. ajax 失败时默认 toast 后端 msg（无需任何 schema 配置）**

两层链路：

**第一层：fetcher 返回非 OK → Error 化**（`packages/flux-runtime/src/async-data/request-runtime.ts:80-118`）

```ts
function createApiResponseError(response, retryMetadata) {
  let message;
  // 1. top-level response.msg（标准 ApiResponse 字段）
  if (typeof response.msg === 'string' && response.msg.length > 0) message = response.msg;
  // 2. response.data.message（非标后端）
  if (!message) message = readResponseErrorMessage(responseData); // tries data.message then data.msg
  // 3. generic fallback
  if (!message) message = response.code
    ? `Request failed (status=${response.status}, code=${response.code})`
    : `Request failed (status=${response.status})`;
  return Object.assign(new Error(message, { cause: response }), retryMetadata, { ... });
}
```

**第二层：dispatcher 兜底 notify**（`packages/flux-action-core/src/action-dispatcher/action-execution.ts:200-225`）

result 是 failure 且没被 `onError` 处理时，自动 `ctx.getEnv().notify('error', result.error.message)`。

**测试 `packages/flux-runtime/src/__tests__/request-runtime-error-notify.test.ts:11-34` 证明**：schema 完全不写 `messages`、不写 `onError`，fetcher 返回 `{ ok: false, status: 400, data: { msg: 'Email already registered' } }`，**自动 `notify('error', 'Email already registered')`，恰好一次**。

**含义**：业务侧绝大多数场景**不需要写** `onSubmitError` 钩子来显示错误 toast —— ajax 默认行为已覆盖。`onSubmitError` 作为机制仍然提供（用于自定义错误恢复逻辑、跳转、上报等非 toast 场景）。

### 1.5 Form 生命周期与 onSubmitSuccess

| API                                       | 位置                                                                            | 说明                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormLifecycleHandlers` 类型              | `packages/flux-core/src/types/runtime.ts:220-237`                               | `submitAction`/`onSubmitSuccess`/`onSubmitError`/`onValidateError`                                                                                 |
| Form 注册 handlers                        | `packages/flux-renderers-form/src/renderers/form.tsx:240-300`                   | 把 schema 的 `onSubmitSuccess` 事件挂到 form 的 lifecycle handler                                                                                  |
| `executeFormSubmit`                       | `packages/flux-runtime/src/form-runtime-submit-flow.ts:229-480`（关键 451-453） | submit 成功后调 `lifecycleHandlers.onSubmitSuccess(result, options)`                                                                               |
| `resolveLifecycleWriteScope(parentScope)` | `packages/flux-renderers-form/src/renderers/form.tsx:99-110`                    | **关键启发式**：若 parentScope 像 surface shell（含 `dialogId`/`drawerId`）且 grandparent 不像，就跳到 grandparent；否则用 parentScope             |
| Form submit 回调的 ctx                    | `packages/flux-renderers-form/src/renderers/form.tsx:251-265`                   | **只传** `scope` + `form` + `interactionId` + `signal` + `prevResult` + `evaluationBindings`；**不传** `componentRegistry`/`surfaceRuntime`/`page` |

---

## 2. 关键发现

### 2.1 `openDialog` action 的实际生效字段

`action-adapter.ts:185-218` 明确读取/使用的字段：

| 字段                                                                                                                                                                                                                                                                                                                | 用途                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `args.data`                                                                                                                                                                                                                                                                                                         | 作为 patch 合入 dialog scope 的 initialData |
| `args.body`                                                                                                                                                                                                                                                                                                         | 当作 schema 编译为 dialog body 节点         |
| `args.title` / `args.size` / `args.width` / `args.height` / `args.showMask` / `args.closeOnOutsideClick` / `args.closeOnEsc` / `args.showCloseButton` / `args.header` / `args.footer` / `args.actions` / `args.headerClassName` / `args.bodyClassName` / `args.footerClassName` / `args.container` / `args.confirm` | 全部从 `surface.*` 读                       |
| `args.statusPath`                                                                                                                                                                                                                                                                                                   | 写入 ownerScope 的状态路径（surface-level） |

**`openDialog` args 中 NOOP 的字段**（写了不生效）：

- ❌ `args.onClose` — 不会传给 `surfaceRuntime.open({options.onClose})`
- ❌ `args.onSubmitSuccess` / `args.onSubmitError` / `args.onConfirm` — 同上
- ❌ `args.ownerScope` / `args.ownerNodeInstance` — 不是从 args 读，是从 ctx 推导

`action-adapter.ts:204-215` 明确构造 `options`：

```ts
options: {
  ownerScope: ctx.scope,
  actionScope: ...,
  componentRegistry: ...,
  validationPlan: validation.plan,
  ownerNodeInstance: ctx.nodeInstance,
  // ↑ 没有 onClose / onOpen / onConfirm / onSubmitSuccess / onSubmitError
}
```

### 2.2 `createSurfaceScope` 创建的子 scope 链（关键发现）

`runtime-factory.ts:592-618`：

```
dialogScope (id=ownerId:dialog-scope, parent=openingScope, dialogId=...)
   ↑
openingScope (id=ownerId:dialog-opening-scope, parent=ctx.scope, empty data)
   ↑
ctx.scope (owner scope — 通常是 page scope)
```

**dialog scope 的 parent 是 openingScope，而不是 owner scope。**

- 对 **declarative surface**（`useSurfaceRenderer`，line 114-125）只创建 **1 层**（`createChildScope(node.scope, {dialogId})`），dialogScope.parent = node.scope 直接是 owner
- 对 **action-style openDialog** 创建 **2 层**（dialogScope → openingScope → owner）

这种 **scope 深度不一致** 是后续 form 的 lifecycleWriteScope 启发式失败的根因。

### 2.3 `ownerScope` / `ownerNodeInstance` 是「只写」字段

`SurfaceEntry.ownerScope` 和 `entry.ownerNodeInstance`（`runtime.ts:239-262`）只在以下位置被**读**过：

- `surface-runtime.ts:36-48`（status publication）
- `dialog-host-surface.tsx:75-118`（context provider 暴露给 SurfaceScopeProviders）
- 测试断言（`runtime-dialogs-scope.dialog-state.test.ts:284`）

**没有任何 action / refresh 机制通过它们反查 owner**。它们是只写状态，没有 reader 用于回链到 owner。

### 2.4 `closeSurface` action 的执行流程

**`closeSurface` 之后能再触发 owner 中的 action 吗？** 答案：**可以触发，但 ctx 不会自动切到 owner scope**。

`action-execution.ts:519-675`（dispatch）+ `action-execution.ts:557-570`（then 分支）：

```ts
if (resultClass === 'success' && normalizedAction.then) {
  previous = await dispatch(
    ctx,
    { nodes: normalizedAction.then, isFullyStatic: false },
    {
      ...baseActionCtx, // ← 沿用 closeSurface 的 ctx
      interactionId: currentActionCtx.interactionId,
      prevResult: result,
      evaluationBindings: branchBindings,
    },
  );
}
```

`baseActionCtx` 在 dispatch 入口（line 528-529）从原 `actionCtx` 继承。**`then` 子链与父 action 共用同一个 `ctx.scope`、`ctx.componentRegistry`、`ctx.surfaceRuntime`、`ctx.page`**，不切换 scope。

所以 `{ action: 'closeSurface', then: { action: 'refreshSource', targetId: 'x' } }`：

- closeSurface 跑在 dialog ctx（dialog scope、dialog registry、dialog surfaceRuntime）
- 然后 refreshSource 跑在 **同一个 dialog ctx**
- `runtime.refreshDataSource({ name: 'x', scope: dialogScope })` → 在 `scopeEntries.get(dialogScope.id)` 这一个 bucket 里查
- 数据源 'x' 通常注册在 owner/page scope bucket → **找不到 → 返回 false**

**关键陷阱**：`closeSurface` 之后没有"切回 owner"的机制。

### 2.5 `closeSurface` 是否有 onClose 钩子？

**没有**。`surface-runtime.ts:182-186` 的 `close(surfaceId)`：

```ts
close(surfaceId) {
  const removed = store.remove(surfaceId);
  disposeEntry(removed);   // ← 不调 entry.onClose
  republishActiveStatuses();
}
```

`disposeEntry`（line 102-116）：只 clearSurfaceStatus、dispose validationOwner、dispose scope。**不调 entry.onClose**。

`entry.onClose` 只在两处被调用：

- `use-surface-renderer.ts:323-326`、`use-surface-renderer.ts:345-348`（declarative surface 卸载时）

action-style openDialog 创建的 entry 没有设 `onClose`（adapter 不传 `options.onClose`），即使被调也是 undefined。

### 2.6 dialog form 的 onSubmitSuccess 执行 scope

**关键发现**：Form 的 `onSubmitSuccess` 不是在 form 所在 dialog scope 执行，而是在 form 推断的 `lifecycleWriteScope` 执行（form.tsx:217-226, 251-265）。

`resolveLifecycleWriteScope(parentScope)`（form.tsx:99-110）的启发式：

- 如果 `parentScope`（form 的 parent，通常是 dialog scope）的 visible 数据里有 `dialogId`/`drawerId`，且 `parentScope.parent` 的 visible 里没有 → 用 `parentScope.parent`
- 否则用 `parentScope`

**对 declarative dialog**：dialogScope.parent = page scope（一层）→ 启发式跳到 page scope ✓

**对 action-style openDialog**：dialogScope.parent = openingScope（无 dialogId）→ 启发式跳到 openingScope，**但 openingScope 并不是 page scope，openingScope.parent 才是 page scope** ✗

测试佐证：

- `form-submit-actions.parent-scope.test.tsx:83-142`（declarative 场景，pass）
- **没有任何测试**覆盖 action-style openDialog + form + onSubmitSuccess 的写回路径

此外，form 的 onSubmitSuccess dispatch 时**只传 `{scope, form, interactionId, signal, prevResult, evaluationBindings}`**，没有 `componentRegistry`、没有 `surfaceRuntime`、没有 `page`、没有 `nodeInstance`。因此从 onSubmitSuccess 里：

- ❌ 不能 `component:refresh`（无 componentRegistry）→ invokeComponentAction 直接返回 "Component registry not available"
- ❌ 不能 `openDialog` / `closeSurface`（无 surfaceRuntime）→ openDialog 报错；closeSurface 静默 no-op（`if (ctx.surfaceRuntime) { ... } return { ok: true };`，见 action-adapter.ts:231-241）
- ❌ 不能 `refreshTable`（无 page）→ `ctx.page?.refresh()` 是 no-op
- ✓ 可以 `setValue` / `setValues` / `ajax` / `refreshSource`（这些不需要外部 ctx 对象）

### 2.7 CRUD 的 refresh API 实现

`crud-renderer-state.ts:304-377`（useCrudHandle 注册）：

- 方法列表：`['refresh', 'getSelection', 'clearSelection', 'toggleSelection', 'loadMore', 'querySubmit', 'queryReset']`（line 324）
- `refresh` 调用 `handleRefresh(toPartialActionContext(ctx))`（line 343）

`crud-renderer.tsx:216-252`（handleRefresh）：

1. 若 `autoClearSelectionOnRefresh`，清空 selection
2. 若有 `loadAction`：`loadResult.reload()` — 自增 `reloadNonce`，触发 `useCrudLoadAction` 内部 effect 重跑（crud-renderer-state.ts:536-539, 599-696）
3. 触发 schema 的 `onRefresh` 事件，scope = `scope ?? ctx?.scope ?? nodeScope`

`useCrudLoadAction`（crud-renderer-state.ts:480-701）：

- `loadReaction.dispatch({evaluationBindings})` 把 CRUD 内部状态作为 bindings 注入，重新执行 schema 配置的 loadAction（reaction handle）
- 结果通过 `setRows` / `setTotal` 写回 React state（不写 scope）

**重点：CRUD 的 refresh 与 `refreshSource` 是两个独立机制**：

- `component:refresh` 走 CRUD 自己的 `loadReaction`（reaction-based）
- `refreshSource targetId='x'` 走 source registry 的 data-source controller（data-source-renderer.tsx 注册的那些 `<data-source>` 节点）
- **CRUD 自己不会注册成一个可被 refreshSource 找到的 source**

### 2.8 CRUD 的 onRefresh 事件触发链（当前唯一测过的远程刷新模式）

`data-crud-request-owned.test.tsx:42-55`：

```tsx
{
  type: 'crud',
  source: '${pagedUsers}',
  onRefresh: { action: 'refreshSource', targetId: 'pagedUsers' },
  // 触发：{ action: 'component:refresh', componentId: 'request-owned-crud' }
}
```

链路：

1. `component:refresh componentId='request-owned-crud'`
2. → registry.resolve（dialog registry 沿 parent 找到 owner registry，找到 CRUD handle）
3. → `handle.capabilities.invoke('refresh', payload, ctx)`
4. → `handleRefresh(toPartialActionContext(ctx))`（ctx 是 caller 的 ctx，但 handleRefresh 内部用 CRUD 自己的 scope）
5. → `loadResult.reload()`（重跑 CRUD 的 loadReaction）
6. → schema 的 `onRefresh` event 用 `scope: scope ?? ctx?.scope ?? nodeScope`（crud-renderer.tsx:236）dispatch，scope 是 CRUD 自己的 scope
7. → onRefresh = `refreshSource targetId='pagedUsers'` → `runtime.refreshDataSource({name:'pagedUsers', scope: crudScope})`
8. → `scopeEntries.get(crudScope.id)` 找到 'pagedUsers'（因为 data-source 与 CRUD 都在 page-body 下，crudScope 就是 page scope，data-source 也注册在 page scope）→ ✓

**这个测试通过的前提是 CRUD 和 data-source 共享同一个 scope（page scope）**。如果它们在不同 scope（例如 CRUD 嵌套在某 fragment 内），这个链就会断。

### 2.9 现有 owner-scope 概念

**`surface-runtime.ts` 是否有"从 ctx 找 owner scope/owner node"的 API？**

答：**没有**。SurfaceEntry 上有 `ownerScope` / `ownerNodeInstance` 字段，但只是数据，没有任何 API 把它们暴露给 action runtime。

`SurfaceRuntime` 接口（`flux-core/src/types/runtime.ts:293-329`）只有：`store`、`open`、`upsert`、`publishStatus`、`publishClosed`、`close`、`closeTop`、`dispose`。**没有 `findOwnerOf(surfaceId)` / `getOwnerScope(surfaceId)` 之类的方法**。

**`runtime.refreshDataSource({name, scope})` 的 scope 参数怎么用？**

答：**精确匹配 scope.id，不向上 traverse**（`source-registry.ts:348-359`）：

```ts
if (args.scope) {
  const bucket = scopeEntries.get(args.scope.id); // ← 仅一次精确查找
  const entry = Array.from(bucket?.values() ?? []).find(
    (candidate) => candidate.name === args.name,
  );
  if (!entry) return false;
  // ...
}
```

如果不传 scope，才会全局扫描所有 bucket（line 361-368）+ nameIndex fallback（line 370-374）。

**是否有"找最近 crud/table/data-source 父节点"的辅助函数？**

答：**没有**。搜索 `findOwner` / `resolveOwner` / `ownerCrud` / `nearestCrud` / `walkScopeChain` / `traverseScope` / `findScope` 在 `packages/` 下均无匹配。`buildScopeChain`（flux-core/src/runtime-inspection.ts:20-39）存在但仅用于 debug，没人调用它做查找。

### 2.10 scope 链与 component registry 的不对称性（关键）

| 机制                                              | 是否沿 parent 链向上查找？      | 文件:行                              |
| ------------------------------------------------- | ------------------------------- | ------------------------------------ |
| `scope.get(path)` 读取                            | ✓ 是                            | scope.ts:340-363                     |
| `scope.has(path)`                                 | ✓ 是                            | scope.ts:365-388                     |
| `scope.update(path, value)` 写入                  | ✗ 否（只写 own）                | scope.ts:475-499                     |
| `componentRegistry.resolve(target)`               | ✓ 是（双向）                    | component-handle-registry.ts:231-298 |
| `sourceRegistry.refreshDataSource({name, scope})` | ✗ **否**（仅精确匹配 scope.id） | source-registry.ts:348-359           |
| `reactionRegistry` 类似 sourceRegistry            | ✗ 否（按 ownerId 精确）         | reaction-runtime.ts:501-503          |

**这就是为什么 `component:refresh` 在 dialog 里能用（registry 自动向上找），而 `refreshSource targetId='x'` 不能用（source registry 不向上找）。**

---

## 3. Gap 分析

| Gap                                                                                   | 根因                                                                                          | 影响                                                                                                                       |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **G1**: openDialog action 不接受 `onClose` / `onSubmitSuccess` / `onSubmitError` 参数 | `action-adapter.ts:204-215` 显式构造 options 时不读 args 里的这些字段                         | 用户无法在 schema 里写 `openDialog args.onClose` 来配 hook                                                                 |
| **G2**: `closeSurface` 不调用 `entry.onClose`                                         | `surface-runtime.ts:182-186` 的 close 只 disposeEntry，不调 callback                          | 即使 G1 补上，hook 也不会被自动触发                                                                                        |
| **G3**: action-style openDialog 创建 2 层 scope（dialog → opening → owner）           | `runtime-factory.ts:602-617` 中 openingScope 是中间层                                         | form 的 `resolveLifecycleWriteScope`（form.tsx:99-110）启发式只跳一层，会停在 openingScope；onSubmitSuccess 写回不到 owner |
| **G4**: form 的 onSubmitSuccess dispatch 不传 componentRegistry/surfaceRuntime/page   | `form.tsx:251-265`（设计如此）                                                                | 在 onSubmitSuccess 里不能 `component:refresh`/`closeSurface`/`refreshTable`                                                |
| **G5**: `then` 链不切换 ctx                                                           | `action-execution.ts:557-570` 用 baseActionCtx                                                | closeSurface 后的 then 仍在 dialog ctx                                                                                     |
| **G6**: `refreshDataSource({name, scope})` 不沿 parent 链查找                         | `source-registry.ts:348-359` 精确匹配 scope.id                                                | dialog 里调 refreshSource 找不到 owner scope 注册的 source                                                                 |
| **G7**: 没有"找最近 crud/data-source 父节点"的辅助函数                                | 全仓库搜索无匹配                                                                              | 通用"提交后自动刷新外层"无法实现                                                                                           |
| **G8**: SurfaceEntry 的 `ownerScope`/`ownerNodeInstance` 字段没有 reader              | 只在 status publication 用                                                                    | 无法从子 ctx 反查 owner                                                                                                    |
| **G9**: `refreshTable` 实际只是 bump refreshTick，不触发任何数据 reload               | `page-store.ts:25-28` + `page-runtime.ts:93-95`                                               | schema 写 `refreshTable` 期望刷新列表，实际无效                                                                            |
| **G10**: CRUD 自身不注册为可被 refreshSource 命中的 source                            | `crud-renderer-state.ts` 只调 `componentRegistry.register`，不调 `runtime.registerDataSource` | 想 "refreshSource targetId='crudId'" 不工作                                                                                |

---

## 4. 设计目标

> 业务诉求原文：
>
> > "openDialog 这种弹出 surface 的 action 中补充一种额外的配置，在窗口成功或者失败的时候分别调用某种额外的 action，但是它们在下方的 scope 中执行。此时可以有一个 refresh 按钮。refresh 检查最近的 scope。如果是 crud 就 refresh crud，如果是 surface 就重新执行 loadAction。最好是不要知道组件 id 或者 name，能通过最近 scope 这种概念执行。"

拆解为四个设计目标：

| 目标                                         | 含义                                                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G-A: Surface lifecycle hooks（机制完整）** | `openDialog` / `openDrawer` 的 args 增加 `onClose` / `onSubmitSuccess` / `onSubmitError` 三个钩子字段。**机制层面三者都提供**，业务方根据场景按需使用 |
| **G-B: Hooks 在 owner scope 执行**           | hook dispatch 时强制把 ctx 切到 owner（用 `entry.ownerScope` + `entry.ownerNodeInstance` + 完整 owner runtime 引用重建 ctx）                          |
| **G-C: 不需要知道组件 id/name**              | 新增 `refreshNearest` action，自动定位最近的 CRUD / data-source                                                                                       |
| **G-D: refresh 智能分发**                    | 是 CRUD → 重跑 loadAction；是 data-source → refreshDataSource；是 surface → 不动（surface 自身无 loadAction）                                         |

---

## 5. 设计提议

### 5.1 总体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│  Owner page scope                                                    │
│  ┌────────────────┐         ┌──────────────────────────────────┐    │
│  │  CRUD 'list'   │◀───┐    │  openDialog args = {              │    │
│  │  loadAction    │    │    │    body: <form ...>,              │    │
│  └────────────────┘    │    │    onClose:        <refreshNearest>,│   │
│         ▲              │    │    onSubmitSuccess:<refreshNearest>,│   │
│         │              │    │    onSubmitError:  <showToast ...>, │    │
│         │              │    │    //     ↑                       │    │
│         │              │    │    // 大多数场景无需配置           │    │
│         │              │    │    // （ajax 默认已 toast 后端 msg）│    │
│         │              │    │  }                                │    │
│         │              │    └──────────────────────────────────┘    │
│         │              │                 ↓                          │
│         │              │  ┌──────────────────────────────────┐    │
│         │              │  │ Dialog scope (form 在这)           │    │
│         │              │  │  form.submitAction → ajax          │    │
│         │              └──│  → success → 自动触发              │    │
│         │                 │     entry.options.onSubmitSuccess  │    │
│         │                 │     (但 ctx 切到 ownerScope)       │    │
│         │                 └──────────────────────────────────┘    │
│         │                              ↓                           │
│         │            ┌────────────────────────────────────────┐  │
│         └─────────── │  refreshNearest action                 │  │
│                      │   1. 沿 scope.parent 找最近的 CRUD       │  │
│                      │      或 data-source                    │  │
│                      │   2. CRUD → component:refresh           │  │
│                      │      data-source → refreshSource       │  │
│                      └────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 方案 A：Surface Lifecycle Hooks（声明式 + 机制完整）

#### 5.2.1 schema 扩展

`OpenDialogActionSchema` / `OpenDrawerActionSchema` 增加三个可选 hook 字段：

```ts
// packages/flux-core/src/types/actions.ts
export interface OpenDialogActionSchema extends ActionShapeFields {
  action: 'openDialog';
  args: {
    title?: string;
    size?: string;
    data?: object;
    body: SchemaInput;
    // ── 新增 lifecycle hooks（owner scope 执行） ──
    onClose?: ActionNodeInput | ActionNodeInput[];
    onSubmitSuccess?: ActionNodeInput | ActionNodeInput[];
    onSubmitError?: ActionNodeInput | ActionNodeInput[];
  };
}
```

**机制层面三个 hook 都提供**，业务方根据场景按需使用：

| hook              | 触发时机                                                                        | 是否有 `$formData` / `$result` | 典型用途                                             |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `onClose`         | surface 被关闭时（任意路径：手动关闭、closeSurface action、ESC、outside click） | 都没有                         | 关闭后刷新列表、清理临时状态                         |
| `onSubmitSuccess` | form submit ajax 返回成功后                                                     | `$formData` + `$result`        | 提交成功后刷新列表、自定义副作用（导航、上报、关闭） |
| `onSubmitError`   | form submit ajax 返回失败后                                                     | `$formData` + `$result`        | 自定义错误恢复（重置某些字段、跳转错误页、上报埋点） |

> **重要**：`onSubmitError` **不**用于显示错误 toast —— ajax 默认行为已经把后端 `msg` / `message` 自动 toast 一次（见 §1.4.b）。`onSubmitError` 用于非 toast 的自定义错误处理。

#### 5.2.2 hook 如何被触发？

**触发路径 1：surface close**

修改 `surface-runtime.ts:182-186` 的 `close(surfaceId)`：

```ts
async close(surfaceId) {
  const removed = store.remove(surfaceId);
  if (!removed) return;
  // 先触发 onClose hook（在 owner ctx 执行）
  if (removed.options.onClose) {
    await dispatchInOwner(removed, removed.options.onClose);
  }
  disposeEntry(removed);
  republishActiveStatuses();
}
```

**触发路径 2：form submit**

让 form 在 `executeFormSubmit`（`form-runtime-submit-flow.ts:229-480`）成功/失败后，调 `surfaceRuntime.triggerSurfaceHook('submit:success' | 'submit:error', { result, formData })`。

`triggerSurfaceHook` 在 `entry.options.onSubmitSuccess` / `onSubmitError` 上 dispatch，**ctx 强制重建为 owner**。

#### 5.2.3 `dispatchInOwner(entry, actionNodes, payload)` 的实现要点

```ts
// packages/flux-runtime/src/surface-hooks.ts（新增）
export async function dispatchInOwner(
  entry: SurfaceEntry,
  nodes: ActionNode[] | undefined,
  payload: {
    result?: unknown;
    formData?: Record<string, unknown>;
    hookName?: 'close' | 'submit:success' | 'submit:error';
  } = {},
): Promise<ActionResult | undefined> {
  if (!nodes || !entry.ownerActionCtx) return undefined;

  // 用 entry 保存的 owner runtime 引用，构造 owner ctx
  const ownerCtx: ActionContext = {
    ...entry.ownerActionCtx, // 保存 owner 当时的 actionScope / componentRegistry / page / surfaceRuntime
    scope: entry.ownerScope, // ← 切回 owner scope
    nodeInstance: entry.ownerNodeInstance, // ← owner node（CRUD 行按钮、表格 toolbar 等）
    prevResult: payload.result,
    evaluationBindings: {
      ...(entry.ownerActionCtx.evaluationBindings ?? {}),
      $formData: payload.formData ?? {}, // ← 提交时的 form values 快照
      $result: payload.result, // ← 兼容现有 ${$result} 语义（成功 = ajax response；失败 = error）
      $hook: payload.hookName, // ← 让 hook 内可判断是哪个阶段触发（多 hook 共用一组 nodes 时有用）
    },
  };

  return dispatch(
    ownerCtx,
    { nodes, isFullyStatic: false },
    {
      interactionId: generateInteractionId(),
      prevResult: payload.result,
    },
  );
}
```

**关键点**：surface 创建时（`surface-runtime.ts:120-157` 的 open）需要保存 owner 的完整 ctx 引用（不只是 scope/nodeInstance）。建议在 `SurfaceEntry` 上加 `ownerActionCtx` 字段（保留 `runtime` / `actionScope` / `componentRegistry` / `page` / `surfaceRuntime` 引用）。

> 注意 `evaluationBindings` 中已有的 `${$result}` 是 dispatcher 注入的语法糖，本设计的 `$result` 与之同义，不冲突；`$formData` 与现有 `ctx.form`（form runtime 对象）语义不同（一个是 plain values snapshot，一个是 runtime handle），命名上明确区分。

### 5.3 方案 B：`refreshNearest` Action（最近 scope 自动定位）

#### 5.3.1 命名选择

候选命名对比：

| 命名                 | 优点                                                                                      | 缺点                                                              | 结论        |
| -------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------- |
| `refresh:nearest`    | 短                                                                                        | 与现有冒号语义（`component:xxx` 是 namespace:method）不一致，混淆 | ❌          |
| **`refreshNearest`** | 与 `refreshTable` / `refreshSource` 同系列（同一动词 refresh 的不同变体），命名一致性最好 | 略长                                                              | ✅ **推荐** |
| `refreshOwner`       | 与 `entry.ownerScope` 概念对齐                                                            | "owner" 在嵌套场景下歧义大                                        | ❌          |
| `bubblingRefresh`    | 借用 DOM 冒泡概念                                                                         | 与 flux action 命名风格不符                                       | ❌          |
| `autoRefresh`        | 简短                                                                                      | 太模糊                                                            | ❌          |

**最终命名：`refreshNearest`**，与 `refreshTable` / `refreshSource` 三足鼎立，schema 读者一看就知道是 refresh 家族：

```
refreshTable   → 刷新 ctx.page（bump refreshTick，目前基本无用）
refreshSource  → 刷新指定 name 的 data-source（精确匹配，需知 name）
refreshNearest → 沿 scope 链向上找最近的 CRUD / data-source（新）
```

#### 5.3.2 schema

```ts
// packages/flux-core/src/types/actions.ts
export interface RefreshNearestActionSchema extends ActionShapeFields {
  action: 'refreshNearest';
  args?: {
    /**
     * 限定类型：'crud' | 'data-source' | 'tree' | 'auto'（默认 auto）
     * auto 时按"最近"匹配，不区分类型
     */
    targetType?: 'crud' | 'data-source' | 'tree' | 'auto';
    /**
     * 找不到目标时的行为：'silent' | 'error'（默认 silent）
     */
    notFound?: 'silent' | 'error';
    /**
     * 是否同时关闭当前 surface（仅 dialog ctx 中有意义）
     * 默认 false（不自动关闭；让 hook 触发链自然关闭）
     */
    closeSurface?: boolean;
  };
}
```

> 不需要 `fromScope` 参数：hook 触发时 ctx 已切到 owner scope，从这里开始 traverse 即可。

#### 5.3.3 实现思路

flux 已有的"向上 traverse"机制只有 `component-handle-registry.ts:231-298` 的 `resolveInScope`（registry 双向遍历）。建议复用并扩展：

```ts
// packages/flux-runtime/src/refresh-nearest.ts（新增）
async function findNearestRefreshable(
  startScope: ScopeRef,
  registry: ComponentHandleRegistry,
  sourceRegistry: SourceRegistry,
  targetType: 'auto' | 'crud' | 'data-source' | 'tree',
): Promise<
  | { kind: 'component'; handle: ComponentHandle; scope: ScopeRef }
  | { kind: 'source'; entry: SourceEntry; scope: ScopeRef }
  | null
> {
  let scope: ScopeRef | undefined = startScope;

  while (scope) {
    // 1) 在此 scope 的 component registry bucket 里找 CRUD / Tree
    if (targetType === 'auto' || targetType === 'crud' || targetType === 'tree') {
      const handle = registry.findFirstInScope(scope, (h) =>
        targetType === 'auto'
          ? h.componentType === 'crud' || h.componentType === 'tree'
          : h.componentType === targetType,
      );
      if (handle) return { kind: 'component', handle, scope };
    }

    // 2) 在此 scope 的 source registry bucket 里找 data-source
    if (targetType === 'auto' || targetType === 'data-source') {
      const entry = sourceRegistry.findFirstInScope(scope);
      if (entry) return { kind: 'source', entry, scope };
    }

    scope = scope.parent;
  }

  return null;
}

export async function refreshNearest(
  ctx: ActionContext,
  args: RefreshNearestArgs = {},
): Promise<ActionResult> {
  const target = await findNearestRefreshable(
    ctx.scope,
    ctx.componentRegistry,
    ctx.runtime.sourceRegistry,
    args.targetType ?? 'auto',
  );

  if (!target) {
    return args.notFound === 'error'
      ? { ok: false, error: new Error('refreshNearest found no refreshable target') }
      : { ok: true, data: { found: false } };
  }

  if (target.kind === 'component') {
    return target.handle.capabilities.invoke('refresh', {}, ctx);
  }
  return {
    ok: await ctx.runtime.refreshDataSource({
      name: target.entry.name,
      scope: target.scope,
    }),
  };
}
```

#### 5.3.4 需要给现有 registry 补的 API

- `ComponentHandleRegistry.findFirstInScope(scope, predicate)`：当前 `resolve` 是按 target（id/name）查找，需要补一个"在指定 scope bucket 里按 predicate 找第一个"的辅助方法（`component-handle-registry.ts`）
- `SourceRegistry.findFirstInScope(scope)`：当前 `refreshDataSource` 是按 name 精确匹配，需要补一个"按 scope bucket 取第一个"的方法（`source-registry.ts`）

这两个都是 bucket scan，开销可控（同一 scope 下 CRUD/data-source 通常很少）。

#### 5.3.5 注册到 dispatcher

`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:42-297` 的 `runBuiltInAction` switch 增加：

```ts
case 'refreshNearest': {
  const args = evaluateActionArgs(action, ctx, internals.evaluator);
  invocation = {
    action: 'refreshNearest',
    args: args ?? {},
    targeting: action.targeting,
    actionNode: action,
    signal,
  };
  break;
}
```

并在 `action-adapter.ts` 的 `invokeBuiltInAction` switch 增加 `case 'refreshNearest'` 调用 `refreshNearest(ctx, args)`。

### 5.4 方案 C：Surface 保存 owner 完整 ctx（基础设施）

#### 5.4.1 `SurfaceEntry` 扩展

```ts
// packages/flux-core/src/types/runtime.ts
export interface SurfaceEntry {
  // 现有字段...
  ownerScope?: ScopeRef;
  ownerNodeInstance?: NodeInstance;
  onClose?: ActionNode[] | undefined;
  onOpen?: ActionNode[] | undefined;
  onConfirm?: ActionNode[] | undefined;
  // ── 新增 ──
  onSubmitSuccess?: ActionNode[] | undefined;
  onSubmitError?: ActionNode[] | undefined;
  ownerActionCtx?: Pick<
    ActionContext,
    | 'runtime'
    | 'actionScope'
    | 'componentRegistry'
    | 'page'
    | 'surfaceRuntime'
    | 'evaluationBindings'
  >;
}
```

#### 5.4.2 `surfaceRuntime.open` 接收并保存

`packages/flux-runtime/src/surface-runtime.ts:120-157` 的 `open({ kind, surface, scope, options })`：

```ts
const entry: SurfaceEntry = {
  // 现有字段...
  ownerScope: options.ownerScope,
  ownerNodeInstance: options.ownerNodeInstance,
  onClose: options.onClose,
  onSubmitSuccess: options.onSubmitSuccess,
  onSubmitError: options.onSubmitError,
  ownerActionCtx: options.ownerActionCtx
    ? {
        runtime: options.ownerActionCtx.runtime,
        actionScope: options.ownerActionCtx.actionScope,
        componentRegistry: options.ownerActionCtx.componentRegistry,
        page: options.ownerActionCtx.page,
        surfaceRuntime: options.ownerActionCtx.surfaceRuntime,
        evaluationBindings: options.ownerActionCtx.evaluationBindings,
      }
    : undefined,
};
```

#### 5.4.3 `openDialog` action 读取 args 并透传

`packages/flux-runtime/src/action-adapter.ts:185-218`：

```ts
case 'openDialog': {
  const dialog = evaluateSurfaceArgs(action, ctx, internals.evaluator);
  if (!dialog) return finishAction(...);

  // 编译 hook 节点（在 owner ctx 求值，在 owner ctx 执行）
  const compileNodes = (input: unknown) =>
    input == null ? undefined : actionProgramCompiler.compile(toArray(input));

  invocation = {
    action: 'openDialog',
    args: dialog,
    targeting: action.targeting,
    actionNode: action,
    signal,
    // ── 新增：透传 hook 节点和 owner ctx ──
    surfaceOptions: {
      onClose: compileNodes(dialog.onClose),
      onSubmitSuccess: compileNodes(dialog.onSubmitSuccess),
      onSubmitError: compileNodes(dialog.onSubmitError),
      ownerActionCtx: ctx,
    },
  };
  break;
}
```

> 这里把 caller 当时的 ctx 整体存为 `ownerActionCtx`，hook 触发时用它 + ownerScope/ownerNodeInstance 重建 owner ctx。

---

## 6. ajax 默认行为对 hook 使用的影响

flux 的 ajax 已有完整的 success/error 通知机制，**绝大多数场景不需要在 hook 里重复造 toast 轮子**。

### 6.1 决策矩阵

| 场景                                   | 推荐做法                                                              | 不推荐                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 成功后默认 toast                       | 配 `messages.success`                                                 | 在 `onSubmitSuccess` 里 `showToast`                                                    |
| 成功后引用 form 数据的 toast           | 配 `messages.success` 用 `${field}` 表达式（ajax 在 form scope 处理） | 在 `onSubmitSuccess` 用 `$formData.field`（除非 hook 在 owner scope 但需要 form 数据） |
| 失败后显示后端错误                     | **什么都不配**（ajax 默认行为已自动 toast 后端 msg）                  | 在 `onSubmitError` 里 `showToast`（重复 toast）                                        |
| 失败后自定义文案                       | 配 `messages.failed`                                                  | 在 `onSubmitError` 里 `showToast`（除非要覆盖默认）                                    |
| 失败后做副作用（重置字段、跳转、上报） | 用 `onSubmitError` hook                                               | 用 `onError` 链（onError 会抑制默认 toast）                                            |
| 成功后刷新外部 CRUD                    | `onSubmitSuccess: { action: 'refreshNearest' }`                       | `then: { action: 'component:refresh', componentId: 'xxx' }`（需知 id）                 |
| dialog 关闭后刷新（无论提交与否）      | `onClose: { action: 'refreshNearest' }`                               | 依赖 closeSurface then 链（ctx 不切换，会失败）                                        |

### 6.2 典型 schema 写法

#### 6.2.1 列表 + 编辑弹窗（最常见场景）

```jsonc
// 列表页 schema（owner）
{
  "type": "crud",
  "id": "list",
  "loadAction": { "action": "ajax", "args": { "url": "/r/User__findPage" } },
  "columns": [
    { "name": "name", "label": "姓名" },
    {
      "type": "operation",
      "buttons": [
        {
          "type": "button",
          "label": "编辑",
          "onClick": {
            "action": "openDialog",
            "args": {
              "title": "编辑",
              "data": { "id": "${id}" },
              "body": {
                "type": "form",
                "submitAction": {
                  "action": "ajax",
                  "args": { "url": "/r/User__update" },
                  "messages": { "success": "保存成功" },
                  // 不需要 messages.failed：ajax 默认已 toast 后端 msg
                },
                "body": [
                  /* ... */
                ],
              },
              // hook 只管副作用，不重复 toast
              "onSubmitSuccess": { "action": "refreshNearest" },
            },
          },
        },
      ],
    },
  ],
}
```

**关键好处**：

- `refreshNearest` **不需要写 `componentId: "list"`**，schema 可以原样从一个 CRUD 拷到另一个 CRUD
- hook 在 owner scope 执行 → 能正确找到 owner 的 list CRUD
- 即使 form 提交时 ctx 残缺，hook 由 surface runtime 主动触发（不是从 form ctx 内触发），ctx 完整

#### 6.2.2 嵌套场景（dialog 里再开 dialog）

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": {
      "type": "crud", // 嵌套 CRUD
      "id": "inner-list",
      "loadAction": {
        /* ... */
      },
      "columns": [
        {
          "type": "operation",
          "buttons": [
            {
              "onClick": {
                "action": "openDialog",
                "args": {
                  "body": { "type": "form" /* ... */ },
                  "onSubmitSuccess": { "action": "refreshNearest" },
                  //                                       ↑
                  //  找到 inner-list（最近的），而不是外层 list
                },
              },
            },
          ],
        },
      ],
    },
    "onSubmitSuccess": { "action": "refreshNearest" },
    //                       ↑
    //  外层 dialog 关闭时找外层 list（owner 是 page）
  },
}
```

`refreshNearest` 从 hook 执行的 owner scope 开始向上找，**第一个遇到的 CRUD 就是要刷的那个**，天然支持嵌套。

#### 6.2.3 用 `onSubmitError` 做非 toast 副作用

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": {
      "type": "form",
      "submitAction": {
        /* ajax */
      },
      "body": [
        /* ... including a hidden tracking field `attemptCount` ... */
      ],
    },
    // 失败时：默认 toast 已显示后端 msg，这里只做副作用
    "onSubmitError": [
      {
        "action": "setValues",
        "args": {
          "path": "",
          "values": { "attemptCount": "${($formData.attemptCount ?? 0) + 1}" },
        },
      },
      {
        "action": "ajax",
        "args": { "url": "/r/Audit__log", "method": "post" },
        "args.data": { "event": "form_submit_failed", "form": "${$formData}" },
      },
    ],
  },
}
```

> 注意 `setValues` 写到 dialog 的 form scope 还是 owner scope？由于 hook 在 owner scope dispatch，`setValues` 默认写 owner。如果想写回 form，需要走 form API（hook 触发时也可以传 form runtime 引用，详见 §8 实现细节）。

#### 6.2.4 显式指定（兼容老用法）

```jsonc
{ "action": "component:refresh", "componentId": "list" }
```

仍然可用，不变。

---

## 7. 与现有机制的兼容性

| 现有机制                                        | 本方案影响                                                                                                  | 兼容性                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------- |
| `refreshSource targetId="x"`（source 路径）     | 不变                                                                                                        | ✅ 完全兼容           |
| `component:refresh componentId="x"`             | 不变；推荐 `refreshNearest` 作为语法糖                                                                      | ✅ 完全兼容           |
| declarative dialog（`useSurfaceRenderer`）      | declarative 已有 onClose 字段，hook 自然生效；可选地把 `onSubmitSuccess`/`onSubmitError` 也补到 declarative | ✅ 增强               |
| action-style openDialog 现有用法（无 hook）     | hook 字段可选；不写就没 hook，行为完全一致                                                                  | ✅ 完全兼容           |
| `closeSurface then refreshSource`（文档现写法） | **建议保留并修复**（让 source registry 沿 scope.parent 向上查找），与 hook 机制并存                         | ✅ 兼容（修复后）     |
| `messages.success` / `messages.failed`          | 不变；hook 与 messages 独立触发                                                                             | ✅ 完全兼容           |
| ajax 默认 error→notify                          | 不变；`onSubmitError` 是补充而非替代                                                                        | ✅ 完全兼容           |
| `onError` 链                                    | 不变；但用户应了解 `onError` 会抑制默认 toast，而 `onSubmitError` hook 不会                                 | ✅ 兼容（文档需说明） |

---

## 8. 替代方案对比

| 方案                                            | 代价         | 优点                                                        | 缺点                                                                                      |
| ----------------------------------------------- | ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A. 只修 source registry 向上 traverse（G6）** | 改 ~30 行    | 最小改动，文档现写法直接生效                                | 仍要写 `targetId`（必须知道 data-source 名）；只解决 source 路径，loadAction 模式仍然无解 |
| **B. 只加 `refreshNearest`**                    | 新增 ~150 行 | 解决"不知道 id"问题                                         | 不解决 onSubmitSuccess 残缺 ctx 问题，从 form 内部仍调不动                                |
| **C. 只加 surface lifecycle hooks（方案 A）**   | 改 ~200 行   | 提供完整触发链路                                            | hook 内部仍要写 `component:refresh componentId="x"`，没解决 id 问题                       |
| **D. 方案 A + 方案 B + 方案 C（推荐）**         | 改 ~350 行   | 完整解决：声明式 hook + 自动定位 + loadAction/source 都覆盖 | 改动较大，需要新增 1 个 action + 扩展 2 个 action args + 1 个新 helper 模块               |
| **E. 修所有 Gap（G1-G10）**                     | 改 ~600 行   | 彻底，文档现写法也工作                                      | 改动面广，回归风险高                                                                      |

**推荐 D**：投入产出比最高，覆盖 95% 业务场景；剩下的 declarative 已正常工作，不必再改。

---

## 9. 实现路径（按 PR 拆分）

### PR 1：基础设施 — surface 保存 owner 完整 ctx（方案 C）

**文件改动**：

- `packages/flux-core/src/types/runtime.ts`：`SurfaceEntry` 加 `ownerActionCtx` / `onSubmitSuccess` / `onSubmitError` 字段
- `packages/flux-runtime/src/surface-runtime.ts:120-157`：`open` 接收并保存
- `packages/flux-runtime/src/action-adapter.ts:204-215`（openDialog/openDrawer）：在构造 options 时多传 ownerActionCtx

**验收**：

- 单测：`SurfaceEntry` 上能读到 ownerActionCtx 的 runtime / actionScope / componentRegistry / page / surfaceRuntime
- 不影响行为，纯基础设施
- 现有所有测试 pass

### PR 2：`refreshNearest` action + registry helper（方案 B）

**文件改动**：

- `packages/flux-runtime/src/component-handle-registry.ts`：增加 `findFirstInScope(scope, predicate)`
- `packages/flux-runtime/src/async-data/source-registry.ts`：增加 `findFirstInScope(scope)`
- 新增 `packages/flux-runtime/src/refresh-nearest.ts`：`findNearestRefreshable` + `refreshNearest`
- `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`：注册新 case
- `packages/flux-runtime/src/action-adapter.ts`：`invokeBuiltInAction` switch 增加新 case
- `packages/flux-core/src/types/actions.ts`：增加 `RefreshNearestActionSchema`

**验收**：

- 单测：模拟 owner CRUD + dialog ctx，验证 refresh 能命中 owner
- 单测：loadAction 模式（无 data-source）和 source 模式都能命中
- 单测：嵌套场景命中最近
- 单测：找不到时 silent / error 两种行为

### PR 3：Surface lifecycle hooks（方案 A）

**文件改动**：

- `packages/flux-core/src/types/actions.ts`：`OpenDialogActionSchema` / `OpenDrawerActionSchema` 加 `onClose` / `onSubmitSuccess` / `onSubmitError`
- 新增 `packages/flux-runtime/src/surface-hooks.ts`：`dispatchInOwner(entry, nodes, payload)`
- `packages/flux-runtime/src/surface-runtime.ts`：增加 `triggerHook(entry, hookName, payload)` 方法
- `packages/flux-runtime/src/surface-runtime.ts:182-186`：`close` 改为 async，调 `triggerHook(entry, 'close')` 后再 dispose
- `packages/flux-runtime/src/form-runtime-submit-flow.ts:451-453`：submit 成功/失败后调 `surfaceRuntime.triggerHook(entry, 'submit:success' | 'submit:error', { result, formData })`
- `packages/flux-runtime/src/action-adapter.ts`（openDialog/openDrawer）：从 args 编译 hook 节点并透传给 surfaceOptions
- `packages/flux-react/src/dialog-host.tsx`：close 调用改 await

**验收**：

- 集成测试：完整的 openDialog + form + submit + 关闭 + 刷新链路
- 单测：每个 hook 在 owner scope 执行（写回数据到 owner）
- 单测：hook 内的 refreshNearest 命中 owner CRUD
- 单测：嵌套 dialog：内层 hook 不影响外层
- 单测：submit 失败时 onSubmitError 触发 + 默认 toast 仍然触发（不抑制）

### PR 4：文档与 examples

**文件改动**：

- `flux-guide/design-patterns/crud.md`：把推荐写法改为 `refreshNearest`，老写法标注"需要知道 id"
- `flux-guide/design-patterns/page-dialog-drawer.md`：增加 hook 字段说明、`messages` vs hook 决策矩阵
- `flux-guide/04-action-system.md`：`refreshNearest` 加入 action 列表
- `flux-guide/examples/`：加 example：`standard-crud-with-dialog.json`
- `apps/playground/src/complex-pages/page-schemas/`：加 example

---

## 10. 风险与权衡

| 风险                                                     | 评估                                                                                            | 缓解                                                                                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refreshNearest` 在复杂页面找错目标                      | 中等。例如 toolbar 上同时有 CRUD 和 tree                                                        | 支持 `args.targetType` 限定；推荐用法是 hook 触发（owner scope 已确定），减少歧义                                                                  |
| Surface 保存 ownerActionCtx → 内存泄漏                   | 低。entry dispose 时清掉引用即可                                                                | disposeEntry 里加 `entry.ownerActionCtx = undefined`                                                                                               |
| Hook 触发顺序（onSubmitSuccess vs onClose）              | 中等。submit 成功 → onSubmitSuccess → 然后 dialog 关闭 → onClose？两个都跑会重复刷新            | 建议：onSubmitSuccess 跑完后**不自动 close**（让 schema 显式写 closeSurface），onClose 只在用户主动关闭时跑。需要文档明确                          |
| 改 `surface-runtime.close` 为 async                      | 低。`closeTop` / `close` 当前是 sync，改成 async 后调用方需要 await                             | 调用方有限（dialog-host.tsx 几处），一次性改完                                                                                                     |
| declarative vs action-style 的 hook 行为不一致           | 中等。declarative 的 onClose 是 React unmount 触发，跟 action-style 的 surface close 不完全对齐 | 在 `use-surface-renderer.ts:323-326` 已有的 onClose 调用点旁边补 onSubmitSuccess/onSubmitError 透传                                                |
| `messages.failed` + `onSubmitError` 都触发导致重复 toast | 中等。messages 在 ajax 内部触发一次，hook 由 surface 触发                                       | 两者用途不同：messages 管文案，hook 管副作用。文档明确说明 hook 不要写 toast（重复造轮子）；如果用户坚持在 hook 写 toast，会触发两次，需在文档警告 |
| `setValues` 在 owner scope 写不到 form                   | 中等。用户在 onSubmitError 里想 reset form field 会失败                                         | hook dispatch 时透传 `form` runtime 引用（form runtime 跨 scope 仍可访问），或者通过 form 的 schema API                                            |

---

## 11. 测试策略

### 11.1 单元测试（PR 2）

```
runtime-refresh-nearest.test.ts
  ✓ 在同一 scope 找到 CRUD
  ✓ 在同一 scope 找到 data-source
  ✓ 沿 scope.parent 向上找到 owner CRUD
  ✓ 嵌套 dialog 中找到最近 CRUD（不是 owner）
  ✓ targetType='crud' 时跳过 data-source
  ✓ targetType='data-source' 时跳过 CRUD
  ✓ 没有目标时 silent 返回 ok:true, found:false
  ✓ 没有目标时 error 返回 ok:false
```

### 11.2 单元测试（PR 3）

```
runtime-surface-hooks.test.ts
  ✓ openDialog args.onClose 在 close 时触发
  ✓ openDialog args.onSubmitSuccess 在 form submit 成功后触发
  ✓ openDialog args.onSubmitError 在 form submit 失败后触发
  ✓ hook 在 owner scope 执行（写回数据到 owner）
  ✓ hook 内的 refreshNearest 命中 owner CRUD
  ✓ 嵌套 dialog：内层 hook 不影响外层
  ✓ onSubmitSuccess 的 $formData 拿到 form values
  ✓ onSubmitError 触发时，默认 ajax toast 仍然触发一次（不抑制）
  ✓ messages.failed 与 onSubmitError 共存：toast 触发一次（来自 messages）+ hook 副作用执行
```

### 11.3 集成测试（PR 3）

```
integration-dialog-refresh.test.tsx
  ✓ 标准 CRUD + 编辑 dialog + 提交 → CRUD 刷新
  ✓ CRUD + 新增 dialog + 提交 → CRUD 刷新
  ✓ CRUD + 删除 confirm dialog + 确认 → CRUD 刷新
  ✓ CRUD loadAction 模式（无 data-source）也能刷新
  ✓ CRUD source 模式（有 data-source）也能刷新
  ✓ submit 失败时 dialog 不关闭，onSubmitError 触发，默认 toast 触发
  ✓ onClose 在用户主动取消时触发，刷新 CRUD
```

### 11.4 回归测试

- 现有 declarative dialog + form + onSubmitSuccess 场景（form-submit-actions.parent-scope.test.tsx 等）必须保持 pass
- 现有 source refresh 测试（runtime-sources-refresh.test.ts）保持 pass
- 现有 CRUD refresh 测试（data-crud-request-owned.test.tsx）保持 pass

---

## 12. 结论

**核心判断**：业务提出的"openDialog 配 hook + refresh 检查最近 scope" 设计方向是**正确的**，与 flux 现有架构能对齐，但需要补三块基础设施：

1. **Surface lifecycle hooks（方案 A）**：机制层面提供 `onClose` / `onSubmitSuccess` / `onSubmitError` 三个钩子，业务方按需使用。`onSubmitError` 不替代 ajax 默认 toast，仅用于非 toast 的自定义错误处理。
2. **`refreshNearest` action（方案 B）**：不需要 id 的智能定位，与 `refreshTable` / `refreshSource` 同系列。
3. **Owner ctx 完整保存（方案 C）**：hook dispatch 时能拿到完整 runtime 能力（componentRegistry / surfaceRuntime / page 等）。

**命名规范**：

- action 用 `refreshNearest`（与 `refreshTable` / `refreshSource` 同系列）
- 不用 `refresh:nearest`（与现有冒号语义 `component:xxx` 冲突）
- evaluationBindings 用 `$formData`（与 `ctx.form` 区分）

**hook 与现有 ajax 通知的关系**：

- `messages.success` / `messages.failed` → 控制成功/失败 toast 文案（ajax 默认行为已处理失败 toast）
- `onClose` / `onSubmitSuccess` / `onSubmitError` hooks → 控制副作用（刷新、导航、上报、字段重置等）
- **不要在 hook 里写 toast**，与 ajax 默认行为重复

**最低可行版本**：PR 1 + PR 2 + PR 3，共约 350 行改动，覆盖 95% 业务场景。

---

## 附录 A：现有相关测试一览

- `runtime-dialogs-scope.dialog-actions.test.ts`（open/close 流程，无 refresh）
- `runtime-dialogs-scope.dialog-state.test.ts`（state 断言，无 form/refresh）
- `runtime-sources-refresh.test.ts`（refreshDataSource scope 匹配，但都只用 page.scope，无父子 scope 场景）
- `data-crud-request-owned.test.tsx`（component:refresh → onRefresh → refreshSource 链，但所有元素共享 page scope）
- `form-submit-actions.parent-scope.test.tsx`（form onSubmitSuccess 写回，仅 declarative 场景）
- `request-runtime-error-notify.test.ts`（ajax 默认 error→notify 契约验证）
- **没有任何测试**覆盖"openDialog action + form + onSubmitSuccess + closeSurface + refreshSource 端到端"

## 附录 B：flux-guide 文档与现实不一致

`flux-guide/design-patterns/page-dialog-drawer.md:178-189` 推荐的 `closeSurface then refreshSource` 写法，根据本调研，**对 action-style openDialog 实际不工作**（G3+G4+G5+G6 联合作用）。本文档提议的方案 D 修复后此写法也能工作，但推荐改为 `onSubmitSuccess: { action: 'refreshNearest' }`，更简洁且不需要 targetId。

## 附录 C：代码引用索引

### Action adapter

- openDialog: `packages/flux-runtime/src/action-adapter.ts:185-218`
- openDrawer: `packages/flux-runtime/src/action-adapter.ts:243-279`
- closeSurface/closeDialog/closeDrawer: `packages/flux-runtime/src/action-adapter.ts:220-241`
- refreshTable: `packages/flux-runtime/src/action-adapter.ts:357-363`
- refreshSource: `packages/flux-runtime/src/action-adapter.ts:365-382`
- invokeComponentAction: `packages/flux-runtime/src/action-adapter.ts:392-471`
- showToast: `packages/flux-runtime/src/action-adapter.ts:281-293`

### Surface runtime

- createManagedSurfaceRuntime: `packages/flux-runtime/src/surface-runtime.ts:12-198`
- surfaceRuntime.open (填充 entry): `packages/flux-runtime/src/surface-runtime.ts:120-157`
- surfaceRuntime.close (disposeEntry 不调 onClose): `packages/flux-runtime/src/surface-runtime.ts:182-186`
- disposeEntry: `packages/flux-runtime/src/surface-runtime.ts:102-116`
- publishSurfaceStatus (ownerScope fallback): `packages/flux-runtime/src/surface-runtime.ts:36-48`

### createSurfaceScope

- runtime-factory.ts:592-618（关键：dialog → opening → owner 三层）
- 测试 dialog scope.parent.readOwn()={} 佐证: `runtime-dialogs-scope.dialog-state.test.ts:223`

### SurfaceEntry 类型

- OwnedSurfaceStateBase: `packages/flux-core/src/types/runtime.ts:239-258`
- SurfaceEntry: `packages/flux-core/src/types/runtime.ts:260-262`
- SurfaceRuntime options 类型: `packages/flux-core/src/types/runtime.ts:293-329`

### Action schema 类型

- OpenDialogActionSchema: `packages/flux-core/src/types/actions.ts:169-172`
- CloseSurfaceActionSchema: `packages/flux-core/src/types/actions.ts:187-190`
- RefreshSourceActionSchema: `packages/flux-core/src/types/actions.ts:196-199`
- MessagesConfig: `packages/flux-core/src/types/actions.ts:125-132`

### Action dispatcher（then 链）

- dispatch + then: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:519-675`（then 在 557-570）
- 默认 error notify 兜底: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:200-225`
- runBuiltInAction: `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:42-297`

### Source registry（关键：不向上 traverse）

- refreshDataSource: `packages/flux-runtime/src/async-data/source-registry.ts:348-377`
- bucket by ownerScopeId: `source-registry.ts:110-112, 341-346`

### Component handle registry（关键：双向 traverse）

- resolveInScope: `packages/flux-runtime/src/component-handle-registry.ts:231-298`

### CRUD refresh

- useCrudHandle 注册 refresh capability: `packages/flux-renderers-data/src/crud-renderer-state.ts:304-377`
- handleRefresh 实现: `packages/flux-renderers-data/src/crud-renderer.tsx:216-252`
- useCrudLoadAction reload: `packages/flux-renderers-data/src/crud-renderer-state.ts:480-701`（reload 在 536-539，effect 在 599-696）
- 测试 CRUD refresh 走通的场景: `data-crud-request-owned.test.tsx:42-55`

### ajax 默认 error→notify

- request-runtime.ts createApiResponseError: `packages/flux-runtime/src/async-data/request-runtime.ts:80-118`
- runtime-action-helpers.ts messages 处理: `packages/flux-runtime/src/runtime-action-helpers.ts:134-167`
- request-runtime-error-notify.test.ts: `packages/flux-runtime/src/__tests__/request-runtime-error-notify.test.ts:11-58`

### Form lifecycle

- form.tsx setLifecycleHandlers + scope 解析: `packages/flux-renderers-form/src/renderers/form.tsx:240-300`
- resolveLifecycleWriteScope: `packages/flux-renderers-form/src/renderers/form.tsx:99-110`
- executeFormSubmit (调 onSubmitSuccess): `packages/flux-runtime/src/form-runtime-submit-flow.ts:229-480`（451-453 调 handler）
- FormLifecycleHandlers 类型: `packages/flux-core/src/types/runtime.ts:220-237`
- declarative dialog 测试（通过）: `form-submit-actions.parent-scope.test.tsx:83-142`

### Dialog host 渲染

- dialog-host.tsx: `packages/flux-react/src/dialog-host.tsx:192-370`
- SurfaceScopeProviders + ownerNodeInstance 透传: `packages/flux-react/src/dialog-host-surface.tsx:75-118`
- declarative useSurfaceRenderer: `packages/flux-renderers-basic/src/use-surface-renderer.ts`（onClose 在 174, 223, 271, 325, 348）

### Page runtime（refreshTick 是 stub）

- page-runtime.ts:93-95
- page-store.ts:25-28
- 唯一消费者 PageRenderer: `packages/flux-renderers-basic/src/page.tsx:41-51`

### Scope 链 / inspection

- createScopeRef + parent: `packages/flux-runtime/src/scope.ts:394-589`
- buildScopeChain（仅 debug）: `packages/flux-core/src/runtime-inspection.ts:20-39`
