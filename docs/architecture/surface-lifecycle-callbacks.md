# Surface Lifecycle Callbacks And Owner-Scoped Refresh

## Purpose

本文档定义 surface family（`dialog` / `drawer` / future `sheet`）的生命周期回调机制，以及配套的 owner-scoped 刷新动作。用它回答：

- `openDialog` / `openDrawer` 如何在 owner 侧响应 surface 内部的事件（form 提交成功/失败、surface 关闭）
- surface 关闭或提交后如何刷新外层数据源 / CRUD，**且不要求 schema 作者知道外层组件的 id / name**
- callback 的执行 scope 为什么必须是 owner，而不是 surface child scope
- 新增 `refreshNearest` 与现有 `refreshTable` / `refreshSource` / `component:refresh` 的分工
- callback 与 `messages` / `onError` 链的关系（callback 是补充，不是替代）

## Position

- `docs/architecture/surface-owner.md` 拥有 surface family 的 owner taxonomy、runtime 模型、stacking 规则、scope 初始化规则。
- 本文只收口 surface lifecycle callback 的窄规则和 owner-scoped refresh 动作。
- `docs/architecture/action-algebra-formal-spec.md` / `docs/architecture/action-scope-and-imports.md` 拥有 action 通用语义；本文档定义的 callback 和 `refreshNearest` 服从那些通用规则，不在此重述。
- `flux-guide/design-patterns/page-dialog-drawer.md` 与 `flux-guide/design-patterns/crud.md` 提供 authoring 视角的范例，与本文档对齐。

## Core Claim

Surface lifecycle callback 是 **owner-side reaction**，不是 surface 内部 event bus。

这条核心 claim 决定了下面所有规则：

- callback 的字段位置在 `openDialog` / `openDrawer` 的 `args` 上（owner 视角声明），**不在 surface body 内部**
- callback 的 dispatch ctx 是 owner ctx（用 surface 打开时保存的 owner runtime / scope / node 引用重建），**不是 surface child scope**
- callback 内执行的 action 默认面向 owner（如 `refreshNearest` 从 owner scope 开始向上查找），而不是面向 surface body

## Lifecycle Hook Schema

`OpenDialogActionSchema.args` / `OpenDrawerActionSchema.args` 在原有的 `title` / `size` / `data` / `body` / `header` / `footer` / `actions` 等字段之外，新增三个可选 callback 字段：

```ts
export interface OpenDialogActionSchema extends ActionShapeFields {
  action: 'openDialog';
  args: {
    title?: string;
    size?: string;
    data?: object;
    body: SchemaInput;
    // ... 现有 surface 字段 ...

    // ── lifecycle callbacks（owner scope 执行） ──
    onClose?: ActionSchema | ActionSchema[];
    onSubmitSuccess?: ActionSchema | ActionSchema[];
    onSubmitError?: ActionSchema | ActionSchema[];
  };
}
```

| 字段              | 触发时机                                                                          | `$formData` | `$result`       | `$hook`            | 典型用途                                             |
| ----------------- | --------------------------------------------------------------------------------- | ----------- | --------------- | ------------------ | ---------------------------------------------------- |
| `onClose`         | surface 被关闭时（任意路径：手动关闭、`closeSurface` action、ESC、outside click） | ✗           | ✗               | `'close'`          | 关闭后刷新列表、清理临时状态                         |
| `onSubmitSuccess` | surface body 内的 form submit ajax 返回成功后                                     | ✓           | ✓ ajax response | `'submit:success'` | 提交成功后刷新列表、自定义副作用（导航、上报、关闭） |
| `onSubmitError`   | surface body 内的 form submit ajax 返回失败后                                     | ✓           | ✓ error payload | `'submit:error'`   | 自定义错误恢复（重置字段、跳转错误页、上报埋点）     |

三个字段都是可选。不写就没有 callback，surface 行为与没有 lifecycle callback 时完全一致。

> **字段命名说明**：上表的 schema 字段名（作者视角）是 `onClose` / `onSubmitSuccess` / `onSubmitError`。runtime 内部存储为 `entry.onCloseNodes` / `entry.onSubmitSuccessNodes` / `entry.onSubmitErrorNodes`（编译后的 `ActionNode[]`），与现有 `entry.onClose`（function 类型，declarative surface 专用）共存。详见 §Hook Triggering Semantics。

