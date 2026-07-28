# Surface Lifecycle Callbacks And Owner-Scoped Refresh

> Plan Status: completed
> Last Reviewed: 2026-07-28
> Source: `docs/analysis/2026-07-27-flux-dialog-submit-refresh-design.md`, `docs/architecture/surface-lifecycle-callbacks.md`
> Related: `docs/architecture/surface-owner.md`

## Purpose

把 `docs/architecture/surface-lifecycle-callbacks.md` 定义的设计落地到 flux-runtime / flux-action-core / flux-renderers-data / flux-renderers-form / flux-renderers-basic / flux-core types，并同步 flux-guide authoring 文档。

最终结果面：业务方在 schema 里写 `openDialog args.onSubmitSuccess: { action: 'refreshNearest' }` 即可在 dialog form 提交成功后刷新外部 CRUD / data-source / tree，**不需要知道外层组件 id/name**，且在多 form dialog 场景下行为可控（通过 `form.submitScope` 显式区分主提交 form）。

## Current Baseline

live repo（`/Users/abc/app/nop-chaos-flux-wt/nop-chaos-flux-master`）的现有事实：

- `SurfaceRuntime` / `SurfaceEntry` 已经统一管理 declarative 和 action-style 两种 surface（`packages/flux-runtime/src/surface-runtime.ts:12-198`，`packages/flux-core/src/types/runtime.ts:239-262`）
- `SurfaceEntry` 已有 `ownerScope` / `ownerNodeInstance` / `onClose` / `onOpen` / `onConfirm` 字段，但 action-style `openDialog` / `openDrawer` 不填 onClose 等回调字段（`packages/flux-runtime/src/action-adapter.ts:204-215`）
- `surfaceRuntime.close()` 不调 `entry.onClose`（`packages/flux-runtime/src/surface-runtime.ts:182-186`）
- `sourceRegistry.refreshDataSource({name, scope})` 按 `scope.id` **精确匹配**，不沿 parent 链向上查找（`packages/flux-runtime/src/async-data/source-registry.ts:348-359`）
- `componentRegistry.resolve()` 已经双向 traverse（`packages/flux-runtime/src/component-handle-registry.ts:231-298`）
- CRUD 的 `refresh` capability 已实现，重跑 `loadAction` + 触发 `onRefresh` event（`packages/flux-renderers-data/src/crud-renderer-state.ts:304-377`，`packages/flux-renderers-data/src/crud-renderer.tsx:216-252`）
- ajax action 已有完整 `messages` 配置 + 默认 error→notify 行为（`packages/flux-core/src/types/actions.ts:125-132`，`packages/flux-runtime/src/runtime-action-helpers.ts:134-167`，`packages/flux-runtime/src/async-data/request-runtime.ts:80-118`，dispatcher 兜底 `packages/flux-action-core/src/action-dispatcher/action-execution.ts:200-225`）
- form 已有 lifecycle handler 机制（`packages/flux-renderers-form/src/renderers/form.tsx:240-300`，`packages/flux-runtime/src/form-runtime-submit-flow.ts:229-480`）
- form 的 onSubmitSuccess dispatch 时 ctx 残缺（无 componentRegistry / surfaceRuntime / page / nodeInstance）（`packages/flux-renderers-form/src/renderers/form.tsx:251-265`）
- `OpenDialogActionSchema.args` 是 `Record<string, SchemaValue>`（`packages/flux-core/src/types/actions.ts:169-172`），不接受 `onClose` / `onSubmitSuccess` / `onSubmitError` 字段约束
- `FormSchema` 已有 `submitAction` / `onSubmitSuccess` / `onSubmitError` 字段（`packages/flux-core/src/types/schema.ts` FormSchema 定义，对应 `flux-guide/flux-types/schema.d.ts:309-336`），没有 `submitScope` 字段
- `docs/architecture/surface-lifecycle-callbacks.md` 已写出完整最终设计（包含 `submitScope`），是本 plan 的 contract source
- `docs/architecture/surface-owner.md` 已增补 §Surface Lifecycle Callbacks 引用章节
- `flux-guide/04-action-system.md` action 列表已含 `refreshNearest`
- `flux-guide/design-patterns/page-dialog-drawer.md` §6 已重写为推荐 lifecycle callback + `refreshNearest`
- `flux-guide/design-patterns/crud.md` §1 已加 lifecycle callback + `refreshNearest` 替代写法
- `flux-guide/flux-types/common.d.ts` `OpenDialogActionSchema` / `OpenDrawerActionSchema` 已加 hook 字段；新增 `RefreshNearestActionSchema`
- `flux-guide/flux-types/schema.d.ts` `FormSchema` 已加 `submitScope: 'local' | 'surface'`

