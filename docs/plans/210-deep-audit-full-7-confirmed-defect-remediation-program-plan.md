# 210 Deep Audit Full-7 Confirmed Defect Remediation Program Plan

> Plan Status: completed
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-deep-audit-full-7/summary.md`, `docs/analysis/2026-05-05-deep-audit-full-7/{02-module-responsibility.md,04-state-ownership.md,05-reactive-precision.md,06-async-safety.md,07-lifecycle.md,08-validation.md,09-renderer-contract.md,10-styling.md,11-ui-components.md,12-field-slot.md,13-type-safety.md,14-test-coverage.md,15-security-performance.md,16-doc-code-consistency.md,17-naming.md,18-cross-package.md,19-error-propagation.md,20-accessibility.md}`
> Related: `docs/plans/203-runtime-validation-and-data-source-contract-closure-plan.md`, `docs/plans/204-renderer-workbench-and-accessibility-closure-plan.md`, `docs/plans/205-doc-boundary-and-test-hardening-closure-plan.md`, `docs/plans/209-renderer-definition-fields-only-convergence-plan.md`

## Purpose

把 `full-7` 审计里已被独立复核确认、且确实需要修正的 live defects / contract drifts / hard-gate issues，整理成可执行的 owner-scoped successor 计划集合。该计划本身不直接落代码修复；它的完成态是：`full-7` 的 confirmed fix set 被诚实冻结、逐项分配到新的 active successor plans、并为后续 closure audit 提供明确 owner 边界，避免把 82 条 retained 问题再次塞进一个假装可执行的单一大计划。

## Current Baseline

- `docs/analysis/2026-05-05-deep-audit-full-7/summary.md` 已完成 20 个维度的初审、深挖和独立复核，当前统计为：可读复核条目 147，保留 82，降级 45，驳回 20；另有 `05-reactive-precision.md` 第 17 条因源文件截断未纳入最终统计。
- 现有已关闭计划 `201`、`203`、`204`、`205`、`206`、`207`、`208`、`209` 已收口更早一轮审计与兼容性/定义层收敛工作，但它们不拥有 `full-7` 的新 retained defects；若直接复用这些 completed plans，会把新问题伪装成已闭合工作。
- `full-7` 的 confirmed retained items 横跨至少四个 owner surface：
- runtime / state / reactive / async / validation / error propagation
- renderer / workbench / styling / a11y / UI-component / public vocabulary
- docs / test-hardening / oversized-file / active-doc drift
- report-designer performance hot paths
- 当前 `summary.md` 里的 P1 清单已经证明这批 retained items 不是单一 owner 可以一次性诚实收口的窄问题；继续写单一 closure plan 会重演历史上的 over-broad plan 与 silent scope drop。
- 根据 `docs/plans/00-plan-authoring-and-execution-guide.md`，confirmed live defect、confirmed contract drift、active-doc drift、以及已进入固定硬门禁的规则都不能降级成 advisory 或模糊 follow-up。

## Goals

- 冻结 `full-7` 中真正必须修正的 confirmed defect / contract drift / hard-gate issue 集合。
- 将这些问题拆分到新的 owner-scoped successor plans，并为每个 successor plan 指定明确目标面、文件范围、文档责任和验证要求。
- 把优化类、watch-only residual、命名噪音与非阻塞改进从 blocking correction set 中剥离出来，防止 scope 继续膨胀。
- 为后续修复执行提供一个可 closure-audit 的 program baseline，而不是继续依赖散落在 `summary.md` 和 20 份维度文件中的 retained list。

## Non-Goals

- 不在本计划中直接执行代码修复。
- 不把 `full-7` 的 82 条 retained 问题继续包装成一个单文件直接执行的“总闭环计划”。
- 不重开已经 `completed` 的旧计划来承接本轮新范围。
- 不把已在 `full-7` 中降级为优化/噪音/局部维护性问题的条目重新提升成 closure blocker。

## Scope

### In Scope

- `docs/analysis/2026-05-05-deep-audit-full-7/summary.md`
- `docs/analysis/2026-05-05-deep-audit-full-7/{02-module-responsibility.md,04-state-ownership.md,05-reactive-precision.md,06-async-safety.md,07-lifecycle.md,08-validation.md,09-renderer-contract.md,10-styling.md,11-ui-components.md,12-field-slot.md,13-type-safety.md,14-test-coverage.md,15-security-performance.md,16-doc-code-consistency.md,17-naming.md,18-cross-package.md,19-error-propagation.md,20-accessibility.md}`
- new successor plans to be created under `docs/plans/`
- this plan file and the execution-day `docs/logs/2026/05-05.md` entry

### Out Of Scope

- actual code edits for the retained defects
- direct architecture/component doc rewrites for the retained defects
- re-running the full deep audit itself
- any residual already adjudicated as optimization candidate, watch-only residual, or out-of-scope improvement unless a later successor plan explicitly reclassifies it into an in-scope fix

## Execution Plan

### Phase 1 - Freeze The Confirmed Correction Set

Status: completed
Targets: `docs/analysis/2026-05-05-deep-audit-full-7/summary.md`, retained-dimension files listed in Scope

- Item Types: `Decision | Proof`

- [x] [Decision] Build a single retained-finding matrix from `full-7` that lists every independently retained item and classifies it as `live defect`, `contract drift`, `hard-gate issue`, or `non-blocking residual candidate`.
- [x] [Decision] Explicitly carve out the non-blocking residual set that should not drive successor closure, limited to true optimization candidates, watch-only items, or local naming noise that does not currently break supported behavior or public contract.
- [x] [Proof] Confirm that every `summary.md` P1 item remains inside the must-fix set and that no retained confirmed defect is silently dropped because it sits outside the current P1 table.
- [x] [Proof] Record the one known truncated item (`05-reactive-precision.md` round-5 item-17) as `not adjudicated / not schedulable` rather than guessing its owner.

Exit Criteria:

- [x] A frozen retained-finding matrix exists and covers every retained `full-7` item except the explicitly truncated record.
- [x] Every must-fix item is classified as `Fix` or `Decision` work for a future successor plan; no confirmed defect is left in an ambiguous bucket.
- [x] Every non-blocking residual has an explicit `Why Not Blocking Closure` rationale.
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Create The Runtime / State / Reactive Successor Plan

Status: completed
Targets: `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md` (new)

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Draft plan `211` to own the retained runtime-side issues from dimensions `04`, `05`, `06`, `07`, `08`, `13`, and `19`.
- [x] [Decision] Keep plan `211` focused on correctness- and contract-bearing issues only, including state-source drift, invalid wide subscriptions with real cost/correctness impact, render-phase side effects, validation participation gaps, async fire-and-forget failures, type-boundary escapes, and retained error-propagation defects.
- [x] [Decision] Exclude pure maintenance noise or already-adjudicated optimization-only items from plan `211`, and record explicit non-goals to prevent it from becoming a second monolithic cleanup bucket.
- [x] [Proof] Attach the owner-doc and verification expectations for plan `211`, including whichever of `docs/architecture/form-validation.md`, `docs/architecture/surface-owner.md`, `docs/architecture/renderer-runtime.md`, and related focused tests are genuinely affected by the final baseline.

Exit Criteria:

- [x] Plan `211` exists under `docs/plans/` with explicit status, baseline, goals/non-goals, slice statuses, closure gates, and no silent scope drop.
- [x] Every retained must-fix item from dimensions `04`, `05`, `06`, `07`, `08`, `13`, and `19` is either assigned to plan `211` or explicitly mapped to another named successor path.
- [x] Plan `211` does not absorb report-designer performance hot paths or docs/test-hardening work that belong to other owners.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Create The Renderer / Workbench / Accessibility Successor Plan

Status: completed
Targets: `docs/plans/212-renderer-workbench-contract-and-accessibility-closure-plan.md` (new)

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Draft plan `212` to own retained renderer/workbench defects from dimensions `09`, `10`, `11`, `12`, `18`, and `20`.
- [x] [Decision] Include only true contract, accessibility, UI-component, styling-interface, and workbench-surface issues that affect the current supported baseline, including `designer-field` metadata/marker drift, BEM-as-public-interface drift, default `FieldFrame<label>` conflicts, retained a11y defects, and explicit cross-package vocabulary/override-surface gaps.
- [x] [Decision] Keep broader visual redesign, full-text i18n cleanup, and generic theme refactoring out of scope unless a retained item proves they are required for supported baseline correctness.
- [x] [Proof] Attach the owner-doc and verification expectations for plan `212`, including the affected component docs, renderer contract docs, and focused DOM/e2e tests.

Exit Criteria:

- [x] Plan `212` exists under `docs/plans/` with explicit ownership and closure criteria.
- [x] Every retained must-fix item from dimensions `09`, `10`, `11`, `12`, `18`, and `20` is either assigned to plan `212` or explicitly mapped to another named successor path.
- [x] Plan `212` does not silently mix in docs/test-hardening or report-designer deep-copy performance work.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Create The Docs / Test / Boundary / Public Vocabulary Successor Plan

Status: completed
Targets: `docs/plans/213-doc-test-boundary-and-hardening-closure-plan.md` (new)

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Draft plan `213` to own retained docs/test/boundary/public-vocabulary items from dimensions `02`, `14`, `16`, and `17`.
- [x] [Decision] Preserve the hard/soft distinction inside plan `213` honestly: the `>700` oversized file split remains a non-degradable hard issue, and the retained dimension `14` items stay in-scope confirmed test-hardening defects rather than being re-opened for blocker re-adjudication.
- [x] [Decision] Keep active-doc drift, live hook/signature drift, and stale-path references in-scope; do not downgrade them into generic doc cleanup.
- [x] [Decision] Keep the retained `dataPath` vs `path` public vocabulary drift in-scope as a real public-contract cleanup item; do not leave dimension `17` without an owner path.
- [x] [Proof] Attach verification expectations for guard scripts, focused tests, and whichever active docs must be updated to match live baseline.

Exit Criteria:

- [x] Plan `213` exists under `docs/plans/` with explicit ownership and closure criteria.
- [x] Every retained must-fix item from dimensions `02`, `14`, `16`, and `17` is either assigned to plan `213` or explicitly mapped to another named successor path.
- [x] Plan `213` explicitly treats the current oversized-file hard threshold and retained dimension `14` must-fix items as non-degradable in-scope work.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 5 - Create The Report Designer Performance Successor Plan

Status: completed
Targets: `docs/plans/214-report-designer-performance-hot-path-closure-plan.md` (new)

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Draft plan `214` to own the retained report-designer performance hot-path issues from dimension `15`.
- [x] [Decision] Keep plan `214` focused on the confirmed deep-copy hotspots and any directly coupled proof/measurement work; do not use it as a catch-all bucket for unrelated workbench cleanup.
- [x] [Proof] Require explicit verification expectations for before/after hot-path behavior, focused tests, and any required owner-doc notes if the supported performance baseline is documented.

Exit Criteria:

- [x] Plan `214` exists under `docs/plans/` with explicit ownership and closure criteria.
- [x] Every retained must-fix item from dimension `15` is assigned to plan `214` or explicitly mapped to another named successor path.
- [x] The plan records why these deep-copy paths are treated as confirmed in-scope defects rather than generic future optimization.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：本计划只有在 `full-7` 的 must-fix retained items 全部完成 successor ownership 分配，且独立计划审阅确认不存在 over-broad scope、silent scope drop、或把 confirmed defect 伪装成 non-blocking residual 之后，才能从 `planned` 变为 `completed`。

- [x] `full-7` 的 confirmed live defects / contract drifts / hard-gate issues 都已分配到唯一 successor owner path，或通过显式 scope change 从本 program 中移除。
- [x] 不存在未被 owner 的 retained P1 item。
- [x] 不存在未被 owner 的 retained dimension item，尤其是 `17-naming` 的公开词汇漂移。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope confirmed defect、contract drift、active-doc drift、或 hard-gate issue。
- [x] 所有 successor plans 都包含显式 `Plan Status`、`Current Baseline`、`Goals` / `Non-Goals`、slice status、exit criteria、closure gates。
- [x] `05-reactive-precision.md` 的截断条目已被明确记录为未裁定，而不是被假装分配。
- [x] 独立子 agent / 独立审阅者 plan-audit 已完成并记录 evidence，且最终结论为 `APPROVE` 或等价明确通过。

## Deferred But Adjudicated

### Downgraded Residuals From Full-7

- Classification: `watch-only residual`
- Why Not Blocking Closure: `full-7` 中已被独立复核降级的条目并不自动进入 must-fix correction set；只有在 successor planning 时再次被 owner 证据确认会破坏当前 supported baseline，才允许重新升级为 in-scope fix。
- Successor Required: no

## Closure

Status Note: Completed. This program plan froze and split the `full-7` confirmed correction set into honest owner-scoped successor plans `211`-`214`. Independent plan review converged to `APPROVE` with no remaining over-broad scope, silent scope drop, or disguised downgrade of confirmed defects.

Known Evidence Gap:

- `05-reactive-precision.md` round-5 item-17 remains `not adjudicated / not schedulable` because the source record is truncated at title level. It is intentionally excluded from successor ownership and from `Deferred But Adjudicated` until the raw evidence can be reconstructed.

Closure Audit Evidence:

- Reviewer / Agent: independent plan-review subagents
- Evidence:
- task `ses_2084c885cffeBFP7KOGwk4KNSA` reviewed plan `210`; first pass flagged missing dim17 ownership, an attempted dim14 blocker re-open, and dishonest truncated-item handling; after revision it returned `APPROVE`.
- task `ses_2083740d3ffeGTZPLdlm1HwDtS` reviewed plan `211`; after targeted revisions it returned `APPROVE`.
- task `ses_208373e3dffeCN6oRBJypkLZ0W` reviewed plan `212`; after targeted revisions it returned `APPROVE`.
- task `ses_208373e1affeEVjyUpo2vaFRCu` reviewed plan `213`; after targeted revisions it returned `APPROVE`.
- task `ses_208373e08ffeysO5BD0TzkObi4` reviewed plan `214` and returned `APPROVE`.

Follow-up:

- Further execution should continue under plans `211`-`214`, not by reopening this successor-split program.