## Form Submit Scope

surface body 内可能存在多个 form。常见场景：

- **dialog 内搜索 form + 编辑 form**：搜索 form 的 submit 不应触发外部刷新
- **主 form + 子 form**（combo / object-field / array-field 内嵌）：子 form 的 submit 是局部行为
- **多 step form**：每个 step 可能各自是独立 form

为了让 surface callback 只响应"主提交 form"的 submit，form schema 引入 `submitScope` 字段：

```ts
export interface FormSchema extends BoundFieldSchemaBase {
  // ...
  /**
   * 提交作用域。决定 form 提交后是否触发所在 surface 的 callback。
   *
   * - 'local' (默认): 只触发 form 自己的 lifecycle handler（onSubmitSuccess / onSubmitError）
   * - 'surface': 同时触发所在 surface 的 onSubmitSuccess / onSubmitError callback（在 owner ctx 执行）
   *
   * 多 form surface 场景（dialog 内搜索 form + 编辑 form）只在主 form 上设 'surface'。
   * 单 form surface 场景建议仍显式声明，消除歧义。
   */
  submitScope?: 'local' | 'surface';
}
```

### 为什么是 form 字段，不是 action 字段

候选方案是在 ajax/submitAction 上加开关（如 `triggersSurfaceCallback: false`）。这种做法被否决，理由：

- **破坏 action 与上下文的独立性**：ajax action 设计上应处处可复用，给它加 surface 概念会让 action 与 surface 耦合
- **多 submit 路径要重复配置**：一个 form 可能既有 ajax 又有其他 action，逐个开关易漏
- **form 是 lifecycle 概念的天然载体**：form 本来就有 lifecycle handler（`onSubmitSuccess` / `onSubmitError`），在 form 上声明 lifecycle 范围语义自洽

### Single-Form Default

> **Status: planned, not yet implemented.** Flux 当前没有 schema-level 校验或自动提升。`submitScope` 默认 `'local'`，必须显式声明 `'surface'` 才触发 surface callback。

设计意图（待实现）：surface body 内**只有一个 form** 且未显式设 `submitScope` 时，编译期自动视为 `'surface'` + 输出 warning（建议显式声明）。

理由：

- 老 schema（单 form dialog）默认就能用 surface callback，不破坏现有写法
- 多 form 场景必须显式区分，避免歧义

**实现依赖**：schema validator（`packages/flux-core/src/schema-validator/` 或同级），与现有 schema 校验同层。flux 当前没有 runtime schema validator（详见 `docs/plans/2026-07-28-1430-surface-lifecycle-callbacks.md` §Deferred But Adjudicated）。在 schema validator 落地前，作者必须在主提交 form 上显式写 `submitScope: 'surface'`。

### Multi-Form Validation

> **Status: planned, not yet implemented.**

设计意图（待实现）：同一 surface body 内最多一个 form 设 `submitScope: 'surface'`。多个时编译期报错：

```
schema-validation-error: at most one form per surface body may declare
submitScope='surface'; found N (form ids: a, b)
```

这是硬约束，不可降级为 warning。理由：多个 `submitScope: 'surface'` form 的 submit 都会触发同一个 surface callback，业务无法区分是哪个 form 触发，语义模糊。

**当前现实**：runtime 不做校验。如果多个 form 都标了 `'surface'`，它们的 submit 都会触发同一 callback（行为可观察，但不会失败）。业务侧需自行保证只有一个主 form。schema validator 落地后会强制校验。

### 嵌套 form 处理

`submitScope` 的作用域是**最近的包含 surface**。嵌套场景：

- surface body → CRUD → CRUD 的 filter form：filter form 的 `submitScope: 'surface'` 会指向**外层 surface**（CRUD 不是 surface）
- surface body → dialog（嵌套）→ form：form 的 `submitScope: 'surface'` 指向最近的 dialog

不需要在 schema 里指明"哪个 surface"，由 runtime 根据 surface child scope 链自动确定。

### 与现有 `submitAction` 的关系

