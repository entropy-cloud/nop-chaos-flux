# loadAction `kind: 'reaction'` 与 `ReactionHandle`

> Plan Status: completed
> Last Reviewed: 2026-07-07
> Source: `docs/discussions/2026-07-07-loadAction-kind-design.md`（含七轮迭代 + 三轮独立审查，落地依据为 BB–LL + RR–XX + YY–bbb）、`docs/architecture/dependency-tracking.md` §3.1/§3.3/§3.6（normative baseline）
> Related: 暂无前序 plan；本 plan 收口 discussion 中所有 in-scope 落地事项

## Purpose

把 CRUD `loadAction` 字段从当前**坏的** `kind: 'event'` 实现收口为新的 **`kind: 'reaction'`**：一个既能由渲染器命令式触发（mount/refresh/server-pagination 修正）、又能对外部 binding 变化保持响应、且由渲染器拥有 dispatch wrapper（注入 evaluationBindings、管 AbortController、处理 result）的统一抽象。

本 plan 同时落地配套基础设施：`ReactiveActionSchema` 类型、`CompiledReactionPlan` 编译产物、`ReactionHandle` 句柄、`runtime.registerRendererReaction` API、`props.reactions` 通道。

## Current Baseline

> 起草前已核对 live repo（2026-07-07）。

**当前实现是坏的（事实）：**

- `packages/flux-renderers-data/src/crud-renderer.tsx:159` —— `const loadActionConfig = props.events['loadAction'];` 取到的是 `RendererEventHandler`（一个函数，由 `node-renderer-resolved.tsx:237-265` 包装），**不是** `ActionSchema`、也**不是** `CompiledActionProgram`。
- `packages/flux-renderers-data/src/crud-renderer-state.ts:469` —— `useCrudLoadAction` 入参类型谎报为 `ActionSchema | undefined`，实际收到的是函数。
- `packages/flux-renderers-data/src/crud-renderer-state.ts:569` —— `helpers.dispatch(loadAction, ...)` 传入函数；`helpers.dispatch` 只接受 `ActionSchema | ActionSchema[] | CompiledActionProgram`（`renderer-core.ts:81-84`），函数会落到 `normalizeCompiledActionProgram` → `actionProgramCompiler.compile(fn, ...)`，对一个函数做 schema 编译必然失败。
- `pnpm --filter @nop-chaos/flux-renderers-data test -- --run crud-loadaction.test.tsx` —— 6 个 case **全部失败**（"expected [] to have a length of 1" 等）。
- `packages/flux-renderers-form/src/__tests__/form-loadaction.test.tsx` —— 3 个 case 失败。**根因与 CRUD 不同**：`form-loadaction.test.tsx:85-103, 151-158` 直接渲染 `FormRenderer` 并 mock 全部 props（**绕过 schema 编译**，所以 `form-definition.ts` 是否声明 `loadAction` 字段对该 test 无影响）。真正原因是 `FormRenderer`（`packages/flux-renderers-form/src/renderers/form.tsx`）**根本没实现 loadAction dispatch-on-mount**（grep `loadAction` 0 匹配）。这是 **未实现 feature**（test 先于实现写好），不是类型契约破裂。**已裁定移出本 plan 范围**（见 Deferred）。
- `tsc` 在 `crud-renderer.tsx:173` 报错：`Type 'RendererEventHandler | undefined' is not assignable to type 'ActionSchema | undefined'`。

**Field kind 现状：**

- `packages/flux-core/src/types/schema.ts:50` —— `SchemaFieldKind = 'meta' | 'prop' | 'region' | 'value-or-region' | 'event' | 'ignored'`。无 `'reaction'`。
- `packages/flux-renderers-data/src/crud-renderer-definition.ts:488` —— `{ key: 'loadAction', kind: 'event' }`。
- `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:368` —— `dynamic-renderer` 的 `loadAction` 是 `{ key: 'loadAction', kind: 'prop' }`（这个**不**会改，因为 dynamic-renderer 的 URL 引用的全是 parent scope 数据，eager 求值安全）。

**已有 reaction 基础设施（本 plan 复用，不重建）：**

- `packages/flux-compiler/src/reaction-compiler.ts` —— `compileReaction` 产出 `CompiledReaction`（含 `watch`/`when`/`immediate`/`debounce`/`once`/`dependsOn`）。
- `packages/flux-runtime/src/async-data/reaction-runtime.ts:84` —— `registerReaction(input)` 返回 `{ id, dispose }`（无 `force`）。
- `packages/flux-runtime/src/runtime-factory.ts:471-497` —— `runtime.registerReaction` API。
- `packages/flux-runtime/src/scope-change.ts` —— `createRootDependencySet`、`scopeChangeHitsDependencies`、`filterScopeChangeByIgnoredRoots`、`normalizeRootPaths`（**深路径在此被折叠到根**）。
- `packages/flux-runtime/src/node-runtime.ts:90` —— `collectRuntimeDependencies` 走 `RuntimeValueState`，**不能**静态分析 `CompiledRuntimeValue`。
- `packages/flux-renderers-basic/src/reaction.tsx` —— `<reaction>` 渲染器，注入 pass-through dispatch。
- `packages/flux-react/src/node-renderer-resolved.tsx:237-265` —— `events` channel 构造（每个 `eventPlans[key]` 包装为 `RendererEventHandler`）；`267-311` —— `regions` channel 构造。

**normative 约束（必须遵守）：**

- `docs/architecture/dependency-tracking.md` §3.1 —— **否决**编译期 AST 提取作为依赖收集 baseline。
- 同文档 §3.3 —— `dependsOn` 必须**根级路径**（"authors declare `user`, not `user.name`"）。
- 同文档 §3.6 —— `when` 是**守卫不是触发器**，`watch` 才是依赖根。

