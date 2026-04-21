# 123 Flux Runtime Split And Boundary Hardening Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-21
> Source: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/api-data-source.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-interaction-state.md`, `docs/architecture/form-validation.md`, `docs/plans/120-runtime-async-governance-convergence-plan.md`, `docs/plans/122-compiler-package-extraction-and-boundary-plan.md`, `docs/experiments/next-gen-low-code-framework-final/09-repo-and-package-blueprint.md`, `docs/experiments/next-gen-low-code-framework-final/10-runtime-module-map.md`, `docs/experiments/next-gen-low-code-framework-final/11-implementation-sequence-and-milestones.md`, `docs/experiments/next-gen-low-code-framework-final/20-mvp-implementation-task-matrix.md`
> Related: `docs/plans/118-flux-internal-kernel-session-refactor-plan.md`, `docs/plans/119-action-precompile-and-args-unification-plan.md`, `docs/plans/120-runtime-async-governance-convergence-plan.md`, `docs/plans/122-compiler-package-extraction-and-boundary-plan.md`

## Purpose

在不引入 `kernel/session` 重写、不中断现有 `RendererRuntime` facade、也不改 author-visible schema contract 的前提下，本计划必须完成 `flux-action-core` 的实际拆分落地，并同时把 `flux-runtime` 内的 action/runtime boundary 收口到可长期维持的稳定状态。

这份计划的目标不是一步把 runtime 完全重做，也不是本轮同时完成 request execution substrate 的独立拆包，而是沿 live repo 已经成型的 seam，把“action 执行框架”从 `flux-runtime` 中真正独立出来，同时把 request/source/reaction 与 action 的边界硬化到足以支持后续再判断 request execution 是否值得独立成包或继续保留为 runtime 内部共享 substrate。

本计划明确采用 compiler extraction 后的新基线：`flux-action-core` 只考虑执行编译后的 `CompiledActionProgram` / `CompiledActionNode`。此前 runtime 内的 action delayed compile / ad-hoc compile fallback 视为已废弃路径，不再作为 split 设计前提保留。

## Current Baseline

- `packages/flux-runtime/src/runtime-factory.ts` 仍然是 runtime 总装入口，直接拥有 compiler/eval 装配、action scope/component registry、request executor、async governance、source/reaction registries、page/form/surface runtime 创建和 teardown。
- `docs/plans/122-compiler-package-extraction-and-boundary-plan.md` 已把 compile-time 拆包收口为单独 owner plan，因此本计划不再重复处理 compiler extraction；这里默认 compiler 方向由 plan 122 持有。
- compiler 已从 `flux-runtime` 迁出到 `@nop-chaos/flux-compiler`；因此本计划不再保留 action runtime delayed compile 的设计空间，默认 action 执行入口消费的都是 compiled action program。
- `packages/flux-runtime/src/action-runtime.ts`、`action-runtime-core.ts`、`action-runtime-handlers.ts` 已经组成相对清晰的 action execution 子系统，但仍通过 `runtime-factory.ts` 注入大量 runtime-owned side-effect ports，例如 form submit、drawer/dialog opening、refresh source、env monitor/notify 等。
- `packages/flux-runtime/src/request-runtime.ts`、`request-runtime-adaptor.ts`、`api-cache.ts`、`operation-control.ts` 已形成 request execution 子系统，但目前仍与 runtime 包同驻，并被 action、source、form submit、async validation 共用。
- `packages/flux-runtime/src/data-source-runtime.ts` 与 `source-registry.ts` 已经形成 source/data-source 子系统；其 author-visible contract 由 `docs/architecture/api-data-source.md` 持有，运行时治理则已在 plan 120 中部分统一。
- `packages/flux-runtime/src/reaction-runtime.ts` 已经形成 reaction 子系统；它依赖 action dispatch，但业务语义和调度治理与 action core 不同，不能简单并入 action 包。
- `packages/flux-runtime/src/operation-control.ts` 当前只承载 timeout / retry / abort helpers，被 action 与 request 共用；`OperationControlConfig` 协议类型已在 `packages/flux-core/src/types/schema.ts`。
- `docs/architecture/flux-runtime-module-boundaries.md` 已切到 compiler package baseline；本计划应直接建立在这一 baseline 上，而不是重新讨论 compiler owner。
- `docs/plans/118-flux-internal-kernel-session-refactor-plan.md` 已被取消；因此本计划不能回到“先发明 internal kernel/session topology”的宽计划，而必须沿 focused subsystem 边界收口。
- `packages/flux-react/src/use-node-imports.ts` 仍有 React-side async import loading；这属于 import/host runtime boundary，不属于本计划首轮 action/request/source/reaction split 的核心目标。

## Goals

- 把 `flux-runtime` 继续收敛成 runtime facade + owner/runtime assembly shell，而不是继续兼任 action execution owner。
- 明确并硬化以下子系统边界：`action execution`、`request execution`、`source/data-source runtime`、`reaction runtime`。
- 在本计划内实际新增并落地 `@nop-chaos/flux-action-core`，把 action DAG/dispatch/control 主体从 `flux-runtime` 中迁出。
- 明确 `flux-action-core` 只拥有 action execution framework、generic operation control 和单个 runtime adapter contract，不拥有 `submitForm` / `refreshSource` / namespace lookup / component lookup 的具体实现。
- 明确 `reaction` 与 `data-source` 的执行体必须复用 `flux-action-core`，禁止继续演化各自独立的平行 action executor。
- 为 request execution 建立与 action-core 解耦的稳定边界；后续是否需要单独 owner plan，取决于 closure audit 是否证明它已经形成稳定的独立包边界。
- 明确 action execution 的最小运行时求值接口，只保留 compiled payload evaluation 所需能力，不再保留 runtime delayed compile 兼容层。
- 明确 `OperationControlConfig` 继续留在 `flux-core`，其执行 helpers 不独立成单独 package，而是归属 action/request execution 相关子系统。
- 保持 `data-source` / `reaction` 的 author-visible contract 不变，只收口物理 owner、依赖方向和 runtime assembly responsibilities。
- 让 `runtime-factory.ts` 的职责进一步缩小到装配和 top-level owned runtime creation，不继续扩张为 giant orchestrator。

## Non-Goals

- 不在本计划中引入新的 `ExecutionPackage` / transaction kernel / admission runtime。
- 不在本计划中重做 `RendererRuntime` facade、宿主调用方式或 React host 主路径。
- 不在本计划中重写 form/page/surface owner 语义或 validation contract。
- 不在本计划中把 imports / import-stack / module cache 全部拆出 runtime；这些仍由现有相关计划单独持有。
- 不在本计划中重写 debugger 产品形态；仅处理 split 后需要的最小 diagnostics / ownership surface 跟随。
- 不在本计划中变更 `ActionSchema`、`DataSourceSchema`、`ReactionSchema` 的 author-visible DSL。
- 不在本计划中把所有异步都强行归入 action；`data-source`、async validation、imports 仍保持独立 owner 语义。
- 不在本计划中完成 `flux-request-runtime` package extraction。
- 不在本计划中保留或恢复 action delayed compile / ad-hoc compile fallback。

## Scope

### In Scope

- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-runtime/src/action-runtime-handlers.ts`
- `packages/flux-runtime/src/runtime-action-helpers.ts`
- `packages/flux-runtime/src/runtime-eval-helpers.ts`
- `packages/flux-runtime/src/action-scope.ts`
- `packages/flux-runtime/src/component-handle-registry.ts`
- `packages/flux-runtime/src/imports.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/request-runtime-adaptor.ts`
- `packages/flux-runtime/src/api-cache.ts`
- `packages/flux-runtime/src/operation-control.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-submit.ts`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/data-source-runtime-utils.ts`
- `packages/flux-runtime/src/data-source-state.ts`
- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/reaction-runtime.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-core/src/types/schema.ts` and any shared runtime contract types that must move or be clarified
- related docs, plan links, and daily logs required to freeze the split baseline