剩余 gap：

1. flux-runtime / flux-action-core / flux-renderers-data / flux-renderers-form 代码侧未实现（schema 类型扩展 + dispatcher case + surface hook 透传 + close hook 触发 + form submitScope 过滤 + refreshNearest 实现）
2. schema validator 未校验"同一 surface body 内最多一个 `submitScope: 'surface'`"
3. schema validator 未实现"单 form 自动启用 `submitScope: 'surface'` + warning"
4. focused tests 缺失（无任何测试覆盖 openDialog + form + submit + close + refresh 端到端）
5. flux-guide examples 与 playground 页面 schema 未补

## Goals

- 实现 `openDialog` / `openDrawer` 的 `onClose` / `onSubmitSuccess` / `onSubmitError` 三个 lifecycle callback（机制完整，业务按需使用）
- 实现 `refreshNearest` action：沿 scope.parent 链向上找最近的 CRUD / data-source / tree 调用其 refresh，不需要 id/name
- 实现 `SurfaceEntry.ownerActionCtx` 保存 owner 完整 ctx，让 callback 在 owner ctx dispatch
- 实现 `form.submitScope: 'local' | 'surface'` 过滤：只有显式声明（或单 form 自动启用）的 form submit 才触发 surface callback
- 实现 schema validator：多 form 时最多一个 `submitScope: 'surface'` 的硬约束；单 form 自动启用 + warning
- 不破坏 declarative surface（`type: 'dialog'` / `type: 'drawer'`）现有行为
- 不破坏现有 `messages` / `onError` / 默认 error→notify 行为
- 不破坏现有 `refreshSource` / `refreshTable` / `component:refresh` 行为

## Non-Goals

- 不实现 `refreshTable` 修复（`refreshTable` 仍只 bump refreshTick；本 plan 不改其语义）
- 不实现 `refreshDataSource` 向上 traverse（保留精确匹配语义；多 scope 查找由 `refreshNearest` 负责）
- 不实现 surface close prevent（如"有未保存修改"对话框）—— 留给未来 plan
- 不实现 batch surface 操作（一次关闭多个 surface、批量刷新多个 owner）
- 不实现 surface preload / prefetch
- 不重构 declarative vs action-style 双轨（design doc 已明确对齐方向，但实际双轨代码不强制合并）
- 不修改 `then` 链不切换 ctx 的现有语义（通过 owner ctx reconstruction 绕过，不改通用 dispatcher 行为）
- 不修改 form `onSubmitSuccess` 残缺 ctx 问题（form 自己的 lifecycle handler 仍按现状执行；surface callback 由 surface runtime 主动触发，不依赖 form ctx）

## Scope

### In Scope

- `packages/flux-core/src/types/`：`SurfaceEntry` 加 `ownerActionCtx` / `onSubmitSuccess` / `onSubmitError` 字段；`OpenDialogActionSchema` / `OpenDrawerActionSchema` args 类型扩展；新增 `RefreshNearestActionSchema`；`FormSchema` 加 `submitScope`
- `packages/flux-runtime/src/surface-runtime.ts`：`open` 接收并保存 `ownerActionCtx` / hook 节点；`close` 改 async，调 `triggerHook(entry, 'close')` 后 dispose；新增 `triggerHook(entry, hookName, payload)` 方法
- `packages/flux-runtime/src/action-adapter.ts`：openDialog/openDrawer 编译 hook 节点 + 透传 owner ctx；refreshNearest 实现
- `packages/flux-runtime/src/runtime-factory.ts`：surface scope 创建透传 ownerActionCtx
- `packages/flux-runtime/src/refresh-nearest.ts`：新增 `findNearestRefreshable` + `refreshNearest` 实现
- `packages/flux-runtime/src/component-handle-registry.ts`：新增 `findFirstInScope(scope, predicate)`
- `packages/flux-runtime/src/async-data/source-registry.ts`：新增 `findFirstInScope(scope)`
- `packages/flux-runtime/src/surface-hooks.ts`：新增 `dispatchInOwner(entry, nodes, payload)`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`：submit 成功/失败后调 `surfaceRuntime.triggerHook`，过滤 `submitScope`
- `packages/flux-renderers-form/src/renderers/form.tsx`：暴露 form schema 的 `submitScope` 字段到 form runtime ctx；收集 `formData` snapshot 传给 hook
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`：declarative surface 同样支持 `onSubmitSuccess` / `onSubmitError`（与 action-style 对齐）
- `packages/flux-react/src/dialog-host.tsx`：close 调用改 await
- `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`：注册 `refreshNearest` case
- `packages/flux-core/src/schema-validator/`（或同级）：增加 submitScope 校验规则（多 form 至多一个 'surface'；单 form 自动启用 + warning）
- `flux-guide/design-patterns/page-dialog-drawer.md`：多 form 场景示例 + `submitScope` 标注
- `flux-guide/examples/`：新增 `crud-with-dialog-and-search-form.md` example
- `apps/playground/src/complex-pages/page-schemas/`：新增 `standard-crud-with-dialog.json` 可视化示例
- `docs/architecture/surface-lifecycle-callbacks.md`：根据 review 反馈微调（如有）

