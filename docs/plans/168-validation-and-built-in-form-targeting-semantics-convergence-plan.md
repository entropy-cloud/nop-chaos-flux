# 168 Validation And Built-In Form Targeting Semantics Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-deep-audit-full/08-validation.md`, `docs/analysis/2026-05-01-adversarial-review.md`, `docs/analysis/2026-05-01-adversarial-review-follow-up.md`, `docs/architecture/form-validation.md`, `docs/architecture/action-scope-and-imports.md`, `docs/references/action-payload-matrix.md`
> Related: `docs/plans/157-validation-owner-and-submitform-implementation-alignment-plan.md`, `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`, `docs/plans/164-adversarial-review-uncovered-findings-remediation-plan.md`, `docs/plans/67-hidden-field-policy-implementation-plan.md`, `docs/plans/119-action-precompile-and-args-unification-plan.md`

## Purpose

收口 2026-05-01 审核后仍未被现有计划 owning 的 validation / submit / built-in form targeting 语义缺口，避免继续同时存在：

- compiler 已经暴露 owner / hidden-field / action targeting surface
- runtime 只落了一部分 happy path 语义
- docs 与 prop coverage tests 继续把未完成语义当成已支持 contract

这份计划只负责 `validation semantics + built-in form targeting` 这一条 owner surface，不把 surface-root owner identity、raw-schema renderer bypass、a11y/i18n、或 test-quality cleanup 混进同一个计划。

## Current Baseline

- `docs/plans/157-validation-owner-and-submitform-implementation-alignment-plan.md` 已完成 supported owner families 与 child validation contracts 的第一轮落地，但并未收口所有 submit / targeting / hidden-field 语义细节。
- `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md` 当前 owning `core -> react -> runtime` root boundary、page/surface/form validation-owner family、以及 runtime disposal / managed surface lifecycle；它不 owning compiler-side validation collection、built-in `formId` resolution、或 hidden-field submit policy 的语义收口。
- `docs/plans/164-adversarial-review-uncovered-findings-remediation-plan.md` 当前 owning scope safety、formula hardening、validation resilience、tree/table a11y 和 i18n；它不 owning validation trigger semantics、submit orchestration semantics、或 built-in targeting contract。
- `packages/flux-compiler/src/schema-compiler/validation-collection.ts` 当前递归收集 validation 时不会在 `create-owner` 边界停止，导致 child owner 既生成自己的 plan，又可能继续被 parent owner 吸入。
- `packages/flux-renderers-form/src/field-utils.tsx` 当前把 `validateOn: 'change'` 的执行时机错误绑到 `touched`，把“何时运行验证”与“何时显示错误”混成一条规则。
- `packages/flux-runtime/src/form-runtime-derived-state.ts` 当前会让 active `summary-gate` child contract 影响 `canSubmit`，但 `packages/flux-runtime/src/form-runtime-submit-flow.ts` 的真实 submit path 只检查 `recurse-submit`，没有把 `summary-gate` 作为 runtime invariant 执行。
- `packages/flux-runtime/src/action-adapter.ts` 当前对 built-in `setValue` / `setValues` / `submitForm` 没有真正的 `formId` resolution：`setValue` / `setValues` mismatch 时静默退回 `ctx.scope.update(...)`，`submitForm` 则完全忽略 `targeting.formId`。
- `packages/flux-renderers-form/src/renderers/form-definition.ts`、`packages/flux-compiler/src/schema-compiler.ts` 和 `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts` 已经把 `submitWhenHidden` 暴露为公开 surface，但 `packages/flux-core/src/types/validation.ts`、`packages/flux-core/src/validation-model.ts` 与 runtime submit/validation path 并未实现该语义。
- `packages/flux-runtime/src/form-runtime-field-ops.ts` 当前仍按 `path -> registrationId` 单实例假设工作；而 active docs 对 runtime registration 的表述仍带有更宽的 registrationId-based multi-instance 色彩。
- `docs/plans/67-hidden-field-policy-implementation-plan.md` 当时明确不引入独立 `submitWhenHidden`；当前 live repo 已经出现“schema/compiler 暴露了它，但 runtime 不支持”的新漂移，本计划必须把这个 contract 收口成单一事实。

## Goals

- 让 parent validation collection、validation trigger、child gating、submit orchestration 在 supported owner families 内形成一致的 live semantics。
- 让 built-in form-targeting carriers（尤其 `formId`）要么成为真实可执行 contract，要么从 active baseline 中被明确降级/移除，而不是继续停留在“看起来支持”的表面语义。
- 让 hidden-field submit policy 形成单一事实：要么真正实现，要么从公开 schema/compiler/doc/test surface 中移除。
- 让 docs、compiler prop coverage、focused tests 与 live runtime 语义重新对齐。

## Non-Goals