`submitScope` 不改变 `submitAction` 的行为：

- `submitAction` 仍是 form 提交时执行的 action（通常是 ajax）
- `submitScope` 决定 submit 完成后是否额外触发 surface callback

执行顺序：

```
form.submitAction (ajax)
  ↓
ajax default notifications (messages.success / messages.failed / 默认 error toast)
  ↓
form lifecycle handlers (form schema 的 onSubmitSuccess / onSubmitError，在 form ctx 执行)
  ↓
[仅当 form.submitScope === 'surface']
surface submit hooks (openDialog args.onSubmitSuccess / args.onSubmitError，在 owner ctx 执行)
```

## Owner-Context Execution Model

Callback dispatch 时，ctx 强制重建为 owner ctx，使用 surface 打开时保存的 owner runtime / scope / node 引用。

### Owner Context Reconstruction

surface 打开时（`surfaceRuntime.open`）必须保存以下 owner 引用到 `SurfaceEntry`：

- `ownerScope`：`ScopeRef`（已有字段）
- `ownerNodeInstance`：`NodeInstance`（已有字段）
- `ownerActionCtx`：**新增字段**，保留 caller 当时的 runtime / actionScope / componentRegistry / page / surfaceRuntime / evaluationBindings 引用

callback 触发时构造的 ctx：

```ts
const ownerCtx: ActionContext = {
  ...entry.ownerActionCtx,
  scope: entry.ownerScope,
  nodeInstance: entry.ownerNodeInstance,
  prevResult: payload.result,
  evaluationBindings: {
    ...(entry.ownerActionCtx.evaluationBindings ?? {}),
    $formData: payload.formData ?? {},
    $result: payload.result,
    $hook: payload.hookName,
  },
};
```

### Why Owner Scope, Not Surface Child Scope

让 callback 在 surface child scope 执行看起来"自然"，但实际不能解决任何业务诉求，并带来三个问题：

1. `refreshNearest` 从 surface child scope 开始向上查找时，会先命中 surface body 内部嵌套的 CRUD（如果有），而不是 owner 侧的外部 CRUD。语义错误。
2. callback 里想做 `setValue` / `setValues` 写回 owner 状态时，写到 surface child scope 会在 surface 关闭后丢失。
3. callback 想调 `component:refresh` / `openDialog` / `closeSurface` 等需要 componentRegistry / surfaceRuntime 的 action 时，surface child ctx 里这些对象要么是 surface 自己的（语义错），要么是 undefined（dispatch 失败）。

因此 callback 必须在 owner ctx 执行。如果业务确实需要操作 surface 内部状态，应该通过 surface body 内的 form / component 自己的事件钩子（如 form 的 `onSubmitSuccess` 字段，是 form 的 lifecycle handler，不是 surface 的 callback），而不是通过 surface lifecycle callback。

### `$formData` vs `ctx.form`

`$formData` 是 callback dispatch 时通过 `evaluationBindings` 注入的 **plain values snapshot**（提交时的 form values 一次性快照）。

`ctx.form` 是 form runtime 对象（含 validate / submit / setValues 等 capability handle）。

两者命名相近但语义不同：

- `$formData.fieldName` 读 form 提交时的字段值（snapshot）
- `ctx.form.capabilities.invoke('setValues', ...)` 调 form 的 capability（如果 callback 想从外部操作 form；这种情况罕见，通常改用 form 自己的 lifecycle handler）

callback 默认不传 `ctx.form`（因为 callback 在 owner ctx 执行，与 surface child 的 form runtime 跨 context）。如果 callback 需要操作 form，应在 form schema 的 `onSubmitSuccess` 字段里写（那是 form lifecycle handler，在 form ctx 执行），而不是在 surface `args.onSubmitSuccess` 里写。

## Hook Triggering Semantics

### Close Hook