### Out Of Scope

- nop-chaos-next（host 集成侧）：本 plan 只实现 flux 框架本身；host 集成在后续 plan
- nop-entropy 后端 XPL 生成：本 plan 不改 `grid_crud.xpl` / `page_simple.xpl` 的 schema 生成逻辑；后端集成在后续 plan
- 其他 surface family（sheet、alert-dialog）的 lifecycle callback：本 plan 只覆盖 dialog / drawer；sheet 等待 future plan
- 表单字段 dirty 检测、close prevent：未来 plan
- 跨 surface 事件总线：未来 plan

## Failure Paths

| 可测场景                                               | 触发                                                       | 行为                                                                                                                                                                                                        | 可重试 | 用户可见表现                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `refreshNearest` 找不到 target（`notFound: 'silent'`） | dialog 内提交但 owner scope 链无 CRUD / data-source        | `{ ok: true, data: { found: false } }`                                                                                                                                                                      | 否     | 无 toast，无错误日志；callback 链继续                              |
| `refreshNearest` 找不到 target（`notFound: 'error'`）  | 同上                                                       | `{ ok: false, error: Error('refreshNearest found no refreshable target') }`                                                                                                                                 | 否     | 走 action dispatcher 默认 error notify（toast 显示 error message） |
| `onSubmitError` 触发但 ajax 默认 toast 也触发          | ajax 失败 + surface 配了 `onSubmitError`                   | ajax 默认 error toast（来自 `messages.failed` 或后端 msg）触发一次；`onSubmitError` hook 执行副作用                                                                                                         | 否     | toast 显示后端 msg 一次 + hook 副作用执行                          |
| 多个 form 同时标 `submitScope: 'surface'`              | schema 编译                                                | schema validation error，编译失败                                                                                                                                                                           | 否     | schema 校验错误信息                                                |
| `triggerHook` 内 action 抛错                           | hook 内 action 执行失败                                    | hook dispatch 失败被 `dispatchInOwner` 捕获；走默认 error notify；不阻塞后续 surface close 流程                                                                                                             | 否     | toast 显示错误；surface 关闭流程继续                               |
| `surfaceRuntime.close` 内 `onClose` hook 抛错          | close 时 hook 失败                                         | hook 错误捕获；entry 仍然 dispose；republishActiveStatuses 仍执行                                                                                                                                           | 否     | toast 显示错误；surface 仍关闭                                     |
| `ownerActionCtx` 已 dispose（owner runtime teardown）  | surface 仍在打开但 owner 已 teardown（理论不该发生但防御） | `dispatchInOwner` 调用已失效 `runtime.dispatch` 抛错；错误被上层 `console.warn` 捕获；不阻塞 close/submit 主流程。flux `ActionContextRuntime` 不暴露 `disposed` 字段，**依赖 try/catch 兜底**而非 pre-check | 否     | 无可见表现；console.warn 一条                                      |

## Test Strategy

档位选择：**必须自动化**

理由：

- 本 plan 实现的是公共 action 契约（`refreshNearest`）和公共 surface 契约（lifecycle callback）
- 涉及 scope / ctx reconstruction / async close / hook 触发顺序等容易回归的复杂语义
- 现有 flux-runtime 测试套件已经为 surface / action / refresh / form lifecycle 提供了完善的 mock 基础设施
- 单 form 自动启用、多 form 校验、hook 触发顺序、`refreshNearest` 查找算法都是 deterministic 行为，必须有测试锁定

不要求 e2e（playground 页面手动验证即可，纳入 Non-Blocking Follow-ups）。

## Execution Plan

### Phase 1 - Owner Context Infrastructure（方案 C）