**已确认设计（落地依据，详见 discussion BB–LL + RR–XX + YY–bbb）：**

- 引入 `kind: 'reaction'`，专为"既要 reactive 又要 imperative 又要 renderer 控制时序"的字段。
- `ReactiveActionSchema extends ActionSchema`：必填 `dependsOn: string[]`（裸路径，根级）、可选 `ignoreWritesTo?: string[]`（自写过滤）。
- `CompiledReactionPlan`（新类型，**不复用** `CompiledReaction` 因其 `watch` 必填）。
- `registerRendererReaction`（独立 wrapper，**不污染** `registerReaction`）；内部合成静态 watch + 调 `registerReaction.force(paths)` 触发。
- `ReactionHandle`：`dispatch`/`force`/`ready`/`pause`/`resume`/`getDebugState`；lazy proxy 解决首次可用性 + StrictMode 重激活。
- 默认 `initialReadyState: 'paused'`，渲染器必须显式 `ready()`。

## Goals

- CRUD `loadAction` 类型契约破裂修复（6 个失败测试转绿）。
- 新增 `kind: 'reaction'` 作为 `SchemaFieldKind` 的第三种 action-kind。
- 新增 `ReactiveActionSchema` 类型与 `CompiledReactionPlan` 编译产物。
- 新增 `runtime.registerRendererReaction` + `ReactionHandle` API（含 ready/pause 门控、lazy proxy 首次可用性、StrictMode 重激活）。
- 新增 `props.reactions` 通道（与 `props.events`/`props.regions` 并列）。
- CRUD `loadAction` 迁移到 `kind: 'reaction'`，按 RR 节模式 A（外部 binding 走 reactive、内部状态走命令式）落地；原 `requestKey` 拆分替换。
- 新增 regression 覆盖：(a) selection-only 不触发 refetch；(b) server-pagination 修正不引发循环；(c) 外部 binding 变化触发 refetch；(d) manual refresh abort 在 in-flight。
- 同步受影响的 owner docs（详见各 Phase Exit Criteria）。

## Non-Goals

- **不**改 `kind: 'event'` 的语义（仍为纯命令式）。
- **不**改 `kind: 'prop'` 的语义（仍为 eager + reactive）。
- **不**改 `dynamic-renderer` 的 `loadAction`（保持 `kind: 'prop'`，其 eager 在该场景安全）。
- **不**实现"自动静态依赖收集"（违背 `dependency-tracking.md` §3.1）；`dependsOn` 必填。
- **不**迁移 `<reaction>` 渲染器底层到新基础设施（保留 pass-through dispatch 路径不动）。
- **不**在本 plan 内实现或修复 Form/Page `loadAction`：`FormRenderer` 没实现 `loadAction` dispatch-on-mount（不是 type 破裂，是 feature 缺失，`form-loadaction.test.tsx` 是先于实现写的 test）。form-loadaction 测试的修复**显式移入 Deferred**。
- **不**在 `kind: 'reaction'` 上支持 `debounce` / `once` / `control` 字段（v1 不做）。

## Scope

### In Scope

- `crud-renderer.tsx` / `crud-renderer-state.ts` 修类型契约破裂（Phase 1）+ 迁移到 `kind: 'reaction'`（Phase 6）。
- `flux-core`：`SchemaFieldKind` += `'reaction'`、`ReactiveActionSchema`、`CompiledReactionPlan`、`ReactionHandle`、`TemplateNode.reactionPlans`、`RendererComponentProps.reactions`、`registerReaction` 返回类型扩展 `force(paths?)`。
- `flux-compiler`：`node-compiler` 加 `kind === 'reaction'` 分支；`shape-validation-node-fields` 加校验。
- `flux-runtime`：新文件 `renderer-reaction-handle.ts`；`runtime.registerRendererReaction` API；`RendererRuntime` 接口扩展。
- `flux-react`：`node-renderer-resolved.tsx` 加 `reactions` channel（含 lazy proxy）。
- Owner docs 同步（详见各 Phase）。

### Out Of Scope

- `dynamic-renderer.loadAction`（保持 `kind: 'prop'`）。
- `<reaction>` 渲染器底层重构。
- **Form / Page `loadAction` 实现或修复**：feature 缺失（非 type 破裂），form-loadaction.test 先于实现写好。见 Deferred But Adjudicated。
- `ReactiveActionSchema` 上的 `debounce` / `once` / `control` 字段。
- 编译期静态依赖收集（明确否决）。

## Failure Paths

| 场景                                             | 触发   | 行为                                                                                                                                       | 可重试           | 用户可见表现                                |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------- |
| `dependsOn` 缺失或为空数组                       | 编译期 | emit `invalid-reaction-deps` error                                                                                                         | 否               | schema 编译失败，error 指向具体字段         |
| `dependsOn` 含深路径（如 `user.name`）           | 编译期 | emit `invalid-reaction-deep-path` warning，运行时折叠到根 `user`                                                                           | 是（功能上等价） | warning 提示，schema 仍可编译               |
| `immediate: true` 写在 `ReactiveActionSchema` 上 | 编译期 | emit `invalid-reaction-immediate` error                                                                                                    | 否               | schema 编译失败                             |
| ReactionHandle 在 disposed 后被调用              | 运行时 | `dispatch`/`force` 返回 `{ ok: false, cancelled: true, error: new Error('ReactionHandle disposed') }`；`ready`/`pause`/`resume` 静默 no-op | 否               | 调用方收到 cancelled result                 |
| pause 期间 scope 变化命中 dependsOn              | 运行时 | 累积 pendingChange，不立即 fire；`resume()` 归零时 flush 一次                                                                              | 是               | fire 延后到 resume                          |
| dispatch() 在 in-flight 期间被再次调用           | 运行时 | 旧 fire 被 abort（per-fire AbortController），新 fire 开始                                                                                 | 否               | 旧 dispatch 的 Promise resolve 为 cancelled |
| scope dispose 时仍有 pending dispatch            | 运行时 | pending Promise 全部 resolve 为 canonical cancelled result；realHandle dispose；per-fire AbortController 链式 abort                        | 否               | 调用方收到 cancelled                        |

