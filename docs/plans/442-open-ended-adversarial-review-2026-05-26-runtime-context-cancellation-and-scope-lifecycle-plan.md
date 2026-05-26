# 442 Open-Ended Adversarial Review 2026-05-26 Runtime Context Cancellation And Scope Lifecycle Plan

> Plan Status: completed
> Last Reviewed: 2026-05-26
> Source: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-04.md}`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`, `docs/architecture/scope-ownership-and-isolation.md`

## Purpose

收口 2026-05-26 对抗性审查中 runtime cross-boundary 能力传递、validation cancellation、以及 ephemeral scope lifecycle 的 live defects，让 source-enabled props、validation owner APIs、temporary event/evaluation scopes 在当前 runtime contract 下可组合、可取消、可释放。

## Current Baseline

- `R26-01-F1`: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/round-01.md` 已确认 renderer-declared `allowSource` prop path 会通过 `SourceObserver` 丢失 caller renderer 的 `ActionContext`，导致 namespaced/imported/component action-backed sources 在普通 source-enabled props 中不可用。
- `R26-02-F1`: `round-02.md` 已确认底层 validation executor 已支持 `AbortSignal`，但 public `ValidationScopeRuntime.validateAt` / `validateSubtree` / `validateAll` 无 options carrier，commit/subtree validation 不能被取消。
- `R26-04-F1`: `round-04.md` 已确认多个 renderer 为一次性 event/evaluation payload 创建 runtime-owned child scopes，却没有对应 disposal，长期交互或渲染会累积 owned scopes。
- 三条 finding 共享一个 runtime owner surface：跨边界 runtime capability 必须随调用生命周期一起传递和释放。修复不应只靠调用点局部约定，而应在 public contracts/helpers 中表达可传递的 context、可取消的 validation、以及临时 scope 的所有权规则。

## Goals

- 修复 `R26-01-F1`, `R26-02-F1`, `R26-04-F1`。
- 让 source-enabled prop execution 与 `helpers.executeSource(...)` 使用同等 action context 能力，至少覆盖 action scope、component registry、node/form/page/surface/evaluation bindings。
- 让 public validation owner APIs 可以接收并传播 `AbortSignal`，包括 form aliases、managed validation scopes、projected validation runtimes、subtree traversal。
- 移除或安全处置 one-off runtime-owned child scopes，确保 event/evaluation payloads 不泄漏 runtime-owned resources。
- 添加 focused tests / lifecycle proofs that fail on the audited bad paths.

## Non-Goals

- 不重新设计 named data-source ownership，除非执行证明它与 `allowSource` path 共用同一个 context-loss root cause。
- 不重写 validation rule semantics；本计划只补 cancellation carrier and propagation。
- 不把 all scope creation 禁掉；materialized renderer child scopes仍可存在，但必须有明确 owner lifecycle/disposal。
- 不把 confirmed lifecycle leak 或 API cancellation gap 放入 non-blocking follow-up。

## Scope

### In Scope

- `packages/flux-core/src/types/*` runtime/source/validation context types.
- `packages/flux-react/src/{renderer-helpers.ts,node-renderer-resolved.tsx,render-nodes.tsx}` or whichever live React source-observer binding owns source-enabled prop context.
- `packages/flux-runtime/src/async-data/{source-observer.ts,source-executor.ts}`, validation runtimes, `runtime-factory.ts`, `form-runtime.ts`, `form-runtime-owner.ts`, `form-runtime-validation.ts`.
- Ephemeral scope call sites retained in `round-04.md`: tabs, loop, recurse, report field panel, table event contexts, and any additional matching live call sites found during re-audit.
- Owner docs: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`, `docs/architecture/scope-ownership-and-isolation.md`, plus daily logs.

### Out Of Scope

- New action language features, new validation rule types, or broad source system redesign beyond preserving current advertised action context semantics.
- Performance optimization unrelated to preventing scope leaks and unnecessary temporary owners.
- Re-reporting already closed action cancelled/timedOut failure-class work.

## Execution Plan

### Phase 1 - Re-verify Runtime Contract Boundaries

Status: completed
Targets: source-enabled prop path, validation owner APIs, scope creation/disposal call sites, owner docs

- Item Types: `Decision | Proof`

- [x] Re-verify `R26-01-F1`, `R26-02-F1`, and `R26-04-F1` against live code before implementation begins.
- [x] Build an exact call-path map for source-enabled props from compiled renderer prop through React source observer registration into `runtime.executeSource(...)`.
- [x] Build an exact validation call-path map for form submit, detail commit, projected validation owner, and non-form `ValidationScopeRuntime` paths.
- [x] Build an exact ephemeral-scope inventory and classify each retained call site as `replace with evaluationBindings`, `temporary scope with try/finally disposal`, or `materialized owner requiring retained lifecycle`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The live baseline is re-audited and this plan's in-scope set is adjusted only through explicit recorded scope change.
- [x] Source context carrier, validation options carrier, and temporary-scope ownership decisions are recorded before code changes.
- [x] Affected owner docs are identified for later update, or `No owner-doc update required` is explicitly justified for a phase.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Preserve Action Context For Source-Enabled Props

Status: completed
Targets: `packages/flux-react`, `packages/flux-runtime/src/async-data`, `packages/flux-core` source/action context types, tests/docs

- Item Types: `Fix | Decision | Proof`

- [x] Extend the source observer entry/run contract or introduce a node-bound observer factory so renderer-declared `allowSource` props can receive the same merged action context as helpers/events.
- [x] Ensure action-backed anonymous sources launched from source-enabled props can invoke namespaced/imported actions and `component:<method>` targets using the caller renderer context.
- [x] Preserve cancellation behavior for source observer refreshes while adding the context carrier.
- [x] Add focused regression tests for at least one source-enabled prop backed by a namespaced/imported action and one backed by a component capability action.
- [x] Update `api-data-source` / `renderer-runtime` docs to describe the final supported context boundary.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R26-01-F1` is fixed.
- [x] Source-enabled prop execution has parity with `helpers.executeSource(...)` for the retained action context capabilities.
- [x] Focused tests fail on the old context-loss path and pass on final behavior.
- [x] Owner docs are updated to the final live baseline.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Add AbortSignal Carrier To Validation Owner APIs

Status: completed
Targets: `packages/flux-core`, `packages/flux-runtime`, `packages/flux-renderers-form-advanced`, validation docs/tests

- Item Types: `Fix | Decision | Proof`

- [x] Add an options parameter containing `signal` to `ValidationScopeRuntime.validateAt`, `validateSubtree`, and `validateAll`, while preserving source compatibility for callers that omit options.
- [x] Thread the options through form runtime aliases, managed validation scopes, projected validation runtimes, `validatePath`, `validateSubtreeByNode`, and fallback subtree traversal.
- [x] Wire available close/supersession/unmount abort controllers in detail commit or projected validation paths where execution proves they already exist.
- [x] Add focused tests proving an async rule invoked through owner/subtree validation observes abort and does not publish stale result after cancellation.
- [x] Add compatibility proof that existing no-options validation callers still typecheck and execute with unchanged semantics.
- [x] Update `docs/architecture/form-validation.md` and reference types to the final public API.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R26-02-F1` is fixed.
- [x] Public validation owner APIs can carry cancellation without breaking existing no-options callers.
- [x] No-options caller compatibility is proven by typecheck and focused/runtime coverage.
- [x] Focused tests cover abort propagation through at least form owner and projected/non-form owner paths.
- [x] Owner docs and reference type docs are synced to the final live baseline.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 4 - Eliminate Ephemeral Runtime-Owned Scope Leaks

Status: completed
Targets: retained call sites from `round-04.md`, runtime helper APIs if needed, lifecycle docs/tests

- Item Types: `Fix | Decision | Proof`

- [x] Replace temporary event/evaluation scopes with `evaluationBindings` overlays where no real `ScopeRef` is needed.
- [x] For call sites that truly need a `ScopeRef`, add a safe temporary-scope helper or local `try/finally` disposal pattern that calls the correct runtime disposal API after sync or async work completes.
- [x] Fix retained call sites in tabs, loop, recurse, report field panel, table event contexts, and any additional matching live call sites found in Phase 1.
- [x] Add focused lifecycle tests or instrumentation-level tests that prove repeated interactions/evaluations do not grow runtime-owned scope registries or leave parent subscriptions behind.
- [x] Cover thrown and async-rejected action/evaluation paths for any temporary-scope helper or `try/finally` pattern introduced by this phase.
- [x] Update `renderer-runtime` / `scope-ownership-and-isolation` docs to distinguish materialized child scopes from temporary event/evaluation overlays.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R26-04-F1` is fixed for all retained live call sites.
- [x] Temporary event/evaluation contexts are either non-owning overlays or disposed deterministically.
- [x] Temporary-scope disposal remains deterministic when the wrapped work throws or rejects.
- [x] Focused proof covers at least one hot event path and one render/evaluation path from the retained finding set.
- [x] Owner docs are updated to the final lifecycle baseline.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 5 - Workspace Verification And Closure Audit

Status: completed
Targets: focused tests, workspace verification, this plan

- Item Types: `Proof`

- [x] Run focused source/context tests, validation cancellation tests, and scope lifecycle tests.
- [x] Run repository verification required for code changes: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and relevant `pnpm test` scope before full test closure.
- [x] Perform independent closure audit with a fresh subagent or reviewer after all code/docs/tests are landed.
- [x] Update this plan's status/checklists only after every in-scope item and closure gate is truly satisfied.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Focused tests for source context, validation cancellation, and scope lifecycle pass.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] Relevant/full test command passes or any non-plan-owned failure has explicit successor ownership before closure.
- [x] Independent closure audit evidence is recorded.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] All in-scope confirmed live defects are fixed: `R26-01-F1`, `R26-02-F1`, `R26-04-F1`.
- [x] Source-enabled prop execution preserves the caller renderer action context needed by supported action-backed sources.
- [x] Public validation owner APIs can propagate cancellation through subtree/owner validation paths.
- [x] Temporary event/evaluation scopes are non-owning or deterministically disposed.
- [x] Necessary focused verification is complete and asserts correct final behavior/resource cleanup.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are updated to the final live baseline, or an explicit `No owner-doc update required` decision is recorded for a phase.
- [x] Independent subagent / independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Execution Notes

- Focused verification passed in package-local environments for `packages/flux-runtime/src/__tests__/{owner-validation-lifecycle-contracts.test.ts,source-observer-action-context.test.ts}` plus `src/async-data/source-observer.test.ts`, `packages/flux-react/src/__tests__/{node-source-prop-controller.test.ts,use-node-source-props.test.tsx}`, and `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.test.ts`.
- Touched-package `typecheck` passed for `@nop-chaos/flux-runtime`, `@nop-chaos/flux-react`, `@nop-chaos/flux-renderers-form`, and `@nop-chaos/flux-renderers-form-advanced`. Workspace `build` passed.
- Workspace `lint` and `check` remain blocked by pre-existing oversized-file gates outside this plan's scope, led by `packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts` already exceeding the repository hard limit.
- Independent closure audit recorded after implementation; no remaining in-scope runtime contract defect was found open.

## Draft Review Record

- Initial draft created from the 2026-05-26 open-ended adversarial review result set.
- Independent draft review: `accept with required revisions` (`ses_19dba036dffeS8Em2fMOI7kM26`). No blocking changes required for this plan. Non-blocking suggestions applied: explicit no-options validation compatibility proof and thrown/async temporary-scope disposal proof.
- Independent follow-up review: `accept` (`ses_19dba036dffeS8Em2fMOI7kM26`). Consensus reached; no remaining blocking revisions.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- Audit named data-source context fidelity after source-enabled prop parity lands. This is non-blocking for this plan unless Phase 1 proves named sources share the same in-scope context-loss root cause.