`surfaceRuntime.close(surfaceId)` removes the entry first (preserving the existing sync close contract that callers rely on), then **fire-and-forgets** `onCloseNodes` asynchronously (only action-style openDialog/openDrawer entries have this field; declarative surface's `entry.onClose` is a function, handled by `use-surface-renderer.ts`, and is not part of this mechanism):

```ts
// live implementation (packages/flux-runtime/src/surface-runtime.ts)
close(surfaceId) {
  const removed = store.remove(surfaceId);
  if (!removed) return;

  // Snapshot hook info before disposeEntry clears entry-owned resources.
  const closeNodes = removed.onCloseNodes;
  const ownerActionCtx = removed.ownerActionCtx;

  disposeEntry(removed);
  republishActiveStatuses();

  // Fire onCloseNodes asynchronously after dispose (fire-and-forget).
  // close() stays sync; hook errors are warned, not thrown.
  if (closeNodes && ownerActionCtx) {
    dispatchInOwner({ ...removed, ownerActionCtx }, closeNodes, { hookName: 'close' }).catch(
      (err) => {
        console.warn('[surface] onClose hook failed:', err);
      },
    );
  }
}
```

`onCloseNodes` fires for any close path:

- 用户点击 close 按钮 / mask / 按 ESC
- schema 调 `closeSurface` action
- 父级 runtime teardown

不触发 `onCloseNodes` 的路径：

- 整个 page runtime 强制 dispose（如 SPA 卸载）—— 这种情况所有 callback 都不保证触发
- 同一 surface 内多次 close 调用（去重后只触发一次）

declarative surface（`type: 'dialog'` / `type: 'drawer'`）的 close 路径**保持现状**：`entry.onClose` (function) 由 `use-surface-renderer.ts:223/325/348` 直接调用，不经 `dispatchInOwner`。两套机制共存，互不干扰。详见 `surface-owner.md` §Declarative And Action-Opened Surfaces。

> **设计权衡（为什么是 sync fire-and-forget 而不是 async）**：让 `close()` 改为 async 会破坏所有现有调用方（5 处：`use-surface-renderer.ts:328`、`dialog-host.tsx:209/388`、`action-adapter.ts:239/241`）。这些调用方依赖 close 立即移除 entry 并触发 React unmount。把 close 改 async 会引入 race（mask 点击后 React tree 还没卸载，用户可能再次点击）。sync + fire-and-forget 保持了 close 的"立即生效"语义，hook 作为副作用异步执行不阻塞 UI 响应。

### Submit Hooks

form 的 submit hook 由 **`packages/flux-renderers-form/src/renderers/form.tsx`** 在创建 lifecycle handler 时注入。form.tsx 读 schema 的 `submitScope` 字段，并通过 `useCurrentSurfaceRuntime()` hook 获取 surface runtime；当 form submit 完成（成功或失败）后，在 form 自己的 lifecycle handler 末尾调 `surfaceRuntime.triggerHook(entry, hookName, payload)`：

```ts
// live implementation in form.tsx setLifecycleHandlers
const triggerSurfaceSubmitHook = async (hookName, result) => {
  if (!surfaceRuntimeForHook?.triggerHook || !surfaceId) return;
  const entry = surfaceRuntimeForHook.store.getState().entries.find((e) => e.id === surfaceId);
  if (!entry) return;
  try {
    await surfaceRuntimeForHook.triggerHook(entry, hookName, {
      result,
      formData: { ...ownedForm.store.getState().values },
      hookName,
    });
  } catch (err) {
    console.warn(`[form] surface ${hookName} hook failed:`, err);
  }
};

// onSubmitSuccess lifecycle handler:
// 1. await form's own onSubmitSuccess action (form schema)
// 2. await triggerSurfaceSubmitHook('submit:success', result)
// similarly for onSubmitError
```

**关键约束**：

- **只触发 `submitScope: 'surface'` 的 form**（详见 §Form Submit Scope）。多 form surface 场景下，只有显式声明 `'surface'` 的 form（或单 form 自动启用）的 submit 才会触发 callback。
- submit hooks 只对 surface body 内的 form submit 生效。如果 surface body 没有提交 form（纯展示），不会触发。
- submit hooks 只对 **action-style** openDialog/openDrawer 有效（`onSubmitSuccessNodes` / `onSubmitErrorNodes` 字段只有 action-style entry 才有）。declarative surface 内的 form submit 不触发 surface callback（declarative surface 已有自己的 onSubmitSuccess 触发路径，由 `use-surface-renderer.ts` 透传）。
- submit hooks 不替代 ajax 默认的 error→notify（详见 §Relationship With Ajax Default Notifications）。
- submit hooks 在 form lifecycle handler 之后触发（form 自己的 `onSubmitSuccess` 字段先执行，然后才是 surface `args.onSubmitSuccess`）。
- submit hooks 不自动关闭 surface。如果业务想在成功后关闭，应在 hook 里显式写 `{ action: 'closeSurface' }`。

> **设计权衡（为什么触发位置在 form.tsx 而不是 form-runtime-submit-flow.ts）**：`form-runtime-submit-flow.ts` 是 form runtime 的纯函数式 submit 流程，不持有 surfaceRuntime / dialogId / schema 等 React-context-bound 信息。让 submit-flow 持有这些会破坏其纯函数性。`form.tsx` 是 React 组件，通过 `useCurrentSurfaceRuntime()` 和 `props.props.submitScope` 拿到这些信息天然合适。lifecycle handler 包装方式让 form-runtime-submit-flow 不变。

### Hook Error Semantics

hook 内 action 抛错的处理契约：

- **hook 抛错不阻塞 surface close 流程**：`close` 用 Promise.catch 包裹 `dispatchInOwner`，捕获错误后 `console.warn`。entry 已在 dispatch 前 dispose，hook 失败不影响 close 主流程。
- **hook 抛错不阻塞 form submit 流程**：`triggerHook` 内部 try/catch，submit 本身的成功状态不被 hook 失败影响
- **owner runtime 已 teardown 时**：`dispatchInOwner` 调用 `entry.ownerActionCtx.runtime.dispatch` 时可能抛错（runtime 对象已失效），错误被上层 catch 捕获并 `console.warn`。flux 当前 `ActionContextRuntime` 不暴露 `disposed` 字段，因此**没有显式 pre-check**，依赖 try/catch 兜底
- hook 抛错时，错误信息走 action dispatcher 默认 error notify（一次 toast），与普通 action 失败一致

### Triggering Order

同一个 surface lifecycle 内可能触发多次 hook。约定顺序：

```
form.submitAction (ajax)
  ↓
ajax default notifications (messages.success / messages.failed / 默认 error toast)
  ↓
form lifecycle handlers (form schema 的 onSubmitSuccess / onSubmitError 字段)
  ↓
surface submit hooks (openDialog args.onSubmitSuccess / args.onSubmitError)
  ↓
（业务在 hook 内显式 closeSurface）
  ↓
surface close hook (openDialog args.onClose)
  ↓
disposeEntry
```

注意：`onClose` 不会在 submit 成功后**自动**触发——业务必须在 submit hook 内显式 `closeSurface`。这避免"submit success 后 onClose 重复刷新"的歧义。

如果业务想要"submit 成功后自动关闭 + 刷新"，写法是：

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": {
      /* form */
    },
    "onSubmitSuccess": [{ "action": "closeSurface" }, { "action": "refreshNearest" }],
  },
}
```

或者把 refresh 放在 `onClose`：

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": {
      /* form */
    },
    "onSubmitSuccess": { "action": "closeSurface" },
    "onClose": { "action": "refreshNearest" },
  },
}
```