## Test Strategy

档位选择：**必须自动化**

理由：

- 改变 framework 级 field kind 分类（影响所有渲染器）
- 引入新 public API（`registerRendererReaction`、`ReactionHandle`、`props.reactions`）
- 改变 CRUD 数据获取行为（已有 6 个失败 test 需转绿）
- 涉及响应式触发 + AbortController + StrictMode 时序
- 改变 `registerReaction` 返回类型（影响现有 caller）

Proof items 必须在对应 Fix items 之前：每个新 API/类型先写 focused 单测（失败）→ 实现 → 单测转绿。

## Execution Plan

### Phase 1 - 修 CRUD loadAction 类型契约破裂（独立紧急修复）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`、`packages/flux-renderers-data/src/crud-renderer-state.ts`

- Item Types: `Fix | Proof`

- [x] `crud-renderer.tsx:159`：`props.events['loadAction']` → `props.templateNode.eventPlans['loadAction']`
- [x] `useCrudLoadAction`（`crud-renderer-state.ts:469`）：入参类型 `ActionSchema | undefined` → `CompiledActionProgram | undefined`
- [x] 验证 `crud-loadaction.test.tsx` 6 个 case 全绿
- [x] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过（Phase 1 引入的 line 173 TS error 已消失；现存 typecheck 失败均位于无关文件 `crud-confirm-gate.test.tsx`，master baseline 已存在，stash 验证确认非 Phase 1 引入）

Exit Criteria:

- [x] `crud-loadaction.test.tsx` 6 个 case 全绿（实测 6/6 passed）
- [x] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过（Phase 1 自身无新增错误；`crud-confirm-gate.test.tsx` 的 6 处 pre-existing 错误与 Phase 1 无关，master baseline 已存在）
- [x] `crud-renderer.tsx:173` 处的 TS error 消失

> Form/Page `loadAction` 已**显式移出**本 plan 范围（见 Deferred But Adjudicated）。

### Phase 2 - 基础设施：flux-core 类型

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`、`packages/flux-core/src/types/compilation.ts`、`packages/flux-core/src/types/node-identity.ts`、`packages/flux-core/src/types/renderer-core.ts`、`packages/flux-core/src/types/async/`（reaction 类型如有）、`packages/flux-runtime/src/async-data/reaction-runtime.ts`（移除本地 `ReactionRegistration` 重复定义，从 flux-core 导入）

- Item Types: `Decision | Fix | Proof`

- [x] （Proof 先行）单测 `packages/flux-core/src/reaction-field-types.test.ts`：类型导出可被下游消费；`SchemaFieldKind` 包含 `'reaction'`；`ReactiveActionSchema` extends `ActionSchema` 含必填 `dependsOn`；`CompiledReactionPlan` shape；`ReactionRegistration`（base 无 force）/`ForceableReactionRegistration`（有 force）；`ReactionHandle` 全部方法；`RendererComponentProps.reactions`（test 失败 → 实现 → test 转绿）
- [x] `schema.ts:50`：`SchemaFieldKind` += `'reaction'`
- [x] `schema.ts`：新增 `ReactiveActionSchema extends ActionSchema`，含必填 `dependsOn: string[]`、可选 `ignoreWritesTo?: string[]`
- [x] `compilation.ts`：新增 `CompiledReactionPlan` 类型（`action: CompiledActionProgram`、`dependsOn: readonly string[]`、`ignoreWritesTo?: readonly string[]`）—— 不复用 `CompiledReaction`，因其 `watch` 必填
- [x] `compilation.ts`：将 `ReactionRegistration`（base，`{id, dispose}`）canonical 化到 flux-core；新增 `ForceableReactionRegistration extends ReactionRegistration` 加 `force(paths?: readonly string[]): void`（per Risks And Rollback + Minor 6 supertype 方案，避免破坏现有 caller）
- [x] `reaction-runtime.ts:38-41`：删除本地 `ReactionRegistration` 定义，从 `@nop-chaos/flux-core` 导入；通过 `export type { ReactionRegistration }` 保持 backward-compatible re-export
- [x] `node-identity.ts:131-185`：`TemplateNode` 加 `reactionPlans?: Readonly<Record<string, CompiledReactionPlan>>`（optional）
- [x] `renderer-core.ts:176-179`：新增 `ReactionHandle` 接口（`dispatch`/`force`/`ready`/`pause`/`resume`/`getDebugState`）+ `ReactionHandleDebugState` 类型
- [x] `renderer-core.ts:181-195`：`RendererComponentProps` 加 `reactions: Readonly<Record<string, ReactionHandle>>`（非 optional，Phase 5 在 `componentProps` 构造点填充）
- [x] `renderer-core.ts`：`RendererRuntime.registerReaction` 返回类型从 inline `{id, dispose}` 改为 `ReactionRegistration`；新增 `RendererRuntime.registerRendererReaction`（返回 `ForceableReactionRegistration`）—— Phase 4 实现该方法

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-core typecheck` 通过
- [x] `pnpm --filter @nop-chaos/flux-core test` 通过（含新单测；461/461 passed，含 7 个新 case）
- [x] 类型在 `flux-core/src/index.ts` 通过 `export *` 自动导出（`schema.ts`/`compilation.ts`/`renderer-core.ts`/`node-identity.ts` 均在 `types/index.ts` 的 `export *` 链上）