- 不处理 page/surface validation-owner family、surface-root validation owners、runtime disposal 泄漏、或 dialog/drawer multi-open owner identity 冲突；这些属于 `Plan 163`。
- 不处理 scope dangerous-key 过滤、formula depth/error hardening、tree/table a11y、或 i18n；这些属于 `Plan 164`。
- 不处理 raw schema fallback / `ignored + raw schema read` renderer-contract bypass；这些属于 renderer-contract successor plan。
- 不在本计划内推广 generalized filter/search/wizard owner families，或重做完整 multi-owner policy matrix。
- 不在本计划内做 `RendererComponentProps.props` 类型系统重设计。

## Scope

### In Scope

- `packages/flux-compiler/src/schema-compiler.ts`
- `packages/flux-compiler/src/schema-compiler/validation-collection.ts`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-core/src/types/validation.ts`
- `packages/flux-core/src/validation-model.ts`
- `packages/flux-runtime/src/action-adapter.ts`
- `packages/flux-runtime/src/form-runtime-derived-state.ts`
- `packages/flux-runtime/src/form-runtime-submit.ts`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-field-ops.ts`
- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-renderers-form/src/renderers/form-definition.ts`
- focused tests proving the above semantics
- `docs/architecture/form-validation.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/references/action-payload-matrix.md`
- `docs/logs/2026/05-01.md`

### Out Of Scope

- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/surface-runtime.ts`
- `packages/flux-react/src/dialog-host.tsx`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-renderers-form/src/renderers/fieldset.tsx`
- `packages/spreadsheet-core/src/core/filter-operations.ts`
- generic `ValidationScopeRuntime` substrate separation work owned by `Plan 163`
- renderer-contract / field-slot normalization work owned by successor plan 169

## Execution Plan

### Phase 1 - Freeze Final Semantic Decisions

Status: completed
Targets: `docs/architecture/form-validation.md`, `docs/architecture/action-scope-and-imports.md`, `docs/references/action-payload-matrix.md`, this plan

- [x] Re-audit the live behavior for `summary-gate`, `validateOn: change`, built-in `formId`, `submitWhenHidden`, and runtime registration identity before any code changes.
- [x] Freeze the final supported baseline for built-in `formId` carriers: **Decision — Real runtime target resolution with explicit failure semantics.** When `formId` is provided and resolves through `ctx.form` or component registry, use that target. When `formId` is provided but doesn't resolve, return error. When `formId` is not provided, current behavior (`scope.update` for `setValue`/`setValues`, `ctx.form` for `submitForm`).
- [x] Freeze the final supported baseline for `submitWhenHidden`: **Decision — Removed from public surface** (prop contract, prop coverage test, docs). Was never implemented at runtime; Plan 67 explicitly decided against it.
- [x] Decide whether runtime registration stays path-singleton in the supported baseline or needs minimal multi-registration support now: **Decision — Path-singleton remains the supported baseline.** Docs updated to record this explicitly.

Exit Criteria:

- [x] The plan records repo-observable final decisions for `formId`, `submitWhenHidden`, and registration identity instead of leaving them as vague future work.
- [x] `docs/architecture/form-validation.md`, `docs/architecture/action-scope-and-imports.md`, and `docs/references/action-payload-matrix.md` are updated to final-design wording for this plan's scope.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 2 - Correct Compiler And Trigger Semantics

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/validation-collection.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-runtime/src/form-runtime-field-ops.ts`, focused tests, scoped docs

- [x] Stop validation collection at supported `create-owner` boundaries so parent owners do not absorb child-owner validation plans in the supported paths.
- [x] Fix `validateOn: change` so validation execution follows the configured trigger semantics rather than the field's `touched` display state.
- [x] Align runtime registration identity with the Phase 1 baseline: either land the minimal code change needed for supported multi-instance cases, or narrow docs/tests to the accepted path-singleton behavior.
- [x] Add focused tests proving owner-boundary collection and change-trigger behavior in live code, not just in docs.

Exit Criteria:

- [x] Parent validation collection no longer crosses supported `create-owner` boundaries in live compiler output.
- [x] `validateOn: change` runs according to trigger semantics, independent of `touched` gating.
- [x] Runtime registration identity semantics are explicit and proven by focused tests.
- [x] `docs/architecture/form-validation.md` is updated to final-design wording for these behaviors.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 3 - Align Submit Orchestration And Built-In Form Targeting

Status: completed
Targets: `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/form-runtime-derived-state.ts`, `packages/flux-runtime/src/form-runtime-submit.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-core/src/types/actions.ts`, `packages/flux-core/src/types/validation.ts`, `packages/flux-core/src/validation-model.ts`, `packages/flux-renderers-form/src/renderers/form-definition.ts`, `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts`