两种写法语义等价（都会刷新一次），第二种把 refresh 集中在 close 钩子，便于"用户取消也刷新"的场景。

## `refreshNearest` Action

### Schema

```ts
export interface RefreshNearestActionSchema extends ActionShapeFields {
  action: 'refreshNearest';
  args?: {
    targetType?: 'crud' | 'data-source' | 'tree' | 'auto'; // 默认 'auto'
    notFound?: 'silent' | 'error'; // 默认 'silent'
  };
}
```

### Semantics

`refreshNearest` 从 `ctx.scope` 开始沿 `scope.parent` 链向上查找，命中第一个具备 `refresh` capability 的 component 或第一个 data-source entry，调用其 refresh：

- target 是 CRUD 或 tree（通过 component handle）→ `handle.capabilities.invoke('refresh', {}, ctx)` → 重跑 loadAction（CRUD）或重新加载（tree）
- target 是 data-source（通过 source registry）→ `runtime.refreshDataSource({ name, scope })`

`auto` 模式下不区分类型，按"最近"匹配。`crud` / `data-source` / `tree` 模式限定特定类型。

### Finding Algorithm

```ts
async function findNearestRefreshable(startScope, registry, sourceRegistry, targetType) {
  let scope = startScope;
  while (scope) {
    // 在此 scope 的 component registry bucket 找匹配的 component
    if (targetType === 'auto' || targetType === 'crud' || targetType === 'tree') {
      const handle = registry.findFirstInScope(scope, (h) =>
        targetType === 'auto'
          ? h.componentType === 'crud' || h.componentType === 'tree'
          : h.componentType === targetType,
      );
      if (handle) return { kind: 'component', handle, scope };
    }

    // 在此 scope 的 source registry bucket 找 data-source
    if (targetType === 'auto' || targetType === 'data-source') {
      const entry = sourceRegistry.findFirstInScope(scope);
      if (entry) return { kind: 'source', entry, scope };
    }

    scope = scope.parent;
  }
  return null;
}
```