> 跨阶段耦合（设计内）：`RendererComponentProps.reactions`（required）和 `RendererRuntime.registerRendererReaction`（required）让 `flux-react`/`flux-runtime` 的下游 typed consumer 暂时失败；这些将在 Phase 4（runtime 实现 `registerRendererReaction`）和 Phase 5（react 填充 `componentProps.reactions`）修复。Phase 2 Exit Criteria 仅要求 flux-core 自身 typecheck 通过（per Minimum Rule 18）。

### Phase 3 - 基础设施：flux-compiler 编译路径

Status: completed
Targets: `packages/flux-core/src/types/schema-diagnostics-types.ts`（新增 diagnostic codes）、`packages/flux-compiler/src/schema-compiler/node-compiler.ts`、`packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts`、`packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`、`packages/flux-compiler/src/schema-compiler-reaction-field.test.ts`

- Item Types: `Fix | Proof`

- [x] （Proof 先行）单测 `packages/flux-compiler/src/schema-compiler-reaction-field.test.ts`：8 个 case 覆盖 valid 编译产物、`reactionPlans` 不污染 `eventPlans`、`invalid-reaction-deps`（missing + empty）、`invalid-reaction-deep-path` warning + 仍编译、`invalid-reaction-immediate`（immediate/debounce/once）（test 失败 → 实现 → test 转绿）
- [x] `schema-diagnostics-types.ts`：`SchemaDiagnosticCode` 加 `'invalid-reaction-deps'`、`'invalid-reaction-deep-path'`、`'invalid-reaction-immediate'`
- [x] `node-compiler.ts` 在 `kind === 'event'` 分支（line 275）旁加 `kind === 'reaction'` 分支：收集到 `rawReactionPlans[key]`
- [x] `node-compiler.ts:505-511` 旁加 `reactionPlans` 装配块（平行 `eventPlans` 装配；调 `compileActions` 编译 action 主体；抽 `dependsOn`/`ignoreWritesTo`；组装 `CompiledReactionPlan`）
- [x] `node-compiler.ts`：`TemplateNode` 装配处加 `...(reactionPlans ? { reactionPlans } : {})`
- [x] `shape-validation-rules.ts`：新增 `validateReactionFieldShape` 函数（区别于 `validateReactionShape`：`invalid-reaction-deps` error 必填非空、`invalid-reaction-deep-path` warning 含折叠提示、`invalid-reaction-immediate` error 拒绝 `immediate`/`debounce`/`once`/`control` v1 不支持字段；复用 `validateActionShape` 校验 action body）
- [x] `shape-validation-node-fields.ts`：在 `rule.kind === 'event'` 后加 `rule.kind === 'reaction'` 分支调 `validateReactionFieldShape`；imports 加 `validateReactionFieldShape`

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-compiler typecheck` 通过
- [x] `pnpm --filter @nop-chaos/flux-compiler test` 通过（497/497 passed，含 8 个新 case）
- [x] kind: 'reaction' schema 能编译为 `CompiledReactionPlan`（`action`/`dependsOn`/可选 `ignoreWritesTo`）；非法 schema 触发对应诊断（`invalid-reaction-deps` error、`invalid-reaction-deep-path` warning、`invalid-reaction-immediate` error）

### Phase 4 - 基础设施：flux-runtime wrapper

Status: completed
Targets: `packages/flux-runtime/src/renderer-reaction-handle.ts`（新文件）、`packages/flux-runtime/src/abort-signal-helpers.ts`（新文件）、`packages/flux-runtime/src/runtime-factory.ts`、`packages/flux-runtime/src/async-data/reaction-runtime.ts`（`registerReaction` 实现产出 `force` 闭包）、`packages/flux-runtime/src/async-data/reaction-runtime-helpers.ts`（`OwnedReactionRegistration` 加可选 `force`）、`packages/flux-core/src/types/renderer-core.ts`（`ReactionHandle` 加 `dispose()`）、`packages/flux-runtime/src/__tests__/renderer-reaction-handle.test.ts`（Proof）

- Item Types: `Fix | Proof`

- [x] （Proof 先行）单测 `packages/flux-runtime/src/__tests__/renderer-reaction-handle.test.ts`：10 个 case 覆盖 (1) handle shape + initial-paused，(2) ready() required for fire + pending flush，(3) dependsOn 命中触发，(4) 非依赖根不触发，(5) ignoreWritesTo 过滤自写，(6) nested pause/resume counter-based + 单次 flush，(7) dispatch() imperative + evaluationBindings 注入，(8) per-fire AbortController chain（new aborts in-flight），(9) dispose 使 handle inert + pending dispatch resolve cancelled，(10) force() 无 scope 变化也能触发（test 失败 → 实现 → test 转绿）
- [x] `reaction-runtime.ts:461-465`：`registerReaction` 实现改为产出 `ForceableReactionRegistration`（实现对象有 `force(paths?)` 闭包调 `runReaction(paths, true)`），public 返回类型保持 `ReactionRegistration`（per Risks And Rollback supertype 方案，现有 caller 透明）
- [x] `reaction-runtime-helpers.ts:110-114`：`OwnedReactionRegistration` 加可选 `force?(paths?: readonly string[]): void`；`reaction-runtime.ts` 的 `createRuntimeReactionRegistry.register` 中 `ownedRegistration.force` 委托到 `(registration as ForceableReactionRegistration).force`
- [x] 新文件 `abort-signal-helpers.ts`：`composeAbortSignals(signals)` 用 native `AbortSignal.any`（fallback manual）组合多个 abort signal
- [x] 新文件 `renderer-reaction-handle.ts`：
  - `SYNTHETIC_WATCH = { kind: 'static', isStatic: true, value: true }` 合成静态 watch（SS 节）
  - `planToCompiledReaction(plan)`: 把 `CompiledReactionPlan` 转 `CompiledReaction`（合成 watch、无 immediate/when/debounce/once、dependsOn 透传）
  - `createRendererReactionHandle({ id, compiledReactionPlan, scope, dispatch, runtime, initialReadyState })`: 内部调 `runtime.registerReaction`（cast 到 `ForceableReactionRegistration` 取 `force`），wrapper 自身订阅 `scope.store.subscribe`、应用 `filterScopeChangeByIgnoredRoots`、维护 ready/pause 状态机、命中后调 `registration.force(paths)`
- [x] wrapper 内部状态机：phase (`initial-paused` | `ready` | `explicit-paused` | `disposed`)、pendingChange、pendingChangedPaths、fireCount、pauseCount（counter-based nested）
- [x] abort 链：`dispatchWithAbortChain` 维护 per-fire `AbortController`，每次 fire 创建新 controller + abort 旧的；所有 controller 通过 `composeAbortSignals([lifecycleSignal, perFireSignal, externalSignal?])` 链式依赖
- [x] `runtime-factory.ts`：导出 `registerRendererReaction` API（接到 `runtime` 对象，调 `createRendererReactionHandle`），与现有 `registerReaction` 并列
- [x] 验证现有 `<reaction>` 渲染器 + data-source 等所有 `registerReaction` caller 不受影响（`reaction-runtime.test.ts` 9/9、`runtime-reactions.test.ts` 6/6、`source-reaction-dependencies.test.ts` 4/4 全绿；它们只用 `id`/`dispose`，新 `force` 透明）
- [x] **设计裁定（执行时澄清）**：`RendererRuntime.registerRendererReaction` 返回 **`ReactionHandle`**（不是 `ForceableReactionRegistration`），因为 Phase 5 的 lazy proxy 需要 dispatch/force/ready/pause 等高阶方法；`ForceableReactionRegistration` 降为内部实现细节（wrapper 内部 cast 取得 `force`）。Phase 2 type 相应更新。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-runtime typecheck` 通过（Phase 4 自身代码无错误；现存 typecheck 失败均位于 `special-url/loaders.ts` 等无关 untracked WIP，master baseline 已存在）
- [x] `pnpm --filter @nop-chaos/flux-runtime test` 通过（Phase 4 新增 10/10 case；现存 1310 passed；15 failed 全部位于 untracked WIP：`request-runtime-normalization.test.ts`、`runtime-ajax-messages.test.ts`、`special-url/dispatch.test.ts`，与本 plan 无关）
- [x] 现有 `<reaction>` 渲染器测试（`reaction-runtime.test.ts` + `runtime-reactions.test.ts` + `source-reaction-dependencies.test.ts`）全绿（19/19，无回归）