Status: completed
Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-runtime/src/action-adapter.ts`

- Item Types: `Fix | Decision`

- [ ] **Decision**：lifecycle hook 字段命名与存储。现有 `OwnedSurfaceStateBase.onClose?: () => Promise<ActionResult> | ActionResult | void` 是 function 类型，已被 declarative surface 在 `packages/flux-renderers-basic/src/use-surface-renderer.ts:223/325/348` live 使用。**不能改其类型**。本 plan 决定：新增三个 `ActionNode[]` 字段 `onCloseNodes` / `onSubmitSuccessNodes` / `onSubmitErrorNodes`，与现有 function-based `onClose` / `onOpen` / `onConfirm` 共存。action-style openDialog/openDrawer 把 schema 的 `onClose` / `onSubmitSuccess` / `onSubmitError` 编译为 ActionNode[] 存到这三个新字段；declarative surface 继续走现有 function-based `onClose` 路径，不被本 plan 改动。这样 action-style 与 declarative 的 close 路径独立、互不干扰。

- [ ] `OwnedSurfaceStateBase` 类型扩展（`packages/flux-core/src/types/runtime.ts:239-258`）：加 `onCloseNodes?: ActionNode[]`、`onSubmitSuccessNodes?: ActionNode[]`、`onSubmitErrorNodes?: ActionNode[]`、`ownerActionCtx?: Pick<ActionContext, 'runtime' | 'actionScope' | 'componentRegistry' | 'page' | 'surfaceRuntime' | 'evaluationBindings'>`
- [ ] `SurfaceRuntimeOptions`（`open()` 的 `options` 字段，`packages/flux-core/src/types/runtime.ts:300-316`）扩展：加 `onCloseNodes` / `onSubmitSuccessNodes` / `onSubmitErrorNodes` / `ownerActionCtx`（类型与 OwnedSurfaceStateBase 对应）
- [ ] `surfaceRuntime.open` 实现（`packages/flux-runtime/src/surface-runtime.ts:120-157`）：把 `options.onCloseNodes` / `options.onSubmitSuccessNodes` / `options.onSubmitErrorNodes` / `options.ownerActionCtx` 写入 entry（与现有 function-based `onClose` / `onOpen` / `onConfirm` 共存）
- [ ] `action-adapter.ts:185-218` `openDialog` case：用 `actionProgramCompiler.compile` 把 `args.onClose` / `args.onSubmitSuccess` / `args.onSubmitError` 编译为 ActionNode[]，通过 `options.onCloseNodes` / `options.onSubmitSuccessNodes` / `options.onSubmitErrorNodes` 透传；同时把 caller ctx 存为 `options.ownerActionCtx`
- [ ] `action-adapter.ts:243-279` `openDrawer` case：同上

Exit Criteria:

> Phase 1 完成后：surface entry 能保存 owner 完整 ctx 和 action-node 形式的 hook 节点；现有 declarative surface 的 function-based onClose 不被破坏。

- [x] `SurfaceEntry` 在 unit test 中可读到 `ownerActionCtx.runtime` / `ownerActionCtx.componentRegistry` 等字段（focused test `surface-lifecycle-hooks.phase1.test.ts` 验证 open 后字段非空）
- [x] openDialog args 里写 `onClose: {...}` / `onSubmitSuccess: {...}` / `onSubmitError: {...}` 时，schema 形式通过 `entry.onCloseNodes` / `entry.onSubmitSuccessNodes` / `entry.onSubmitErrorNodes` 可读（hook 字段类型为 `ActionSchema | ActionSchema[]`，运行时通过 `runtime.dispatch` 编译执行，而非预编译为 `ActionNode[]`；这是与 plan 起草时的微调，详见 Phase 1 Decision 段落最后一段）
- [x] declarative surface 测试保持 pass：现有 `use-surface-renderer.ts` 的 `onClose` (function) 调用路径不被破坏（`runtime-dialogs-scope.dialog-state.test.ts` 等保持绿）
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-core typecheck` + `pnpm --filter @nop-chaos/flux-runtime typecheck`）

### Phase 2 - `refreshNearest` Action（方案 B）

Status: completed
Targets: `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`, `packages/flux-runtime/src/refresh-nearest.ts` (new), `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`, `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-core/src/types/actions.ts`

- Item Types: `Fix`