`ComponentHandleRegistry.findFirstInScope` 和 `SourceRegistry.findFirstInScope` 是新增的 helper API，按 `scope.id` 精确匹配 bucket，在 bucket 内按 predicate 找第一个。开销可控（同一 scope 下 CRUD / data-source 通常很少）。

**实现注意事项**：两个 registry 的内部存储模型不对称：

- `SourceRegistry` 已经按 `scope.id` 分桶（`scopeEntries: Map<scopeId, Map<name, entry>>`，见 `packages/flux-runtime/src/async-data/source-registry.ts:110-112`），`findFirstInScope` 直接读 bucket 即可。
- `ComponentHandleRegistry` 是 flat `Set<ComponentHandle>` + by-id / by-name / by-cid 索引（`packages/flux-runtime/src/component-handle-registry.ts:19-24`），**没有 scope-id 维度**。`findFirstInScope` 实现需要遍历 handles 并按 `handle.scope.id === targetScope.id` 过滤，或者在 registry 初始化时新增一个 `Map<scopeId, Set<ComponentHandle>>` 索引。

实现时优先选择新增 scope-id 索引（性能 + 一致性），避免每次 scan。索引维护与 handle register / unregister 同步。

### `notFound` Behavior

- `silent`（默认）：找不到任何 refreshable target 时返回 `{ ok: true, data: { found: false } }`，不抛错
- `error`：找不到时返回 `{ ok: false, error: new Error('refreshNearest found no refreshable target') }`

### Relationship With `refreshTable` / `refreshSource` / `component:refresh`

| 动作                | 适用场景                                                                              | 是否需要 id/name                      |
| ------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| `refreshTable`      | bump `ctx.page.refreshTick`（仅触发订阅了 refreshTick 的组件，目前只有 PageRenderer） | 不需要                                |
| `refreshSource`     | 刷新指定 name 的 data-source                                                          | **需要** targetId                     |
| `component:refresh` | 调指定 component 的 refresh capability                                                | **需要** componentId 或 componentName |
| `refreshNearest`    | 沿 scope 链向上找最近的 refreshable 目标（CRUD / tree / data-source）                 | **不需要**                            |

四个动作语义互补，不替代。`refreshTable` / `refreshSource` / `component:refresh` 都要求作者显式指定目标，适合"明确知道要刷谁"的场景。`refreshNearest` 适合"作者只知道有一个外层列表，不关心它的 id"的场景，例如：

- schema 复用：同一个 dialog body 被多个 CRUD 引用，提交后都刷新 caller
- 嵌套弹窗：dialog 内部再开 dialog，最内层提交后刷新最近的外层 CRUD
- 通用按钮：toolbar 上的"刷新"按钮不知道自己在哪个 CRUD 里

### Why Not Extend `refreshSource` To Walk Scope Chain

替代方案是让 `refreshDataSource({ name, scope })` 在 `scope` 精确匹配失败时沿 parent 链向上查找。这能解决 source 路径，但有两个问题：

- 不能解决 loadAction 模式（CRUD 没有注册为 source）
- 容易误刷上层同名的 source（嵌套场景歧义）