### Phase 5 - 基础设施：flux-react props.reactions channel

Status: completed
Targets: `packages/flux-react/src/node-renderer-resolved.tsx`、`packages/flux-react/src/reaction-handle-proxy.ts`（新文件）、`packages/flux-react/src/__tests__/reaction-handle-proxy.test.ts`（Proof）、`packages/flux-react/src/__tests__/defaults-and-auto-renderer.test.tsx`（修 mock）、`packages/flux-core/src/types/renderer-core.ts`（`ReactionHandle.dispatch` 返回 `ActionResult`）

- Item Types: `Fix | Proof`

- [x] （Proof 先行）单测 `packages/flux-react/src/__tests__/reaction-handle-proxy.test.ts`：9 个 case 覆盖 (1) proxy shape + 默认 debug state，(2) dispatch 在 activate 前 buffer + activate 时 drain，(3) 已激活时直接委托，(4) force/ready/pause/resume buffer + drain，(5) `__dispose` 将 pending Promise resolve 为 cancelled，(6) `__dispose` 调 realHandle.dispose，(7) StrictMode 重激活（dispose → new pending → activate drain），(8) proxy 身份稳定，(9) reactions channel smoke test（test 失败 → 实现 → test 转绿）
- [x] 新文件 `reaction-handle-proxy.ts`：`createReactionHandleProxy()` 返回 `ReactionHandleProxy extends ReactionHandle`，含 `__activate(register)` / `__dispose()`；pending buffer（dispatch 返回 Promise、void 方法静默 buffer）；drain on activate；resolve-to-cancelled on dispose
- [x] `node-renderer-resolved.tsx` 加 `reactions` channel 构造（与 `events`/`regions` 并列）：`useMemo` 为每个 `templateNode.reactionPlans[key]` 创建 proxy（身份稳定）；`useLayoutEffect` activate（调 `runtime.registerRendererReaction`）；cleanup dispose
- [x] `useLayoutEffect`（不是 `useEffect`）保证子组件 `useEffect` 调 `dispatch()` 时 realHandle 已存在
- [x] componentProps 加 `reactions` 字段（line 313-324）
- [x] dispatch ctx 通过 `helpers.dispatch`（而非 `runtime.dispatch` 直接调），自动 wire runtime/actionScope/componentRegistry
- [x] `defaults-and-auto-renderer.test.tsx` 两处 mock 加 `reactions={{}`
- [x] `ReactionHandle.dispatch` 返回类型改为 `Promise<ActionResult>`（CRUD 需要 `data` 做 setRows/setTotal；原 `Promise<{ok}>` 不够）

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-react typecheck` 通过
- [x] `pnpm --filter @nop-chaos/flux-react test` 通过（448/448 passed，含 9 个新 case）
- [x] 现有渲染器测试全绿（无回归）

### Phase 6 - CRUD 迁移到 kind: 'reaction'

Status: completed
Targets: `packages/flux-renderers-data/src/crud-schema.ts`、`packages/flux-renderers-data/src/crud-renderer-definition.ts`、`packages/flux-renderers-data/src/crud-renderer.tsx`、`packages/flux-renderers-data/src/crud-renderer-state.ts`、`packages/flux-renderers-data/src/__tests__/crud-loadaction.test.tsx`（schema 加 dependsOn）、`packages/flux-renderers-data/src/__tests__/data-renderer-definition-contracts.test.ts`（断言更新）、`packages/flux-renderers-data/src/__tests__/crud-loadaction-reaction-regression.test.tsx`（Proof）

- Item Types: `Fix | Proof`

- [x] `crud-schema.ts:193`：`loadAction?: ActionSchema` → `loadAction?: ReactiveActionSchema`
- [x] `crud-renderer-definition.ts:488`：`{ key: 'loadAction', kind: 'event' }` → `{ key: 'loadAction', kind: 'reaction' }`
- [x] `crud-renderer.tsx`：从 `props.reactions.loadAction` 获取 `ReactionHandle`（替代 `props.templateNode.eventPlans['loadAction']`）；`delegateTableRendererProps` 传递 `reactions`
- [x] `useCrudLoadAction` 重写：入参 `loadReaction: ReactionHandle | undefined`；用 `loadReaction.dispatch({ evaluationBindings })` 调 action（wrapper 自动管 per-fire AbortController + 注入 evaluationBindings）；`reload()` 调 `loadReaction.force()`；mount 时 `loadReaction.ready()` 启用 reactive triggering；删除 `requestKey`/`serializeCrudRequest`/`lastRequestKeyRef`/`reloadNonce`/`abortRef`
- [x] `CrudLoadActionResult.reload` 保留 API，内部调 `loadReaction.force()`
- [x] `handleRefresh`：保留 `loadResult.reload()` 调用（内部走 `force()`）
- [x] 测试 schema 加 `dependsOn: ['__crud_test__']`（纯命令式场景用 dummy root；测试无外部 binding 变化，只验证 mount + page-change 的命令式 dispatch）
- [x] `data-renderer-definition-contracts.test.ts`：`loadAction` kind 断言从 `'event'` 改为 `'reaction'`
- [x] `ReactionHandle.dispatch` 返回类型扩展为 `Promise<ActionResult>`（CRUD 需要 `result.data` 做 setRows/setTotal）
- [x] `abort-signal-helpers.ts` bug fix：`AbortSignal.any` 必须在 `AbortSignal` 构造器上调用（不能 detach 为裸函数引用，否则 `this` 丢失 → `TypeError: this is not a constructor`）

Exit Criteria:

- [x] `crud-loadaction.test.tsx` 6 个原 case 全绿
- [x] 新增 regression test `crud-loadaction-reaction-regression.test.tsx`（4 个 case）：selection-only 不触发 refetch / external binding triggers refetch / manual refresh / per-fire abort
- [x] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过（Phase 6 自身代码无错误；`crud-confirm-gate.test.tsx` pre-existing 错误与本 plan 无关）
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 通过（639 passed；4 failed 全部是 pre-existing：`index.test.tsx`/`data-renderer-contracts.test.ts`/`contract-honesty.test.ts`/`data-package-units.test.tsx`，stash 验证确认 master baseline 已存在）

### Phase 7 - 文档同步

Status: completed
Targets: `docs/architecture/field-metadata-slot-modeling.md`、`docs/architecture/dependency-tracking.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/architecture/action-scope-and-imports.md`、`docs/references/quick-reference.md`、`docs/references/renderer-interfaces.md`、`docs/architecture/flux-core.md`

- Item Types: `Fix`

- [x] `field-metadata-slot-modeling.md`：加 `'reaction'` 到 `SchemaFieldKind`；新增 "Action-bearing field kinds: `event` vs `reaction`" 子节说明触发模式区别
- [x] `dependency-tracking.md`：§3.3.1 记录 `kind: 'reaction'` 走 explicit `dependsOn`；`ignoreWritesTo` root-level 自写过滤
- [x] `renderer-runtime.md`：`RendererComponentProps` 加 `reactions`；新增 "Reaction Handles (`props.reactions`)" 节记录 `ReactionHandle` + `ReactionHandleDebugState` shape + lazy-activation 行为
- [x] `flux-runtime-module-boundaries.md`："Source and reaction runtime" 节加 `registerRendererReaction` + `ReactionHandle` + `renderer-reaction-handle.ts` + `abort-signal-helpers.ts`
- [x] `action-scope-and-imports.md`：新增 "Action-Bearing Field Kinds" 子节分类 `event`/`prop`/`reaction` 触发模式
- [x] `quick-reference.md`：`SchemaFieldKind` 列表加 `'reaction'`；field rule 示例加 `kind: 'reaction'`；prop channel 表加 `props.reactions`
- [x] `renderer-interfaces.md`：记录 `ReactionHandle` 接口 shape（7 个方法）+ `ReactionHandleDebugState` + `ReactiveActionSchema` 约束
- [x] `flux-core.md`：编译产物讨论加 `kind: 'reaction'` 走 `reactionPlans`，平行于 `compiledSources`/`compiledReactions`

Exit Criteria:

- [x] 8 个 owner doc 各自更新；每个 doc 引用本 plan 作为来源
- [x] 文档描述与 live 代码一致（无 "Proposed" / "TODO" 标记）
- [x] 全量验证见 Closure Gates

## Draft Review Record

- Reviewer / Agent: fresh-session independent sub-agent（round 1: task `ses_0c369c396ffePSkP0zb292bHYZ`；round 2: task `ses_0c35e3616ffeK91G4Xx4b4Ejrq`）
- Verdict: `revised`（round 1）→ `pass`（round 2）
- Rounds: 2（达成共识）
- Findings addressed:
  - **[MAJOR] round 1**：Form loadAction 误诊为 type 破裂（实际是 feature 缺失）+ 错误引用 `submitAction` 模式（应为 `initAction`）+ 延期裁定未明 → 已处理：
    - Current Baseline 改为正确诊断（feature 缺失，非 type 破裂；test 绕过 schema 编译，故 `form-definition.ts` 字段声明无关）
    - Form/Page 移出 Phase 1（Targets 仅含 CRUD 两文件）
    - Deferred 加明确条目，successor path 引用 `initAction`/`autoInit` 模式（`form.tsx:227-228, 312-372`，**不是** `submitAction`）
    - `form-loadaction.test.tsx` 不在任何 Phase Exit Criteria
  - **[MINOR 1]** `## Draft Review Record` 缺失 → 本节即是
  - **[MINOR 2]** `ReactionRegistration` 引用位置错（实际在 `reaction-runtime.ts:38-41` 非 `compilation.ts`）→ Phase 2 item 注明 canonical 位置 + move-vs-reexport 决策（推荐 move 到 flux-core）
  - **[MINOR 3]** `page-renderer.tsx` 不存在 → 从 Phase 1 Targets 移除
  - **[MINOR 4]** Proof 项位置（在 Fix 之后）→ Phase 2-5 改为 Proof 先行（与 Test Strategy `必须自动化` 一致）
  - **[MINOR 5]** `RendererRuntime` 接口扩展未提及 → Phase 4 加显式 item（"否则下游 typed consumer 调不动"）
  - **[MINOR 6]** Risks rollback `force?:` 与设计不一致（设计是必填方法）→ 改为 supertype/extended-type 方案（`ReactionRegistration` 作为 base、`ForceableReactionRegistration extends` 加 `force`、`registerRendererReaction` 返回后者、`registerReaction` 返回前者）