### Out Of Scope

- compiler package extraction itself already owned by plan 122
- imports / import-stack / module cache extraction as a whole
- form/page/surface owner package extraction
- full validation package extraction
- react-host package topology redesign
- new public host manifest / capability manifest DSL

## Design Position

### 1. This plan lands `flux-action-core`, not only seam hardening

本计划的 owner result 是：

- `@nop-chaos/flux-action-core` 实际存在并承载 action execution 主体
- `runtime-factory.ts` 明显变薄
- action/request/source/reaction 的 runtime-host boundary 明确
- request-runtime 后续拆包不再需要先重新审计 action side baseline

本计划必须在 closure 前创建 `@nop-chaos/flux-action-core`。

### 2. `ActionScope` / component-target / imports stay runtime-owned

`action execution` 可以被收敛出 pre-package boundary，但以下能力在本计划中继续明确保留为 runtime host infrastructure：

- `ActionScope`
- `ComponentHandleRegistry`
- imported namespace lifecycle / `imports.ts`
- import-stack / module cache ownership

因此，本计划中的 action seam 只覆盖：

- DAG dispatch sequencing
- control application
- built-in / component / namespaced dispatch ordering shell
- ports needed to reach runtime host infrastructure

而不是把 imports / component registry / capability lexical visibility 一起搬出 runtime。

