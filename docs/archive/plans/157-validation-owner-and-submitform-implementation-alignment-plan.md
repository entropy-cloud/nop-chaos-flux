# 157 Validation Owner Boundary And Child Contract Implementation Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-04-30
> Source: `docs/index.md`, `docs/architecture/README.md`, `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/action-scope-and-imports.md`, `docs/plans/119-action-precompile-and-args-unification-plan.md`, `docs/plans/135-non-form-validation-scope-and-owner-boundary-implementation-plan.md`, `docs/logs/2026/04-30.md`
> Related: `docs/plans/119-action-precompile-and-args-unification-plan.md`, `docs/plans/135-non-form-validation-scope-and-owner-boundary-implementation-plan.md`, `docs/plans/155-architecture-owner-doc-convergence-plan.md`, `docs/plans/156-reference-doc-sync-and-audit-consensus-plan.md`

## Purpose

收口已经被 owner docs 选定、但 live code 仍未完整兑现的 validation-owner 实现面，避免继续依赖把 owner docs 写成 current-vs-target 混合文档的临时做法：

- 把 `docs/architecture/form-validation.md` 的 current-vs-target 混写继续当作狭义例外

本计划完成时，相关代码应满足当前 owner-doc 设计要求，且 `docs/architecture/` 在本计划范围内不再需要用“当前实现仍然较窄”的混写来维持主合同。

## Current Baseline

- `docs/index.md`、`docs/architecture/README.md`、`docs/plans/00-plan-authoring-and-execution-guide.md` 一致要求：`docs/architecture/` 只保存最新设计基线，不应长期混写 `Current vs Target`。
- `docs/plans/155-architecture-owner-doc-convergence-plan.md` 已收口其 scoped owner-doc drift，并修复了 CRUD 对 `$form.values` 的明确 contract violation。
- 在重新核对 `packages/flux-core/src/types/actions.ts`、`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`、`packages/flux-runtime/src/action-adapter.ts` 后，可确认 `submitForm` 当前 live contract 是“需要 `ctx.form` 的语义型 submit command”，而不是 `args: ApiSchema` payload action；旧的 `submitForm -> args` 结论应视为过度机械套用 `ajax` 收敛规则的历史残留，不再作为本计划目标。
- `docs/plans/135-non-form-validation-scope-and-owner-boundary-implementation-plan.md` 已落地 page-owned root 作为第一个 non-form validation owner family，但 `docs/architecture/form-validation.md` 仍显式保留多处 target/live split，核心原因是以下语义尚未完整落地：
  - compiler-driven `ownerResolution` / owner partitioning
  - renderer-level draft owner 向 shared child-owner substrate 的收敛
  - `ChildValidationContract` 从 placeholder/partial wiring 收口为真实 parent-child validation contract
- 因此当前 repo 并未在这些主题上完全达到“architecture 保存最新设计决定，代码逐步追赶”的健康状态；更准确地说，是“部分 architecture docs 领先代码，另一些 owner docs 仍因代码未跟上而不得不混写 current/target”。

## Goals

- 落地最小但真实的 multi-owner validation semantics，使 `docs/architecture/form-validation.md`、`docs/architecture/data-domain-owner.md`、`docs/architecture/value-adaptation-and-detail-field.md` 在本计划范围内可以改回最终设计表述，而不是继续依赖 current-vs-target 例外。
- 让 detail/draft child-owner 路径不再只靠 renderer-level 临时 `FormRuntime` 生命周期维持，而是进入 compiler/runtime-owned owner boundary baseline。
- 在计划关闭前，通过独立 closure audit 重新确认：本计划范围内的 architecture docs 只描述最终设计状态，且 live code 已满足这些设计要求。

## Non-Goals

- 不在本计划内实现 Report Designer / Spreadsheet family `api.md`、`contracts.md` 所描述的整套 future package/API surface。
- 不在本计划内一次性落地所有 future validation owner families；`filter/search/wizard` 若无具体 renderer adopter，仍保持 out of scope。
- 不在本计划内重做完整 row-local staged editor / table child-domain architecture。
- 不在本计划内通过继续降级 owner docs 来替代代码落地；若某一条设计被证明短期内不再成立，应显式改 owner doc baseline 并新开 successor plan，而不是继续保留 current-vs-target 混写。

## Scope

### In Scope