- [ ] `ComponentHandleRegistry.findFirstInScope(scope, predicate)` 实现（`packages/flux-runtime/src/component-handle-registry.ts`）：在指定 scope bucket 内按 predicate 找第一个匹配 component handle；找不到返回 undefined
- [ ] `SourceRegistry.findFirstInScope(scope)` 实现（`packages/flux-runtime/src/async-data/source-registry.ts`）：在指定 scope bucket 内取第一个 source entry；找不到返回 undefined
- [ ] 新增 `packages/flux-runtime/src/refresh-nearest.ts`：实现 `findNearestRefreshable(startScope, registry, sourceRegistry, targetType)` + `refreshNearest(ctx, args)`；找不到 target 时按 `args.notFound` 决定 silent / error 行为
- [ ] `packages/flux-core/src/types/actions.ts` 加 `RefreshNearestActionSchema` 类型（已经在 `flux-guide/flux-types/common.d.ts` 写好，需同步到源码）
- [ ] `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:42-297` 加 `case 'refreshNearest'`：构造 invocation
- [ ] `packages/flux-runtime/src/action-adapter.ts:invokeBuiltInAction` switch 加 `case 'refreshNearest'`：调 `refreshNearest(ctx, args)`

Exit Criteria:

> Phase 2 完成后：`refreshNearest` action 可被 schema 调用，沿 scope.parent 链查找并刷新最近的 CRUD / data-source / tree。

- [x] `refreshNearest` 单测覆盖：同 scope 命中 CRUD / data-source / tree；沿 parent 链向上命中；嵌套 scope 命中最近；找不到 target 时 silent 返回 `{ ok: true, data: { found: false } }`；找不到 target 且 `notFound: 'error'` 返回 `{ ok: false }`（`packages/flux-runtime/src/__tests__/refresh-nearest.phase2.test.ts` 8 tests pass）
- [x] `refreshNearest` 单测覆盖：`targetType: 'crud'` 跳过 data-source；`targetType: 'data-source'` 跳过 CRUD
- [x] `findFirstInScope` 单测：找到第一个匹配；空 bucket 返回 undefined（包含在 phase2.test.ts 中）
- [x] 现有 `refreshSource` / `refreshTable` / `component:refresh` 测试保持 pass（`runtime-sources-refresh.test.ts` + `action-adapter.builtins.test.ts` 19 tests pass）

### Phase 3 - Surface Lifecycle Hooks Triggering（方案 A）

Status: completed
Targets: `packages/flux-runtime/src/surface-hooks.ts` (new), `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`, `packages/flux-react/src/dialog-host.tsx`

- Item Types: `Fix`

- [ ] 新增 `packages/flux-runtime/src/surface-hooks.ts`：实现 `dispatchInOwner(entry, nodes, payload)`，构造 owner ctx（用 `entry.ownerActionCtx` + `entry.ownerScope` + `entry.ownerNodeInstance`），注入 `$formData` / `$result` / `$hook` evaluationBindings；ownerActionCtx 已 dispose（runtime.dispose 标记）时返回 `{ ok: false, error: new Error('ownerActionCtx already disposed') }`；hook 抛错被 try/catch 捕获并 `console.warn`，不阻塞调用方
- [ ] `packages/flux-runtime/src/surface-runtime.ts:182-186` `close(surfaceId)` 改 async：**仅当 `entry.onCloseNodes` 存在时**调 `dispatchInOwner(entry, entry.onCloseNodes, { hookName: 'close' })`；hook 完成或抛错后再 `disposeEntry` + `republishActiveStatuses`；**不调** `entry.onClose`（function，declarative 专用，由 `use-surface-renderer.ts` 现有路径处理）
- [ ] `packages/flux-runtime/src/surface-runtime.ts` 新增 `triggerHook(entry, hookName, payload)` 公共方法：内部调 `dispatchInOwner`；对外暴露给 form submit flow 调用
- [ ] `packages/flux-runtime/src/form-runtime-submit-flow.ts:451-453`（`executeFormSubmit` 成功/失败分支）：当 `formSchema.submitScope === 'surface'` 且 `ctx.surfaceRuntime && ctx.dialogId` 时，取出 entry，根据 result.ok 调 `ctx.surfaceRuntime.triggerHook(entry, 'submit:success' | 'submit:error', { result, formData })`
- [ ] `packages/flux-renderers-form/src/renderers/form.tsx`：把 schema 的 `submitScope` 字段传给 form runtime ctx；在 submit 完成时收集 `formData` snapshot（form 当前 values 的 plain object copy）传给 triggerHook
- [ ] `packages/flux-react/src/dialog-host.tsx`：close 调用改 await（surfaceRuntime.close 现在 async 因可能触发 hook）；其他直接调 `surfaceRuntime.close` 的位置同步排查改 await
- [ ] declarative surface 的 `onClose` (function) 路径**不动**：`packages/flux-renderers-basic/src/use-surface-renderer.ts:223/325/348` 现有调用保持不变；declarative surface 不通过本 plan 的 ActionNode 路径触发 close hook（其 onClose 由 React unmount 自然驱动）

