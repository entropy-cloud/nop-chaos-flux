# 126 Runtime Effect Channel Convergence Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-22
> Source: `docs/analysis/experiment-retrospective-value-assessment.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/api-data-source.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/120-runtime-async-governance-convergence-plan.md`, `docs/plans/125-flux-runtime-async-data-internal-reorganization-plan.md`
> Related: `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/120-runtime-async-governance-convergence-plan.md`

## Purpose

在不改动作者可见 action/source/data-source/reaction 合同、也不把当前 runtime 重写成完整 effect algebra 的前提下，为 Flux 在已经统一的 `ActionRuntimeAdapter` action invocation boundary 之上，进一步建立可选的 runtime-internal `EffectChannel` 收敛层，使关键 host/runtime side effects 能共享统一的拦截、审计、取消归属和测试替身能力。

## Current Baseline

- `ActionRuntimeAdapter` 现已统一承接 built-in / component / namespace 三类 action 的最终 runtime invocation boundary；`flux-action-core` 负责 dispatch ordering、selector classification、compiled payload evaluation，`flux-runtime` 负责具体调用落点。
- `reaction` 与 `data-source` 已在“执行体”层复用共享 substrate：`reaction` 通过 `helpers.dispatch(...)` 进入 action dispatch，`data-source` 的 action-backed source body 通过 `createSourceExecutor(...)->executeAction(...)` 复用 action-core。
- `executeApiSchema(...)` 已是 ajax、form submit、async validation、data-source request 的共享 request convergence path；`async-governance` 也已经为 `data-source`、`reaction`、async validation 提供 shared `runId` / `supersededBy` / `stale-dropped` 基线。
- 当前缺口不是“action family 没有统一 boundary”，而是 runtime-wide side effects 仍分散：`data-source`、`reaction`、imports、部分 `env.notify` / `env.navigate` / `env.fetcher` 调用仍未纳入统一 effect interception plane。
- `data-source` 不能简单被改写为“每次 refresh 都是普通 action dispatch”：它除了执行体，还拥有 owner-level publication、status、polling、dedup、refresh policy、request reuse、scope-tree disposal 和 async-governance 语义。这些不是普通 action graph 的职责。

## Goals

- 为 runtime 建立一个内部 `EffectChannel` / middleware 层，以已统一的 `ActionRuntimeAdapter` 作为 action invocation 入口，再向 host/runtime side effects 扩展。
- 保持 built-in / component / namespace 三类 action 继续共享统一 adapter boundary，并在此基础上补充 audit metadata 和 interception hook。
- 在不破坏 `data-source` / `reaction` owner 语义的前提下，让 request / notify / navigate 等关键 host boundary 可被同一套 effect middleware 观察或替换。
- 为后续 dialog/surface close -> action chain cancellation、debugger effect timeline、focused mock testing 预留稳定内部接线点。

## Non-Goals

- 不把当前 runtime 重写为 v5/Final 风格的完整 JSON 可序列化 effect algebra。
- 不把 `data-source`、`reaction`、async validation、form submit 变成同一种业务 owner 模型。
- 不把所有 `scope.update()` / `form.setValue()` 立即强制改写为 effect-as-data 协议。
- 不改变 `ActionRuntimeAdapter`、`ActionSchema`、`SourceSchema`、`DataSourceSchema`、`ReactionSchema` 的 author-visible contract。

## Scope

### In Scope

- `packages/flux-runtime/src/action-adapter.ts` 的内部执行路径中间件化。
- 定义 runtime-internal effect taxonomy，覆盖 adapter-handled action invocation、request execute、notify、navigate、surface open/close、source refresh。
- 评估并增量接线 `data-source` / `reaction` / import failure 路径对 request/notify effect channel 的复用方式。
- 补充 architecture / analysis / plan docs，明确“执行体复用”与“owner lifecycle 不同”的边界。

### Out Of Scope

- 不在本计划中设计 worker replay、time-travel effect log、或 crash-recovery journal。
- 不在本计划中合并 async-governance 与 effect channel 为单一 giant abstraction。
- 不在本计划中把 `data-source` refresh scheduler、polling loop、status publication 迁移到 `flux-action-core`。

## Execution Plan

### Phase 1 - Baseline Audit And Taxonomy Freeze

