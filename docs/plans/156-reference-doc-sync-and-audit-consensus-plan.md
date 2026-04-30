# 156 Reference Doc Sync And Audit Consensus Plan

> Plan Status: completed
> Last Reviewed: 2026-04-30
> Source: `docs/analysis/2026-04-30-references-doc-code-consistency-audit.md`, `docs/index.md`, `docs/architecture/README.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/form-validation.md`, `docs/logs/2026/04-20.md`, `docs/logs/2026/04-21.md`, `docs/logs/2026/04-30.md`
> Related: `docs/plans/155-architecture-owner-doc-convergence-plan.md`

## Purpose

把本轮 `docs/references/` 审计结论执行为一个可收口的同步计划，并把 reference docs、相关 owner docs、以及 daily logs 的说法重新收敛到同一套 live baseline。计划完成时，必须明确区分三类结果：reference doc 落后于代码、代码落后于文档/日志、以及 reference doc 混入 target-state 内容。

## Current Baseline

- `docs/analysis/2026-04-30-references-doc-code-consistency-audit.md` 已完成一轮基于 live code、`docs/architecture/` 规范文档、以及 `docs/logs/` 相关记录的 references 审计。
- 本轮重新核查后，判责规则已经收紧：
  - `docs/references/` 应描述最新 live baseline，而不是混入未来态伪类型或 target design。
  - `docs/index.md` 与 `docs/architecture/README.md` 的一般规则仍然是 active docs 只描述当前/最终 baseline；本计划不把 phased current-vs-target 叙述升级为一般政策。
  - `docs/architecture/form-validation.md` 目前是一个 live repo 中的已存在特殊情况：它明确同时承载 current live baseline 和 target architecture。该特殊情况只能在本计划范围内被收紧和澄清，不能外推为其它 owner docs 的通用写法。
  - `docs/logs/` 是历史证据来源，不是 owner contract，但当 log 明确宣称“已 landed”时，必须与 live code 重新核对。
- 当前已确认的主要 gap：
  - reference docs 落后于代码：`terminology.md`、`renderer-interfaces.md`、`action-payload-matrix.md`（除 `submitForm` 外）、`architecture-doc-status-matrix.md`、`integrating-third-party-components.md`、`refactoring-guidelines.md`
  - code 或已落地记录落后于文档：`action-payload-matrix.md` 与 2026-04-20 / 2026-04-21 daily log 将 `submitForm -> args: ApiSchema` 记为 LANDED，但 live code 仍未闭环
  - mixed drift：`form-validation-runtime-types.md`、`form-validation-execution-details.md`、`complex-component-design-process.md`
- `docs/architecture/frontend-programming-model.md` 与 `docs/architecture/flux-design-principles.md` 已固定当前高层基线：Flux 是 `Final Execution Schema` runtime；AMIS 只能作为历史/参考输入，不再是新的 owner-doc 基线措辞。
- `docs/architecture/form-validation.md` 目前同时承载 live-baseline note 和 target-architecture wording，但当前 owner doc仍残留少量 stale summary/example type names，会反向污染 reference docs。

## Goals

- 把本轮 references 审计中确认的 drift 执行成明确的文档同步改动。
- 明确修复或降级 `submitForm -> args` 的 landed 说法，使 docs、logs、code 三者一致。
- 把 validation references 与 `docs/architecture/form-validation.md` 这一处现有特殊 owner doc 的职责边界重新划清：reference doc 负责 live exported types / current contract，`form-validation.md` 中保留的 target/live split 只作为需要收紧说明的现存例外，而不是其它 owner docs 的通用模式。
- 在计划关闭前，通过多轮 fresh 子 agent 独立复核，直到对范围、判责、剩余工作达成一致。

## Non-Goals

- 不在本计划中重做新的 validation architecture redesign。
- 不在本计划中顺带推进大范围代码实现。
- 不在本计划中直接实现 `submitForm -> args` 的完整代码闭环；本计划只负责把它判定为“文档/日志应降级同步”还是“必须另立 successor implementation plan”。
- 不重写全部 `docs/references/`；只处理本轮审计确认的文件。
- 不把 `docs/logs/` 改写成规范文档；只在必要处补记同步结论和 closure evidence。

## Scope

### In Scope

- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- `docs/references/action-payload-matrix.md`
- `docs/references/form-validation-runtime-types.md`
- `docs/references/form-validation-execution-details.md`
- `docs/references/architecture-doc-status-matrix.md`
- `docs/references/complex-component-design-process.md`
- `docs/references/integrating-third-party-components.md`
- `docs/references/refactoring-guidelines.md`
- `docs/architecture/form-validation.md` within the narrow scope needed to remove stale summary/example type drift
- related `docs/logs/2026/04-20.md`, `docs/logs/2026/04-21.md`, `docs/logs/2026/04-30.md` entries if a landed/in-progress conclusion must be corrected or clarified
- minimal live-code verification paths needed to adjudicate `submitForm -> args`
- successor-plan note if the audit conclusion is that `submitForm -> args` should be implemented rather than downgraded in docs/logs

Review-only inputs (not mutable targets unless this plan is explicitly revised):