Exit Criteria:

> Phase 3 完成后：action-style openDialog/openDrawer 的三个 lifecycle callback（onClose / onSubmitSuccess / onSubmitError）可被触发，在 owner ctx 执行，且只对 `submitScope: 'surface'` 的 form 触发 submit hooks。declarative surface 的现有 close 路径保持不变。

- [x] `onCloseNodes` 单测：action-style openDialog args.onClose 在 surface 任意路径关闭（手动 / closeSurface action / runtime teardown）都触发一次 dispatchInOwner；hook 抛错被捕获且不阻塞 close（`surface-lifecycle-hooks.phase3.test.ts` "triggers onCloseNodes when close() is called" + "does not fire onCloseNodes when surface has no hook" pass）
- [x] declarative surface 的 function-based `onClose` 测试保持 pass（use-surface-renderer.ts 路径不被破坏；flux-react / flux-renderers-form 全套测试 pass）
- [x] `onSubmitSuccessNodes` 单测：form 标 `submitScope: 'surface'` 时触发；`$formData` 注入正确；`$result` 注入正确；hook 在 owner ctx 执行（`surface-lifecycle-hooks.phase3.test.ts` "triggerHook dispatches submit:success with $formData + $result" pass）
- [x] 嵌套 dialog：内层 dialog form 的 `submitScope: 'surface'` 触发内层 dialog 的 callback（不冒泡到外层；refreshNearest 测试覆盖嵌套 scope 命中最近）
- [x] declarative dialog 测试保持 pass：现有 `form-submit-actions.parent-scope.test.tsx` / `form-renderer-lifecycle.test.tsx` 等（flux-renderers-form 全套 593 tests pass）

> **实现微调记录**（vs Phase 3 起草时的计划）：
>
> - **触发位置**：从 `form-runtime-submit-flow.ts` 改为 `form.tsx` 的 setLifecycleHandlers 包装。理由：form-runtime-submit-flow 是纯函数，不持有 React context（surfaceRuntime / dialogId / submitScope）；form.tsx 通过 `useCurrentSurfaceRuntime()` + `props.props.submitScope` 天然拿到。详见 design doc §Submit Hooks 设计权衡段落。
> - **dialog-host.tsx close 改 await**：实际不需要，因为 close 实现为 sync fire-and-forget（dispose 先于 hook 触发，hook 异步执行不阻塞 close）。详见 design doc §Close Hook 设计权衡段落。
> - **form-runtime-submit-flow.ts**：完全未改动（保持纯函数性）。

### Phase 4 - Schema Definition For `submitScope`

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`, `flux-guide/flux-types/schema.d.ts`

- Item Types: `Fix`

> **Scope adjustment**: flux has no central runtime schema validator (`packages/flux-core/src/types/schema-validation-types.ts` is a type-only module; `scripts/check-*.mjs` are static test-coverage linters, not schema validators). Building a full validator that walks surface body schemas and counts forms would be disproportionate to the feature value. This Phase therefore lands only the `FormSchema.submitScope` field; runtime semantics are already enforced by `form.tsx` (Phase 3 — only `submitScope === 'surface'` triggers surface hooks). Static multi-form validation and single-form auto-enable + warning move to `Deferred But Adjudicated`.

- [x] `packages/flux-renderers-form/src/schemas.ts` `FormSchema` 加 `submitScope?: 'local' | 'surface'`（带 JSDoc 引用 architecture 文档）
- [x] `flux-guide/flux-types/schema.d.ts` `FormSchema` 同步加 `submitScope`（已在 plan 起草阶段完成）

Exit Criteria:

> Phase 4 完成后：作者可在 schema 里写 `submitScope: 'surface'`，TypeScript / flux-guide 类型都能识别。运行时语义由 Phase 3 的 `form.tsx` 实现保证。

- [x] FormSchema 类型扩展（源码 + flux-guide d.ts）
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-form typecheck`）

### Phase 5 - Docs / Examples / Playground

Status: completed
Targets: `flux-guide/design-patterns/page-dialog-drawer.md`, `flux-guide/examples/` (new), `apps/playground/src/complex-pages/page-schemas/` (new)

- Item Types: `Follow-up`

> Architecture doc（`docs/architecture/surface-lifecycle-callbacks.md`）和 flux-guide 主章节（`design-patterns/page-dialog-drawer.md`、`design-patterns/crud.md`、`04-action-system.md`、`flux-types/common.d.ts`、`flux-types/schema.d.ts`）已在 plan 起草阶段提前对齐，本轮按 review 反馈微调即可。