Status: planned
Targets: `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/async-data/*.ts`, `packages/flux-runtime/src/import-stack.ts`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/api-data-source.md`

- [ ] 审计当前 runtime 中所有主要 side-effect 出口，区分 unified action adapter boundary、request convergence path、owner-local side effects、以及 host-only 旁路。
- [ ] 定义最小 `RuntimeEffect` 判别联合与 middleware context，明确哪些 effect 需要统一元数据，哪些仅做 passthrough。
- [ ] 明确 `data-source` / `reaction` 与 effect channel 的接线原则：共享 request/notify/navigate seams，但不把 owner lifecycle 降格为普通 action。

Exit Criteria:

- [ ] 有一份 repo-observable 的 effect taxonomy，可映射到现有实现文件。
- [ ] `docs/architecture` 明确写出“data-source execution body can reuse action dispatch, but data-source owner refresh is not just an action dispatch”。

### Phase 2 - Action Adapter Middleware Shell

Status: planned
Targets: `packages/flux-runtime/src/action-adapter.ts`, focused tests under `packages/flux-runtime/src/__tests__/`

- [ ] 在 `flux-runtime` 内新增 `EffectChannel` 实现，并让 `createActionRuntimeAdapter(...)` 通过 channel dispatch unified action invocations。
- [ ] 先覆盖 adapter-handled built-in invocations，再确认 component/namespace invocation 是否只需要 metadata interception 而不需要更深 middleware 拆分。
- [ ] 保持 `ActionRuntimeAdapter` 对 `flux-action-core` 的外部接口不变。

Exit Criteria:

- [ ] unified action adapter execution 已经先经过统一 middleware 层，再进入具体 handler。
- [ ] 现有 built-in action focused tests 继续通过，无 author-visible contract drift。

### Phase 3 - Component / Namespace / Host Boundary Convergence

Status: planned
Targets: `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/action-scope.ts`, `packages/flux-runtime/src/async-data/request-runtime.ts`, `packages/flux-runtime/src/async-data/data-source-runtime.ts`, `packages/flux-runtime/src/async-data/reaction-runtime.ts`, `packages/flux-runtime/src/import-stack.ts`

- [ ] 让 `invokeComponentAction(...)` 和 `invokeNamespacedAction(...)` 通过 effect channel 记录统一 metadata，并保留现有 provider contract。
- [ ] 为 request execute、notify、navigate 增加可复用的 effect handler，使 `data-source` / `reaction` / import failure 至少可共享 host-boundary interception，而不是各自直连 env。
- [ ] 明确哪些 runtime-owned side effects 仍保留 direct call 作为刻意例外，并记录原因。

Exit Criteria:

- [ ] component / namespace / request / notify / navigate 至少已有统一 effect metadata 接线点。
- [ ] `data-source` 与 `reaction` 没有被重构成 fake action owners，但能复用共享 host-boundary handlers。

### Phase 4 - Cancellation Ownership And Audit Surface

Status: planned
Targets: `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/async-data/*.ts`, debugger-facing docs if needed

- [ ] 评估 dialog/surface close -> child action chain cancellation 的最小接线点，优先复用现有 `AbortSignal` 基线而非新建并发框架。
- [ ] 为 effect events 增加最小充分的 metadata：`interactionId`、`scopeId`、`nodeId`、`ownerKind`、`ownerId`、effect kind、settle outcome。
- [ ] 补充 focused tests，覆盖 cancellation、audit ordering、以及 stale/settled behavior 的 observability。

Exit Criteria:

- [ ] 至少一个 surface-owned cancellation path 能证明 effect channel 对取消归属有实际收益。
- [ ] debugger / monitor docs 能说明 effect metadata 的来源和限制。

## Validation Checklist

- [ ] `ActionRuntimeAdapter` 外部 contract 继续保持为统一 action invocation boundary，未扩大为新的 public architecture burden。
- [ ] `data-source` / `reaction` 继续保留 owner-level publication、status、polling、dedup、async-governance 语义。
- [ ] request convergence (`executeApiSchema`) 仍然是 ajax / submit / validation / data-source request 的共享入口。
- [ ] architecture / analysis docs 已同步说明“执行体复用 != owner 模型统一”。
- [ ] focused verification 已覆盖 built-in action dispatch、component invoke、namespace invoke、data-source refresh、reaction dispatch、surface cancellation。
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: 未开始执行。只有在 built-in action、host-boundary interception、以及至少一个实际 cancellation/audit consumer 落地后，才应评估是否关闭。

Closure Audit Evidence:

- Reviewer / Agent: TBD
- Evidence: TBD

Follow-up:

- 如果后续确实出现 worker replay / effect journal / pure-data protocol 的真实消费者，再拆 successor plan 处理 effect serialization。
- 如果最终发现只有 request/notify/navigate 需要统一 interception，而不需要完整 middleware taxonomy，可缩小本计划并把剩余 effect-algebra 方向移出当前 scope。
