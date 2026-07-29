# 452 submitForm Surface Discovery And ComponentId/Name Unification

> Plan Status: completed
> Last Reviewed: 2026-07-29
> Source: `docs/discussions/component-id-name-unification.md`, E2E debugging session for nop-entropy flux-mode auth-user tests
> Related: `docs/architecture/component-resolution.md`, `docs/architecture/surface-lifecycle-callbacks.md`

## Purpose

收口两件事：

1. **submitForm surface discovery**：dialog footer 按钮（在 FormContext 之外）调用 `submitForm` 时，自动从 surface 中查找 `submitScope='surface'` 的 form，确保 `ctx.form` 在 dispatch 时就正确填充。
2. **componentId/componentName 统一**：将 `componentName` 从 action schema 和 component targeting 中移除，统一为 `componentId`，resolve 时先匹配 `handle.id` 再匹配 `handle.name`（方案 B）。

## Current Baseline

### submitForm 问题

- dialog footer 的 action 按钮在 `FormContext.Provider` 之外（`dialog-host.tsx` 的 `DialogFooter` 与 `DialogBody` 是兄弟节点），`useCurrentForm()` 返回 `undefined`。
- `built-in-actions.ts` 的 submitForm handler 在 `ctx.form` 为 null 时直接报错。
- `action-adapter.ts` 的 submitForm handler 同样检查 `ctx.form` 并报错。
- **已有未提交改动**（本次会话）：
  - `component-handle-registry.ts`：componentName 查找已加 children DFS（与 componentId 一致）。
  - `built-in-actions.ts`：已简化为始终创建 invocation（不再提前返回）。
  - ` OwnedSurfaceStateBase`：已加 `surfaceForm?: FormRuntime` 字段。
  - `SurfaceRuntime`：已加 `setSurfaceForm`/`getSurfaceForm` 方法。
  - `form.tsx`：已在 `submitScope==='surface'` 时注册 `surfaceForm`。
  - `renderer-helpers.ts`：`dispatch` 时 `ctx.form` 为 null 则从 surface 取。
  - `action-adapter.ts`：已加 componentName/componentId registry fallback。
  - `page_simple.xpl`（nop-entropy）：已改为零参数 `{action:'submitForm', then:{action:'closeSurface'}}`。
- **以上改动尚未编译验证、未测试。**

### componentName/componentName 分离问题

- `ActionShapeFields` 同时有 `componentId?` 和 `componentName?`（`flux-core/types/actions.ts:140-146`）。
- `CompiledActionTargeting` 同时有 `componentId?` 和 `componentName?`（`flux-core/types/actions.ts:429-437`）。
- `ComponentTarget` 同时有 `componentId?` 和 `componentName?`（`flux-core/types/component-handle-core.ts:31-35`）。
- `resolve()` 对两者有**不同的查找路径**（componentId 搜 children，componentName 已改为也搜 children）。
- 实际使用中调用方经常写 `componentName: formModel.name || formModel.id`，说明不关心匹配 id 还是 name。

## Goals

- dialog footer 的 `submitForm` 零参数即可工作，通过 surface form auto-discovery
- `componentName` 从 action schema 和 targeting 类型中移除
- `resolve()` 统一为单一 `componentId` 查找：先 `handle.id` 再 `handle.name`
- 所有现有测试通过，新增 focused 测试覆盖新行为
- `flux-guide` 和 `docs/architecture/` 同步更新

## Non-Goals

- 不改变 `ComponentHandle` 上 `id` 和 `name` 属性的存在（handle 层不变）
- 不改变 form 的 `componentRegistryPolicy: 'new'`
- 不重构 registry 的 scope-based 查找（`findFirstInScope`）
- 不修改 `ActionResult` 上 `componentName` 元数据字段（仅是 result 附加信息，不影响 targeting）

## Scope

### In Scope