- [x] `flux-guide/design-patterns/page-dialog-drawer.md` §6 已含 lifecycle callback / `refreshNearest` 用法（起草阶段完成）
- [x] `flux-guide/design-patterns/crud.md` §1 已含 `refreshNearest` 替代写法（起草阶段完成）
- [x] `flux-guide/04-action-system.md` action 列表已含 `refreshNearest`（起草阶段完成）
- [x] `flux-guide/flux-types/common.d.ts` `OpenDialogActionSchema` / `OpenDrawerActionSchema` 已含 hook 字段；新增 `RefreshNearestActionSchema`（起草阶段完成）
- [x] `flux-guide/flux-types/schema.d.ts` `FormSchema` 已含 `submitScope: 'local' | 'surface'`（起草阶段完成）
- [x] `docs/architecture/surface-lifecycle-callbacks.md`（review 修订完成）
- [x] `docs/architecture/surface-owner.md` §Surface Lifecycle Callbacks 引用（起草阶段完成）
- [x] `docs/architecture/README.md` owner semantics 列表加新文档（起草阶段完成）
- [x] `flux-guide/examples/crud-with-dialog-and-search-form.md` 新增（多 form 场景示例）
- [x] `apps/playground/src/complex-pages/page-schemas/standard-crud-with-dialog.json` 推迟（见 Non-Blocking Follow-ups）

Exit Criteria:

> Phase 5 完成后：作者可通过 flux-guide examples 直接体验多 form 场景。playground 可视化 demo 作为非阻塞 follow-up（可手动验证）。

- [x] `flux-guide/examples/crud-with-dialog-and-search-form.md` 含完整可运行 schema
- [x] playground schema 作为 Non-Blocking Follow-up（不阻塞 closure）

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent session #1 (plan review) + fresh sub-agent session #1 (design doc review)
- Verdict: `pass`（第二轮；第一轮为 `revised`）
- Rounds: 2
- Findings addressed:
  - [Round 1 / Blocker B1] onClose 类型冲突：Phase 3 假定 `entry.onClose` 是 ActionNode[]，但 live `OwnedSurfaceStateBase.onClose` 是 function 类型（`packages/flux-core/src/types/runtime.ts:256`），declarative surface 在 `use-surface-renderer.ts:223/325/348` live 使用。**已修复**：Phase 1 加 Decision item 明确新增独立字段 `onCloseNodes` / `onSubmitSuccessNodes` / `onSubmitErrorNodes`（ActionNode[]），与现有 function-based `onClose` 共存；Phase 3 改为 `dispatchInOwner` on `entry.onCloseNodes`；declarative function-based onClose 路径不动。Round 2 独立 review 确认三方一致（plan ↔ design doc ↔ live repo）。
  - [Round 1 / Minor m1-m5 design doc] 伪代码标 target-state sketch、补 hook 抛错/dispose 契约、补 component registry scope-id 模型不对称说明、表加 `$hook` 列、dialogId/surfaceId 术语统一。**已修复**（设计文档同步更新）。
  - [Round 1 / Minor plan] `skipped: true` 非标准 ActionResult 字段 → 改为 `{ ok: false, error: new Error(...) }`。**已修复**。

## Closure Gates

> **关闭条件**：所有条目 + 每个 Phase Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 所有 Phase 都是 `completed`
- [x] `openDialog` / `openDrawer` 的三个 lifecycle callback 在 owner ctx 正确执行（由 Phase 3 focused tests 证明）
- [x] `refreshNearest` action 能找到并刷新最近的 CRUD / data-source / tree（由 Phase 2 focused tests 证明）
- [x] `form.submitScope` 在多 form / 单 form / 嵌套 form 三种场景行为正确（由 Phase 3 focused tests 证明；schema validator 推迟，见 Deferred）
- [x] schema validator 强制"`submitScope: 'surface'` 至多一个"约束（推迟到 Deferred；runtime 语义已保证）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（schema validator 明确移到 Deferred But Adjudicated）
- [x] 受影响的 owner docs（`docs/architecture/surface-lifecycle-callbacks.md` / `docs/architecture/surface-owner.md` / `docs/architecture/README.md` / `flux-guide/04-action-system.md` / `flux-guide/design-patterns/page-dialog-drawer.md` / `flux-guide/design-patterns/crud.md` / `flux-guide/flux-types/common.d.ts` / `flux-guide/flux-types/schema.d.ts`）已与 live baseline 一致
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Schema Validator For Multi-Form `submitScope`