### 2.1 `reaction` / `data-source` reuse action-core as execution substrate

本计划明确区分两层：

1. owner shell
2. execution body

其中：

- `reaction` 仍然是 watch/schedule/loop-guard owner
- `data-source` 仍然是 producer/publish/status owner
- 但它们内部真正“执行一段动作”的部分，必须复用 `flux-action-core`

禁止继续演化的方向：

- `reaction` 自己再维护一套平行的 action branching/control executor
- `data-source` 自己再维护一套平行的 async action executor

允许保留的 owner 壳语义：

- `reaction`: watch hit, debounce/coalesce, fire policy, loop guard, lifetime
- `data-source`: auto-load, refresh policy, loading/ready/error/stale publish, data/status paths

因此，本计划的分层规则是：

1. `reaction = watch owner + action-core execution body`
2. `data-source = producer owner + action-core/request execution body`
3. owner 壳不被压平为 action，但执行体必须尽量统一到 action-core 或其下层共享 execution substrate

### 3. Keep the public `ActionContext`; isolate runtime specifics behind one adapter object

本计划不把 `ActionContext` 拆成双合同。

原因：

1. `ActionContext` 今天已经是 `ActionNamespaceProvider.invoke(...)` 与 `ComponentCapabilities.invoke(...)` 的公共 contract。
2. 现在强拆双合同会把本计划扩大成 public contract surgery，而不是 focused package extraction。
3. 当前更重要的是切断 `flux-action-core` 对 runtime internals 的编译期依赖，而不是先重写整个 context 类型体系。

本计划的边界决策是：

1. 保持现有 `ActionContext` public contract 在 `flux-core` 不变。
2. `flux-action-core` 可以读取 `ActionContext`，但不因为 `ctx` 上存在某些字段就直接建立对 runtime owners 的编译期依赖。
3. action dispatch 的 resolution order 仍由 `flux-action-core` 持有：built-in -> component -> namespaced -> not-found。
4. 所有 runtime-specific 行为都通过单个 adapter 对象进入 runtime。
5. `ActionScope`、`ComponentHandleRegistry`、`FormRuntime`、`SurfaceRuntime` 等 runtime-owned 结构继续留在 `flux-runtime`，仅由 runtime adapter 实现消费它们。

推荐 adapter 方向：

```ts
interface ActionRuntimeAdapter {
  executeEffect(action: CompiledActionNode, ctx: ActionContext, signal?: AbortSignal): Promise<ActionResult>;
}
```

说明：