- [x] Implement the Phase 1 `formId` decision across built-in `setValue`, `setValues`, and `submitForm`, so mismatch no longer silently writes to the current scope.
- [x] Make supported `summary-gate` child-owner semantics enforceable from the submit path, not only through button disabled state.
- [x] Resolve `submitWhenHidden` end to end per the Phase 1 decision: implement it through core/runtime/compiler/docs/tests, or remove it from the public surface and prop coverage.
- [x] Add focused regression tests for cross-form built-in targeting, programmatic submit through active `summary-gate`, and hidden-field submit policy.

Exit Criteria:

- [x] Built-in form-targeting carriers no longer present a false surface: supported target resolution works end to end, or unsupported carriers are explicitly removed/narrowed.
- [x] Supported `summary-gate` behavior is enforced by live submit orchestration rather than only by `canSubmit` UI state.
- [x] `submitWhenHidden` is either a real supported contract or no longer appears in active schema/compiler/doc/test surfaces.
- [x] Focused regression tests cover the new semantics directly.
- [x] `docs/architecture/form-validation.md`, `docs/architecture/action-scope-and-imports.md`, and `docs/references/action-payload-matrix.md` are updated to final-design wording.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 4 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, focused tests, scoped docs, this plan

- [x] Run focused verification for each landed semantic change.
- [x] Run repo-wide required verification after code changes land.
- [x] Perform a fresh independent closure audit that re-reads the live repo, checks each phase exit criterion, and confirms no remaining plan-owned semantic split survives in docs/tests/code.

Exit Criteria:

- [x] Each phase has focused verification tied to the live behavior it changed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Scoped docs describe final supported baseline only.
- [x] Independent closure audit confirms no remaining plan-owned work in scope.
- [x] `docs/logs/2026/05-01.md` records closure-audit evidence.

## Validation Checklist

- [x] parent validation collection respects supported owner boundaries
- [x] `validateOn: change` no longer depends on `touched`
- [x] built-in `formId` carriers are either real or explicitly removed/narrowed
- [x] `summary-gate` semantics are enforced by submit orchestration in supported paths
- [x] hidden-field submit policy is a single live fact across schema/compiler/runtime/docs/tests
- [x] runtime registration identity semantics are explicit and focused-tested
- [x] independent sub-agent or independent reviewer closure audit is completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

- The biggest scope risk is letting this plan absorb all remaining validation or action work. Keep surface-root owner lifecycle, disposal, and runtime substrate separation in `Plan 163`; keep a11y/i18n in `Plan 164`.
- The biggest semantic risk is accepting doc narrowing where a real live contract is still needed. Closure must distinguish “docs no longer promise it” from “supported behavior is actually implemented” and record which path was chosen for each finding.
- The biggest migration risk is changing built-in `formId` behavior without sufficient focused tests; any change here can silently break old schema that currently depends on accidental current-scope fallback.

## Closure

Status Note: All four phases completed. Parent validation collection stops at create-owner boundaries. validateOn:change no longer gated by touched. Built-in formId targeting has real resolution with explicit failure semantics. summary-gate contracts are enforced by submit orchestration. submitWhenHidden removed from public surface. Registration identity documented as path-singleton baseline.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit (re-read live repo), 2026-05-01
- Verdict: PASS
- Phase 1: All three semantic decisions (formId → real targeting with explicit failure, submitWhenHidden → removed, registration → path-singleton) recorded in plan and reflected in docs.
- Phase 2: validation-collection.ts:91-93 stops at create-owner boundaries. field-utils.tsx:131-137 onChange validates on change without touched gate. Focused tests: validation-collection.test.ts:437-516 (boundary stop), field-utils.unit.test.tsx:177-201 (change regardless of touched).
- Phase 3: action-adapter.ts resolveFormTarget implements formId resolution via ctx.form.id match for setValue/setValues and via componentRegistry for submitForm. Mismatch returns explicit error. form-runtime-submit-flow.ts:166-199 enforces summary-gate in submit execution path. submitWhenHidden removed from all .ts/.tsx source and prop coverage tests (0 matches in source, 20 in docs/plans/logs as historical reference). Focused tests: action-adapter.unit.test.ts:378-506 (formId targeting), form-runtime-submit-flow.test.ts:194-276 (summary-gate submit blocking).
- Phase 4: docs/logs/2026/05-01.md records all 4 phases. Docs (form-validation.md, action-scope-and-imports.md, action-payload-matrix.md) describe final baseline.
- Minor finding: resolveFormTarget componentRegistry path (action-adapter.ts:43-56) for setValue/setValues returns not-found even when a form-like component is found via registry. Dead code with conservative failure mode. Doc at action-scope-and-imports.md:656 slightly overstates componentRegistry resolution for setValue/setValues (accurate for submitForm). Recommend tracking as follow-up.

Follow-up:

- Surface-root owner identity and managed-surface lifecycle issues remain with `Plan 163`.
- Raw-schema renderer bypass and field-slot normalization remain with `Plan 169`.
- If supported registration semantics still need broader multi-instance generalization after this plan lands, move that wider work to a separate successor plan instead of reopening this one.