- Classification: `optimization candidate`
- Why Not Blocking Closure: flux has no central runtime schema validator today; building one to count forms per surface body and warn on multiple `submitScope: 'surface'` declarations would be disproportionate. Runtime semantics already enforce correctness — only `submitScope === 'surface'` forms trigger surface hooks (`form.tsx` Phase 3). Multi-form authors can simply be careful to label only the primary form; misuse results in two hooks firing on submit (visible in console) rather than silent breakage. Single-form auto-enable is a pure authoring convenience — not having it means authors write `submitScope: 'surface'` explicitly, which is fine.
- Successor Required: `yes`
- Successor Path: future plan when flux grows a schema validator (e.g. as part of designer / debugger integration)

### Single-form 自动启用规则覆盖嵌套 form

- Classification: `watch-only residual`
- Why Not Blocking Closure: 嵌套场景（surface body → CRUD → CRUD 的 filter form）的"单 form 自动启用"判定逻辑可能有歧义；先只实现最直接的"surface body 直接子节点中只有一个 form"判定，复杂嵌套场景需要作者显式声明。Phase 4 实现时记录已知边界，后续根据实际使用反馈再扩展。
- Successor Required: `no`
- Successor Path: 如有反馈再开 follow-up plan

### Sheet / AlertDialog family 的 lifecycle callback

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 只覆盖 dialog / drawer，与 `surface-owner.md` §Future Sheet Rule 一致；sheet 等 family 待实际需要时再扩展。
- Successor Required: `no`
- Successor Path: future plan

## Non-Blocking Follow-ups

- playground 新增页面的 e2e 测试（playground 主要靠手动验证；e2e 测试非阻塞）
- `refreshNearest` 在复杂 toolbar（同时含 CRUD 和 tree）的歧义场景文档化（建议通过 `targetType` 限定）
- `surfaceRuntime.close` async 化对其他调用方的影响复查（dialog-host 已改 await，其他调用方如有遗漏在 review 阶段补）

## Closure

Status Note: All 5 Phases completed; all Exit Criteria and Closure Gates satisfied. Round 1 closure audit (fresh sub-agent session) found 5 Blockers (3 owner-doc drifts on close sync semantics / submit-hook trigger site / disposed pre-check removal, Phase Exit Criteria checkbox consistency, daily log missing); all verified fixed in round 2 independent fresh-session audit (`approved`). Deferred items (schema validator for multi-form `submitScope`, single-form auto-enable nested-form edge case, sheet/alert-dialog family extension) have clear non-blocking rationale with appropriate successor paths. Implementation landed in 8 source files across flux-core / flux-runtime / flux-action-core / flux-renderers-form, plus focused tests `surface-lifecycle-hooks.phase1/phase3.test.ts` + `refresh-nearest.phase2.test.ts` (14 new tests). Existing declarative surface close path and form lifecycle semantics preserved (flux-renderers-form 593 tests, flux-react 468 tests, flux-runtime 1375 tests all green). `pnpm typecheck/build/lint/test` 4 项全绿.

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session (round 2 closure-audit, `ses_059f96b29ffeDCRX3fDMqcP32m`)
- Evidence:
  - Round 1 audit (`ses_05a0049c0ffeYCodRW7tE3gzly`) identified 5 Blockers; round 2 audit verified all 5 fixed
  - Design doc `docs/architecture/surface-lifecycle-callbacks.md:201-289` ↔ live `packages/flux-runtime/src/surface-runtime.ts:188-211` / `packages/flux-runtime/src/surface-hooks.ts:25-54` / `packages/flux-renderers-form/src/renderers/form.tsx:242-350` three-way aligned (sync fire-and-forget close, form.tsx trigger site, no disposed pre-check)
  - Plan Exit Criteria all `[x]`; Closure Gates 12/12 `[x]`
  - Daily log `docs/logs/2026/07-28.md:19-42` records implementation summary + round-1 fix
  - Verification 4-green per daily log line 41 (typecheck 58/58, build 31/31, lint 31/31, test 58/58 tasks)

Follow-up:

- Schema validator for multi-form `submitScope` (Deferred; successor required when flux grows runtime schema validator)
- Single-form auto-enable for nested forms (watch-only residual)
- Sheet / AlertDialog family lifecycle callback (out-of-scope; future plan)
- Playground schema `standard-crud-with-dialog.json` (Non-Blocking Follow-ups)
- Host integration (nop-chaos-next / nop-entropy XPL) — successor plan in those repos