1. `flux-action-core` 自己负责判定当前 action 属于 built-in、`component:<method>`、还是 namespaced action，并保持现有 resolution order。
2. 一旦进入真正的 runtime-specific effect 执行，再通过单个 adapter 对象进入 runtime。
3. `flux-action-core` 默认消费 compiled action nodes，不负责 schema-to-compiled 的延迟编译。
4. 是否在 runtime 内部把 adapter 再拆成更窄的方法，是 runtime 实现细节，不属于 `flux-action-core` owner surface。

规则：

1. `flux-action-core` 保持使用现有 `ActionContext` public contract。
2. `flux-action-core` 继续持有 dispatch ordering、branch semantics、result classification、monitor shaping、control application。
3. 任何需要 `submitForm`、`surface open/close`、`component:<method>`、`namespace:method>`、`refreshSource`、`navigate` 等 runtime-specific 行为的能力，必须通过 `ActionRuntimeAdapter` 获取，不允许 action-core 直接反向 import runtime owners。
4. `ActionNamespaceProvider.invoke(...)` 与 `ComponentCapabilities.invoke(...)` 继续接受 `ActionContext`，不在本计划中改签名。
5. 如果后续确实需要收敛 `ActionContext`，那应由单独 focused owner plan 处理，而不是混入本次 action-core extraction。

### 3.2 Minimal Runtime Evaluation Surface

由于 action 现在只执行编译后的 program，本计划不再把“运行时编译 action payload”视为合法依赖。

本计划要求审计并冻结 action-core 对运行时求值的最小接口：

1. 必需且唯一：`evaluateCompiled(compiled, scope)`
2. `evaluate(target, scope)` 若保留，只能作为非 action 路径的 runtime-owned 兼容壳，不能继续作为 action-core contract surface
3. `compileValue(target)` 不再属于 action-core 必需依赖；若仍有残留使用，必须明确为非 action/runtime-owned leftover，而不是继续滞留在 action-core contract 中

`runtime-eval-helpers.ts` 在本计划中相关，但其讨论重点不再是“是否支持运行时延迟编译”，而是“compiled payload evaluation 的最小依赖面”。

### 3.1 Built-in Ownership Matrix

本计划要求明确 built-in action 的 owner 形态，避免 extraction 时一边搬代码一边临时猜语义。

| Built-in action | `flux-action-core` owns | runtime adapter owns |
| --- | --- | --- |
| `ajax` | selector recognition, payload evaluation trigger, result normalization shell | actual request execution |
| `submitForm` | selector recognition, payload evaluation trigger, result normalization shell | actual form submit lifecycle |
| `refreshSource` | selector recognition, result normalization shell | source lookup + refresh execution |
| `openDialog` / `openDrawer` | selector recognition, payload evaluation trigger, result normalization shell | surface creation/open |
| `closeDialog` / `closeDrawer` | selector recognition, result normalization shell | actual surface close |
| `showToast` | selector recognition, payload evaluation trigger, result normalization shell | concrete notify/toast behavior |
| `navigate` | selector recognition, payload evaluation trigger, result normalization shell | concrete host navigation |
| `component:<method>` | dispatch-mode classification, method extraction, result normalization shell | component handle resolve + invoke |
| `namespace:method` | dispatch-mode classification, namespace/method split, result normalization shell | action-scope resolution + provider invoke |
| `setValue` / `setValues` | selector recognition, payload evaluation trigger, result normalization shell | actual scope/form write path |
| `refreshTable` | selector recognition, result normalization shell | page/table runtime refresh path |

规则：

1. `flux-action-core` 不直接拥有任何依赖 `FormRuntime`、`PageRuntime`、`SurfaceRuntime`、`ActionScope`、`ComponentHandleRegistry` 的 effect body。
2. `flux-action-core` 仍拥有 built-in selector recognition、dispatch ordering 和统一 result normalization shell。
3. runtime adapter 是所有 runtime-owned effect body 的唯一入口。

### 4. `operation-control` is generic async execution control, not ajax-specific

`OperationControlConfig` 继续留在 `flux-core`。

`operation-control.ts` 不是 `ajax` 专属机制，而是任意 async action / request execution 都可复用的 generic execution control substrate。它回答的是：

- timeout
- retry
- abort
- debounce