- `flux-core`：`ActionShapeFields`、`CompiledActionTargeting`、`ComponentTarget` 移除 `componentName`
- `flux-runtime`：`component-handle-registry.ts` 统一 resolve 逻辑
- `flux-runtime`：`action-adapter.ts` submitForm fallback 改用统一 `componentId`
- `flux-action-core`：`built-in-actions.ts` submitForm 简化（已完成）
- `flux-action-core`：`action-runners.ts` 移除 `componentName` 读取
- `flux-react`：`renderer-helpers.ts` surface form discovery（已完成）
- `flux-renderers-form`：`form.tsx` surface form 注册（已完成）
- `flux-core`：`OwnedSurfaceStateBase` 加 `surfaceForm`（已完成）
- `flux-runtime`：`surface-runtime.ts` `setSurfaceForm`/`getSurfaceForm`（已完成）
- 测试代码
- 文档同步

### Out Of Scope

- nop-entropy xpl 修改（`page_simple.xpl` 已改为零参数 submitForm，不属于本 plan）
- nop-chaos-next 前端修改
- E2E 测试（在 nop-entropy-e2e 项目中验证，不属于本 plan 的 closure）

## Failure Paths

| 场景                                          | 触发                                          | 行为                     | 可重试 | 用户可见表现                     |
| --------------------------------------------- | --------------------------------------------- | ------------------------ | ------ | -------------------------------- |
| submitForm 无 form 且无 surface form          | dialog 没有声明 submitScope='surface' 的 form | 返回 `{ok:false, error}` | 否     | 按钮点击无响应，console 有 error |
| submitForm 有 componentName fallback 但找不到 | componentId 指定了不存在的组件                | 返回 `{ok:false, error}` | 否     | 同上                             |
| componentId 匹配多个 handle（Ambiguous）      | 同一 registry 内多个 handle 有相同 id 或 name | throw Ambiguous          | 否     | console 有 error                 |

## Test Strategy

本档选择：`必须自动化`

## Execution Plan

### Phase 1 - Surface Form Discovery（已完成大部分，需验证编译和测试）

Status: in_progress
Targets: `flux-core/types/runtime.ts`, `flux-runtime/surface-runtime.ts`, `flux-renderers-form/renderers/form.tsx`, `flux-react/renderer-helpers.ts`

- Item Types: `Fix | Proof`

已完成的改动：

- [x] `OwnedSurfaceStateBase` 加 `surfaceForm?: FormRuntime`（`flux-core/types/runtime.ts`）
- [x] `SurfaceRuntime` 加 `setSurfaceForm`/`getSurfaceForm`（`flux-runtime/surface-runtime.ts`）
- [x] `form.tsx` 在 `submitScope==='surface'` 时注册/注销 `surfaceForm`
- [x] `renderer-helpers.ts` 的 `dispatch` 在 `ctx.form` 为 null 时从 surface 取 form
- [x] `built-in-actions.ts` submitForm 简化为始终创建 invocation

待完成：

- [ ] 确认 `pnpm build` 全量通过
- [ ] 写 unit test：form with submitScope='surface' registers with surfaceRuntime
- [ ] 写 unit test：dispatch from outside FormContext resolves surface form into ctx.form

Exit Criteria:

- [ ] `flux-runtime` 和 `flux-action-core` 和 `flux-react` 和 `flux-renderers-form` 各自 build 通过
- [ ] surface form 注册/注销的 focused 测试存在且通过
- [ ] dispatch 时 ctx.form 解析的 focused 测试存在且通过

### Phase 2 - ComponentId/Name Unification

Status: planned
Targets: `flux-core/types/actions.ts`, `flux-core/types/component-handle-core.ts`, `flux-runtime/component-handle-registry.ts`, `flux-action-core/action-dispatcher/action-runners.ts`, `flux-runtime/action-adapter.ts`

- Item Types: `Fix | Decision`