- `docs/analysis/2026-04-30-references-doc-code-consistency-audit.md`
- `docs/index.md`
- `docs/architecture/README.md`
- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-design-principles.md`

### Out Of Scope

- broad rewrites of unrelated architecture families
- new top-level routing redesign
- cleanup of stale `dist/` artifacts
- new feature work unrelated to this audit
- landing a new `submitForm -> args` runtime implementation inside this plan

## Execution Plan

### Phase 1 - Freeze Baseline And Adjudication Rules

Status: completed
Targets: `docs/architecture/form-validation.md`, `docs/logs/2026/04-20.md`, `docs/logs/2026/04-21.md`, `docs/logs/2026/04-30.md`

Review Inputs: `docs/index.md`, `docs/architecture/README.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/analysis/2026-04-30-references-doc-code-consistency-audit.md`

- [x] Re-check the owner-doc precedence chain before touching any reference file.
- [x] Re-check the relevant daily log entries so landed-vs-target claims are tied to explicit repo evidence rather than copied forward.
- [x] Lock the adjudication rule in plan notes: reference docs must mirror live baseline; `form-validation.md` is treated as a narrow pre-existing exception to be clarified, not as a new general rule for owner docs.

Exit Criteria:

- [x] The plan's `Current Baseline` still matches the live owner-doc precedence chain after a fresh read.
- [x] The `submitForm -> args` conclusion is supported by both source paths and cited log entries, not only by the analysis doc.
- [x] Related `docs/architecture/` files are confirmed as the owner baseline for this plan's scope.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 2 - Reference Interface And Routing Sync

Status: completed
Targets: `docs/references/terminology.md`, `docs/references/renderer-interfaces.md`, `docs/references/action-payload-matrix.md`, `docs/references/architecture-doc-status-matrix.md`, `docs/references/integrating-third-party-components.md`, `docs/references/refactoring-guidelines.md`

- [x] Update the reference docs that are simply missing live fields, signatures, routing entries, or dependency-chain facts.
- [x] Add the missing `closeSurface`, `surfaceId`, and `dataPath` action references.
- [x] Decide and document the correct current status for `submitForm -> args`: either downgrade the doc/log wording from LANDED in this plan, or create a narrow successor implementation plan instead of widening this plan.

Exit Criteria:

- [x] `terminology.md` includes the missing `RendererComponentProps`, `RendererHelpers`, and `ActionContext` fields confirmed in live code.
- [x] `renderer-interfaces.md` includes the missing `RendererDefinition` and `SchemaRendererProps` fields confirmed in live code.
- [x] `action-payload-matrix.md` reflects the live built-in action surface and no longer overstates `submitForm -> args` landing status.
- [x] If docs/logs are downgraded instead of code being changed, the affected `docs/logs/2026/04-20.md` / `04-21.md` / `04-30.md` entries are clarified to show that the landing claim was not fully realized in live code.
- [x] If docs/logs are downgraded instead of code being changed, no successor implementation plan is needed for this plan closure.
- [x] `architecture-doc-status-matrix.md` includes the concrete missing active architecture docs found in the audit.
- [x] `integrating-third-party-components.md` and `refactoring-guidelines.md` no longer describe stale signatures or package-chain facts.
- [x] Related `docs/architecture/` or `docs/components/` remain aligned with the updated reference wording.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 3 - Validation Reference / Owner Boundary Cleanup

Status: completed
Targets: `docs/references/form-validation-runtime-types.md`, `docs/references/form-validation-execution-details.md`, `docs/architecture/form-validation.md`

- [x] Rewrite `form-validation-runtime-types.md` as a strict live-code reference.
- [x] Replace stale/non-existent API type teaching in `form-validation-execution-details.md` while preserving conceptually correct behavioral sections.
- [x] Remove stale summary/example type names from `docs/architecture/form-validation.md` that currently leak target/pseudotype drift back into the references.
- [x] Clarify in `docs/architecture/form-validation.md` that its remaining live-vs-target split is a narrow owner-doc exception under active cleanup, not a general template for other architecture docs.

Exit Criteria:

- [x] `form-validation-runtime-types.md` no longer contains fictional exported types such as `ScopeValidationResult`, `FormSubmitResult`, or `FieldRegistrationState`.
- [x] `form-validation-runtime-types.md` reflects the live exported `ValidationScopeRuntime`, `FormRuntime`, `CompiledFormValidationModel`, and `RuntimeFieldRegistration` shapes.
- [x] `form-validation-execution-details.md` no longer teaches developers to use non-existent result/runtime types.
- [x] `docs/architecture/form-validation.md` no longer contains stale summary/example type names that conflict with live exports, and any remaining target/live split is explicitly labeled as a narrow existing exception under cleanup.
- [x] Related `docs/architecture/` files in this phase's scope are updated consistently with that narrower wording.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 4 - Complex-Component Reference Baseline Cleanup

Status: completed
Targets: `docs/references/complex-component-design-process.md`

Review Inputs: `docs/index.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`

- [x] Update the document so it no longer presents AMIS JSON as the current core DSL baseline.
- [x] Update stale applied-component status and token-prefix examples.
- [x] Ensure the doc reads as a practical reference under the current Flux owner-doc baseline, not as a preserved pre-Flux process document.

Exit Criteria:

- [x] `complex-component-design-process.md` no longer conflicts with `frontend-programming-model.md` / `flux-design-principles.md` about the current DSL/runtime framing.
- [x] The status table reflects current shipped architecture families.
- [x] CSS token examples use current `--nop-*` baseline where applicable.
- [x] Any necessary routing/cross-link updates are completed.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 5 - Repeated Independent Audit Until Consensus

Status: completed
Targets: `docs/plans/156-reference-doc-sync-and-audit-consensus-plan.md`, scoped docs/logs/code paths changed by this plan

- [x] Run a first fresh subagent audit over the drafted/updated plan and scoped files.
- [x] Resolve findings or narrow the plan if the first audit finds overreach or misclassification.
- [x] Run at least one additional fresh subagent audit after revisions.
- [x] After the repeated review rounds converge, run one explicit closure-audit pass that re-checks every phase exit criterion and the full validation checklist.
- [x] Do not mark the plan `completed` until that explicit closure-audit pass confirms the scoped sync work and remaining debt ownership are clear.

Exit Criteria:

- [x] At least two fresh independent subagent reviews have re-checked the scoped files after plan drafting / execution.
- [x] Any disagreements between audit rounds are resolved in the plan, the scoped docs, or explicit follow-up ownership notes.
- [x] Repeated audit evidence is recorded in this plan and/or the corresponding daily log.
- [x] One explicit independent closure-audit pass has re-checked every phase exit criterion and the validation checklist after the review rounds converged.
- [x] The corresponding execution-date `docs/logs/` entry is updated with consensus evidence.

## Validation Checklist

- [x] Reference docs in this plan's scope now mirror the latest live baseline rather than mixed target/current wording
- [x] `submitForm -> args` status is consistent across docs, logs, and live code, or an explicit successor implementation plan owns the remaining code gap
- [x] validation owner-doc vs reference-doc responsibilities are explicitly separated again
- [x] complex-component reference wording no longer conflicts with the current Flux top-level architecture baseline
- [x] repeated independent subagent audits have been completed and recorded
- [x] independent closure audit has re-checked every phase exit criterion and this checklist, and the evidence is recorded
- [x] focused verification for any code-backed adjudication has been completed
- [x] `pnpm typecheck` — N/A (docs-only plan, no code changed)
- [x] `pnpm build` — N/A
- [x] `pnpm lint` — N/A
- [x] `pnpm test` — N/A

## Audit Evidence Log

- Plan review round 1: `ses_223110346ffe7uNm2dP8vAICkP` - found soft `submitForm` ownership, over-broad owner-doc wording, contradictory validation wording, and incomplete source provenance; resolved in the revised plan before execution.
- Plan review round 2: `ses_2230ece1effeDYxfvvbShRU8Go` - found mutable-scope leakage, still-too-broad goals wording, and closure-audit gaps; resolved before execution.
- Post-update audit round 1: ses_222aad6f3ffeYZt1qLDbvynFd1 — PASS WITH MINOR ISSUES. All Phase 1-4 exit criteria MET. All validation checklist items SATISFIED. Two minor issues: (1) audit evidence log not yet updated, (2) 04-30.md log entry does not enumerate verified exit criteria. No blockers for closure.
- Post-update audit round 2: ses_222a615a4ffe1rcZU7u6A35485 — PASS WITH MINOR ISSUES. All 7 verification items VERIFIED. New finding: `architecture-doc-status-matrix.md` missing family sub-documents (flow-designer/*, report-designer/*) — pre-existing gap outside plan scope. No blockers for closure.

## Closure

Status Note: All five phases completed. Phases 1-4 executed the reference-doc sync work. Phase 5 completed three independent audit rounds (two post-update reviews + one closure audit). All exit criteria verified. The plan is closed with no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: ses_222a1f3ebffe9Gb3wxWZLGu7Ax (independent closure-audit subagent)
- Evidence: All Phase 1-4 exit criteria re-checked and PASS. All validation checklist items SATISFIED or N/A (docs-only plan). Code-backed adjudication confirmed via `built-in-actions.ts:231` (`args: undefined`) and `action-adapter.ts:140` (`ctx.form.submit()`). `submitForm -> args` consistently marked NOT FULLY LANDED across docs, logs, and live code. Three audit rounds completed and recorded in Audit Evidence Log.

Follow-up:

- If `submitForm -> args` requires a real runtime landing rather than a doc/log downgrade, move that work to a narrow successor implementation plan instead of silently widening this plan.
- If additional reference-doc drift is discovered outside this plan's scoped files, record it in a successor plan or follow-up analysis instead of expanding this plan without review.
- `architecture-doc-status-matrix.md` is missing family sub-document entries (flow-designer/*, report-designer/*). This is a pre-existing gap outside plan 156's scope. A follow-up should add these entries.
- `docs/architecture/form-validation.md` live-vs-target split is labeled as a narrow existing exception under cleanup. Future work should continue tightening this until the exception is either removed or the target state is landed.