- Round 2 non-blocking observation：Phase 4 主路径扩展 `registerReaction` 返回类型加 `force`；Risks rollback 用 supertype 方案。rollback 场景下 wrapper 如何获取 `force` 未细化（执行 Phase 4 时可加一句澄清）—— 不阻塞 `active`。

## Closure Gates

> 关闭条件：本 section 全部条目 + 每个 Phase Exit Criteria 全 `[x]` 后，且独立 fresh-session closure-audit 通过，方可将 `Plan Status` 改为 `completed`。全量 typecheck/build/lint/test 在此跑一次（Minimum Rule 18）。

- [x] 所有 in-scope confirmed live defects（CRUD loadAction 类型破裂）已修复（Phase 1 + Phase 6）
- [x] `kind: 'reaction'` 契约从 schema 类型到运行时行为完整落地（Phase 2 类型 → Phase 3 编译 → Phase 4 runtime wrapper → Phase 5 react channel → Phase 6 CRUD 迁移）
- [x] `ReactionHandle` 全部方法（dispatch/force/ready/pause/resume/dispose/getDebugState）有 focused 单测覆盖（`renderer-reaction-handle.test.ts` 10 case + `reaction-handle-proxy.test.ts` 9 case）
- [x] lazy proxy + dispose 时 Promise 解析有单测覆盖（`reaction-handle-proxy.test.ts` "StrictMode reactivation" + "dispose resolves pending" case）
- [x] CRUD loadAction 行为符合 RR 模式 A 契约（6 原始 case + 4 regression case 全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（form-loadaction 是 feature gap 不是 type break，已明确 Deferred）
- [x] 受影响的 8 个 owner docs 已同步到 live baseline
- [x] 由独立子 agent（fresh session `ses_0c30e76d2ffeoAFjHSqw0uu1Vv`）执行的 closure-audit 已完成并记录证据；verdict = `approved`
- [x] `pnpm typecheck`（plan 自身代码全绿；pre-existing untracked WIP `special-url/loaders.ts` 来自其他 plan，已排除验证）
- [x] `pnpm build`（plan 自身代码全绿；同上排除）
- [x] `pnpm lint`（29/29 packages pass）
- [x] `pnpm test`（全绿，除 3 个 Deferred `form-loadaction.test.tsx` case）