而不是：

- transport-specific ajax semantics
- owner-level async governance

本计划要求：

1. `operation-control` 的语义文档和代码边界必须明确为“generic async execution control”。
2. `ajax` 只是它的一个 consumer；plain async action、future async host capability、request execution 都可以复用这套控制基座。
3. 由于本计划首轮只落 `flux-action-core`，`operation-control` 的物理 owner 随之迁出；但文档上必须明确它是 action/request 可共享的 generic substrate，而不是 action-owned business semantics。

### 5. Plan 122 is a hard prerequisite

凡是同时涉及 `runtime-factory.ts`、`packages/flux-runtime/src/index.ts`、`docs/architecture/flux-runtime-module-boundaries.md` 的 split work，都必须以 plan 122 的 compiler extraction baseline 为前置；本计划不能在 compiler owner 仍漂移时并行推进文件迁移。

## Target Split Direction

本计划落地后与后续 successor plans 的方向：

```text
packages/
  flux-core/
    src/
      types/
        schema.ts                 # OperationControlConfig stays here

  flux-action-core/              # new target package
    src/
      index.ts
      action-runtime.ts
      action-runtime-core.ts
      action-runtime-handlers.ts  # core-safe subset + ports

  flux-runtime/
    src/
      runtime-factory.ts         # assembly shell only
      runtime-action-helpers.ts  # runtime adapter glue
      request-runtime.ts         # request execution substrate remains here unless later audit promotes it
      request-runtime-adaptor.ts
      api-cache.ts
      data-source-runtime.ts
      data-source-state.ts
      data-source-runtime-utils.ts
      source-registry.ts
      reaction-runtime.ts
      form-runtime*.ts
      page-runtime.ts
      surface-runtime.ts
```

执行顺序要求：

- 先在 `packages/flux-runtime/src/` 内完成 seam hardening 与 `ActionContext`/ports 收口。
- 然后在本计划 Phase 3 中实际创建并迁出 `@nop-chaos/flux-action-core`。
- 不允许把“只做内部目录重组”当作本计划的最终收口状态。

## Ownership Boundary Decisions

### `flux-core` Owns

- `OperationControlConfig` and related public config shape
- shared runtime/action/request/source/reaction contract types that are genuinely cross-package and public
- no execution helpers unless they are public protocol helpers rather than executable logic

### `flux-action-core` Owns

- action DAG dispatch sequencing
- built-in branch semantics such as `parallel`, `then`, `onError`, `onSettled`
- action-control application, timeout / retry / debounce orchestration
- runtime-independent action helper logic
- a single runtime adapter contract used to enter runtime-specific behavior
- the generic async execution control helper layer currently represented by `operation-control.ts`
- execution substrate reused by action dispatch, reaction-triggered runs, and data-source-owned action bodies

Naming Freeze For This Plan:

- `flux-action-core` 是本计划冻结使用的 package name，用于表达“action execution framework owner”。
- 该名字不自动等同于“所有 action 相关 owner 都迁入此包”。
- 若后续要改名为更窄术语（例如更贴近 action algebra 的名字），应由单独 successor plan 处理，不在本计划内并行展开。

### Future Request Extraction Candidate

- `executeApiSchema(...)`
- request preparation/materialization/adaptor flow
- request dedup/cache/retry/abort execution plumbing
- fetcher-facing request executor and request cache substrate
- only if a later audit shows these responsibilities form a stable package boundary rather than a runtime-internal shared substrate

### `flux-runtime` Owns

- `RendererRuntime` facade and top-level assembly
- form/page/surface runtime ownership
- source/data-source runtime lifecycle and publication semantics
- reaction lifecycle, watch semantics, loop guard, and debug snapshot ownership
- the concrete implementation of the single `ActionRuntimeAdapter`
- runtime-specific adapters from action core to form/surface/source/env/component capabilities
- adapting reaction/data-source owner shells onto the shared action-core execution substrate

## Package Direction Constraints