- `packages/flux-runtime/src/form-runtime.ts` and related validation modules
- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-compiler/src/schema-compiler.ts`
- `packages/flux-runtime/src/runtime-owned-factories.ts`
- `packages/flux-runtime/src/page-runtime.ts`
- `packages/flux-renderers-form-advanced/src/detail-view/*`
- `packages/flux-renderers-form-advanced/src/composite-field/*`
- focused validation tests needed to prove the landed semantics
- `docs/architecture/form-validation.md`
- `docs/architecture/data-domain-owner.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- corresponding execution-date `docs/logs/` entry

### Out Of Scope

- `docs/architecture/report-designer/api.md` / `contracts.md` 对应的大范围 package implementation
- generalized filter/search/wizard validation-owner adoption without a concrete current renderer path
- report/flow/word designer family feature development unrelated to validation/action convergence
- stale `dist/` artifact cleanup

## Execution Plan

### Phase 1 - Freeze The Code-Owned Design Targets

Status: completed
Targets: `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/logs/2026/04-30.md`

- [x] Re-audit the owner-doc rules for this plan's scope and explicitly freeze which statements are treated as final design requirements rather than temporary wording.
- [x] Collapse any remaining ambiguity around validation owner semantics inside the scoped docs before code work starts.
- [x] Record which current mixed wording is expected to disappear after Phases 2-4 land, so closure can test repo-observable outcomes instead of relying on memory.

Exit Criteria:

- [x] The scoped validation docs identify the exact mixed sections that this plan must eliminate by landing code.
- [x] Related `docs/architecture/` files are updated to final-design wording where the baseline is already fixed, and any still-open design target is explicitly assigned to a later phase rather than mixed into current wording.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 2 - Land Compiler-Owned Validation Boundary Classification For Supported Families

Status: completed
Targets: `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/form-runtime*.ts`, `packages/flux-renderers-form-advanced/src/composite-field/*`, `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`

- [x] Promote the currently documented `ownerResolution` baseline from target sketch to live compiler/runtime contract for the supported owner families in this plan.
- [x] Keep the supported family set narrow and explicit: `form`, page-owned root, and current draft/detail child-owner paths; unsupported families must remain explicitly out of scope rather than half-landed.
- [x] Replace renderer-only owner-boundary guesswork with compiler/runtime-owned boundary metadata and owner creation for the supported families.
- [x] Add focused tests proving that supported `create-owner` / `inherit-owner` boundaries are real, while unsupported boundaries still do not create accidental owners.

Exit Criteria:

- [x] A live compiler/runtime boundary contract exists for the supported owner families instead of only a target sketch in docs.
- [x] Supported child-owner paths are created through owner-boundary metadata rather than only renderer-local ad hoc runtime creation.
- [x] Unsupported families remain explicitly non-owner or parent-owned in live behavior and tests.
- [x] `docs/architecture/form-validation.md` and `docs/architecture/data-domain-owner.md` no longer need scoped wording that says owner-boundary classification is still only planned for a future phase in these supported paths.
- [x] Related `docs/architecture/` or `docs/components/` are updated to final-design wording only.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 3 - Land Real Child Validation Contracts For Supported Draft Owners

Status: completed
Targets: `packages/flux-runtime/src/form-runtime*.ts`, `packages/flux-renderers-form-advanced/src/detail-view/*`, `packages/flux-renderers-form-advanced/src/composite-field/*`, focused validation tests, `docs/architecture/form-validation.md`, `docs/architecture/value-adaptation-and-detail-field.md`

- [x] Replace placeholder/partial `ChildValidationContract` behavior with a real parent-child validation contract for the supported child-owner paths.
- [x] Land submit/commit coordination that uses active child-owner contracts rather than renderer-only local lifecycle assumptions.
- [x] Keep the supported contract modes narrow and explicit; do not widen to every theoretical owner family in the same pass.
- [x] Add regression coverage for child-owner activation, parent gating/submit coordination, and draft commit behavior.

Exit Criteria:

- [x] Supported child owners register and unregister real contracts that the parent runtime uses during validation/submit orchestration.
- [x] Parent-child submit coordination for supported draft owners is observable in live tests, not just in interface shapes.
- [x] `docs/architecture/form-validation.md` no longer needs to describe `ChildValidationContract` as mainly a placeholder for later phases in the supported paths.
- [x] `docs/architecture/value-adaptation-and-detail-field.md` no longer needs to treat renderer-level draft `FormRuntime` as the primary live baseline for the supported paths.
- [x] Related `docs/architecture/` or `docs/components/` are updated to final-design wording only.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 4 - Verification And Final Owner-Doc Cleanup

Status: completed
Targets: scoped tests, `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/plans/157-validation-owner-and-submitform-implementation-alignment-plan.md`, corresponding execution-date `docs/logs/` entry

- [x] Re-audit the scoped owner docs against live code after Phases 2-3.
- [x] Remove any remaining plan-scoped current-vs-target exception wording that is no longer justified.
- [x] Run focused verification plus repo-wide required verification for the landed code changes.
- [x] Run a fresh independent closure audit before marking the plan complete.

Exit Criteria:

- [x] In this plan's scope, `docs/architecture/` files describe final design state only and do not rely on current-vs-target exception wording.
- [x] All Phase 2-3 behavior claims are backed by live code paths and focused tests.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` succeed.
- [x] The corresponding execution-date `docs/logs/` entry records the closure-audit evidence.

## Validation Checklist

- [x] scoped validation owner semantics no longer depend on renderer-level ad hoc behavior in the supported child-owner paths
- [x] compiler/runtime boundary classification exists for the supported owner families in this plan
- [x] parent-child validation contract behavior is proven by focused tests for the supported paths
- [x] `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`, and `docs/architecture/value-adaptation-and-detail-field.md` no longer require plan-scoped current-vs-target exception wording
- [x] focused verification for changed code paths is complete
- [x] independent closure audit has re-checked every phase exit criterion and this checklist
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: The supported validation-owner paths in this plan now match the owner-doc baseline: compiler/runtime metadata classifies supported owner boundaries, detail child owners register real parent-visible contracts while active, and the scoped architecture docs describe final supported design state rather than preserving a plan-owned current-vs-target exception.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: `ses_2225c72ffffe7rkOLk8DE95DBD` re-checked every phase/checklist item against live repo state, initially found two remaining Phase 4 doc/log gaps in `docs/architecture/form-validation.md` and closure evidence recording, and passed after those were resolved and recorded in `docs/logs/2026/04-30.md`.

Follow-up:

- Report Designer / Spreadsheet future package-contract implementation remains out of scope for this plan and should move through a separate owner plan if those architecture docs are kept as active target baseline.
- Filter/search/wizard owner-family rollout, row-local staged owners, and any broader multi-owner generalization beyond the supported paths in this plan must be tracked in successor plans instead of being silently reintroduced here.