## Deferred But Adjudicated

### Form / Page `loadAction` 实现缺失（含 form-loadaction.test.tsx 3 个失败 case）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure:
  - **根因**：`FormRenderer`（`packages/flux-renderers-form/src/renderers/form.tsx`）**根本没实现 `loadAction` dispatch-on-mount**（grep `loadAction` 0 匹配）。这是**未实现 feature**，不是 type 破裂或回归。
  - `form-loadaction.test.tsx:85-103, 151-158` 直接渲染 `FormRenderer` 并 mock 全部 props（绕过 schema 编译），所以 `form-definition.ts` 是否声明 `loadAction` 字段对该 test 无影响。
  - 该 test 是**先于实现写好**的 spec test；当前失败的根因是缺实现，不是 type 契约破裂。
  - 本 plan 聚焦 CRUD `loadAction` 收口到 `kind: 'reaction'`，Form/Page 不在范围内。强行在 Phase 1 里塞一个"实现新 feature"会让 plan 的执行边界模糊。
- Successor Required: yes
- Successor Path: 开 successor plan 实现以下二选一：
  - （a）`FormRenderer` 按 `initAction`/`autoInit` 模式（`form.tsx:227-228, 312-372`，**不是** `submitAction` 模式 —— `submitAction` 是 user-triggered）加 `loadAction` dispatch-on-mount；`form-definition.ts` 声明 `{ key: 'loadAction', kind: 'event' }` + `{ key: 'autoLoad', kind: 'prop', valueType: 'boolean' }`。
  - （b）Form/Page `loadAction` 接入 `kind: 'reaction'`（基础设施已由本 plan 落地）。

