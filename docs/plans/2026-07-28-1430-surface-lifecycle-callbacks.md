# Surface Lifecycle Callbacks And Owner-Scoped Refresh

> Plan Status: draft
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

| 可测场景                                               | 触发                                                       | 行为                                                                                                                                              | 可重试 | 用户可见表现                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `refreshNearest` 找不到 target（`notFound: 'silent'`） | dialog 内提交但 owner scope 链无 CRUD / data-source        | `{ ok: true, data: { found: false } }`                                                                                                            | 否     | 无 toast，无错误日志；callback 链继续                              |
| `refreshNearest` 找不到 target（`notFound: 'error'`）  | 同上                                                       | `{ ok: false, error: Error('refreshNearest found no refreshable target') }`                                                                       | 否     | 走 action dispatcher 默认 error notify（toast 显示 error message） |
| `onSubmitError` 触发但 ajax 默认 toast 也触发          | ajax 失败 + surface 配了 `onSubmitError`                   | ajax 默认 error toast（来自 `messages.failed` 或后端 msg）触发一次；`onSubmitError` hook 执行副作用                                               | 否     | toast 显示后端 msg 一次 + hook 副作用执行                          |
| 多个 form 同时标 `submitScope: 'surface'`              | schema 编译                                                | schema validation error，编译失败                                                                                                                 | 否     | schema 校验错误信息                                                |
| `triggerHook` 内 action 抛错                           | hook 内 action 执行失败                                    | hook dispatch 失败被 `dispatchInOwner` 捕获；走默认 error notify；不阻塞后续 surface close 流程                                                   | 否     | toast 显示错误；surface 关闭流程继续                               |
| `surfaceRuntime.close` 内 `onClose` hook 抛错          | close 时 hook 失败                                         | hook 错误捕获；entry 仍然 dispose；republishActiveStatuses 仍执行                                                                                 | 否     | toast 显示错误；surface 仍关闭                                     |
| `ownerActionCtx` 已 dispose（owner runtime teardown）  | surface 仍在打开但 owner 已 teardown（理论不该发生但防御） | `dispatchInOwner` 检测 ownerActionCtx.runtime 已 dispose，跳过 dispatch 返回 `{ ok: false, error: new Error('ownerActionCtx already disposed') }` | 否     | 无可见表现；console.warn 一条                                      |

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

Status: planned
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

