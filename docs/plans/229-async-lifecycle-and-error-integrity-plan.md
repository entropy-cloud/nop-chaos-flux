# 229 Async, Lifecycle, And Error Integrity Plan

> Plan Status: planned
> Last Reviewed: 2026-05-07
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,06-async-safety.md,07-lifecycle.md,19-error-propagation.md}`
> Related: `docs/plans/{211-runtime-state-reactivity-and-safety-closure-plan.md,220-cross-boundary-state-and-host-contract-closure-plan.md,223-reactive-and-async-follow-up-closure-plan.md,224-validation-subtree-follow-up-plan.md}`

## Purpose

收口 `full-8` 中 retained async safety、local lifecycle disposal、以及 error-propagation fidelity defects。完成态要求：Flow create confirm / table quick-edit / report field-source refresh 的 async baseline honest，局部 owned runtimes/registries 会释放，`ok:false` 与 retained error surfaces 不再被误报成功或被静默替换，并有 focused proof。

## Current Baseline

- 维度 06 保留了 3 个 defects：Flow create dialog confirm 缺同步门闩、table quick-edit save 缺同步门闩、report field-source refresh 缺 `AbortSignal` or equivalent stale-drop contract。
- 维度 07 保留了局部 `FormRuntime` dispose 与 node/root component registry dispose 责任缺口。
- 维度 19 保留了 reaction `ok:false`、async validation action `ok:false`、`onSettled` result failure ignore、parallel aggregate missing representative error、submit-form registry error replacement、code-editor resolver error replacement、`compileTemplate` returns `[error]` success、compile continueOnError unknown renderer throws。
- `211` 已关闭 earlier async/error families；本计划只拥有 `full-8` 仍保留的 distinct residuals。
- `220` 已关闭 runtime dispose surface-entry correctness；本计划不重开 `220` 的 runtime teardown baseline，只处理局部 owned runtime/registry disposal and error-fidelity residuals.

## Goals

- 为 retained async paths 建立同步门闩与 honest cancellation/stale-drop baseline。
- 为 locally owned runtimes/registries 建立 dispose 责任。
- 为 retained error-fidelity paths 建立 honest failure propagation。

## Non-Goals

- 不接管 state ownership/reactive precision owned by `223`。
- 不接管 validation-owner semantics owned by `224`，除非 `ok:false` async validation helper 的 failure propagation 明确属于本计划。
- 不把本计划扩大成 generic async framework rewrite。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`
- `packages/report-designer-core/src/runtime/field-sources.ts` and directly affected provider interfaces/adapters
- `packages/flux-react/src/form.tsx`, `use-node-scopes.ts`, `schema-renderer.tsx`
- `packages/flux-runtime/src/{runtime-action-helpers.ts,reaction-runtime.ts,action-adapter.ts}`
- `packages/flux-code-editor/src/code-editor-renderer/*` where retained resolver error replacement applies
- `packages/flux-formula/src/compile/formula-compiler.ts`
- `packages/flux-compiler/src/schema-compiler.ts` only for the retained `continueOnError` / unknown-renderer error-fidelity residual
- directly affected focused tests and owner docs for the above files

### Out Of Scope

- runtime ownership/reactive precision owned by `223`
- validation structural semantics owned by `224`
- module-boundary splits owned by `222`

## Execution Plan

### Workstream 1 - Close Retained Async And Lifecycle Gaps

Status: planned
Targets: Flow, table quick-edit, report field-source, local runtime/registry disposal surfaces

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Add synchronous operation-level guards for Flow create confirm and table quick-edit save.
- [ ] [Fix] Add `AbortSignal` support or an explicit stale-drop contract for report field-source refresh.
- [ ] [Fix] Dispose locally owned `FormRuntime` and node/root registries on unmount without reopening `220`'s runtime teardown closure.
- [ ] [Proof] Add focused tests for the retained async guards and local disposal behavior.

Exit Criteria:

- [ ] The retained async and local lifecycle defects are closed on the supported paths.
- [ ] Focused tests cover the landed guards and disposal behavior.
- [ ] Affected owner docs are updated if the stable baseline changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Restore Error-Fidelity Integrity

Status: planned
Targets: runtime/code-editor/formula/compiler error surfaces, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Propagate `ActionResult.ok === false` consistently for reaction dispatch and async validation helpers.
- [ ] [Fix] Preserve or surface representative errors for retained `onSettled`, aggregate/parallel, submit-form registry resolution, and code-editor resolver paths.
- [ ] [Fix] Remove retained false-success error handling from `compileTemplate` and align compile diagnostics behavior for the owned continue-on-error residual.
- [ ] [Proof] Add focused tests for the final error-fidelity baseline.

Exit Criteria:

- [ ] The retained error-fidelity defects are closed on the supported paths.
- [ ] `ok:false` is not silently reported as success on the owned paths.
- [ ] Focused tests cover the landed failure propagation behavior.
- [ ] Affected owner docs are updated if the stable error contract changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Verification And Closure Audit

Status: planned
Targets: in-scope packages/tests/docs, this plan

- Item Types: `Proof | Decision`

- [ ] Run focused verification for async/lifecycle and error-fidelity workstreams.
- [ ] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all changes land.
- [ ] Perform an independent closure audit and fix any remaining in-scope ambiguity before closing the plan.

Exit Criteria:

- [ ] Focused verification is recorded for both retained families.
- [ ] Workspace verification passes.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] All in-scope retained async and lifecycle defects are fixed.
- [ ] All in-scope retained error-fidelity defects are fixed.
- [ ] Focused verification exists for each landed family.
- [ ] No in-scope retained defect is silently deferred or downgraded.
- [ ] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Validation Checklist

- [ ] `211`, `220`, `223`, and `224` carve-outs remain explicit.
- [ ] Error-fidelity fixes preserve representative error information instead of replacing it with weaker placeholders.
- [ ] Focused tests cover both async/lifecycle and error-fidelity families.
- [ ] No retained `full-8` item from dimensions 06/07/19 is left without an owner decision.

## Closure

Status Note: pending execution.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending execution.