1. `flux-action-core` must not depend on `flux-runtime` internals.
2. any future extracted request package must not depend on form/page/surface owner modules.
3. `flux-runtime` may depend on `flux-action-core` and any future request package, but not vice versa.
4. `operation-control` helpers should not become a standalone package; in this plan they move with `flux-action-core`, but their semantics remain generic async execution control substrate shared by action/request consumers rather than ajax-specific control.
5. `data-source` and `reaction` remain runtime-owned subdomains in the first split pass.
6. `RendererEnv` remains in `flux-core` and continues to be used directly by runtime/request/action layers without introducing a new env facade.

## Execution Plan

### Phase 1 - Baseline Audit And Compiler Baseline Freeze

Status: planned
Targets: `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/action-runtime*.ts`, `packages/flux-runtime/src/request-runtime*.ts`, `packages/flux-runtime/src/data-source-runtime*.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `docs/architecture/flux-runtime-module-boundaries.md`

- [ ] Audit current imports/exports and runtime-factory responsibilities, and record the exact seams already present for action/request/source/reaction split.
- [ ] Distinguish which runtime-action helpers are core-safe versus runtime-adapter-only.
- [ ] Distinguish which request-runtime pieces are pure shared execution versus runtime-owner glue.
- [ ] Audit `runtime-eval-helpers.ts` and freeze the minimum evaluation API needed by compiled action execution after delayed compile removal.
- [ ] Re-audit current docs so the plan does not repeat the cancelled `kernel/session` direction from plan 118.
- [ ] Freeze the already-landed compiler extraction from plan 122 as an input assumption for this plan, and list the runtime-owned files that remain after that move.
- [ ] Audit current `reaction` and `data-source` execution paths and record exactly which parts already call action dispatch versus still run parallel execution logic.

Exit Criteria:

- [ ] The plan can point to concrete current seams for action, request, source, and reaction.
- [ ] There is an explicit list of files that can move first without dragging form/page/surface semantics with them.
- [ ] The live baseline for `flux-runtime-module-boundaries.md` drift is documented before code movement starts.
- [ ] The post-plan-122 runtime baseline is explicit, repo-observable, and no longer left as soft coordination text.
- [ ] The current execution-body reuse baseline for `reaction` / `data-source` is explicit before extraction starts.

### Phase 2 - Pre-Package Boundary Inside `flux-runtime`

Status: planned
Targets: `packages/flux-runtime/src/`, `packages/flux-runtime/src/index.ts`, related tests

- [ ] Reorganize runtime internals into focused subdirectories or equivalent file groups for `action-core`, `request-runtime`, `source-runtime`, `reaction-runtime`, and `owners`.
- [ ] Introduce stable internal ports/interfaces so `runtime-factory.ts` stops reaching deeply into subsystem implementation details.
- [ ] Ensure `runtime-factory.ts` only wires ports, helpers, registries, and top-level owner factories.
- [ ] Keep request-runtime convergence paths for ajax, form submit, async validation, and data-source explicit inside the new seam instead of leaving hidden same-package dependencies.
- [ ] Freeze the decision that public `ActionContext` remains unchanged in this plan, and move runtime-specific behavior isolation to a single adapter contract instead of contract surgery.
- [ ] Define the single `ActionRuntimeAdapter` owner surface that `flux-action-core` will call for runtime-specific execution.
- [ ] Freeze the dispatch-ordering decision: `flux-action-core` retains built-in -> component -> namespaced resolution order and uses the adapter only for effect execution.
- [ ] Write the built-in ownership matrix and map every current built-in handler to either core shell logic or runtime adapter execution.
- [ ] Freeze the rule that `reaction` / `data-source` execution bodies must call into action-core instead of growing separate executors.
- [ ] Remove delayed compile assumptions from action execution seams and freeze the minimum compiled-value evaluation contract.
- [ ] Keep public exports stable unless an explicitly documented migration shim is needed.

Exit Criteria:

- [ ] `runtime-factory.ts` shrinks toward assembly-only responsibilities.
- [ ] Action/request/source/reaction subsystems can be described as focused modules with minimal cross-subsystem imports.
- [ ] The repo has a pre-package boundary that can be lifted out without first redesigning public contracts.
- [ ] Request-runtime seam clearly includes the live consumers that currently share `executeApiSchema(...)`.
- [ ] Public `ActionContext` remains stable, while runtime-specific behavior is isolated behind one adapter object.
- [ ] Dispatch ordering owner and built-in ownership matrix are explicit enough that Phase 3 can move code without semantic drift.
- [ ] `reaction` / `data-source` owner shells and shared execution body are separated clearly enough that Phase 4 can harden them without inventing new executor logic.
- [ ] Action execution no longer depends on runtime delayed compile assumptions.

### Phase 3 - Extract `flux-action-core`

Status: planned
Targets: `packages/flux-action-core/`, `packages/flux-runtime/src/action-runtime*.ts`, `packages/flux-runtime/src/runtime-action-helpers.ts`, `packages/flux-runtime/src/action-scope.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/imports.ts`, `packages/flux-runtime/src/operation-control.ts`, `packages/flux-runtime/src/request-runtime*.ts`, `packages/flux-runtime/src/data-source-runtime*.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/form-runtime*.ts`, `packages/flux-runtime/src/index.ts`, `packages/flux-core/src/types/actions.ts`

- [ ] Create `@nop-chaos/flux-action-core` package shell and move action execution files plus `operation-control.ts` into it.
- [ ] Keep `ActionContext` in `flux-core` unchanged; move only the action execution body and generic async execution control into action-core.
- [ ] Keep action-core input on compiled action programs only; remove any remaining ad-hoc compile fallback from the extraction path.
- [ ] Define explicit runtime-host boundaries for namespaced action resolution, component-target dispatch, imported namespace lifecycle, and component registry access so they remain runtime-owned after extraction.
- [ ] Implement the single `ActionRuntimeAdapter` in `flux-runtime`, and make action-core call it for all runtime-specific effect execution while keeping dispatch ordering in action-core.
- [ ] Rewire ajax actions, form submit, async validation, data-source refresh triggers, and reaction dispatch to use the extracted action-core through ports rather than same-package coupling.
- [ ] Keep `ActionScope`, `ComponentHandleRegistry`, and `imports.ts` in `flux-runtime`, but make action-core consume them only through runtime-provided ports.
- [ ] Ensure the extracted action-core becomes the only action-graph executor used by ordinary action dispatch, reaction-triggered runs, and any data-source action body execution.

Exit Criteria:

- [ ] `@nop-chaos/flux-action-core` exists and `flux-runtime` no longer owns the main action execution implementation body.
- [ ] Namespaced action resolution, component-target dispatch, and import lifecycle remain explicitly runtime-owned in both code and docs.
- [ ] Public `ActionContext` stays stable, and action-core no longer needs runtime internals because all runtime-specific behavior goes through the single adapter object.
- [ ] Dispatch ordering still matches `built-in -> component -> namespaced -> not-found` after extraction.
- [ ] Generic async execution control now lives with action-core but is still documented as reusable beyond ajax.
- [ ] Plan 120 async-governance behavior remains unchanged after action-core extraction.
- [ ] No second parallel action executor remains in `reaction` or `data-source` paths after extraction.
- [ ] No runtime delayed compile path remains in action execution after extraction.

### Phase 4 - Request/Source/Reaction Boundary Hardening After Action-Core Extraction

Status: planned
Targets: `packages/flux-runtime/src/request-runtime*.ts`, `packages/flux-runtime/src/api-cache.ts`, `packages/flux-runtime/src/data-source-runtime*.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/form-runtime*.ts`, docs/tests

- [ ] Ensure request seam is consumed consistently by ajax actions, form submit, async validation, and data-source instead of only by one path.
- [ ] Rewire source/data-source runtime to consume action-core and request seam through stable ports rather than package-local reach-through.
- [ ] Rewire reaction runtime to consume action-core dispatch through stable ports rather than implicit same-package coupling.
- [ ] Freeze what remains runtime-owned versus what becomes a future request-extraction candidate scope.
- [ ] Keep `reaction` and `data-source` owner shells narrow: scheduling/publication stay local, execution body stays shared.

Exit Criteria:

- [ ] `executeApiSchema(...)` convergence across ajax, submit, validation, and data-source is preserved after action-core extraction.
- [ ] `data-source` and `reaction` keep their author-visible contract and plan 120 async-governance semantics.
- [ ] Future request-extraction candidate scope is explicit and no longer blocked by action-side ambiguity.
- [ ] `reaction` and `data-source` no longer imply or contain their own separate action execution framework.

### Phase 5 - Docs, Successor Boundaries, And Closure Audit

Status: planned
Targets: `packages/flux-runtime/src/index.ts`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/index.md`, `docs/logs/2026/04-21.md`, related references/examples/tests