- [ ] `SurfaceEntry` 在 unit test 中可读到 `ownerActionCtx.runtime` / `ownerActionCtx.componentRegistry` 等字段（focused test 验证 open 后字段非空）
- [ ] openDialog args 里写 `onClose: {...}` / `onSubmitSuccess: {...}` / `onSubmitError: {...}` 时，编译后的 action node 数组通过 `entry.onCloseNodes` / `entry.onSubmitSuccessNodes` / `entry.onSubmitErrorNodes` 可读
- [ ] declarative surface 测试保持 pass：现有 `use-surface-renderer.ts` 的 `onClose` (function) 调用路径不被破坏（`runtime-dialogs-scope.dialog-state.test.ts` 等保持绿）
- [ ] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-core typecheck` + `pnpm --filter @nop-chaos/flux-runtime typecheck`）

### Phase 2 - `refreshNearest` Action（方案 B）

Status: planned
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

- [ ] `refreshNearest` 单测覆盖：同 scope 命中 CRUD / data-source / tree；沿 parent 链向上命中；嵌套 scope 命中最近；找不到 target 时 silent 返回 `{ ok: true, data: { found: false } }`；找不到 target 且 `notFound: 'error'` 返回 `{ ok: false }`
- [ ] `refreshNearest` 单测覆盖：`targetType: 'crud'` 跳过 data-source；`targetType: 'data-source'` 跳过 CRUD
- [ ] `findFirstInScope` 单测：找到第一个匹配；空 bucket 返回 undefined
- [ ] 现有 `refreshSource` / `refreshTable` / `component:refresh` 测试保持 pass

### Phase 3 - Surface Lifecycle Hooks Triggering（方案 A）

Status: planned
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

- [ ] `onCloseNodes` 单测：action-style openDialog args.onClose 在 surface 任意路径关闭（手动 / closeSurface action / runtime teardown）都触发一次 dispatchInOwner；hook 抛错被捕获且不阻塞 close
- [ ] declarative surface 的 function-based `onClose` 测试保持 pass（use-surface-renderer.ts 路径不被破坏）
- [ ] `onSubmitSuccessNodes` 单测：form 标 `submitScope: 'surface'` 时触发；不标时不触发；`$formData` 注入正确；`$result` 注入正确；hook 在 owner ctx 执行（写 owner scope 的 path 验证）
- [ ] `onSubmitErrorNodes` 单测：form 标 `submitScope: 'surface'` + ajax 失败时触发；ajax 默认 error toast 仍触发一次（不抑制）；hook 副作用执行
- [ ] 嵌套 dialog：内层 dialog form 的 `submitScope: 'surface'` 触发内层 dialog 的 callback（不冒泡到外层）
- [ ] declarative dialog 测试保持 pass：现有 `form-submit-actions.parent-scope.test.tsx` / `form-renderer-lifecycle.test.tsx` 等

### Phase 4 - Schema Validation For `submitScope`

Status: planned
Targets: `packages/flux-core/src/schema-validator/` 或同级校验逻辑

- Item Types: `Fix`

- [ ] 定位现有 schema validator 入口（grep `validateSchema` / `schema-file-validator`）；确定校验 hook 形态
- [ ] 实现规则 A（硬约束）：同一 surface body 内多个 form 标 `submitScope: 'surface'` → schema validation error
- [ ] 实现规则 B（启发式 + warning）：surface body 内只有一个 form 且未显式设 `submitScope` 时，编译期自动视为 `'surface'`，输出 warning（建议显式声明）
- [ ] "surface body" 的边界定义：最近的 `type: 'dialog'` / `type: 'drawer'` 节点的 `body` 区域；嵌套 dialog 各自独立判定

Exit Criteria:

> Phase 4 完成后：schema 编译期保证 `submitScope` 的语义安全（不会出现多个 form 触发同一 callback 的歧义场景）。

- [ ] schema validator 单测：多个 `submitScope: 'surface'` form 报错
- [ ] schema validator 单测：单个未标 `submitScope` form 自动启用 + warning 输出
- [ ] schema validator 单测：嵌套 dialog 各自独立计数（外层 dialog 一个 + 内层 dialog 一个 = 合法）

### Phase 5 - Docs / Examples / Playground

Status: planned
Targets: `flux-guide/design-patterns/page-dialog-drawer.md`, `flux-guide/examples/` (new), `apps/playground/src/complex-pages/page-schemas/` (new)

- Item Types: `Follow-up`

- [ ] `flux-guide/design-patterns/page-dialog-drawer.md` §6 增加"多 form 场景"小节，给出 `submitScope: 'surface'` 在主 form 上的标注范例
- [ ] `flux-guide/examples/crud-with-dialog-and-search-form.md` 新增：完整的"列表 + dialog 内 CRUD + 搜索 form + 编辑 form"示例 schema
- [ ] `apps/playground/src/complex-pages/page-schemas/standard-crud-with-dialog.json` 新增：可视化 demo，含三种场景（单 form dialog / 多 form dialog / 嵌套 dialog）
- [ ] `apps/playground/src/complex-pages/complex-pages-model.ts` 把新 schema 注册到 playground 导航
- [ ] `docs/architecture/surface-lifecycle-callbacks.md` 根据 review 反馈微调（如独立子 agent review 提出 Major 以上问题）

Exit Criteria:

> Phase 5 完成后：作者可以通过 flux-guide examples 和 playground 直接体验三种典型场景。

- [ ] `flux-guide/examples/crud-with-dialog-and-search-form.md` 含完整可运行 schema
- [ ] playground 启动后能在导航找到 `Standard CRUD With Dialog` 页面，三个场景都可正常交互（手动验证 + 截图记录到 daily log）

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立子 agent 填写。

- Reviewer / Agent: <<fresh session id>>
- Verdict: <<pass | pass-with-minors | revised | degraded>>
- Rounds: <<审查轮数，≤2>>
- Findings addressed: <<每条已处理的 Blocker/Major 一行；Minor 不记>>

## Closure Gates

> **关闭条件**：所有条目 + 每个 Phase Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] 所有 Phase 都是 `completed`
- [ ] `openDialog` / `openDrawer` 的三个 lifecycle callback 在 owner ctx 正确执行（由 Phase 3 focused tests 证明）
- [ ] `refreshNearest` action 能找到并刷新最近的 CRUD / data-source / tree（由 Phase 2 focused tests 证明）
- [ ] `form.submitScope` 在多 form / 单 form / 嵌套 form 三种场景行为正确（由 Phase 3 + Phase 4 focused tests 证明）
- [ ] schema validator 强制"`submitScope: 'surface'` 至多一个"约束（由 Phase 4 focused tests 证明）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs（`docs/architecture/surface-lifecycle-callbacks.md` / `docs/architecture/surface-owner.md` / `docs/architecture/README.md` / `flux-guide/04-action-system.md` / `flux-guide/design-patterns/page-dialog-drawer.md` / `flux-guide/design-patterns/crud.md` / `flux-guide/flux-types/common.d.ts` / `flux-guide/flux-types/schema.d.ts`）已与 live baseline 一致
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

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

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