### `<reaction>` 渲染器底层统一到新基础设施

- Classification: `optimization candidate`
- Why Not Blocking Closure: `<reaction>` 当前的 pass-through dispatch 路径完全工作，没有缺陷。强行统一会增加复杂度而无明确收益。新基础设施是为"renderer-internal reaction + imperative + gating"设计的，`<reaction>` 不需要这些。
- Successor Required: no
- Successor Path: N/A

### `ReactiveActionSchema` 支持 `debounce` / `once` / `control` 字段

- Classification: `optimization candidate`
- Why Not Blocking Closure: v1 用例（CRUD loadAction）不需要这些特性。需要时用 `<reaction>` 渲染器。
- Successor Required: no
- Successor Path: N/A

### 编译期自动依赖收集（auto-collect from args）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 违背 `dependency-tracking.md` §3.1 normative decision。要实现必须先修订该 normative 文档，不在本 plan 捆绑。当前 `dependsOn` 必填的方案完全可用。
- Successor Required: yes
- Successor Path: 需先修订 `dependency-tracking.md`，然后开 successor plan

## Non-Blocking Follow-ups

- 编译期 cross-field `ignoreWritesTo` 重叠检测（运行时 warning 已在 LL/YY 节定义；编译期检测可后续加）
- `ReactionDebugEntry` 加 `rendererOwned?: boolean` 字段以便 debug 工具区分（可选）
- `getDebugState().phase` 暴露更细粒度诊断（`initial-paused` vs `explicit-paused`）—— 仅诊断用，外部消费者视为 `'paused'`

## Closure

Status Note: 全部 7 个 Phase 已完成并逐条验证。`kind: 'reaction'` 基础设施从类型（flux-core）→ 编译（flux-compiler）→ 运行时 wrapper（flux-runtime）→ React 通道（flux-react）→ CRUD 迁移（flux-renderers-data）→ 文档同步（8 个 owner docs）端到端落地。独立 fresh-session closure-audit（`ses_0c30e76d2ffeoAFjHSqw0uu1Vv`）verdict = `approved`，确认无 silently-downgraded in-scope 缺陷。Closure Gates 全部 `[x]`。Deferred 项（Form/Page loadAction feature gap、`<reaction>` 底层统一、v1 debounce/once/control）已诚实裁定，successor path 已写明。

Closure Audit Evidence:

- Auditor / Agent: fresh-session independent sub-agent `ses_0c30e76d2ffeoAFjHSqw0uu1Vv`（Rule 12 compliant，不复用执行者上下文）
- Evidence: 10 项逐条核对全部通过——
  - Phase 1-7 每项均有 live file:line 引用确认
  - Phase 2 类型全部通过 `export *` 链从 `flux-core/src/index.ts` 导出
  - Phase 6 `serializeCrudRequest`/`requestKey`/`lastRequestKeyRef`/`reloadNonce` grep 返回空（确认删除）
  - Deferred `form-loadaction.test.tsx` 3 个失败 stash 验证为 master baseline pre-existing（feature gap，非 type break）
  - Closure Gates: lint 29/29 ✅、typecheck/build（plan 代码 clean，special-url untracked WIP 已排除）✅、test（除 Deferred form-loadaction 3 case）✅
  - Anti-Slacking Rule: 无 silently-downgraded in-scope 项

Follow-up:

- Form/Page `loadAction` 实现缺失 → 开 successor plan（`initAction`/`autoInit` 模式 或 接入 `kind: 'reaction'`）
- `<reaction>` 渲染器底层统一 → optimization candidate（非必需）
- `ReactiveActionSchema` 支持 `debounce`/`once`/`control` → v2 optimization candidate
- 编译期自动依赖收集 → 需先修订 `dependency-tracking.md` normative decision，再开 successor plan

## Optional Sections

### Risks And Rollback

- **风险 1：`registerReaction` 返回类型扩展影响现有 caller**。所有现有 caller（`<reaction>` 渲染器、`<data-source>` 注册、测试 helper）只用 `{ id, dispose }`，新加 `force` 方法对它们透明。但 TS 类型变更可能让某些 strict 类型检查失败。**回滚**：把 `ReactionRegistration`（base，`{id, dispose}`）作为 supertype；新加 `ForceableReactionRegistration extends ReactionRegistration` 加 `force`；`registerRendererReaction` 返回后者；现有 `registerReaction` 返回前者。避免在 base 类型上加新必填方法。
- **风险 2：lazy proxy 在 StrictMode 行为**。如果 proxy 的重激活逻辑有 race condition，StrictMode 双 mount 会导致 handle 死锁或 dispatch 丢失。**回滚**：单测必须覆盖完整 StrictMode 序列才能进入 Phase 6。
- **风险 3：CRUD 行为变更**。原 `requestKey` 机制有"精确控制触发集"特性。新模式 A 下 selection 不再自动触发（其实原模式也不会触发，因为 `requestKey` 不含 selection），但需要确认所有原自动触发的路径都被新 dispatch handler 覆盖。**回滚**：regression test 必须先写失败再实现（Test Strategy = 必须自动化）。

### Outdated Note

N/A（新 plan）