- [ ] Update architecture docs so runtime module ownership matches the landed action-core extraction and hardened request/source/reaction seams.
- [ ] Update `docs/architecture/action-algebra-formal-spec.md` and `docs/architecture/api-data-source.md` so `Operation Control` is described as generic async execution control after the move.
- [ ] Update docs to state that action execution consumes compiled action programs and does not retain delayed compile fallback after compiler extraction.
- [ ] Write explicit successor-plan boundary for any future request extraction candidate; `flux-action-core` is no longer a successor because it lands in this plan.
- [ ] Document migration policy expectations for public exports after action-core extraction.
- [ ] Run independent closure audit against live code and docs, checking for interface-vs-semantics drift and leftover plan-owned work.

Exit Criteria:

- [ ] Docs no longer pretend runtime is a single undifferentiated giant assembly layer.
- [ ] `flux-action-core` extraction is reflected in docs and public export policy.
- [ ] Successor boundary for any future request extraction is explicit enough that a later package split can start without reopening the baseline audit.
- [ ] Closure audit confirms no hidden action-core extraction work remains inside this plan scope.

## Validation Checklist

- [ ] `flux-runtime` is observably thinner and closer to facade/owner assembly than at the start of the plan.
- [ ] `@nop-chaos/flux-action-core` is landed with stable dependency direction and no back-import into `flux-runtime` internals.
- [ ] `OperationControlConfig` remains in `flux-core`, while generic async execution helpers no longer live in `flux-runtime`.
- [ ] Public `ActionContext` contract remains stable through the extraction.
- [ ] Action execution only consumes compiled actions; delayed compile is not retained as a compatibility path.
- [ ] `data-source`, form submit, async validation, and ajax actions still share the documented request convergence path after seam hardening.
- [ ] `data-source` and `reaction` keep their current author-visible contract and async-governance semantics.
- [ ] `reaction` and `data-source` execution bodies reuse `flux-action-core` rather than maintaining parallel executors.
- [ ] `docs/architecture/flux-runtime-module-boundaries.md` and related docs are updated to the new ownership baseline.
- [ ] Focused verification covers action dispatch, non-ajax async action control behavior, ajax/request execution, form submit, data-source refresh, reaction dispatch, and any moved public exports.
- [ ] Independent subagent closure audit is completed and evidence is recorded here or in the daily log.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- `flux-action-core` may accidentally absorb runtime-specific owner semantics if ports are not made explicit early.
- A future extracted request package may become a grab bag if source/form/validation-specific policy leaks into it instead of staying in runtime owners.
- If successor plans are not written clearly, this plan may appear “done” while package extraction baseline is still ambiguous.
- If the extraction stalls, Phase 2 seam hardening is the rollback-safe stopping point; after Phase 3 starts, package creation must either land fully or be explicitly rolled back.

## Closure

Status Note: Not closed. This plan is the active owner for post-compiler `flux-action-core` extraction plus request/source/reaction seam hardening once approved.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Plan 122 is a prerequisite for any file movement that overlaps compiler-owned runtime files or shared module-boundary docs.
- Expected successor plan after closure: only if closure audit shows request execution has become a stable package boundary; otherwise it remains a runtime-internal shared substrate and no extra package plan is needed.
