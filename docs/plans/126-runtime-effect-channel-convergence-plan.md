# 126 Runtime Effect Channel Convergence Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-22
> Source: `docs/analysis/experiment-retrospective-value-assessment.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/api-data-source.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/120-runtime-async-governance-convergence-plan.md`, `docs/plans/125-flux-runtime-async-data-internal-reorganization-plan.md`
> Related: `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/120-runtime-async-governance-convergence-plan.md`

## Purpose

在不改动作者可见 action/source/data-source/reaction 合同、也不把当前 runtime 重写成完整 effect algebra 的前提下，为 Flux 在已经统一的 `ActionRuntimeAdapter` action invocation boundary 之上，进一步建立可选的 runtime-internal `EffectChannel` 收敛层，使关键 host/runtime side effects 能共享统一的拦截、审计、取消归属和测试替身能力。

## Current Baseline

- `ActionRuntimeAdapter` 现已统一承接 built-in / component / namespace 三类 action 的最终 runtime invocation boundary；`flux-action-core` 负责 dispatch ordering、selector classification、compiled payload evaluation，`flux-runtime` 负责具体调用落点。
- `reaction` 与 `source` 已在“执行体”层复用共享 substrate：`reaction.actions` 通过 `helpers.dispatch(...)` 进入 action dispatch，action-backed/api-backed `source` body 通过 `createSourceExecutor(...)->executeAction(...)` 复用 action-core，因此两者最终也会落到统一的 `ActionRuntimeAdapter` action boundary。
- `data-source` 则只在部分执行体上共享 request/action substrate；其 refresh/publish/polling/status/async-governance/dispose 仍是 owner-level orchestration，不是普通 action run。
- `executeApiSchema(...)` 已是 ajax、form submit、async validation、data-source request 的共享 request convergence path；`async-governance` 也已经为 `data-source`、`reaction`、async validation 提供 shared `runId` / `supersededBy` / `stale-dropped` 基线。
- 当前缺口不是“action family 没有统一 boundary”，而是 runtime-wide side effects 仍分散：`data-source` owner orchestration、imports、部分 `env.notify` / `env.navigate` / `env.fetcher` 调用仍未纳入统一 effect interception plane。
- `data-source` 不能简单被改写为“每次 refresh 都是普通 action dispatch”：它除了执行体，还拥有 owner-level publication、status、polling、dedup、refresh policy、request reuse、scope-tree disposal 和 async-governance 语义。这些不是普通 action graph 的职责。

## Remaining Seam Inventory

### Already Converged

- Built-in / `component:<method>` / namespaced actions now share the single `ActionRuntimeAdapter` invocation boundary.
- `reaction.actions` already reuses that boundary through `runtime.dispatch(...)`.
- Action-backed and api-backed `source` execution bodies already reuse that boundary through `createSourceExecutor(...)->executeAction(...) -> runtime.dispatch(...)`.

### Keep As Owner-Local Orchestration

- `data-source` refresh scheduling, polling, dedup / refresh policy, stale-drop, async-governance settlement, publish-to-scope, and scope-tree disposal.
- formula `data-source` and formula source publication.
- owner status publication such as `status-owner.ts` and source status writes.
- direct scope/form writes that are the semantic payload of a built-in action after adapter entry (`setValue`, `setValues`, publish-to-scope helpers).

Rationale:

- These are not "one more action family"; they are owner lifecycle semantics or the final state-application side of an already-routed action.
- Forcing them through `ActionRuntimeAdapter` would blur the boundary between invocation routing and owner state orchestration.

### Candidate Future Convergence Targets

- Host notifications emitted outside schema-authored action execution:
  - `packages/flux-action-core/src/action-dispatcher.ts` on `onSettled` branch failure reporting
- Host navigation outside schema-authored built-in navigate actions if such paths appear later.
- Import-load failure reporting shape has been converged through a shared helper, but semantic ownership is still duplicated between runtime and react integration.
- Data-source failure notify, reaction fire-count warning notify, and the `flux-action-core` `onSettled` fallback notify path have all been converged through shared host-reporting helpers; the remaining gaps are now mostly semantic ownership questions and any future non-action host reports that still hand-roll their own semantics.
- A thinner request/audit seam above `env.fetcher(...)` if debugger / audit tooling needs one effect timeline across ajax, validation, form submit, and data-source requests.

Recommended convergence hook:

- Prefer an env decorator / adapter at the `SchemaRenderer` host boundary as the first implementation step for host-boundary seams.
- This is already a proven pattern in the repo via debugger integration (`decorateEnv(env)` + `runtime.setEnv(env)`), so notify/fetcher/navigate interception does not require a new runtime-wide abstraction first.
- A shared low-level helper now exists in `@nop-chaos/flux-core` for decorating `fetcher` / `notify` / `navigate`, which should be the default baseline for future host-boundary wrappers.

What env decoration solves well:

- `env.fetcher(...)` interception for request/audit tooling
- `env.notify(...)` interception for non-action notifications
- `env.navigate(...)` interception when navigation happens through host wiring

What env decoration does not solve by itself:

- owner lifecycle semantics (`data-source` polling, dedup, stale-drop, publish ordering, disposal)
- internal scope/form writes (`scope.update`, `form.setValue`, `page.store.setData`)
- duplicate semantic reporting sites such as import failure reporting; a decorator can normalize host calls, but code still may need de-duplication of who reports what and when

### Shared Request Substrate, But Not Adapter Targets

- `executeApiSchema(...)` remains the canonical request convergence path for ajax, form submit, async validation, and api-backed `data-source`.
- `form.submit(...)` and async validation should keep using that shared request substrate directly rather than being re-expressed as synthetic built-in actions.

Rationale:

- They already share the request execution semantics that matter most: adaptor evaluation, canonical request preparation, fetch / abort behavior, and response adaptation.
- Pushing them through `ActionRuntimeAdapter` would add another invocation layer without materially increasing convergence.

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
- 定义 runtime-internal effect taxonomy，覆盖 adapter-handled action invocation、request execute、notify、navigate、surface open/close、source refresh，以及仍保留 owner orchestration 的例外边界。
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
- [ ] 将 import failure reporting、dispatcher branch-error notify、data-source/reaction warning notify 分类为 host-boundary candidates，而不是误记为缺失的 action adapter coverage。
- [ ] 评估是否先用 `SchemaRenderer` 层 env decorator 收口 fetcher/notify/navigate，再决定 runtime-internal effect channel 是否还有必要扩大范围。

Exit Criteria:

- [ ] 有一份 repo-observable 的 effect taxonomy，可映射到现有实现文件。
- [ ] `docs/architecture` 明确写出“data-source execution body can reuse action dispatch, but data-source owner refresh is not just an action dispatch”。
- [ ] `docs/architecture` 明确写出哪些 seams 已收口、哪些是 owner-local 例外、哪些是下一阶段 host-boundary 候选。
- [ ] 文档明确 env decorator 是 host-boundary convergence 的首选入口，而不是 action adapter 的替代物。

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
- [ ] 评估是否需要统一 import failure reporting seam，避免 `import-stack.ts` 与 `use-node-imports.ts` 各自重复 `notify + monitor`。
- [ ] 如果 env decorator 已足够覆盖 host-boundary observability，则缩小 runtime-internal effect channel 的实现范围，避免重复抽象。

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
- [ ] 文档明确 `form.submit` / async validation / data-source request 已共享 request substrate，但不是新的 adapter-unification gaps。
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