`refreshNearest` 显式区分 component / source 两种 target，并通过 `targetType` 让作者限定类型，语义更清晰。

## Relationship With Ajax Default Notifications

flux 的 ajax action 已经有完整的 success / error 通知机制，surface callback 是**补充**，不是替代。

### Default Ajax Notification Behavior

ajax action 在不写任何 callback / messages / onError 时：

- 成功：默认不 toast（除非配 `messages.success`）
- 失败：默认 toast 后端 msg（`response.msg` > `response.data.message` > `response.data.msg` > 兜底文案），恰好触发一次

实现位置：

- `packages/flux-runtime/src/async-data/request-runtime.ts:80-118`：fetcher 非 OK 响应转 Error，message 优先级如上
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:200-225`：dispatcher 兜底 `notify('error', result.error.message)`

测试 `packages/flux-runtime/src/__tests__/request-runtime-error-notify.test.ts:11-34` 验证此契约。

### Authoring Decision Matrix

| 场景                                   | 推荐做法                                                              | 不推荐                                                                   |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 成功后默认 toast                       | 配 `messages.success`                                                 | 在 `onSubmitSuccess` 里 `showToast`                                      |
| 成功后引用 form 数据的 toast           | 配 `messages.success` 用 `${field}` 表达式（ajax 在 form scope 处理） | 在 `onSubmitSuccess` 用 `$formData.field`（除非需要在 owner scope 引用） |
| 失败后显示后端错误                     | **什么都不配**（ajax 默认行为已自动 toast 后端 msg）                  | 在 `onSubmitError` 里 `showToast`（重复 toast，会触发两次）              |
| 失败后自定义文案                       | 配 `messages.failed`                                                  | 在 `onSubmitError` 里 `showToast`（除非要覆盖默认）                      |
| 失败后做副作用（重置字段、跳转、上报） | 用 `onSubmitError` callback                                           | 用 `onError` 链（onError 会抑制默认 toast）                              |
| 成功后刷新外部 CRUD                    | `onSubmitSuccess: { action: 'refreshNearest' }`                       | `then: { action: 'component:refresh', componentId: 'xxx' }`（需知 id）   |
| dialog 关闭后刷新（无论提交与否）      | `onClose: { action: 'refreshNearest' }`                               | 依赖 `closeSurface` then 链（ctx 不切换，会失败）                        |

### Why `onSubmitError` Exists If Ajax Already Toasts

`onSubmitError` 不替代 ajax 默认 toast，而是用于非 toast 的自定义错误处理：

- 重置某些字段（让用户重试）
- 跳转到错误页 / 错误详情
- 上报埋点（如失败次数计数、错误日志）
- 根据错误 code 决定是否关闭 dialog（例如某些业务错误仍要保留 dialog 让用户继续编辑）

如果业务只需要"显示后端错误"，不需要配 `onSubmitError`——ajax 默认行为已覆盖。

## Relationship With `onError` Chain

`onError` 是 action 自己的字段（`ActionShapeFields.onError`），它会在 ajax 失败时执行，**并抑制默认 error toast**。

`onSubmitError`（surface callback）不抑制默认 toast，与 `onError` 互不干扰。如果业务同时在 ajax 的 `onError` 和 surface `onSubmitError` 都写了 action：

- `onError` 执行（默认 toast 被抑制）
- `onSubmitError` 执行（不抑制已经被 `onError` 抑制的 toast，但本身也不发新 toast）

这种组合很少用。一般建议：

- 想完全控制错误处理 → 用 `onError`（接受默认 toast 被抑制）
- 想保留默认 toast + 额外副作用 → 用 `onSubmitError` callback

## Relationship With Declarative Surface

declarative `type: 'dialog'` / `type: 'drawer'`（走 `useSurfaceRenderer`）已有 `onClose` 字段（React unmount 触发）。本设计补充的 `onSubmitSuccess` / `onSubmitError` 对 declarative surface 同样适用：

- declarative surface 的 `onClose` 由 React unmount 触发，由 surface-runtime 通过 `useSurfaceRenderer` 透传
- declarative surface 的 `onSubmitSuccess` / `onSubmitError` 由 form submit 触发，逻辑与 action-style surface 一致

两种 authoring 入口（declarative 和 action-style）的 callback 行为对齐，不长期保留双轨差异。这与 `surface-owner.md` 的 §Declarative And Action-Opened Surfaces 一致。

## Authoring Examples

### 标准 CRUD + 编辑 dialog（最常见场景）

```jsonc
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
                },
                "body": [
                  /* ... */
                ],
              },
              "onSubmitSuccess": [{ "action": "closeSurface" }, { "action": "refreshNearest" }],
            },
          },
        },
      ],
    },
  ],
}
```

### 嵌套 dialog（dialog 内部 CRUD 再开 dialog）

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": {
      "type": "crud", // 嵌套 CRUD
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
                  "onSubmitSuccess": [{ "action": "closeSurface" }, { "action": "refreshNearest" }],
                  // refreshNearest 从 inner dialog 的 owner（=嵌套 CRUD）开始查找
                  // 命中嵌套 CRUD，而不是外层 CRUD
                },
              },
            },
          ],
        },
      ],
    },
  },
}
```