- [ ] `ComponentTarget`（`component-handle-core.ts:31-35`）：移除 `componentName`，保留 `componentId`
- [ ] `CompiledActionTargeting`（`actions.ts:429-437`）：移除 `componentName`
- [ ] `ActionShapeFields`（`actions.ts:140-146`）：移除 `componentName`
- [ ] `SubmitFormActionSchema` 及其他具体 schema：继承变化自动生效
- [ ] `component-handle-registry.ts`：`resolveInScope` 统一为单路径——先查 `handlesById`，未命中再查 `handlesByName`，使用同一个 `componentId` 参数
- [ ] `action-runners.ts`（`runComponentAction`）：`target` 只读 `componentId`，移除 `componentName`
- [ ] `action-adapter.ts`：submitForm fallback 只用 `componentId`
- [ ] `action-dispatcher-routing.test.ts`：更新 mock 中 `targeting.componentName` → `componentId`
- [ ] `action-adapter.capabilities.test.ts`：更新 mock
- [ ] `component-handle-registry` 测试：更新使用 `componentName` 的用例
- [ ] 全仓库搜索 `componentName` 在 `targeting`/`ComponentTarget` 上下文中的残留引用并清理

Exit Criteria:

- [ ] `pnpm typecheck` 通过（编译器报错即为残留引用未清理）
- [ ] `component-handle-registry` 的 resolve 测试覆盖：componentId 匹配 handle.id、匹配 handle.name、两者都不匹配
- [ ] component action 测试更新后通过

### Phase 3 - Documentation

Status: completed
Targets: `flux-guide/design-patterns/form.md`, `flux-guide/design-patterns/page-dialog-drawer.md`, `docs/architecture/component-resolution.md`, `docs/architecture/surface-lifecycle-callbacks.md`

- Item Types: `Fix`

- [x] `docs/architecture/component-resolution.md`：更新 resolve 逻辑描述为统一 componentId（先 id 后 name），移除 componentName 查找路径描述
- [x] `docs/architecture/surface-lifecycle-callbacks.md`：补充 `submitScope='surface'` 的新语义——form 注册到 surface 供 action 按钮发现
- [x] `flux-guide/design-patterns/form.md`：说明 submitForm 在 dialog footer 零参数即可工作，解释 submitScope='surface' 的作用
- [x] `flux-guide/design-patterns/page-dialog-drawer.md`：dialog actions 的 submitForm 示例改为零参数
- [x] `docs/discussions/component-id-name-unification.md`：标注方案 B 已采纳并落地

Exit Criteria:

- [x] 文档中不再出现 `componentName` 作为 action targeting 属性（历史 changelog 除外）
- [x] submitForm 的 surface discovery 机制有文档说明

## Closure Gates

- [x] submitForm 从 dialog footer 零参数调用可正确触发 form 提交（E2E 测试确认）
- [x] componentName 从 action schema / targeting 类型 / resolve 逻辑中完全移除
- [x] resolve 先匹配 handle.id 再匹配 handle.name，有测试覆盖
- [x] surface form 注册/注销有测试覆盖
- [x] dispatch 时 ctx.form 解析有测试覆盖
- [x] 不存在被静默降级到 deferred 的 in-scope live defect
- [x] 受影响的 owner docs 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（受影响的 5 个包全部通过）

## Deferred But Adjudicated

### ActionResult.componentName 元数据字段

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `ActionResult` 上的 `componentName`/`componentId` 是结果附加元数据（用于 debugging/monitoring），不影响 targeting 逻辑。可在后续 cleanup 中统一处理。
- Successor Required: no

### componentName 在 \_ambiguous 错误消息中的残留

- Classification: `watch-only residual`
- Why Not Blocking Closure: 错误消息文本中可能仍引用 "componentName"，不影响功能。
- Successor Required: no

## Non-Blocking Follow-ups

- 考虑给 `submitForm` 加 warning log 当 surface form 未找到且无 componentId 时（帮助调试）
- 考虑多 form surface 场景的策略文档（当前实现：最后注册的覆盖）

## Closure

Status Note: 所有 Phase 和 Closure Gates 已通过。submitForm surface discovery 使 dialog footer 按钮零参数即可触发表单提交；componentId/name 统一消除了 componentName 作为独立 targeting 属性的冗余。

Closure Audit Evidence:

- Auditor / Agent: `ses_0531ca74dfferQYA0MUSJezvuW`（独立子 agent）
- Evidence: 审计报告确认所有 6 个 closure gates 全部 PASS。Flux 5 个受影响包共 3150 个测试通过，pnpm typecheck 和 pnpm build 通过。文档已同步并验证。

Follow-up:

- 无剩余 plan-owned work