### `onSubmitError` 做非 toast 副作用

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": {
      "type": "form",
      "submitScope": "surface",
      "submitAction": {
        /* ajax */
      },
    },
    // 失败时：默认 toast 已显示后端 msg，这里只做埋点上报
    "onSubmitError": {
      "action": "ajax",
      "args": {
        "url": "/r/Audit__log",
        "method": "post",
        "data": { "event": "form_submit_failed", "form": "${$formData}" },
      },
    },
  },
}
```

### 多 form surface（搜索 form + 主提交 form）

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": [
      {
        "type": "crud",
        "id": "dialog-list",
        "loadAction": {
          /* ajax */
        },
        "queryForm": {
          // CRUD queryForm 内嵌的 form，submitScope 默认 'local'
          // 即使整个 dialog 设了 onSubmitSuccess，搜索 form 的 submit 不会触发
          "body": [{ "type": "input-text", "name": "keyword", "label": "关键字" }],
        },
        "columns": [
          /* ... */
          {
            "type": "operation",
            "buttons": [
              {
                "type": "button",
                "label": "编辑",
                "onClick": {
                  "action": "openDialog",
                  "args": {
                    "body": {
                      "type": "form",
                      "submitScope": "surface",
                      "submitAction": {
                        /* ajax */
                      },
                    },
                    "onSubmitSuccess": { "action": "refreshNearest" },
                    //              ↑
                    //  这里"nearest"是内层 dialog 的 owner（=外层 dialog body 的 CRUD）
                    //  而不是最外层 page 的 CRUD
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  },
}
```

注意：嵌套 dialog 中 `submitScope: 'surface'` 指向**最近的包含 surface**（内层 dialog），不会冒泡到外层 dialog。

## Non-Goals

本设计不解决以下问题：

- **跨 surface 的状态同步**：如果两个同时打开的 dialog 需要同步状态，应通过 statusPath 或共享 owner scope，不在 lifecycle callback 内做。
- **surface preload / prefetch**：surface 打开前的数据预取不在 lifecycle callback 范围。
- **surface close prevent**：阻止 surface 关闭（如"有未保存修改"）通过 form 的 dirty 检测 + beforeClose 机制，不在 lifecycle callback 范围。未来如需要再设计。
- **batch surface 操作**：一次关闭多个 surface、批量刷新多个 owner，不在 lifecycle callback 范围。

## Related Documents

- `docs/architecture/surface-owner.md` — surface family owner taxonomy、runtime 模型、scope 初始化规则
- `docs/architecture/action-algebra-formal-spec.md` — action 通用语义
- `docs/architecture/action-scope-and-imports.md` — action scope 模型
- `docs/architecture/scope-ownership-and-isolation.md` — scope ownership 与 isolation
- `flux-guide/04-action-system.md` — authoring 视角的 action 列表
- `flux-guide/design-patterns/page-dialog-drawer.md` — authoring 范例
- `flux-guide/design-patterns/crud.md` — CRUD 操作范例
- `flux-guide/flux-types/common.d.ts` — schema 类型定义
